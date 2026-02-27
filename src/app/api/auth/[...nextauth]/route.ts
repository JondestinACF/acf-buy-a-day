/**
 * src/app/api/auth/[...nextauth]/route.ts
 * NextAuth route handler — authOptions live in src/lib/auth.ts
 */

import NextAuth from 'next-auth';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
