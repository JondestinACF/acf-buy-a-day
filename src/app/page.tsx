'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import type { PublicCalendarDay } from '@/types';

const ACF_URL = 'https://www.albanycommunity.org/whatdowedo-1';
const ACFLink = ({ children }: { children: React.ReactNode }) => (
  <a href={ACF_URL} target="_blank" rel="noopener noreferrer"
     className="underline underline-offset-2 hover:opacity-80 transition-opacity">
    {children}
  </a>
);

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
      <nav className="bg-white border-b border-gray-200 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-0 flex items-center justify-between">
          <a href={ACF_URL} target="_blank" rel="noopener noreferrer"
             className="hover:opacity-80 transition-opacity">
            <img src="/acf-logo.png" alt="Albany Community Foundation" className="h-28 -my-3 w-auto" />
          </a>
          <div className="flex items-center gap-6">
            <a href="#how-it-works" className="text-gray-600 hover:text-gray-900 text-sm font-medium transition-colors">
              How It Works
            </a>
            <a href="#faq" className="text-gray-600 hover:text-gray-900 text-sm font-medium transition-colors">
              FAQ
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

          {/* Example dedications */}
          <div className="flex flex-wrap justify-center gap-3 mb-10">
            {[
              { text: 'Happy 50th, Dad!', label: 'Birthday' },
              { text: 'We Miss You, Grandpa Joe', label: 'Memorial' },
              { text: '50 Years, Still Dancing', label: 'Anniversary' },
              { text: 'Welcome, Baby Liam!', label: 'New Arrival' },
              { text: 'Happy Retirement, Coach!', label: 'Celebration' },
            ].map((ex) => (
              <div key={ex.text} className="bg-white/10 border border-white/15 rounded-lg px-4 py-2.5 text-center">
                <p className="text-white font-semibold text-sm tracking-wide">&ldquo;{ex.text}&rdquo;</p>
                <p className="text-xs mt-1" style={{ color: '#c9a227' }}>{ex.label}</p>
              </div>
            ))}
          </div>

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

      {/* ── How It Works + Mockup ──────────────────────────────────────────── */}
      <section id="how-it-works" className="bg-acf-blue-dark border-t border-white/10 py-14">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col lg:flex-row items-center gap-12">

            {/* Calendar mockup — left */}
            <div className="relative flex-shrink-0 flex justify-center">
              <img
                src="/calendar-mockup.jpg"
                alt="2027 ACF Community Wall Calendar sample"
                className="rounded-xl shadow-2xl"
                style={{ width: '260px', border: '1px solid rgba(255,255,255,0.12)' }}
              />
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 text-xs px-3 py-1 rounded-full whitespace-nowrap"
                   style={{ backgroundColor: 'rgba(0,0,0,0.6)', color: 'rgba(255,255,255,0.75)' }}>
                Sample mockup
              </div>
            </div>

            {/* Steps — right */}
            <div className="flex-1">
              <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: '#c9a227' }}>How It Works</p>
              <h2 className="text-xl font-extrabold text-white mb-2">A simple way to celebrate Albany and give back.</h2>
              <p className="text-blue-300 text-sm leading-relaxed mb-8">
                The 2027 ACF Community Wall Calendar hangs in about 1,000 Albany homes, schools,
                and local businesses all year long. Dedicate a day and your message is printed right on the date.
              </p>

              <div className="space-y-5">
                {[
                  { n: '1', title: 'Claim Your Date',  desc: 'Pick any available day in 2027 that means something to you.' },
                  { n: '2', title: 'Add Your Message', desc: '27 characters — a name, a milestone, a memory.' },
                  { n: '3', title: 'See It in Print',  desc: 'Your $100 gift funds local Albany programs and your dedication is printed for all to see.' },
                ].map(({ n, title, desc }) => (
                  <div key={n} className="flex items-start gap-4">
                    <div className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-extrabold mt-0.5"
                         style={{ backgroundColor: '#c9a227', color: '#0e3166' }}>
                      {n}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">{title}</p>
                      <p className="text-blue-300 text-xs leading-relaxed">{desc}</p>
                    </div>
                  </div>
                ))}
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

      {/* ── FAQ ──────────────────────────────────────────────────────────── */}
      <section id="faq" className="bg-acf-blue-dark py-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <p className="text-3xl sm:text-4xl font-extrabold uppercase tracking-widest mb-3" style={{ color: '#c9a227' }}>FAQ</p>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white">
              Questions? We've Got Answers.
            </h2>
          </div>

          <div className="space-y-4">
            {[
              {
                q: 'What exactly is the 2027 ACF Community Wall Calendar?',
                a: 'It\'s a printed 12-month wall calendar featuring Albany photography, hung in about 1,000 Albany homes, schools, and local businesses all year long. Every dedicated day is printed right on the date for everyone to see throughout the year.',
              },
              {
                q: 'How does dedicating a day work?',
                a: 'Browse the calendar, pick an available date that means something to you — a birthday, anniversary, milestone, or memory — write a short message (up to 27 characters), and complete your $100 donation. That\'s it. Your dedication is locked in.',
              },
              {
                q: 'What can I write in my dedication?',
                a: 'Anything meaningful — a name, a celebration, a remembrance. You have 27 characters to work with. Examples: "Happy 50th, Dad!", "In memory of Rosa", "Go Ella at UC Davis!", or "Ben Beats Cancer!"',
              },
              {
                q: 'Are there any restrictions on what I can say?',
                a: 'Yes. Dedications must be personal, positive, and community-friendly. We don\'t allow messages that are political, religious, promotional, or that could be considered controversial or offensive. Think of it this way — if it would make a neighbor smile, it\'s probably just right. All dedications are reviewed by our team before being finalized.',
              },
              {
                q: 'What happens after I submit my dedication?',
                a: 'You\'ll receive an immediate email confirming that your card was charged and your request is under review. However, your dedication is not official until you receive a second confirmation email from us. We personally review every submission to make sure it meets our community guidelines — typically within a few business days.',
              },
              {
                q: 'Is my $100 donation tax-deductible?',
                a: (<>Yes. The <ACFLink>Albany Community Foundation</ACFLink> is a registered 501(c)(3) nonprofit. Your full $100 donation is tax-deductible and you&apos;ll receive a confirmation for your records.</>),
              },
              {
                q: 'Where does my money go?',
                a: (<>Directly to the <ACFLink>Albany Community Foundation</ACFLink>, which funds local grants, youth programs, and community initiatives right here in Albany. Every dollar stays local.</>),
              },
              {
                q: 'Can I dedicate more than one day?',
                a: 'Absolutely — you can dedicate as many days as you like, as long as they\'re available. Each dedication is a separate $100 donation.',
              },
              {
                q: 'What if the date I want is already taken?',
                a: 'Dates are claimed on a first-come, first-served basis. If your first choice is gone, pick another meaningful date — there are 365 of them!',
              },
              {
                q: 'When will the calendar be printed and distributed?',
                a: 'The 2027 calendar will be printed and distributed in late 2026 in time for the new year. You\'ll receive an email confirmation once your dedication is secured.',
              },
              {
                q: 'Will I get a copy of the calendar?',
                a: 'Every donor receives one complimentary copy of the 2027 calendar. We\'ll email you with pickup or delivery details once the calendars are printed in late 2026.',
              },
              {
                q: 'Who do I contact if I have more questions?',
                a: 'Email us anytime at acf@albanycommunity.org and we\'ll get back to you as soon as we can.',
              },
            ].map(({ q, a }, i) => (
              <details key={i} className="group rounded-xl overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.07)' }}>
                <summary className="flex items-center justify-between gap-4 px-6 py-5 cursor-pointer list-none">
                  <span className="font-semibold text-white text-sm sm:text-base">{q}</span>
                  <span className="text-acf-gold text-xl font-bold flex-shrink-0 group-open:rotate-45 transition-transform duration-200">+</span>
                </summary>
                <div className="px-6 pb-5 text-blue-200 text-sm leading-relaxed border-t border-white/10 pt-4">
                  {a}
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer className="bg-acf-blue-dark text-blue-200 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 text-center text-xs space-y-1">
          <a href={ACF_URL} target="_blank" rel="noopener noreferrer"
             className="font-semibold text-white hover:text-blue-200 transition-colors">
            Albany Community Foundation
          </a>
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
