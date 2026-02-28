/**
 * GET /api/test-email
 * Temporary diagnostic — tests buyer confirmation email + checks webhook status.
 * DELETE THIS FILE after debugging.
 */

import { NextResponse } from 'next/server';
import { sendBuyerConfirmation } from '@/lib/email';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const email = url.searchParams.get('email') || 'jon@cellopartners.com';

  // Check recent SOLD days to see if webhook is working
  const recentSold = await prisma.calendarDay.findMany({
    where: { status: 'SOLD' },
    orderBy: { paidAt: 'desc' },
    take: 5,
    select: {
      date: true,
      orderId: true,
      buyerEmail: true,
      buyerFirstName: true,
      dedicationText: true,
      paidAt: true,
      stripePaymentIntentId: true,
      amountPaidCents: true,
    },
  });

  // Try sending a test buyer confirmation
  let emailResult: string;
  try {
    await sendBuyerConfirmation({
      toEmail: email,
      toName: 'Test User',
      orderId: 'TEST-001',
      date: '2027-05-15',
      dedicationText: 'Test Dedication',
      amountCents: 10000,
      paidAt: new Date().toISOString(),
    });
    emailResult = 'SUCCESS — check your inbox at ' + email;
  } catch (err) {
    emailResult = 'FAILED: ' + (err instanceof Error ? err.message : String(err));
  }

  return NextResponse.json({
    emailTest: emailResult,
    recentSoldDays: recentSold.map(d => ({
      date: d.date,
      orderId: d.orderId,
      buyerEmail: d.buyerEmail,
      buyerFirstName: d.buyerFirstName,
      dedication: d.dedicationText,
      paidAt: d.paidAt,
      hasStripePI: !!d.stripePaymentIntentId,
      amountCents: d.amountPaidCents,
    })),
  }, { status: 200 });
}
