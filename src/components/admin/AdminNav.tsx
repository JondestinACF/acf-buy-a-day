'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';

const NAV_LINKS = [
  { href: '/admin', label: 'Dashboard', icon: '📊' },
  { href: '/admin/settings', label: 'Settings', icon: '⚙️' },
];

export default function AdminNav() {
  const pathname = usePathname();
  const { data: session } = useSession();

  return (
    <nav className="bg-acf-green-dark text-white w-64 flex-shrink-0 flex flex-col min-h-screen">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-green-900">
        <Link href="/admin" className="flex items-center gap-3 group">
          <div className="w-10 h-10 bg-acf-red rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-white font-black italic text-sm tracking-tight leading-none" style={{ fontStyle: 'italic' }}>acf</span>
          </div>
          <div>
            <p className="text-xs uppercase tracking-widest text-green-300 mb-0.5">Admin Panel</p>
            <p className="font-bold text-sm leading-tight">Buy a Day 2027</p>
          </div>
        </Link>
      </div>

      {/* Nav links */}
      <div className="flex-1 px-3 py-4">
        {NAV_LINKS.map(({ href, label, icon }) => (
          <Link
            key={href}
            href={href}
            className={[
              'flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 text-sm font-medium transition-colors',
              pathname === href
                ? 'bg-acf-green text-white'
                : 'text-green-200 hover:bg-green-900 hover:text-white',
            ].join(' ')}
          >
            <span>{icon}</span>
            {label}
          </Link>
        ))}
      </div>

      {/* User info + sign out */}
      <div className="px-4 py-4 border-t border-green-900">
        {session?.user && (
          <div className="mb-3">
            <p className="text-xs text-green-300 truncate">{session.user.email}</p>
            <p className="text-xs text-green-400 capitalize">{(session.user as { role?: string }).role ?? 'admin'}</p>
          </div>
        )}
        <button
          onClick={() => signOut({ callbackUrl: '/admin/login' })}
          className="w-full text-left text-xs text-green-300 hover:text-white transition-colors py-1"
        >
          Sign Out →
        </button>
        <Link
          href="/"
          className="block text-xs text-green-400 hover:text-green-200 transition-colors mt-1"
          target="_blank"
        >
          View Public Calendar ↗
        </Link>
      </div>
    </nav>
  );
}
