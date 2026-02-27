'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import type { PublicCalendarDay } from '@/types';

const Calendar = dynamic(() => import('@/components/Calendar'), { ssr: false });
const CheckoutFlow = dynamic(() => import('@/components/Checkout'), { ssr: false });

export default function HomePage() {
  const [selectedDay, setSelectedDay] = useState<PublicCalendarDay | null>(null);
  const [showCheckout, setShowCheckout] = useState(false);
  const [priceInCents] = useState(10000);

  const handleSelectDay = (day: PublicCalendarDay) => {
    if (day.status !== 'AVAILABLE') return;
    setSelectedDay(day);
    setShowCheckout(true);
  };

  const handleCloseCheckout = () => {
    setShowCheckout(false);
    setSelectedDay(null);
  };

  return (
    <main className="min-h-screen bg-white">

      {/* ── Hero Section (blue) ──────────────────────────────────────────── */}
      <section className="bg-acf-blue py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <div className="inline-flex items-center gap-2 bg-acf-red text-white px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest mb-6">
            <span>📅</span> Buy a Day — 2027
          </div>

          <h1 className="text-4xl sm:text-5xl font-extrabold text-white mb-5 leading-tight">
            Dedicate a Day on the<br />
            <span className="text-acf-blue-light">2027 ACF Community Calendar</span>
          </h1>

          <p className="text-blue-100 text-lg max-w-2xl mx-auto leading-relaxed mb-10">
            Choose any available date and honor a birthday, anniversary, memorial, or milestone
            — while directly supporting ACF grants and programs that strengthen our community.
          </p>

          {/* Price badge */}
          <div className="inline-flex items-center gap-4 bg-white/10 border border-white/20 rounded-2xl px-8 py-5 mb-10">
            <span className="text-5xl font-extrabold text-white">$100</span>
            <div className="text-left border-l border-white/30 pl-4">
              <p className="text-white font-semibold">per calendar day</p>
              <p className="text-blue-200 text-sm mt-0.5">100% tax-deductible</p>
            </div>
          </div>

          {/* How it works */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto">
            {[
              { step: '1', icon: '📅', title: 'Pick Your Date', desc: 'Choose any available day from the calendar below.' },
              { step: '2', icon: '✏️', title: 'Add a Dedication', desc: 'Up to 20 characters printed on your calendar day.' },
              { step: '3', icon: '💙', title: 'Support ACF', desc: 'Your $100 donation funds grants across Albany.' },
            ].map(({ step, icon, title, desc }) => (
              <div key={step} className="bg-white/10 border border-white/20 rounded-xl p-5 text-left">
                <div className="w-7 h-7 bg-acf-red rounded-full flex items-center justify-center text-white text-xs font-bold mb-3">
                  {step}
                </div>
                <p className="text-white font-semibold mb-1">{icon} {title}</p>
                <p className="text-blue-200 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Calendar Section ─────────────────────────────────────────────── */}
      <section
        id="calendar"
        className="max-w-7xl mx-auto px-4 sm:px-6 py-12"
        aria-label="2027 Community Calendar"
      >
        <div className="mb-8 text-center">
          <h2 className="text-3xl font-extrabold text-gray-900 mb-2">
            Choose Your Day
          </h2>
          <p className="text-gray-500">
            Select any <span className="font-semibold text-acf-blue">available</span> date to begin.
          </p>
        </div>

        <Calendar onSelectDay={handleSelectDay} selectedDate={selectedDay?.date} />
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer className="bg-acf-blue-dark text-blue-200 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 text-center text-xs">
          <p>© 2025 by Albany Community Foundation, 1164 Solano Ave, Box 133, Albany, CA 94706</p>
        </div>
      </footer>

      {/* ── Checkout Modal ───────────────────────────────────────────────── */}
      {showCheckout && selectedDay && (
        <div
          className="fixed inset-0 bg-black/60 flex items-start justify-center z-50 p-4 overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-label="Checkout"
        >
          <div className="w-full max-w-lg my-auto">
            <CheckoutFlow
              day={selectedDay}
              priceInCents={priceInCents}
              settings={{ textRequired: false, emojisAllowed: false }}
              onClose={handleCloseCheckout}
              onSuccess={() => { /* success screen shown inside CheckoutFlow, user closes via button */ }}
            />
          </div>
        </div>
      )}
    </main>
  );
}
