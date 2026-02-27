'use client';

/**
 * Checkout/index.tsx
 * Orchestrates the multi-step checkout flow.
 * Manages hold lifecycle (creates hold on step entry, releases on abandon).
 */

import React, { useState, useEffect, useCallback, memo } from 'react';
import StepConfirm from './StepConfirm';
import StepDedication from './StepDedication';
import StepBuyerInfo from './StepBuyerInfo';
import StepPayment from './StepPayment';
import type { PublicCalendarDay, BuyerFormData, CheckoutSession } from '@/types';

interface CheckoutFlowProps {
  day: PublicCalendarDay;
  priceInCents: number;
  settings: { textRequired: boolean; emojisAllowed: boolean };
  onClose: () => void;
  onSuccess: () => void;
}

type CheckoutStep = 'confirm' | 'dedication' | 'buyer' | 'payment' | 'success';

const STEP_ORDER: CheckoutStep[] = ['confirm', 'dedication', 'buyer', 'payment', 'success'];

// ── Isolated countdown timer — lives in its own component so its
//    every-second state update never triggers a re-render of the form. ──────
const HoldCountdown = memo(function HoldCountdown({
  holdExpiresAt,
}: {
  holdExpiresAt: string;
}) {
  const [remaining, setRemaining] = useState(() =>
    Math.max(0, Math.floor((new Date(holdExpiresAt).getTime() - Date.now()) / 1000))
  );

  useEffect(() => {
    const tick = () =>
      setRemaining(Math.max(0, Math.floor((new Date(holdExpiresAt).getTime() - Date.now()) / 1000)));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [holdExpiresAt]);

  return (
    <p className={['text-xs mt-3 text-center', remaining < 60 ? 'text-red-300 font-semibold' : 'text-blue-200'].join(' ')}>
      {remaining > 0
        ? `⏱ Your date is held for ${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, '0')}`
        : '⚠️ Your hold has expired. Please start over.'}
    </p>
  );
});

export default function CheckoutFlow({
  day,
  priceInCents,
  settings,
  onClose,
  onSuccess,
}: CheckoutFlowProps) {
  const [step, setStep] = useState<CheckoutStep>('confirm');
  const [session, setSession] = useState<CheckoutSession | null>(null);
  const [holdLoading, setHoldLoading] = useState(false);
  const [holdError, setHoldError] = useState<string | null>(null);
  const [buyerData, setBuyerData] = useState<Partial<BuyerFormData>>({});
  const [dedicationText, setDedicationText] = useState('');

  // Create hold when user confirms date
  const createHold = useCallback(async () => {
    setHoldLoading(true);
    setHoldError(null);
    try {
      const res = await fetch('/api/checkout/hold', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: day.date }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not hold this date');

      setSession({
        date: day.date,
        holdToken: data.holdToken,
        holdExpiresAt: data.holdExpiresAt,
      });
      setStep('dedication');
    } catch (err) {
      setHoldError(err instanceof Error ? err.message : 'Failed to hold date');
    } finally {
      setHoldLoading(false);
    }
  }, [day.date]);

  // Release hold when component unmounts (user navigates away)
  useEffect(() => {
    return () => {
      if (session) {
        navigator.sendBeacon(
          '/api/checkout/hold',
          JSON.stringify({ date: session.date, holdToken: session.holdToken })
        );
      }
    };
  }, [session]);

  const currentStepIndex = STEP_ORDER.indexOf(step);
  const [year, month, dayNum] = day.date.split('-').map(Number);
  const dateDisplay = new Date(year, month - 1, dayNum).toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
  });

  const handleNext = useCallback((data: BuyerFormData) => {
    setBuyerData(data);
    setStep('payment');
  }, []);

  const handleBackToDedication = useCallback(() => setStep('dedication'), []);
  const handleBackToConfirm = useCallback(() => setStep('confirm'), []);

  return (
    <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full mx-auto">
      {/* Header */}
      <div className="bg-acf-green px-6 pt-6 pb-4">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-white font-bold text-lg leading-tight">Buy a Day</h2>
            <p className="text-blue-200 text-sm">{dateDisplay} · 2027 Calendar</p>
          </div>
          <button
            onClick={onClose}
            className="text-green-200 hover:text-white transition-colors ml-4 flex-shrink-0"
            aria-label="Close checkout"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Step indicator */}
        {step !== 'success' && (
          <div className="flex items-center gap-1 mt-4">
            {STEP_ORDER.filter((s) => s !== 'success').map((s, i) => (
              <React.Fragment key={s}>
                <div className={[
                  'flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold transition-all',
                  i < currentStepIndex
                    ? 'bg-acf-yellow text-gray-800'
                    : i === currentStepIndex
                    ? 'bg-white text-acf-green'
                    : 'bg-green-800 text-green-400',
                ].join(' ')}>
                  {i < currentStepIndex ? '✓' : i + 1}
                </div>
                {i < STEP_ORDER.length - 2 && (
                  <div className={`flex-1 h-0.5 ${i < currentStepIndex ? 'bg-acf-yellow' : 'bg-green-800'}`} />
                )}
              </React.Fragment>
            ))}
          </div>
        )}

        {/* Hold countdown — isolated so it never re-renders the form */}
        {session && step !== 'success' && (
          <HoldCountdown holdExpiresAt={session.holdExpiresAt} />
        )}
      </div>

      {/* Body */}
      <div className="p-6">
        {step === 'confirm' && (
          <>
            {holdError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                {holdError}
              </div>
            )}
            <StepConfirm
              date={day.date}
              priceInCents={priceInCents}
              onConfirm={createHold}
              onCancel={onClose}
            />
            {holdLoading && (
              <div className="absolute inset-0 bg-white/70 flex items-center justify-center rounded-b-2xl">
                <div className="w-8 h-8 border-4 border-acf-green border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </>
        )}

        {step === 'dedication' && (
          <StepDedication
            initialText={dedicationText}
            textRequired={settings.textRequired}
            emojisAllowed={settings.emojisAllowed}
            onNext={(text) => { setDedicationText(text); setStep('buyer'); }}
            onBack={handleBackToConfirm}
          />
        )}

        {step === 'buyer' && (
          <StepBuyerInfo
            initialData={{ ...buyerData, dedicationText }}
            onNext={handleNext}
            onBack={handleBackToDedication}
          />
        )}

        {step === 'payment' && session && (
          <StepPayment
            date={day.date}
            holdToken={session.holdToken}
            buyerData={{ ...buyerData as BuyerFormData, dedicationText }}
            amountCents={priceInCents}
            onSuccess={() => {
              setStep('success');
              onSuccess();
            }}
            onBack={handleBackToDedication}
          />
        )}

        {step === 'success' && (
          <div className="text-center py-4">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Thank You!</h3>
            <p className="text-gray-500 text-sm mb-4">
              Your day on the 2027 ACF Community Calendar is confirmed. Check your email for a receipt.
            </p>
            <button
              onClick={onClose}
              className="px-6 py-3 bg-acf-green text-white rounded-xl hover:bg-acf-green-dark transition-colors font-semibold"
            >
              View Calendar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
