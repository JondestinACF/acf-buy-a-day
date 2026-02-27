/**
 * src/middleware.ts
 * Protects /admin routes — redirects to /admin/login if not authenticated.
 * Also adds security headers to all responses.
 */

import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export default withAuth(
  function middleware(req: NextRequest) {
    const response = NextResponse.next();

    // Security headers
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('X-XSS-Protection', '1; mode=block');
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    response.headers.set(
      'Permissions-Policy',
      'camera=(), microphone=(), geolocation=()'
    );

    return response;
  },
  {
    callbacks: {
      authorized({ token, req }) {
        // Only protect /admin routes (not /admin/login or /api/auth)
        if (req.nextUrl.pathname.startsWith('/admin')) {
          return !!token;
        }
        // Also protect admin API routes
        if (req.nextUrl.pathname.startsWith('/api/admin')) {
          return !!token;
        }
        return true;
      },
    },
    pages: {
      signIn: '/admin/login',
    },
  }
);

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
};
