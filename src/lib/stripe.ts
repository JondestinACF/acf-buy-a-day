/**
 * src/lib/stripe.ts
 * Stripe client instances for server and client side.
 */

import Stripe from 'stripe';

// Server-side Stripe client (secret key)
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
  typescript: true,
});

// Helper: format cents as dollars string (e.g., 10000 → "$100.00")
export function formatPrice(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(cents / 100);
}

// Helper: verify Stripe webhook signature and parse event
export function constructWebhookEvent(
  body: string | Buffer,
  signature: string,
  secret: string
): Stripe.Event {
  return stripe.webhooks.constructEvent(body, signature, secret);
}
