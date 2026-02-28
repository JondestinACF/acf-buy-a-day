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

      {/* ── Nav ────────────────────────────────────────────────────────────── */}
      <nav className="bg-acf-blue-dark border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <span className="text-white font-bold text-sm tracking-wide">
            Albany Community Foundation · 2027
          </span>
          <div className="flex items-center gap-6">
            <a href="#how-it-works" className="text-blue-200 hover:text-white text-sm transition-colors">
              How It Works
            </a>
          </div>
        </div>
      </nav>

      {/* ── Hero ───────────────────────────────────────────────────────────── */}
      <section className="bg-acf-blue-dark py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">

          {/* Badge */}
          <div className="inline-flex items-center gap-2 border border-acf-gold/50 text-acf-gold px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest mb-8">
            2027 ACF Community Wall Calendar
          </div>

          {/* Headline */}
          <h1 className="text-5xl sm:text-6xl font-extrabold text-white mb-3 leading-tight">
            Every Day Has a Story.
          </h1>
          <h2 className="text-4xl sm:text-5xl font-extrabold italic mb-8 leading-tight" style={{ color: '#c9a227' }}>
            Which One Will You Tell?
          </h2>

          {/* Body copy */}
          <p className="text-blue-200 text-lg max-w-2xl mx-auto leading-relaxed mb-10">
            Albany is full of characters. Tell us yours in just 27 characters.
            Dedicate a day in the 2027 Community Wall Calendar — choose a date that matters,
            add your message, and let your $100 gift support the programs that make
            this city worth celebrating.
          </p>

          {/* Price box */}
          <div className="inline-flex flex-col sm:flex-row items-center gap-6 bg-white/10 border border-white/20 rounded-2xl px-8 py-6 mb-10">
            <div className="text-center sm:text-left">
              <p className="text-5xl font-extrabold text-white">$100</p>
              <p className="text-blue-200 text-sm mt-1">per day dedicated</p>
            </div>
            <div className="border-t sm:border-t-0 sm:border-l border-white/20 pt-4 sm:pt-0 sm:pl-6 text-left space-y-2">
              {[
                'Fully tax-deductible',
                'Printed in the 2027 wall calendar',
                'Funds local Albany grants',
              ].map((item) => (
                <div key={item} className="flex items-center gap-2 text-sm text-blue-100">
                  <span className="text-acf-gold font-bold">✓</span>
                  {item}
                </div>
              ))}
            </div>
          </div>

          {/* CTA */}
          <div>
            <a
              href="#calendar"
              className="inline-block px-8 py-4 rounded-xl font-bold text-lg transition-all shadow-lg hover:shadow-xl hover:scale-105"
              style={{ backgroundColor: '#c9a227', color: '#0e3166' }}
            >
              Dedicate a Day →
            </a>
          </div>
        </div>
      </section>

      {/* ── How It Works ───────────────────────────────────────────────────── */}
      <section id="how-it-works" className="bg-acf-blue-dark py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: '#c9a227' }}>How It Works</p>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-12">
            Three Simple Steps to Something Lasting
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[
              {
                number: '1',
                title: 'Claim Your Date',
                desc: 'Browse the calendar and select any available day in 2027 — a birthday, anniversary, graduation, or any date that holds meaning for you.',
              },
              {
                number: '2',
                title: 'Add Your Message',
                desc: "You've got 27 characters — a name, a milestone, a memory. Make them yours.",
              },
              {
                number: '3',
                title: 'See It in Print & Support Albany',
                desc: 'Your $100 donation funds local grants, youth programs, and community initiatives across Albany — and your dedication is immortalized in print.',
              },
            ].map(({ number, title, desc }) => (
              <div key={title} className="rounded-2xl p-7 text-left border-t-4" style={{ backgroundColor: 'rgba(255,255,255,0.07)', borderTopColor: '#c9a227' }}>
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-extrabold mb-5" style={{ backgroundColor: '#c9a227', color: '#0e3166' }}>
                  {number}
                </div>
                <h3 className="text-lg font-bold text-white mb-3">{title}</h3>
                <p className="text-blue-200 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Calendar Mockup Preview ──────────────────────────────────────── */}
      <section className="bg-white py-20 border-t border-gray-100">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col lg:flex-row items-center gap-12">

            {/* Text */}
            <div className="lg:w-2/5 text-center lg:text-left">
              <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: '#c9a227' }}>
                The Physical Calendar
              </p>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-5 leading-tight">
                A simple way to celebrate Albany and give back.
              </h2>
              <p className="text-gray-500 leading-relaxed mb-6">
                The 2027 ACF Community Wall Calendar hangs in hundreds of Albany homes
                and local businesses all year long. When you dedicate a day, your message
                appears right on the date, becoming part of the shared rhythm of our town.
              </p>
              <a
                href="#calendar"
                className="inline-block px-6 py-3 rounded-xl font-bold text-sm transition-all hover:scale-105"
                style={{ backgroundColor: '#0e3166', color: '#fff' }}
              >
                Claim Your Day →
              </a>
            </div>

            {/* Mockup image */}
            <div className="lg:w-3/5 flex justify-center">
              <div className="relative">
                <img
                  src="/calendar-mockup.jpg"
                  alt="2027 ACF Community Wall Calendar mockup showing May with sample dedications"
                  className="rounded-xl shadow-2xl w-full max-w-sm lg:max-w-md"
                  style={{ border: '1px solid rgba(0,0,0,0.08)' }}
                />
                <div
                  className="absolute bottom-4 left-1/2 -translate-x-1/2 text-xs font-semibold px-3 py-1 rounded-full whitespace-nowrap"
                  style={{ backgroundColor: 'rgba(14,49,102,0.85)', color: '#fff' }}
                >
                  Sample mockup — final design may vary
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── Calendar Section ─────────────────────────────────────────────── */}
      <section
        id="calendar"
        className="max-w-7xl mx-auto px-4 sm:px-6 py-16"
        aria-label="2027 Community Calendar"
      >
        <div className="mb-8 text-center">
          <p className="text-xs font-bold uppercase tracking-widest text-acf-gold mb-3">The Calendar</p>
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 text-center text-xs space-y-1">
          <p className="font-semibold text-white">Albany Community Foundation</p>
          <p>1164 Solano Ave, Box 133, Albany, CA 94706</p>
          <p>© 2027 Albany Community Foundation · All rights reserved</p>
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
