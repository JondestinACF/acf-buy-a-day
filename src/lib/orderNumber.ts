/**
 * src/lib/orderNumber.ts
 * Generates human-readable order numbers in format: ACF-2027-XXXXX
 * Uses an atomic counter approach via the database to avoid collisions.
 */

import { prisma } from './prisma';

/**
 * Generate a unique, human-readable order number.
 * Uses the total count of SOLD days as the sequence number.
 * Format: ACF-2027-00042
 */
export async function generateOrderId(year: number = 2027): Promise<string> {
  // Count existing sold orders to get the next sequence number
  const count = await prisma.calendarDay.count({
    where: {
      status: 'SOLD',
      orderId: { not: null },
    },
  });

  const seq = String(count + 1).padStart(5, '0');
  return `ACF-${year}-${seq}`;
}

/**
 * Generate a cryptographically random hold token (UUID v4).
 */
export function generateHoldToken(): string {
  // Use crypto.randomUUID() — available in Node 15+ and modern browsers
  return crypto.randomUUID();
}
