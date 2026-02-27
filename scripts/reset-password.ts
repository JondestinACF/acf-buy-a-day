/**
 * scripts/reset-password.ts
 * Resets the password for an existing admin user.
 * Run: npm run reset-password
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import * as readline from 'readline';

const prisma = new PrismaClient();

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (q: string): Promise<string> => new Promise((res) => rl.question(q, res));

async function main() {
  const email = await ask('Email address: ');
  const password = await ask('New password (min 12 chars): ');

  if (password.length < 12) {
    console.log('❌ Password must be at least 12 characters.');
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const updated = await prisma.adminUser.update({
    where: { email: email.toLowerCase() },
    data: { passwordHash },
  });

  console.log(`\n✅ Password updated for ${updated.email}`);
}

main()
  .catch((e) => { console.error('❌ Failed:', e.message); process.exit(1); })
  .finally(async () => { rl.close(); await prisma.$disconnect(); });
