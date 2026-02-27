/**
 * GET /api/calendar
 * Returns all 2027 calendar days with public-safe status info.
 * Expired checkout holds are automatically released here.
 *
 * Response: { days: PublicCalendarDay[] }
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { calendarLimiter, getClientIp } from '@/lib/ratelimit';
import { createAuditLog, AUDIT_ACTIONS } from '@/lib/auditLog';
import type { PublicCalendarDay } from '@/types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: Request) {
  // Rate limit
  const ip = getClientIp(request);
  const limit = calendarLimiter.check(ip);
  if (!limit.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  try {
    // Expire stale checkout holds atomically
    const now = new Date();
    const expiredHolds = await prisma.calendarDay.findMany({
      where: {
        status: 'CHECKOUT_HOLD',
        holdExpiresAt: { lt: now },
      },
    });

    if (expiredHolds.length > 0) {
      await prisma.$transaction(async (tx) => {
        for (const day of expiredHolds) {
          await tx.calendarDay.update({
            where: { id: day.id },
            data: {
              status: 'AVAILABLE',
              holdToken: null,
              holdExpiresAt: null,
            },
          });
          await tx.auditLog.create({
            data: {
              calendarDayId: day.id,
              action: AUDIT_ACTIONS.CHECKOUT_HOLD_EXPIRED,
              oldValue: { status: 'CHECKOUT_HOLD', holdToken: day.holdToken },
              newValue: { status: 'AVAILABLE' },
              performedBy: 'system',
              notes: 'Checkout hold expired automatically',
            },
          });
        }
      });
    }

    // Fetch all days for the calendar year
    const settings = await prisma.adminSettings.findUnique({ where: { id: 'singleton' } });
    const year = settings?.calendarYear ?? 2027;

    const start = new Date(Date.UTC(year, 0, 1));
    const end = new Date(Date.UTC(year + 1, 0, 1));

    const days = await prisma.calendarDay.findMany({
      where: {
        date: { gte: start, lt: end },
      },
      orderBy: { date: 'asc' },
      select: {
        id: true,
        date: true,
        status: true,
        dedicationText: true,
        holdExpiresAt: true,
      },
    });

    const publicDays: PublicCalendarDay[] = days.map((day) => ({
      id: day.id,
      date: day.date.toISOString().split('T')[0], // "2027-01-15"
      status: day.status as PublicCalendarDay['status'],
      // Only expose dedication text for sold days (shown on calendar)
      dedicationText: day.status === 'SOLD' ? (day.dedicationText ?? undefined) : undefined,
      holdExpiresAt: day.status === 'CHECKOUT_HOLD' ? day.holdExpiresAt?.toISOString() : undefined,
    }));

    // Check if sales are open
    const salesStatus = getSalesStatus(settings);

    return NextResponse.json({
      days: publicDays,
      salesStatus,
      priceInCents: settings?.priceInCents ?? 10000,
      year,
    });
  } catch (error) {
    console.error('[/api/calendar] Error:', error);
    return NextResponse.json({ error: 'Failed to load calendar' }, { status: 500 });
  }
}

function getSalesStatus(settings: {
  salesStartDate?: Date | null;
  salesEndDate?: Date | null;
} | null): 'open' | 'not_started' | 'ended' | 'unknown' {
  if (!settings) return 'unknown';
  const now = new Date();
  if (settings.salesStartDate && now < settings.salesStartDate) return 'not_started';
  if (settings.salesEndDate && now > settings.salesEndDate) return 'ended';
  return 'open';
}
