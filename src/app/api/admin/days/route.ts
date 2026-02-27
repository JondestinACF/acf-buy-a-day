/**
 * GET /api/admin/days
 * Returns all calendar days with full info for admin dashboard.
 * Supports filtering by month (query: ?month=2027-03) and status.
 */

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const month = searchParams.get('month'); // "2027-03"
  const status = searchParams.get('status'); // "SOLD" | "ADMIN_HOLD" | etc.
  const page = parseInt(searchParams.get('page') || '1');
  const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 200);
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {};

  if (month) {
    const [year, mon] = month.split('-').map(Number);
    if (!isNaN(year) && !isNaN(mon)) {
      where.date = {
        gte: new Date(Date.UTC(year, mon - 1, 1)),
        lt: new Date(Date.UTC(year, mon, 1)),
      };
    }
  }

  if (status) {
    where.status = status;
  }

  const [days, total] = await Promise.all([
    prisma.calendarDay.findMany({
      where,
      orderBy: { date: 'asc' },
      skip,
      take: limit,
    }),
    prisma.calendarDay.count({ where }),
  ]);

  const formatted = days.map((day) => ({
    ...day,
    date: day.date.toISOString().split('T')[0],
    paidAt: day.paidAt?.toISOString(),
    holdExpiresAt: day.holdExpiresAt?.toISOString(),
    createdAt: day.createdAt.toISOString(),
    updatedAt: day.updatedAt.toISOString(),
  }));

  return NextResponse.json({ days: formatted, total, page, limit });
}
