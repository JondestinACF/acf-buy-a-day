/**
 * src/types/index.ts
 * Shared TypeScript types used across the application.
 */

// ─── Day Status ───────────────────────────────────────────────────────────────

export type DayStatus = 'AVAILABLE' | 'CHECKOUT_HOLD' | 'SOLD' | 'ADMIN_HOLD';

// ─── Public Calendar Day ──────────────────────────────────────────────────────

/** Safe, public-facing representation of a calendar day (no PII). */
export interface PublicCalendarDay {
  id: string;
  date: string;            // ISO date string: "2027-01-15"
  status: DayStatus;
  dedicationText?: string; // Only present for SOLD days (for display)
  holdExpiresAt?: string;  // ISO string — only if CHECKOUT_HOLD
}

// ─── Admin Calendar Day ───────────────────────────────────────────────────────

/** Full admin representation including buyer PII. */
export interface AdminCalendarDay {
  id: string;
  date: string;
  status: DayStatus;
  dedicationText?: string;
  buyerFirstName?: string;
  buyerLastName?: string;
  buyerEmail?: string;
  buyerPhone?: string;
  billingAddress?: BillingAddress;
  contactOptIn: boolean;
  stripePaymentIntentId?: string;
  orderId?: string;
  amountPaidCents?: number;
  paidAt?: string;
  holdToken?: string;
  holdExpiresAt?: string;
  adminNote?: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Billing Address ──────────────────────────────────────────────────────────

export interface BillingAddress {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
}

// ─── Checkout Flow ────────────────────────────────────────────────────────────

export interface CheckoutSession {
  date: string;        // "2027-01-15"
  holdToken: string;   // UUID issued by hold endpoint
  holdExpiresAt: string;
}

export interface BuyerFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  billingAddress: BillingAddress;
  contactOptIn: boolean;
  dedicationText: string;
}

// ─── Order Confirmation ───────────────────────────────────────────────────────

export interface OrderConfirmation {
  orderId: string;
  date: string;
  dedicationText?: string;
  buyerName: string;
  buyerEmail: string;
  amountPaidCents: number;
  paidAt: string;
}

// ─── Admin Settings ───────────────────────────────────────────────────────────

export interface Settings {
  emojisAllowed: boolean;
  textRequired: boolean;
  priceInCents: number;
  calendarYear: number;
  salesStartDate?: string;
  salesEndDate?: string;
  acfAdminEmail: string;
}

// ─── Audit Log ────────────────────────────────────────────────────────────────

export interface AuditLogEntry {
  id: string;
  calendarDayId: string;
  date: string;          // Denormalized for easier display
  action: string;
  oldValue?: Record<string, unknown>;
  newValue?: Record<string, unknown>;
  performedBy: string;
  ipAddress?: string;
  notes?: string;
  createdAt: string;
}

// ─── API Responses ────────────────────────────────────────────────────────────

export interface ApiError {
  error: string;
  details?: string;
}

export interface HoldResponse {
  holdToken: string;
  holdExpiresAt: string;
  date: string;
}

export interface PaymentIntentResponse {
  clientSecret: string;
  paymentIntentId: string;
  amountCents: number;
}
