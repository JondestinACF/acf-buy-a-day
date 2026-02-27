/**
 * scripts/block-first-mondays.ts
 * Marks the first Monday of every month in 2027 as ADMIN_HOLD
 * so they cannot be purchased.
 *
 * Run: npm run block-first-mondays
 */

import { PrismaClient, DayStatus } from '@prisma/client';

const prisma = new PrismaClient();

function getFirstMonday(year: number, month: number): Date {
  // month is 0-indexed (0 = January)
  const date = new Date(Date.UTC(year, month, 1));
  // getUTCDay(): 0=Sun, 1=Mon, 2=Tue, ...
  const dayOfWeek = date.getUTCDay();
  const daysUntilMonday = dayOfWeek === 1 ? 0 : (8 - dayOfWeek) % 7;
  date.setUTCDate(1 + daysUntilMonday);
  return date;
}

async function main() {
  const firstMondays: { label: string; date: Date }[] = [];

  for (let month = 0; month < 12; month++) {
    const date = getFirstMonday(2027, month);
    const label = date.toLocaleDateString('en-US', {
      timeZone: 'UTC',
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    firstMondays.push({ label, date });
  }

  console.log('\n📅  Blocking first Mondays of every month in 2027...\n');

  for (const { label, date } of firstMondays) {
    const updated = await prisma.calendarDay.updateMany({
      where: { date },
      data: {
        status: DayStatus.SOLD,
        adminNote: 'First Monday of month — reserved',
      },
    });

    if (updated.count > 0) {
      console.log(`  ✅  ${date.toISOString().slice(0, 10)}  —  ${label}`);
    } else {
      console.log(`  ⚠️   ${date.toISOString().slice(0, 10)}  —  ${label} (not found — has db:seed been run?)`);
    }
  }

  console.log('\n✨ Done! All first Mondays are now blocked from purchase.\n');
}

main()
  .catch((e) => {
    console.error('Failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
