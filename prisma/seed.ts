/**
 * prisma/seed.ts
 * Seeds the database with:
 *  - All 365 calendar days for 2027 (status: AVAILABLE)
 *  - Default admin settings (singleton row)
 *
 * Run: npm run db:seed
 */

import { PrismaClient, DayStatus } from '@prisma/client';
import { FEDERAL_HOLIDAYS_2027 } from '../scripts/block-holidays';

const prisma = new PrismaClient();

function generateDaysForYear(year: number): Date[] {
  const dates: Date[] = [];
  const start = new Date(Date.UTC(year, 0, 1)); // Jan 1
  const end = new Date(Date.UTC(year + 1, 0, 1)); // Jan 1 next year

  for (let d = new Date(start); d < end; d.setUTCDate(d.getUTCDate() + 1)) {
    dates.push(new Date(d));
  }
  return dates;
}

async function main() {
  const YEAR = 2027;
  console.log(`\n🌱 Seeding ${YEAR} calendar days...\n`);

  const dates = generateDaysForYear(YEAR);

  // Upsert all days — safe to re-run without duplicating
  let created = 0;
  let skipped = 0;

  for (const date of dates) {
    const result = await prisma.calendarDay.upsert({
      where: { date },
      update: {},  // Don't overwrite if it already has data
      create: {
        date,
        status: DayStatus.AVAILABLE,
      },
    });
    if (result.createdAt.getTime() === result.updatedAt.getTime()) {
      created++;
    } else {
      skipped++;
    }
  }

  console.log(`✅ Calendar days: ${created} created, ${skipped} already existed`);

  // Upsert admin settings singleton
  await prisma.adminSettings.upsert({
    where: { id: 'singleton' },
    update: {},
    create: {
      id: 'singleton',
      emojisAllowed: false,
      textRequired: false,
      priceInCents: 10000,
      calendarYear: YEAR,
      acfAdminEmail: process.env.ACF_ADMIN_EMAIL || 'admin@albanycf.org',
    },
  });

  console.log('✅ Admin settings initialized');

  // Block federal holidays
  console.log('\n🏛️  Blocking federal holidays...');
  for (const holiday of FEDERAL_HOLIDAYS_2027) {
    await prisma.calendarDay.updateMany({
      where: { date: holiday.date },
      data: {
        status: DayStatus.ADMIN_HOLD,
        adminNote: `Federal Holiday: ${holiday.name}`,
      },
    });
    console.log(`  ✅  ${holiday.date.toISOString().slice(0, 10)}  —  ${holiday.name}`);
  }

  console.log('\n✨ Seeding complete!\n');
  console.log('Next step: create an admin user with:');
  console.log('  npm run create-admin\n');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
