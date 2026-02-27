/**
 * GET /api/admin/settings — Retrieve admin settings
 * PATCH /api/admin/settings — Update admin settings
 */

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const settingsSchema = z.object({
  emojisAllowed: z.boolean().optional(),
  textRequired: z.boolean().optional(),
  priceInCents: z.number().min(100).max(1_000_000).optional(), // $1 – $10,000
  salesStartDate: z.string().datetime().nullable().optional(),
  salesEndDate: z.string().datetime().nullable().optional(),
  acfAdminEmail: z.string().email().optional(),
});

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const settings = await prisma.adminSettings.findUnique({ where: { id: 'singleton' } });
  if (!settings) return NextResponse.json({ error: 'Settings not found' }, { status: 404 });

  return NextResponse.json({
    ...settings,
    updatedAt: settings.updatedAt.toISOString(),
    salesStartDate: settings.salesStartDate?.toISOString() ?? null,
    salesEndDate: settings.salesEndDate?.toISOString() ?? null,
  });
}

export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  const result = settingsSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: 'Validation error', details: result.error.flatten() }, { status: 400 });
  }

  const data = result.data;

  const updated = await prisma.adminSettings.update({
    where: { id: 'singleton' },
    data: {
      ...(data.emojisAllowed !== undefined && { emojisAllowed: data.emojisAllowed }),
      ...(data.textRequired !== undefined && { textRequired: data.textRequired }),
      ...(data.priceInCents !== undefined && { priceInCents: data.priceInCents }),
      ...(data.salesStartDate !== undefined && {
        salesStartDate: data.salesStartDate ? new Date(data.salesStartDate) : null,
      }),
      ...(data.salesEndDate !== undefined && {
        salesEndDate: data.salesEndDate ? new Date(data.salesEndDate) : null,
      }),
      ...(data.acfAdminEmail !== undefined && { acfAdminEmail: data.acfAdminEmail }),
      updatedBy: session.user?.email || 'admin',
    },
  });

  return NextResponse.json({
    ok: true,
    settings: {
      ...updated,
      updatedAt: updated.updatedAt.toISOString(),
      salesStartDate: updated.salesStartDate?.toISOString() ?? null,
      salesEndDate: updated.salesEndDate?.toISOString() ?? null,
    },
  });
}
