'use client';

/**
 * Step B: Enter dedication text (optional or required per settings).
 * Shows live character counter, validates length and allowed characters.
 */

import React, { useState, useEffect } from 'react';
import { validateDedicationText, MAX_DEDICATION_LENGTH } from '@/lib/validation';

interface StepDedicationProps {
  initialText: string;
  textRequired: boolean;
  emojisAllowed: boolean;
  onNext: (text: string) => void;
  onBack: () => void;
}

export default function StepDedication({
  initialText,
  textRequired,
  emojisAllowed,
  onNext,
  onBack,
}: StepDedicationProps) {
  const [text, setText] = useState(initialText);
  const [touched, setTouched] = useState(false);

  const validation = validateDedicationText(text, { required: textRequired, emojisAllowed });
  const isValid = validation.valid;
  const remaining = MAX_DEDICATION_LENGTH - text.length;
  const isNearLimit = remaining <= 5;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val.length <= MAX_DEDICATION_LENGTH) {
      setText(val);
      setTouched(true);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (isValid) {
      onNext(text.trim());
    }
  };

  const examples = [
    'Happy Birthday!',
    'In Loving Memory',
    'Albany Strong',
    'Class of 2027',
    'Our Anniversary',
  ];

  return (
    <form onSubmit={handleSubmit} className="animate-slide-up">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Add a Dedication{!textRequired && ' (Optional)'}
        </h2>
        <p className="text-gray-500 text-sm">
          {textRequired
            ? 'Your dedication will appear on the printed 2027 ACF Community Calendar.'
            : 'Personalize your day with a short message. This will appear on the printed 2027 ACF Community Calendar.'}
        </p>
      </div>

      {/* Text input */}
      <div className="mb-2">
        <label htmlFor="dedication" className="block text-sm font-medium text-gray-700 mb-1.5">
          Dedication Text
          {!textRequired && (
            <span className="ml-2 text-xs font-normal text-gray-400">(optional)</span>
          )}
        </label>
        <div className="relative">
          <input
            id="dedication"
            type="text"
            value={text}
            onChange={handleChange}
            onBlur={() => setTouched(true)}
            maxLength={MAX_DEDICATION_LENGTH}
            placeholder={textRequired ? 'Required' : 'e.g., Happy Birthday!'}
            aria-describedby="dedication-hint dedication-error"
            aria-invalid={touched && !isValid}
            className={[
              'w-full px-4 py-3 rounded-xl border text-gray-900 text-lg font-medium',
              'focus:outline-none focus:ring-2 transition-colors',
              touched && !isValid
                ? 'border-red-400 focus:ring-red-300 bg-red-50'
                : 'border-gray-300 focus:ring-acf-green focus:border-acf-green',
            ].join(' ')}
          />
          {/* Character counter */}
          <span
            className={[
              'absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono',
              isNearLimit ? 'text-red-500 font-bold' : 'text-gray-400',
            ].join(' ')}
            aria-live="polite"
            aria-label={`${remaining} characters remaining`}
          >
            {text.length}/{MAX_DEDICATION_LENGTH}
          </span>
        </div>

        {/* Validation error */}
        {touched && !isValid && (
          <p id="dedication-error" role="alert" className="mt-1.5 text-sm text-red-600 flex items-center gap-1">
            <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" />
            </svg>
            {validation.error}
          </p>
        )}

        {/* Hint */}
        <p id="dedication-hint" className="mt-1.5 text-xs text-gray-400">
          Max {MAX_DEDICATION_LENGTH} characters including spaces.
          {!emojisAllowed && ' Emojis are not permitted.'}
        </p>
      </div>

      {/* Example suggestions */}
      <div className="mb-8">
        <p className="text-xs text-gray-400 mb-2">Ideas:</p>
        <div className="flex flex-wrap gap-2">
          {examples.map((ex) => (
            <button
              key={ex}
              type="button"
              onClick={() => { setText(ex); setTouched(true); }}
              className="px-3 py-1 text-xs rounded-full border border-gray-200 text-gray-600 hover:border-acf-red hover:text-acf-green transition-colors bg-white"
            >
              {ex}
            </button>
          ))}
        </div>
      </div>

      {/* Preview */}
      {text && (
        <div className="mb-6 p-4 bg-acf-yellow border border-acf-yellow-dark rounded-xl">
          <p className="text-xs text-gray-500 mb-1 uppercase tracking-wider">Preview on Calendar</p>
          <p className="text-lg font-bold text-gray-800 italic">"{text}"</p>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3">
        <button
          type="button"
          onClick={onBack}
          className="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium"
        >
          ← Back
        </button>
        <button
          type="submit"
          className="flex-1 px-6 py-3 bg-acf-green text-white rounded-xl hover:bg-acf-green-dark transition-colors font-semibold shadow-sm"
        >
          {text ? 'Continue with Dedication →' : (textRequired ? 'Dedication Required' : 'Continue without Dedication →')}
        </button>
      </div>
    </form>
  );
}
