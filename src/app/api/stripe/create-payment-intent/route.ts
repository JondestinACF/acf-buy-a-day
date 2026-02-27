/**
 * POST /api/stripe/create-payment-intent
 * Creates a Stripe PaymentIntent after verifying a valid checkout hold.
 * Stores buyer info in metadata for the webhook to use.
 *
 * Body: BuyerFormData + { date, holdToken }
 * Response: { clientSecret, paymentIntentId, amountCents }
 */

import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { prisma } from '@/lib/prisma';
import { buyerInfoSchema, validateCalendarDate, validateDedicationText, sanitizeDedicationText } from '@/lib/validation';
import { paymentIntentLimiter, getClientIp } from '@/lib/ratelimit';
import type { PaymentIntentResponse } from '@/types';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  // Rate limit
  const ip = getClientIp(request);
  const limit = paymentIntentLimiter.check(ip);
  if (!limit.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { date, holdToken, ...formData } = body as {
    date?: string;
    holdToken?: string;
    [key: string]: unknown;
  };

  // Validate date
  if (!date || !validateCalendarDate(date)) {
    return NextResponse.json({ error: 'Invalid date' }, { status: 400 });
  }
  if (!holdToken) {
    return NextResponse.json({ error: 'Missing hold token' }, { status: 400 });
  }

  // Validate buyer info
  const parseResult = buyerInfoSchema.safeParse(formData);
  if (!parseResult.success) {
    return NextResponse.json(
      { error: 'Invalid form data', details: parseResult.error.flatten() },
      { status: 400 }
    );
  }

  const buyerData = parseResult.data;

  // Get admin settings
  const settings = await prisma.adminSettings.findUnique({ where: { id: 'singleton' } });
  const priceInCents = settings?.priceInCents ?? 10000;

  // Validate dedication text with current settings
  const dedicationValidation = validateDedicationText(
    buyerData.dedicationText || '',
    {
      required: settings?.textRequired ?? false,
      emojisAllowed: settings?.emojisAllowed ?? false,
    }
  );
  if (!dedicationValidation.valid) {
    return NextResponse.json({ error: dedicationValidation.error }, { status: 400 });
  }

  const dedicationText = sanitizeDedicationText(buyerData.dedicationText || '');
  const dateObj = new Date(date + 'T00:00:00.000Z');

  try {
    // Verify hold is still valid — check in a transaction
    const day = await prisma.$transaction(async (tx) => {
      const day = await tx.calendarDay.findUnique({ where: { date: dateObj } });

      if (!day) throw new Error('DATE_NOT_FOUND');
      if (day.status !== 'CHECKOUT_HOLD') throw new Error(`INVALID_STATUS:${day.status}`);
      if (day.holdToken !== holdToken) throw new Error('INVALID_HOLD_TOKEN');
      if (day.holdExpiresAt && day.holdExpiresAt < new Date()) throw new Error('HOLD_EXPIRED');

      return day;
    });

    // Create Stripe PaymentIntent with buyer metadata
    // Note: actual buyer data stored in metadata is for webhook recovery only
    // Do NOT store card data
    const paymentIntent = await stripe.paymentIntents.create({
      amount: priceInCents,
      currency: 'usd',
      payment_method_types: ['card'],
      metadata: {
        date,
        holdToken,
        calendarDayId: day.id,
        buyerEmail: buyerData.email,
        buyerFirstName: buyerData.firstName,
        buyerLastName: buyerData.lastName,
        buyerPhone: buyerData.phone || '',
        dedicationText,
        contactOptIn: String(buyerData.contactOptIn),
        billingAddress: JSON.stringify(buyerData.billingAddress),
        appVersion: '1.0',
      },
      receipt_email: buyerData.email,
      description: `ACF 2027 Calendar — ${date}${dedicationText ? ` — "${dedicationText}"` : ''}`,
    }, {
      idempotencyKey: `acf-2027-pi-${date}-${holdToken}`,
    });

    // Store the payment intent ID on the day record for webhook correlation
    await prisma.calendarDay.update({
      where: { id: day.id },
      data: {
        stripePaymentIntentId: paymentIntent.id,
        // Pre-populate buyer info so webhook has it if metadata lookup fails
        buyerFirstName: buyerData.firstName,
        buyerLastName: buyerData.lastName,
        buyerEmail: buyerData.email,
        buyerPhone: buyerData.phone || null,
        billingAddress: buyerData.billingAddress,
        contactOptIn: buyerData.contactOptIn,
        dedicationText: dedicationText || null,
      },
    });

    const response: PaymentIntentResponse = {
      clientSecret: paymentIntent.client_secret!,
      paymentIntentId: paymentIntent.id,
      amountCents: priceInCents,
    };

    return NextResponse.json(response);
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'unknown';

    if (msg === 'DATE_NOT_FOUND') {
      return NextResponse.json({ error: 'Date not found' }, { status: 404 });
    }
    if (msg.startsWith('INVALID_STATUS')) {
      return NextResponse.json(
        { error: 'This date is no longer on hold. Please start over.' },
        { status: 409 }
      );
    }
    if (msg === 'INVALID_HOLD_TOKEN') {
      return NextResponse.json(
        { error: 'Your hold token is invalid. Please start over.' },
        { status: 403 }
      );
    }
    if (msg === 'HOLD_EXPIRED') {
      return NextResponse.json(
        { error: 'Your checkout session has expired. Please select the date again.' },
        { status: 410 }
      );
    }

    const errMsg = error instanceof Error ? error.message : String(error);
    console.error('[/api/stripe/create-payment-intent] Error:', errMsg);
    return NextResponse.json({ error: errMsg }, { status: 500 });
  }
}
