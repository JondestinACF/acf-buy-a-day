'use client';

/**
 * CalendarMonth.tsx
 * Renders a single month's grid of day cells.
 */

import React from 'react';
import { format, getDaysInMonth, getDay } from 'date-fns';
import CalendarDay from './CalendarDay';
import type { PublicCalendarDay } from '@/types';

interface CalendarMonthProps {
  year: number;
  month: number; // 1–12
  days: PublicCalendarDay[];
  onSelectDay: (day: PublicCalendarDay) => void;
  selectedDate?: string;
}

const DAY_HEADERS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function CalendarMonth({
  year,
  month,
  days,
  onSelectDay,
  selectedDate,
}: CalendarMonthProps) {
  const monthDate = new Date(year, month - 1, 1);
  const monthName = format(monthDate, 'MMMM yyyy');
  const daysInMonth = getDaysInMonth(monthDate);
  const firstDayOfWeek = getDay(monthDate); // 0 = Sunday

  // Build a map for quick lookup
  const dayMap = new Map<string, PublicCalendarDay>();
  for (const day of days) {
    dayMap.set(day.date, day);
  }

  // Build grid cells: padding + actual days
  const cells: (PublicCalendarDay | null)[] = [
    ...Array(firstDayOfWeek).fill(null), // padding
  ];

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    cells.push(dayMap.get(dateStr) ?? null);
  }

  // Pad to complete last row
  while (cells.length % 7 !== 0) {
    cells.push(null);
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Month header */}
      <div className="bg-acf-blue px-4 py-3 text-center">
        <h3 className="text-white font-semibold text-sm tracking-wide">{monthName}</h3>
      </div>

      {/* Day-of-week headers */}
      <div className="grid grid-cols-7 border-b border-gray-100">
        {DAY_HEADERS.map((h) => (
          <div
            key={h}
            className="py-1.5 text-center text-[10px] font-semibold text-gray-400 uppercase tracking-wider"
          >
            {h}
          </div>
        ))}
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7 gap-0.5 p-1.5">
        {cells.map((cell, i) => (
          <CalendarDay
            key={i}
            day={cell}
            onSelect={onSelectDay}
            isSelected={cell?.date === selectedDate}
          />
        ))}
      </div>
    </div>
  );
}
