/**
 * POST /api/admin/refund
 * Process a Stripe refund and optionally restore the date to available.
 *
 * Body: { date: string, restoreDate: boolean, reason?: string }
 */

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { stripe } from '@/lib/stripe';
import { validateCalendarDate } from '@/lib/validation';
import { createAuditLog, AUDIT_ACTIONS } from '@/lib/auditLog';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: { date?: string; restoreDate?: boolean; reason?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  const { date, restoreDate = false, reason = 'Admin refund' } = body;

  if (!date || !validateCalendarDate(date)) {
    return NextResponse.json({ error: 'Invalid date' }, { status: 400 });
  }

  const dateObj = new Date(date + 'T00:00:00.000Z');

  try {
    const day = await prisma.calendarDay.findUnique({ where: { date: dateObj } });

    if (!day) return NextResponse.json({ error: 'Day not found' }, { status: 404 });
    if (day.status !== 'SOLD') {
      return NextResponse.json({ error: 'This date is not sold — cannot refund.' }, { status: 400 });
    }
    if (!day.stripePaymentIntentId) {
      return NextResponse.json({ error: 'No Stripe payment found for this date.' }, { status: 400 });
    }

    // Issue refund via Stripe
    const refund = await stripe.refunds.create({
      payment_intent: day.stripePaymentIntentId,
      reason: 'requested_by_customer',
      metadata: {
        adminEmail: session.user?.email || 'admin',
        reason,
        date,
        orderId: day.orderId || '',
      },
    });

    if (refund.status !== 'succeeded' && refund.status !== 'pending') {
      return NextResponse.json(
        { error: `Stripe refund failed: ${refund.status}` },
        { status: 500 }
      );
    }

    // Update day status
    const newStatus = restoreDate ? 'AVAILABLE' : 'ADMIN_HOLD';

    await prisma.$transaction(async (tx) => {
      await tx.calendarDay.update({
        where: { id: day.id },
        data: {
          status: newStatus,
          adminNote: restoreDate
            ? null
            : `Refunded on ${new Date().toISOString().split('T')[0]} — ${reason}`,
          // Keep buyer info for records
        },
      });

      await tx.auditLog.create({
        data: {
          calendarDayId: day.id,
          action: AUDIT_ACTIONS.REFUND_ISSUED,
          oldValue: { status: 'SOLD', orderId: day.orderId, amountPaidCents: day.amountPaidCents },
          newValue: { status: newStatus, stripeRefundId: refund.id, restored: restoreDate },
          performedBy: session.user?.email || 'admin',
          notes: `${reason}. Stripe refund ${refund.id}. Date ${restoreDate ? 'restored to available' : 'set to admin hold'}.`,
        },
      });
    });

    return NextResponse.json({
      ok: true,
      refundId: refund.id,
      refundStatus: refund.status,
      dateStatus: newStatus,
      amountRefunded: refund.amount,
    });
  } catch (error) {
    console.error('[admin/refund] Error:', error);
    const msg = error instanceof Error ? error.message : 'Refund failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
