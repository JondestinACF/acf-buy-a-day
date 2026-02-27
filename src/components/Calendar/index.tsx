'use client';

/**
 * Calendar/index.tsx
 * Full year calendar with real-time status, month navigation, and legend.
 * Polls the API every 30 seconds to reflect real-time availability changes.
 */

import React, { useState, useEffect, useCallback } from 'react';
import CalendarMonth from './CalendarMonth';
import type { PublicCalendarDay } from '@/types';

interface CalendarProps {
  onSelectDay: (day: PublicCalendarDay) => void;
  selectedDate?: string;
}

type SalesStatus = 'open' | 'not_started' | 'ended' | 'unknown';

export default function Calendar({ onSelectDay, selectedDate }: CalendarProps) {
  const [days, setDays] = useState<PublicCalendarDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [salesStatus, setSalesStatus] = useState<SalesStatus>('unknown');
  const [priceInCents, setPriceInCents] = useState(10000);
  const [year, setYear] = useState(2027);
  const [focusedMonth, setFocusedMonth] = useState<number | null>(null); // null = show all

  // Current view state — default to showing all months
  const [viewMode, setViewMode] = useState<'all' | 'single'>('all');
  const [currentMonth, setCurrentMonth] = useState(1); // Jan

  const fetchCalendar = useCallback(async () => {
    try {
      const res = await fetch('/api/calendar', { cache: 'no-store' });
      if (!res.ok) throw new Error('Failed to load calendar');
      const data = await res.json();
      setDays(data.days);
      setSalesStatus(data.salesStatus);
      setPriceInCents(data.priceInCents);
      setYear(data.year);
    } catch (err) {
      setError('Unable to load calendar. Please try refreshing.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCalendar();
    // Poll every 30 seconds for real-time updates
    const interval = setInterval(fetchCalendar, 30_000);
    return () => clearInterval(interval);
  }, [fetchCalendar]);

  // Count stats
  const stats = {
    available: days.filter((d) => d.status === 'AVAILABLE').length,
    sold: days.filter((d) => d.status === 'SOLD').length,
    held: days.filter((d) => d.status === 'ADMIN_HOLD').length,
  };

  const months = Array.from({ length: 12 }, (_, i) => i + 1);

  const getDaysForMonth = (month: number) =>
    days.filter((d) => {
      const [, m] = d.date.split('-').map(Number);
      return m === month;
    });

  if (loading) {
    return (
      <div className="flex justify-center items-center py-24">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-acf-blue border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-500 text-sm">Loading the 2027 calendar…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-16">
        <p className="text-red-600 mb-4">{error}</p>
        <button
          onClick={fetchCalendar}
          className="px-4 py-2 bg-acf-blue text-white rounded-lg hover:bg-acf-blue-dark transition-colors text-sm"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (salesStatus === 'not_started') {
    return (
      <div className="text-center py-16 px-4">
        <div className="text-5xl mb-4">📅</div>
        <h3 className="text-2xl font-bold text-acf-blue mb-2">Sales Opening Soon</h3>
        <p className="text-gray-600 max-w-md mx-auto">
          The 2027 ACF Community Calendar is not yet available for purchase. Check back soon!
        </p>
      </div>
    );
  }

  if (salesStatus === 'ended' && stats.available === 0) {
    return (
      <div className="text-center py-16 px-4">
        <div className="text-5xl mb-4">🎉</div>
        <h3 className="text-2xl font-bold text-acf-blue mb-2">Sold Out!</h3>
        <p className="text-gray-600 max-w-md mx-auto">
          Every day on the 2027 ACF Community Calendar has been claimed. Thank you to our incredible community!
        </p>
      </div>
    );
  }

  const priceDisplay = `$${(priceInCents / 100).toFixed(0)}`;

  return (
    <div>
      {/* Stats bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex flex-wrap gap-4 text-sm">
          <StatChip color="bg-white border border-gray-200" count={stats.available} label="Available" />
          <StatChip color="bg-gray-100 border border-gray-200" count={stats.sold} label="Sold" />
          <StatChip color="bg-amber-50 border border-amber-200" count={stats.held} label="On Hold" />
        </div>

        {/* View toggle */}
        <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setViewMode('all')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              viewMode === 'all'
                ? 'bg-white text-acf-blue shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            All Months
          </button>
          <button
            onClick={() => setViewMode('single')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              viewMode === 'single'
                ? 'bg-white text-acf-blue shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Month View
          </button>
        </div>
      </div>

      {/* Legend */}
      <div
        className="flex flex-wrap gap-4 mb-6 p-3 bg-gray-50 rounded-lg border border-gray-100"
        role="legend"
        aria-label="Calendar legend"
      >
        <LegendItem
          color="bg-white border border-gray-200"
          label={`Available — ${priceDisplay}`}
        />
        <LegendItem
          color="bg-gray-100 border border-gray-200"
          dotColor="bg-gray-400"
          label="Sold"
        />
        <LegendItem
          color="bg-amber-50 border border-amber-200"
          dotColor="bg-amber-400"
          label="Admin Hold"
        />
      </div>

      {/* Single month view */}
      {viewMode === 'single' && (
        <div>
          {/* Month navigation */}
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => setCurrentMonth((m) => Math.max(1, m - 1))}
              disabled={currentMonth === 1}
              className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              aria-label="Previous month"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <span className="font-semibold text-gray-700">
              {new Date(year, currentMonth - 1).toLocaleString('default', { month: 'long', year: 'numeric' })}
            </span>
            <button
              onClick={() => setCurrentMonth((m) => Math.min(12, m + 1))}
              disabled={currentMonth === 12}
              className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              aria-label="Next month"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
          <CalendarMonth
            year={year}
            month={currentMonth}
            days={getDaysForMonth(currentMonth)}
            onSelectDay={onSelectDay}
            selectedDate={selectedDate}
          />
        </div>
      )}

      {/* All months grid */}
      {viewMode === 'all' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {months.map((month) => (
            <CalendarMonth
              key={month}
              year={year}
              month={month}
              days={getDaysForMonth(month)}
              onSelectDay={onSelectDay}
              selectedDate={selectedDate}
            />
          ))}
        </div>
      )}

      <p className="text-center text-xs text-gray-400 mt-6">
        Calendar updates automatically every 30 seconds
      </p>
    </div>
  );
}

function StatChip({ color, count, label }: { color: string; count: number; label: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${color}`}>
      <span className="font-bold text-sm">{count}</span>
      <span className="text-gray-500">{label}</span>
    </span>
  );
}

function LegendItem({ color, dotColor, label }: { color: string; dotColor?: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className={`w-6 h-6 rounded ${color} flex items-center justify-center`}>
        {dotColor && <span className={`w-2 h-2 rounded-full ${dotColor}`} />}
      </span>
      <span className="text-xs text-gray-600">{label}</span>
    </div>
  );
}
