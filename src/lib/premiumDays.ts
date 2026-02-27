/**
 * src/lib/premiumDays.ts
 * Defines premium calendar days with special pricing.
 * Used on both client and server.
 */

// Premium days and their prices in cents
export const PREMIUM_DAYS: Record<string, number> = {
  '2027-02-14': 25000, // Valentine's Day     — $250
  '2027-05-09': 25000, // Mother's Day         — $250
  '2027-06-20': 25000, // Father's Day         — $250
  '2027-10-31': 25000, // Halloween            — $250
  '2027-12-24': 25000, // Christmas Eve        — $250
  '2027-12-31': 25000, // New Year's Eve       — $250
};

export const PREMIUM_DAY_NAMES: Record<string, string> = {
  '2027-02-14': "Valentine's Day",
  '2027-05-09': "Mother's Day",
  '2027-06-20': "Father's Day",
  '2027-10-31': 'Halloween',
  '2027-12-24': 'Christmas Eve',
  '2027-12-31': "New Year's Eve",
};

/** Returns the price in cents for a given date, falling back to the default. */
export function getPriceForDate(date: string, defaultPriceInCents: number): number {
  return PREMIUM_DAYS[date] ?? defaultPriceInCents;
}

/** Returns true if the date is a premium day. */
export function isPremiumDay(date: string): boolean {
  return date in PREMIUM_DAYS;
}
