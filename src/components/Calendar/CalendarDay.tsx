'use client';

/**
 * CalendarDay.tsx
 * Individual day cell in the calendar grid.
 * Shows status visually and handles click for available days.
 */

import React from 'react';
import type { PublicCalendarDay } from '@/types';

interface CalendarDayProps {
  day: PublicCalendarDay | null; // null = padding cell before month start
  onSelect?: (day: PublicCalendarDay) => void;
  isSelected?: boolean;
}

const STATUS_CONFIG = {
  AVAILABLE: {
    bg: 'bg-white hover:bg-acf-blue-light hover:border-acf-blue cursor-pointer group',
    text: 'text-gray-800',
    dot: null,
    label: null,
    ariaLabel: (d: string) => `${d} — Available, $100`,
  },
  SOLD: {
    bg: 'bg-gray-100 cursor-not-allowed',
    text: 'text-gray-400',
    dot: 'bg-gray-400',
    label: 'Sold',
    ariaLabel: (d: string) => `${d} — Sold`,
  },
  ADMIN_HOLD: {
    bg: 'bg-red-50 cursor-not-allowed',
    text: 'text-red-400',
    dot: 'bg-red-300',
    label: 'Not Available',
    ariaLabel: (d: string) => `${d} — Not Available`,
  },
  CHECKOUT_HOLD: {
    bg: 'bg-blue-50 cursor-not-allowed',
    text: 'text-blue-400',
    dot: 'bg-blue-300',
    label: null,
    ariaLabel: (d: string) => `${d} — Being purchased`,
  },
};

export default function CalendarDay({ day, onSelect, isSelected }: CalendarDayProps) {
  if (!day) {
    return <div className="aspect-square" aria-hidden="true" />;
  }

  const config = STATUS_CONFIG[day.status];
  const dayNum = parseInt(day.date.split('-')[2]);
  const isAvailable = day.status === 'AVAILABLE';

  const handleClick = () => {
    if (isAvailable && onSelect) {
      onSelect(day);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.key === 'Enter' || e.key === ' ') && isAvailable && onSelect) {
      e.preventDefault();
      onSelect(day);
    }
  };

  return (
    <div
      role={isAvailable ? 'button' : 'cell'}
      tabIndex={isAvailable ? 0 : -1}
      aria-label={config.ariaLabel(day.date)}
      aria-pressed={isSelected}
      aria-disabled={!isAvailable}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={[
        'relative aspect-square rounded-lg border transition-all duration-150',
        'flex flex-col items-center justify-center text-center p-1',
        'focus:outline-none focus:ring-2 focus:ring-acf-blue focus:ring-offset-1',
        config.bg,
        isSelected
          ? 'border-acf-blue bg-acf-blue-light ring-2 ring-acf-blue shadow-md'
          : 'border-gray-200',
      ].join(' ')}
    >
      {/* Day number */}
      <span
        className={[
          'text-sm font-semibold leading-none',
          config.text,
          isSelected ? 'text-acf-blue' : '',
        ].join(' ')}
      >
        {dayNum}
      </span>

      {/* Status indicator dot */}
      {config.dot && (
        <span className={`mt-1 w-1.5 h-1.5 rounded-full ${config.dot}`} />
      )}

      {/* "Sold" / "Hold" label */}
      {config.label && (
        <span
          className={`text-[9px] leading-tight font-medium ${config.text} mt-0.5`}
        >
          {config.label}
        </span>
      )}

      {/* Dedication text on sold days — truncated */}
      {day.status === 'SOLD' && day.dedicationText && (
        <span
          className="absolute bottom-0 left-0 right-0 text-[7px] text-gray-500 truncate px-0.5 pb-0.5 text-center leading-tight"
          title={day.dedicationText}
        >
          {day.dedicationText}
        </span>
      )}

      {/* Premium star indicator */}
      {day.isPremium && isAvailable && (
        <span className="absolute top-0.5 right-0.5 text-[8px]">⭐</span>
      )}

      {/* Hover price hint for available days */}
      {isAvailable && (
        <span className="absolute inset-0 flex items-end justify-center pb-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <span className="text-[8px] text-acf-blue font-semibold">${(day.priceInCents / 100).toFixed(0)}</span>
        </span>
      )}
    </div>
  );
}
