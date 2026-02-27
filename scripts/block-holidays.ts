/**
 * scripts/block-holidays.ts
 * Marks all 2027 US federal holidays as ADMIN_HOLD so they cannot be purchased.
 *
 * Run: npm run block-holidays
 */

import { PrismaClient, DayStatus } from '@prisma/client';

const prisma = new PrismaClient();

// 2027 US Federal Holidays (month is 0-indexed for Date.UTC)
export const FEDERAL_HOLIDAYS_2027: { name: string; date: Date }[] = [
  { name: "New Year's Day",                      date: new Date(Date.UTC(2027,  0,  1)) },
  { name: 'Martin Luther King Jr. Day',           date: new Date(Date.UTC(2027,  0, 18)) },
  { name: "Presidents' Day",                      date: new Date(Date.UTC(2027,  1, 15)) },
  { name: 'Memorial Day',                         date: new Date(Date.UTC(2027,  4, 31)) },
  { name: 'Juneteenth National Independence Day', date: new Date(Date.UTC(2027,  5, 19)) },
  { name: 'Independence Day',                     date: new Date(Date.UTC(2027,  6,  4)) },
  { name: 'Labor Day',                            date: new Date(Date.UTC(2027,  8,  6)) },
  { name: 'Columbus Day',                         date: new Date(Date.UTC(2027,  9, 11)) },
  { name: 'Veterans Day',                         date: new Date(Date.UTC(2027, 10, 11)) },
  { name: 'Thanksgiving Day',                     date: new Date(Date.UTC(2027, 10, 25)) },
  { name: 'Christmas Day',                        date: new Date(Date.UTC(2027, 11, 25)) },
];

async function main() {
  console.log('\n🏛️  Blocking 2027 federal holidays...\n');

  for (const holiday of FEDERAL_HOLIDAYS_2027) {
    const updated = await prisma.calendarDay.updateMany({
      where: { date: holiday.date },
      data: {
        status: DayStatus.ADMIN_HOLD,
        adminNote: `Federal Holiday: ${holiday.name}`,
      },
    });

    if (updated.count > 0) {
      console.log(`  ✅  ${holiday.date.toISOString().slice(0, 10)}  —  ${holiday.name}`);
    } else {
      console.log(`  ⚠️   ${holiday.date.toISOString().slice(0, 10)}  —  ${holiday.name} (day not found — has db:seed been run?)`);
    }
  }

  console.log('\n✨ Done! All federal holidays are now blocked from purchase.\n');
}

main()
  .catch((e) => {
    console.error('Failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
