'use client';

/**
 * Step A: Confirm selected date and price.
 */

import React from 'react';
import { format } from 'date-fns';

interface StepConfirmProps {
  date: string; // "2027-03-15"
  priceInCents: number;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function StepConfirm({ date, priceInCents, onConfirm, onCancel }: StepConfirmProps) {
  const [year, month, day] = date.split('-').map(Number);
  const dateObj = new Date(year, month - 1, day);
  const formattedDate = format(dateObj, 'EEEE, MMMM d, yyyy');
  const price = `$${(priceInCents / 100).toFixed(0)}`;
  const dayOfYear = Math.ceil(
    (dateObj.getTime() - new Date(year, 0, 0).getTime()) / 86_400_000
  );

  return (
    <div className="text-center animate-slide-up">
      <div className="w-16 h-16 bg-acf-green-light rounded-full flex items-center justify-center mx-auto mb-4">
        <svg className="w-8 h-8 text-acf-green" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </div>

      <h2 className="text-2xl font-bold text-gray-900 mb-1">You Selected</h2>
      <p className="text-acf-green font-bold text-xl mb-1">{formattedDate}</p>
      <p className="text-sm text-gray-500 mb-6">Day {dayOfYear} of the 2027 ACF Community Calendar</p>

      <div className="bg-acf-yellow border border-acf-yellow-dark rounded-xl p-5 mb-6 inline-block min-w-[240px]">
        <p className="text-sm text-gray-600 mb-1">Donation Amount</p>
        <p className="text-4xl font-bold text-gray-900">{price}</p>
        <p className="text-xs text-gray-500 mt-1">Tax-deductible donation to ACF</p>
      </div>

      <p className="text-sm text-gray-500 mb-8 max-w-sm mx-auto">
        Your date will be held for <strong>10 minutes</strong> while you complete checkout.
      </p>

      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <button
          onClick={onCancel}
          className="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium"
        >
          Go Back
        </button>
        <button
          onClick={onConfirm}
          className="px-8 py-3 bg-acf-green text-white rounded-xl hover:bg-acf-green-dark transition-colors font-semibold shadow-sm"
        >
          Continue — {price} →
        </button>
      </div>
    </div>
  );
}
