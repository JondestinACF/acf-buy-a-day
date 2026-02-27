/**
 * GET /api/admin/audit-log
 * Returns audit log entries. Supports filtering by date, action, and calendarDayId.
 */

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const calendarDayId = searchParams.get('calendarDayId');
  const action = searchParams.get('action');
  const page = parseInt(searchParams.get('page') || '1');
  const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 200);
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {};
  if (calendarDayId) where.calendarDayId = calendarDayId;
  if (action) where.action = action;

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      include: {
        calendarDay: {
          select: { date: true },
        },
      },
    }),
    prisma.auditLog.count({ where }),
  ]);

  const formatted = logs.map((log) => ({
    id: log.id,
    calendarDayId: log.calendarDayId,
    date: log.calendarDay.date.toISOString().split('T')[0],
    action: log.action,
    oldValue: log.oldValue,
    newValue: log.newValue,
    performedBy: log.performedBy,
    ipAddress: log.ipAddress,
    notes: log.notes,
    createdAt: log.createdAt.toISOString(),
  }));

  return NextResponse.json({ logs: formatted, total, page, limit });
}
