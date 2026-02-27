/**
 * src/lib/validation.ts
 * Shared validation logic for dedication text and form fields.
 * Used on both client and server to prevent bypassing.
 */

import { z } from 'zod';

// ─── Constants ─────────────────────────────────────────────────────────────────

export const MAX_DEDICATION_LENGTH = 26;
export const CALENDAR_YEAR = 2027;

// Regex: letters, numbers, spaces, basic punctuation — NO emojis by default
// Emojis are blocked unless admin enables them globally
const ALLOWED_CHARS_NO_EMOJI = /^[a-zA-Z0-9 !@#&()\-_'".,:;?+=%*]+$/;
const ALLOWED_CHARS_WITH_EMOJI = /^[\p{L}\p{N}\p{P}\p{Z}\p{S}]+$/u;

// Emoji detection regex
const EMOJI_REGEX =
  /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{FE00}-\u{FE0F}]|[\u{1F000}-\u{1FFFF}]/u;

// ─── Dedication Text Validation ────────────────────────────────────────────────

export interface DedicationValidationResult {
  valid: boolean;
  error?: string;
}

export function validateDedicationText(
  text: string,
  options: { required: boolean; emojisAllowed: boolean }
): DedicationValidationResult {
  // Empty is OK if not required
  if (!text || text.trim() === '') {
    if (options.required) {
      return { valid: false, error: 'Dedication text is required.' };
    }
    return { valid: true };
  }

  if (text.length > MAX_DEDICATION_LENGTH) {
    return {
      valid: false,
      error: `Dedication text must be ${MAX_DEDICATION_LENGTH} characters or fewer.`,
    };
  }

  if (!options.emojisAllowed && EMOJI_REGEX.test(text)) {
    return {
      valid: false,
      error: 'Emojis are not allowed in dedication text.',
    };
  }

  const pattern = options.emojisAllowed
    ? ALLOWED_CHARS_WITH_EMOJI
    : ALLOWED_CHARS_NO_EMOJI;

  if (!pattern.test(text)) {
    return {
      valid: false,
      error:
        'Dedication text contains invalid characters. Use letters, numbers, and basic punctuation only.',
    };
  }

  return { valid: true };
}

// ─── Checkout Form Validation (Zod) ───────────────────────────────────────────

export const billingAddressSchema = z.object({
  line1: z.string().min(1, 'Address is required').max(100),
  line2: z.string().max(100).optional(),
  city: z.string().min(1, 'City is required').max(60),
  state: z.string().min(2, 'State is required').max(50),
  postal_code: z.string().min(3, 'Postal code is required').max(20),
  country: z.string().length(2, 'Use 2-letter country code (e.g. US)').default('US'),
});

export const buyerInfoSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(50),
  lastName: z.string().min(1, 'Last name is required').max(50),
  email: z.string().email('Valid email is required').max(100),
  phone: z
    .string()
    .regex(/^[\d\s\-+().]*$/, 'Invalid phone number format')
    .max(20)
    .optional()
    .or(z.literal('')),
  billingAddress: billingAddressSchema,
  contactOptIn: z.boolean().default(false),
  dedicationText: z.string().max(MAX_DEDICATION_LENGTH).default(''),
});

export type BuyerInfoInput = z.infer<typeof buyerInfoSchema>;

// ─── Date Validation ───────────────────────────────────────────────────────────

/** Validates a date string is a valid 2027 calendar date. */
export function validateCalendarDate(dateStr: string): boolean {
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;

  const [year, month, day] = dateStr.split('-').map(Number);
  if (year !== CALENDAR_YEAR) return false;
  if (month < 1 || month > 12) return false;

  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

// ─── Sanitization ─────────────────────────────────────────────────────────────

/** Strip leading/trailing whitespace and collapse internal whitespace. */
export function sanitizeDedicationText(text: string): string {
  return text.trim().replace(/\s+/g, ' ');
}
