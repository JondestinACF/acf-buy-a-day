/**
 * GET /api/admin/export
 * Exports sold and held days as CSV for calendar production.
 *
 * Query params:
 *   ?status=SOLD|ADMIN_HOLD (optional, default: all non-available)
 *   ?month=2027-03 (optional)
 */

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import { format } from 'date-fns';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const statusFilter = searchParams.get('status');
  const month = searchParams.get('month');

  const where: Record<string, unknown> = {
    status: statusFilter
      ? statusFilter
      : { in: ['SOLD', 'ADMIN_HOLD'] },
  };

  if (month) {
    const [year, mon] = month.split('-').map(Number);
    if (!isNaN(year) && !isNaN(mon)) {
      where.date = {
        gte: new Date(Date.UTC(year, mon - 1, 1)),
        lt: new Date(Date.UTC(year, mon, 1)),
      };
    }
  }

  const days = await prisma.calendarDay.findMany({
    where,
    orderBy: { date: 'asc' },
  });

  // Build CSV manually (no external dependency needed for this)
  const headers = [
    'date',
    'status',
    'dedication_text',
    'order_id',
    'buyer_first_name',
    'buyer_last_name',
    'buyer_email',
    'buyer_phone',
    'amount_usd',
    'stripe_payment_intent_id',
    'paid_at',
    'contact_opt_in',
    'admin_note',
  ];

  const rows = days.map((day) => [
    day.date.toISOString().split('T')[0],                   // date
    day.status,                                               // status
    day.dedicationText || '',                                 // dedication_text
    day.orderId || '',                                        // order_id
    day.buyerFirstName || '',                                 // buyer_first_name
    day.buyerLastName || '',                                  // buyer_last_name
    day.buyerEmail || '',                                     // buyer_email
    day.buyerPhone || '',                                     // buyer_phone
    day.amountPaidCents ? (day.amountPaidCents / 100).toFixed(2) : '', // amount_usd
    day.stripePaymentIntentId || '',                          // stripe_payment_intent_id
    day.paidAt ? day.paidAt.toISOString() : '',               // paid_at
    day.contactOptIn ? 'yes' : 'no',                          // contact_opt_in
    day.adminNote || '',                                      // admin_note
  ]);

  function csvEscape(value: string): string {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }

  const csvLines = [
    headers.join(','),
    ...rows.map((row) => row.map(csvEscape).join(',')),
  ];
  const csv = csvLines.join('\n');

  const filename = `acf-calendar-export-${format(new Date(), 'yyyy-MM-dd-HHmm')}.csv`;

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  });
}
