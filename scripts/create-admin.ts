/**
 * scripts/create-admin.ts
 * Interactive script to create the first admin user.
 * Run: npm run create-admin
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import * as readline from 'readline';

const prisma = new PrismaClient();

function prompt(question: string): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function main() {
  console.log('\n👤 Create ACF Admin User\n');

  const name = await prompt('Full name: ');
  const email = await prompt('Email address: ');
  const password = await prompt('Password (min 12 chars): ');

  if (password.length < 12) {
    console.error('❌ Password must be at least 12 characters.');
    process.exit(1);
  }

  const existing = await prisma.adminUser.findUnique({ where: { email } });
  if (existing) {
    console.error(`❌ Admin with email "${email}" already exists.`);
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const admin = await prisma.adminUser.create({
    data: { name, email, passwordHash, role: 'superadmin' },
  });

  console.log(`\n✅ Admin created!`);
  console.log(`   Name:  ${admin.name}`);
  console.log(`   Email: ${admin.email}`);
  console.log(`   Role:  ${admin.role}`);
  console.log(`\nYou can now log in at /admin/login\n`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
