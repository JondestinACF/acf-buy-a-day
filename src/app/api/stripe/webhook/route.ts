/**
 * POST /api/stripe/webhook
 * Stripe webhook handler — the source of truth for payment confirmation.
 *
 * Handles:
 *   - payment_intent.succeeded → mark day as SOLD
 *   - payment_intent.payment_failed → release hold
 *   - charge.refunded → optionally restore day
 *
 * CRITICAL: Raw body must be passed to stripe.webhooks.constructEvent.
 * This route bypasses Next.js JSON body parsing.
 */

import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import Stripe from 'stripe';
import { stripe } from '@/lib/stripe';
import { prisma } from '@/lib/prisma';
import { generateOrderId } from '@/lib/orderNumber';
import { createAuditLog, AUDIT_ACTIONS } from '@/lib/auditLog';
import { sendBuyerConfirmation, sendAdminNotification } from '@/lib/email';

// IMPORTANT: Disable body parsing so we get the raw body for signature verification
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const body = await request.text(); // Raw body
  const sig = headers().get('stripe-signature');
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!sig || !webhookSecret) {
    console.error('[webhook] Missing stripe-signature or webhook secret');
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown';
    console.error('[webhook] Signature verification failed:', msg);
    return NextResponse.json({ error: `Webhook error: ${msg}` }, { status: 400 });
  }

  console.log(`[webhook] Processing event: ${event.type} (${event.id})`);

  try {
    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentSucceeded(event.data.object as Stripe.PaymentIntent);
        break;

      case 'payment_intent.payment_failed':
        await handlePaymentFailed(event.data.object as Stripe.PaymentIntent);
        break;

      case 'charge.refunded':
        await handleChargeRefunded(event.data.object as Stripe.Charge);
        break;

      default:
        // Ignore other events
        console.log(`[webhook] Ignored event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error(`[webhook] Handler error for ${event.type}:`, error);
    // Return 200 to prevent Stripe retrying — log the error
    // If you want retries on failure, return 500 instead
    return NextResponse.json({ error: 'Handler failed' }, { status: 500 });
  }
}

// ─── payment_intent.succeeded ─────────────────────────────────────────────────

async function handlePaymentSucceeded(pi: Stripe.PaymentIntent): Promise<void> {
  const { date, holdToken, calendarDayId } = pi.metadata;

  if (!calendarDayId || !date) {
    console.error('[webhook] Missing metadata on PaymentIntent:', pi.id);
    return;
  }

  // Idempotency: skip if already processed
  const existing = await prisma.calendarDay.findUnique({
    where: { stripePaymentIntentId: pi.id },
  });

  if (existing?.status === 'SOLD') {
    console.log(`[webhook] Already processed PI ${pi.id} — skipping`);
    return;
  }

  const orderId = await generateOrderId();
  const paidAt = new Date();

  // Extract buyer info from metadata (was set during create-payment-intent)
  const billingAddress = (() => {
    try { return JSON.parse(pi.metadata.billingAddress || '{}'); }
    catch { return {}; }
  })();

  await prisma.$transaction(async (tx) => {
    const day = await tx.calendarDay.findUnique({ where: { id: calendarDayId } });

    if (!day) {
      throw new Error(`CalendarDay not found: ${calendarDayId}`);
    }

    // Only proceed if in CHECKOUT_HOLD (or already has this PI — idempotent)
    if (day.status !== 'CHECKOUT_HOLD' && day.stripePaymentIntentId !== pi.id) {
      console.warn(`[webhook] Unexpected status for ${date}: ${day.status}`);
      return;
    }

    const prevStatus = day.status;

    await tx.calendarDay.update({
      where: { id: day.id },
      data: {
        status: 'SOLD',
        orderId,
        amountPaidCents: pi.amount,
        paidAt,
        stripePaymentIntentId: pi.id,
        holdToken: null,
        holdExpiresAt: null,
        // Buyer info may already be set from create-payment-intent, but ensure it's here
        buyerFirstName: day.buyerFirstName || pi.metadata.buyerFirstName || null,
        buyerLastName: day.buyerLastName || pi.metadata.buyerLastName || null,
        buyerEmail: day.buyerEmail || pi.metadata.buyerEmail || null,
        buyerPhone: day.buyerPhone || pi.metadata.buyerPhone || null,
        billingAddress: day.billingAddress || billingAddress,
        contactOptIn: day.contactOptIn || pi.metadata.contactOptIn === 'true',
        dedicationText: day.dedicationText || pi.metadata.dedicationText || null,
      },
    });

    await tx.auditLog.create({
      data: {
        calendarDayId: day.id,
        action: AUDIT_ACTIONS.PAYMENT_RECEIVED,
        oldValue: { status: prevStatus },
        newValue: { status: 'SOLD', orderId, amountPaidCents: pi.amount },
        performedBy: `stripe:${pi.id}`,
        notes: `Stripe PaymentIntent succeeded`,
      },
    });
  });

  // Send emails (non-blocking — don't fail the webhook if email fails)
  const buyerEmail = existing?.buyerEmail || pi.metadata.buyerEmail;
  const buyerFirstName = existing?.buyerFirstName || pi.metadata.buyerFirstName || '';
  const buyerLastName = existing?.buyerLastName || pi.metadata.buyerLastName || '';
  const dedicationText = existing?.dedicationText || pi.metadata.dedicationText || '';

  if (buyerEmail) {
    try {
      await sendBuyerConfirmation({
        toEmail: buyerEmail,
        toName: `${buyerFirstName} ${buyerLastName}`.trim(),
        orderId,
        date,
        dedicationText: dedicationText || undefined,
        amountCents: pi.amount,
        paidAt: paidAt.toISOString(),
      });
    } catch (emailErr) {
      console.error('[webhook] Failed to send buyer confirmation email:', emailErr);
    }

    try {
      await sendAdminNotification({
        toEmail: buyerEmail,
        toName: `${buyerFirstName} ${buyerLastName}`.trim(),
        orderId,
        date,
        dedicationText: dedicationText || undefined,
        amountCents: pi.amount,
        paidAt: paidAt.toISOString(),
        buyerPhone: existing?.buyerPhone || pi.metadata.buyerPhone || undefined,
        stripePaymentIntentId: pi.id,
      });
    } catch (emailErr) {
      console.error('[webhook] Failed to send admin notification email:', emailErr);
    }
  }

  console.log(`[webhook] ✅ Order ${orderId} created for date ${date}`);
}

// ─── payment_intent.payment_failed ────────────────────────────────────────────

async function handlePaymentFailed(pi: Stripe.PaymentIntent): Promise<void> {
  const { calendarDayId } = pi.metadata;
  if (!calendarDayId) return;

  await prisma.$transaction(async (tx) => {
    const day = await tx.calendarDay.findUnique({ where: { id: calendarDayId } });
    if (!day || day.status !== 'CHECKOUT_HOLD') return;

    await tx.calendarDay.update({
      where: { id: day.id },
      data: {
        status: 'AVAILABLE',
        holdToken: null,
        holdExpiresAt: null,
        stripePaymentIntentId: null,
      },
    });

    await tx.auditLog.create({
      data: {
        calendarDayId: day.id,
        action: AUDIT_ACTIONS.CHECKOUT_HOLD_EXPIRED,
        oldValue: { status: 'CHECKOUT_HOLD' },
        newValue: { status: 'AVAILABLE' },
        performedBy: `stripe:${pi.id}`,
        notes: `Payment failed: ${pi.last_payment_error?.message || 'unknown reason'}`,
      },
    });
  });

  console.log(`[webhook] Hold released after payment failure for PI ${pi.id}`);
}

// ─── charge.refunded ──────────────────────────────────────────────────────────

async function handleChargeRefunded(charge: Stripe.Charge): Promise<void> {
  // This is informational — admin-initiated refunds are managed via the admin API
  // The webhook just logs it
  const piId = typeof charge.payment_intent === 'string'
    ? charge.payment_intent
    : charge.payment_intent?.id;

  if (!piId) return;

  const day = await prisma.calendarDay.findUnique({
    where: { stripePaymentIntentId: piId },
  });

  if (!day) return;

  await createAuditLog({
    calendarDayId: day.id,
    action: AUDIT_ACTIONS.REFUND_ISSUED,
    oldValue: { status: day.status },
    newValue: { refundedViaStripe: true },
    performedBy: `stripe:${piId}`,
    notes: `Charge refunded via Stripe. Amount: $${(charge.amount_refunded / 100).toFixed(2)}`,
  });

  console.log(`[webhook] Refund logged for day ${day.date.toISOString().split('T')[0]}`);
}
