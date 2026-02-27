/**
 * POST /api/checkout/hold
 * Creates a 10-minute checkout hold on a specific date.
 * Concurrency-safe: uses a Prisma transaction with conditional update.
 *
 * Body: { date: "2027-03-15" }
 * Response: { holdToken, holdExpiresAt, date }
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateHoldToken } from '@/lib/orderNumber';
import { createAuditLog, AUDIT_ACTIONS } from '@/lib/auditLog';
import { validateCalendarDate } from '@/lib/validation';
import { holdLimiter, getClientIp } from '@/lib/ratelimit';
import type { HoldResponse } from '@/types';

export const dynamic = 'force-dynamic';

const HOLD_DURATION_MS = 10 * 60 * 1000; // 10 minutes

export async function POST(request: Request) {
  // Rate limit
  const ip = getClientIp(request);
  const limit = holdLimiter.check(ip);
  if (!limit.allowed) {
    return NextResponse.json({ error: 'Too many requests. Please slow down.' }, { status: 429 });
  }

  let body: { date?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { date } = body;

  if (!date || !validateCalendarDate(date)) {
    return NextResponse.json({ error: 'Invalid or missing date' }, { status: 400 });
  }

  // Check if sales are open
  const settings = await prisma.adminSettings.findUnique({ where: { id: 'singleton' } });
  const now = new Date();
  if (settings?.salesStartDate && now < settings.salesStartDate) {
    return NextResponse.json({ error: 'Sales have not started yet' }, { status: 403 });
  }
  if (settings?.salesEndDate && now > settings.salesEndDate) {
    return NextResponse.json({ error: 'Sales have ended' }, { status: 403 });
  }

  const dateObj = new Date(date + 'T00:00:00.000Z');
  const holdToken = generateHoldToken();
  const holdExpiresAt = new Date(Date.now() + HOLD_DURATION_MS);

  try {
    // Atomic: only update if status is AVAILABLE
    // If the date is CHECKOUT_HOLD but expired, treat as available
    const result = await prisma.$transaction(async (tx) => {
      const day = await tx.calendarDay.findUnique({
        where: { date: dateObj },
      });

      if (!day) {
        throw new Error('DATE_NOT_FOUND');
      }

      // Allow hold if AVAILABLE, or if CHECKOUT_HOLD but expired
      const canHold =
        day.status === 'AVAILABLE' ||
        (day.status === 'CHECKOUT_HOLD' && day.holdExpiresAt && day.holdExpiresAt < now);

      if (!canHold) {
        throw new Error(`DATE_UNAVAILABLE:${day.status}`);
      }

      const updated = await tx.calendarDay.update({
        where: { id: day.id },
        data: {
          status: 'CHECKOUT_HOLD',
          holdToken,
          holdExpiresAt,
        },
      });

      await tx.auditLog.create({
        data: {
          calendarDayId: day.id,
          action: AUDIT_ACTIONS.CHECKOUT_HOLD_CREATED,
          oldValue: { status: day.status },
          newValue: { status: 'CHECKOUT_HOLD', holdExpiresAt: holdExpiresAt.toISOString() },
          performedBy: `customer-ip:${ip}`,
          ipAddress: ip,
        },
      });

      return updated;
    });

    const response: HoldResponse = {
      holdToken,
      holdExpiresAt: holdExpiresAt.toISOString(),
      date,
    };

    return NextResponse.json(response);
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'unknown';

    if (msg === 'DATE_NOT_FOUND') {
      return NextResponse.json({ error: 'Date not found' }, { status: 404 });
    }
    if (msg.startsWith('DATE_UNAVAILABLE')) {
      const status = msg.split(':')[1];
      return NextResponse.json(
        { error: 'This date is no longer available', status },
        { status: 409 }
      );
    }

    console.error('[/api/checkout/hold] Error:', error);
    return NextResponse.json({ error: 'Failed to hold date' }, { status: 500 });
  }
}

// DELETE /api/checkout/hold — release a hold by token
export async function DELETE(request: Request) {
  let body: { date?: string; holdToken?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { date, holdToken } = body;
  if (!date || !holdToken || !validateCalendarDate(date)) {
    return NextResponse.json({ error: 'Missing date or holdToken' }, { status: 400 });
  }

  const dateObj = new Date(date + 'T00:00:00.000Z');

  try {
    await prisma.$transaction(async (tx) => {
      const day = await tx.calendarDay.findUnique({ where: { date: dateObj } });

      if (!day || day.status !== 'CHECKOUT_HOLD' || day.holdToken !== holdToken) {
        return; // Already released or different token — no-op
      }

      await tx.calendarDay.update({
        where: { id: day.id },
        data: { status: 'AVAILABLE', holdToken: null, holdExpiresAt: null },
      });

      await tx.auditLog.create({
        data: {
          calendarDayId: day.id,
          action: AUDIT_ACTIONS.CHECKOUT_HOLD_EXPIRED,
          oldValue: { status: 'CHECKOUT_HOLD' },
          newValue: { status: 'AVAILABLE' },
          performedBy: 'customer',
          notes: 'Hold released by customer (navigated away)',
        },
      });
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[/api/checkout/hold DELETE] Error:', error);
    return NextResponse.json({ error: 'Failed to release hold' }, { status: 500 });
  }
}
