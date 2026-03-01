/**
 * GET /api/debug-webhook
 * Temporary diagnostic endpoint to check webhook & email configuration.
 * DELETE THIS AFTER DEBUGGING.
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  // 1. Check environment variables
  const envCheck = {
    STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET
      ? `SET (starts with ${process.env.STRIPE_WEBHOOK_SECRET.substring(0, 10)}...)`
      : 'MISSING ❌',
    RESEND_API_KEY: process.env.RESEND_API_KEY ? 'SET ✅' : 'MISSING ❌',
    SMTP_FROM: process.env.SMTP_FROM || 'NOT SET (using fallback)',
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY
      ? `SET (starts with ${process.env.STRIPE_SECRET_KEY.substring(0, 7)}...)`
      : 'MISSING ❌',
    ACF_ADMIN_EMAIL: process.env.ACF_ADMIN_EMAIL || 'NOT SET (using default)',
  };

  // 2. Check recent calendar days
  const recentDays = await prisma.calendarDay.findMany({
    where: {
      status: { in: ['SOLD', 'CHECKOUT_HOLD'] },
    },
    orderBy: { updatedAt: 'desc' },
    take: 10,
    select: {
      date: true,
      status: true,
      orderId: true,
      buyerEmail: true,
      buyerFirstName: true,
      stripePaymentIntentId: true,
      paidAt: true,
      updatedAt: true,
      holdExpiresAt: true,
    },
  });

  // 3. Check audit logs for recent webhook activity
  const recentAuditLogs = await prisma.auditLog.findMany({
    where: {
      action: { in: ['PAYMENT_RECEIVED', 'CHECKOUT_HOLD_EXPIRED'] },
    },
    orderBy: { createdAt: 'desc' },
    take: 5,
    select: {
      action: true,
      performedBy: true,
      notes: true,
      createdAt: true,
    },
  });

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    environment: envCheck,
    recentDays: recentDays.map((d) => ({
      date: d.date.toISOString().split('T')[0],
      status: d.status,
      orderId: d.orderId,
      buyerEmail: d.buyerEmail,
      buyerName: d.buyerFirstName,
      stripePI: d.stripePaymentIntentId ? `${d.stripePaymentIntentId.substring(0, 15)}...` : null,
      paidAt: d.paidAt,
      updatedAt: d.updatedAt,
      holdExpiresAt: d.holdExpiresAt,
    })),
    recentWebhookActivity: recentAuditLogs,
    diagnosis: !process.env.STRIPE_WEBHOOK_SECRET
      ? '❌ STRIPE_WEBHOOK_SECRET is not set — webhook will reject all events'
      : !process.env.RESEND_API_KEY
      ? '❌ RESEND_API_KEY is not set — emails cannot be sent'
      : recentAuditLogs.length === 0
      ? '⚠️ No webhook activity found in audit logs — webhook may not be reaching the app'
      : '✅ Config looks OK — check the data below for details',
  });
}
