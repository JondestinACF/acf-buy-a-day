/**
 * POST /api/admin/holds — Create an admin hold on a date
 * DELETE /api/admin/holds — Release an admin hold
 *
 * Body (POST): { date: string, note?: string }
 * Body (DELETE): { date: string }
 */

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { validateCalendarDate } from '@/lib/validation';
import { createAuditLog, AUDIT_ACTIONS } from '@/lib/auditLog';

export const dynamic = 'force-dynamic';

// POST — Create hold
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: { date?: string; note?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  const { date, note } = body;
  if (!date || !validateCalendarDate(date)) {
    return NextResponse.json({ error: 'Invalid date' }, { status: 400 });
  }

  const dateObj = new Date(date + 'T00:00:00.000Z');

  try {
    const result = await prisma.$transaction(async (tx) => {
      const day = await tx.calendarDay.findUnique({ where: { date: dateObj } });
      if (!day) throw new Error('NOT_FOUND');

      if (day.status === 'SOLD') throw new Error('ALREADY_SOLD');
      if (day.status === 'ADMIN_HOLD') throw new Error('ALREADY_HELD');

      const prevStatus = day.status;

      const updated = await tx.calendarDay.update({
        where: { id: day.id },
        data: {
          status: 'ADMIN_HOLD',
          adminNote: note || null,
          // Clear any stale checkout holds
          holdToken: null,
          holdExpiresAt: null,
        },
      });

      await tx.auditLog.create({
        data: {
          calendarDayId: day.id,
          action: AUDIT_ACTIONS.HOLD_CREATED,
          oldValue: { status: prevStatus },
          newValue: { status: 'ADMIN_HOLD', adminNote: note },
          performedBy: session.user?.email || 'admin',
          notes: note || 'Admin hold created',
        },
      });

      return updated;
    });

    return NextResponse.json({
      ok: true,
      date,
      status: result.status,
      adminNote: result.adminNote,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'unknown';
    if (msg === 'NOT_FOUND') return NextResponse.json({ error: 'Day not found' }, { status: 404 });
    if (msg === 'ALREADY_SOLD') return NextResponse.json({ error: 'This date is already sold and cannot be held.' }, { status: 409 });
    if (msg === 'ALREADY_HELD') return NextResponse.json({ error: 'This date is already on admin hold.' }, { status: 409 });

    console.error('[admin/holds POST] Error:', error);
    return NextResponse.json({ error: 'Failed to create hold' }, { status: 500 });
  }
}

// DELETE — Release hold
export async function DELETE(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: { date?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  const { date } = body;
  if (!date || !validateCalendarDate(date)) {
    return NextResponse.json({ error: 'Invalid date' }, { status: 400 });
  }

  const dateObj = new Date(date + 'T00:00:00.000Z');

  try {
    await prisma.$transaction(async (tx) => {
      const day = await tx.calendarDay.findUnique({ where: { date: dateObj } });
      if (!day) throw new Error('NOT_FOUND');
      if (day.status !== 'ADMIN_HOLD') throw new Error('NOT_HELD');

      await tx.calendarDay.update({
        where: { id: day.id },
        data: { status: 'AVAILABLE', adminNote: null },
      });

      await tx.auditLog.create({
        data: {
          calendarDayId: day.id,
          action: AUDIT_ACTIONS.HOLD_RELEASED,
          oldValue: { status: 'ADMIN_HOLD', adminNote: day.adminNote },
          newValue: { status: 'AVAILABLE' },
          performedBy: session.user?.email || 'admin',
          notes: 'Admin hold released',
        },
      });
    });

    return NextResponse.json({ ok: true, date });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'unknown';
    if (msg === 'NOT_FOUND') return NextResponse.json({ error: 'Day not found' }, { status: 404 });
    if (msg === 'NOT_HELD') return NextResponse.json({ error: 'This date is not on admin hold.' }, { status: 409 });

    console.error('[admin/holds DELETE] Error:', error);
    return NextResponse.json({ error: 'Failed to release hold' }, { status: 500 });
  }
}
