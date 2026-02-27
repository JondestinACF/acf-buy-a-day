/**
 * PATCH /api/admin/days/[date]
 * Admin: edit dedication text for a sold day.
 * Records audit log with old and new value.
 *
 * Body: { dedicationText: string, reason?: string }
 */

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { validateCalendarDate, validateDedicationText, sanitizeDedicationText } from '@/lib/validation';
import { createAuditLog, AUDIT_ACTIONS } from '@/lib/auditLog';

export const dynamic = 'force-dynamic';

interface Params { params: { date: string } }

export async function PATCH(request: Request, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { date } = params;
  if (!validateCalendarDate(date)) {
    return NextResponse.json({ error: 'Invalid date' }, { status: 400 });
  }

  let body: { dedicationText?: string; reason?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  const { dedicationText = '', reason } = body;

  // Get current settings
  const settings = await prisma.adminSettings.findUnique({ where: { id: 'singleton' } });

  const validation = validateDedicationText(dedicationText, {
    required: false, // Admin can clear text
    emojisAllowed: settings?.emojisAllowed ?? true, // Admins get more flexibility
  });

  if (!validation.valid) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  const sanitized = sanitizeDedicationText(dedicationText);
  const dateObj = new Date(date + 'T00:00:00.000Z');

  try {
    const day = await prisma.calendarDay.findUnique({ where: { date: dateObj } });
    if (!day) return NextResponse.json({ error: 'Day not found' }, { status: 404 });

    if (day.status !== 'SOLD') {
      return NextResponse.json(
        { error: 'Can only edit dedication text for sold days.' },
        { status: 400 }
      );
    }

    const oldText = day.dedicationText;

    const updated = await prisma.calendarDay.update({
      where: { id: day.id },
      data: { dedicationText: sanitized || null },
    });

    await createAuditLog({
      calendarDayId: day.id,
      action: AUDIT_ACTIONS.TEXT_EDIT,
      oldValue: { dedicationText: oldText },
      newValue: { dedicationText: sanitized || null },
      performedBy: session.user?.email || 'admin',
      notes: reason || 'Admin edited dedication text',
    });

    return NextResponse.json({
      ok: true,
      date,
      dedicationText: updated.dedicationText,
    });
  } catch (error) {
    console.error('[admin/days/PATCH] Error:', error);
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
  }
}

// GET /api/admin/days/[date] — get single day with full info
export async function GET(request: Request, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { date } = params;
  if (!validateCalendarDate(date)) {
    return NextResponse.json({ error: 'Invalid date' }, { status: 400 });
  }

  const dateObj = new Date(date + 'T00:00:00.000Z');
  const day = await prisma.calendarDay.findUnique({
    where: { date: dateObj },
    include: {
      auditLogs: {
        orderBy: { createdAt: 'desc' },
        take: 20,
      },
    },
  });

  if (!day) return NextResponse.json({ error: 'Day not found' }, { status: 404 });

  return NextResponse.json({
    ...day,
    date: day.date.toISOString().split('T')[0],
    paidAt: day.paidAt?.toISOString(),
    holdExpiresAt: day.holdExpiresAt?.toISOString(),
    createdAt: day.createdAt.toISOString(),
    updatedAt: day.updatedAt.toISOString(),
    auditLogs: day.auditLogs.map((l) => ({
      ...l,
      createdAt: l.createdAt.toISOString(),
    })),
  });
}
