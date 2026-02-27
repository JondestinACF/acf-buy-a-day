/**
 * src/lib/ratelimit.ts
 * Simple in-memory rate limiter for key API endpoints.
 * For production scale, swap this out for Upstash Redis.
 *
 * Usage:
 *   const limiter = getRateLimiter('checkout', 5, 60_000); // 5 req per minute
 *   const result = limiter.check(ip);
 *   if (!result.allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const stores = new Map<string, Map<string, RateLimitEntry>>();

// Auto-cleanup every 5 minutes to prevent memory leaks
setInterval(() => {
  const now = Date.now();
  for (const [storeName, store] of stores.entries()) {
    for (const [key, entry] of store.entries()) {
      if (now > entry.resetAt) store.delete(key);
    }
    if (store.size === 0) stores.delete(storeName);
  }
}, 5 * 60_000);

export function getRateLimiter(
  name: string,
  maxRequests: number,
  windowMs: number
) {
  if (!stores.has(name)) {
    stores.set(name, new Map());
  }
  const store = stores.get(name)!;

  return {
    check(key: string): { allowed: boolean; remaining: number; resetAt: number } {
      const now = Date.now();
      const entry = store.get(key);

      if (!entry || now > entry.resetAt) {
        store.set(key, { count: 1, resetAt: now + windowMs });
        return { allowed: true, remaining: maxRequests - 1, resetAt: now + windowMs };
      }

      if (entry.count >= maxRequests) {
        return { allowed: false, remaining: 0, resetAt: entry.resetAt };
      }

      entry.count++;
      return { allowed: true, remaining: maxRequests - entry.count, resetAt: entry.resetAt };
    },
  };
}

// Pre-configured rate limiters for each endpoint
export const calendarLimiter = getRateLimiter('calendar', 60, 60_000);       // 60/min
export const holdLimiter = getRateLimiter('hold', 10, 60_000);               // 10/min per IP
export const paymentIntentLimiter = getRateLimiter('payment', 5, 60_000);    // 5/min per IP
export const adminLoginLimiter = getRateLimiter('adminLogin', 10, 15 * 60_000); // 10 per 15min

/** Extract client IP from Next.js request headers */
export function getClientIp(request: Request): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  );
}
