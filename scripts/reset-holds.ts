/**
 * scripts/reset-holds.ts
 * Resets all stuck CHECKOUT_HOLD days back to AVAILABLE.
 * Run this any time you need to clear test holds instantly.
 *
 * Run: npm run reset-holds
 */

import { PrismaClient, DayStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const result = await prisma.calendarDay.updateMany({
    where: { status: DayStatus.CHECKOUT_HOLD },
    data: {
      status: DayStatus.AVAILABLE,
      holdToken: null,
      holdExpiresAt: null,
    },
  });
  console.log(`\n✅ Reset ${result.count} stuck checkout hold(s) back to AVAILABLE.\n`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => await prisma.$disconnect());
