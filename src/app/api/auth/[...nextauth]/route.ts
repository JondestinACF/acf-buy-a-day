/**
 * src/app/api/auth/[...nextauth]/route.ts
 * NextAuth configuration with Credentials provider for admin login.
 */

import NextAuth, { type NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { adminLoginLimiter, getClientIp } from '@/lib/ratelimit';

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Email and password are required.');
        }

        // Rate limit by IP
        const ip = req?.headers?.['x-forwarded-for']?.split(',')[0]?.trim() || 'unknown';
        const limit = adminLoginLimiter.check(ip);
        if (!limit.allowed) {
          throw new Error('Too many login attempts. Please try again later.');
        }

        const user = await prisma.adminUser.findUnique({
          where: { email: credentials.email.toLowerCase() },
        });

        if (!user) {
          // Prevent timing attacks — still hash compare
          await bcrypt.compare(credentials.password, '$2a$12$invalid-hash-placeholder-data');
          throw new Error('Invalid email or password.');
        }

        const isValid = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!isValid) {
          throw new Error('Invalid email or password.');
        }

        // Update last login
        await prisma.adminUser.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        });

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        };
      },
    }),
  ],

  session: {
    strategy: 'jwt',
    maxAge: 8 * 60 * 60, // 8 hours
  },

  jwt: {
    maxAge: 8 * 60 * 60,
  },

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as { role?: string }).role || 'admin';
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as { role?: string; id?: string }).role = token.role as string;
        (session.user as { role?: string; id?: string }).id = token.id as string;
      }
      return session;
    },
  },

  pages: {
    signIn: '/admin/login',
    error: '/admin/login',
  },

  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
