'use client';

/**
 * Step D: Payment via Stripe Elements.
 * Creates PaymentIntent server-side, then collects card details with Stripe.
 */

import React, { useState, useEffect } from 'react';
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import type { BuyerFormData } from '@/types';

// Load Stripe outside render to avoid recreating the object on each render
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

interface StepPaymentProps {
  date: string;
  holdToken: string;
  buyerData: BuyerFormData;
  amountCents: number;
  onSuccess: (orderId: string, paidAt: string) => void;
  onBack: () => void;
}

export default function StepPayment(props: StepPaymentProps) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const createIntent = async () => {
      try {
        const res = await fetch('/api/stripe/create-payment-intent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            date: props.date,
            holdToken: props.holdToken,
            ...props.buyerData,
          }),
        });

        const data = await res.json();
        console.log('[StepPayment] API response:', res.status, data);

        if (!res.ok) {
          throw new Error(data.error || `Server error ${res.status}`);
        }

        setClientSecret(data.clientSecret);
        setPaymentIntentId(data.paymentIntentId);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to initialize payment');
      } finally {
        setLoading(false);
      }
    };

    createIntent();
  }, [props.date, props.holdToken, props.buyerData]);

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="w-10 h-10 border-4 border-acf-green border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-500">Initializing secure payment…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-7 h-7 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h3 className="font-semibold text-gray-900 mb-2">Payment Setup Failed</h3>
        <p className="text-sm text-red-600 mb-6">{error}</p>
        <button
          onClick={props.onBack}
          className="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium"
        >
          ← Go Back
        </button>
      </div>
    );
  }

  if (!clientSecret) return null;

  return (
    <Elements
      stripe={stripePromise}
      options={{
        clientSecret,
        appearance: {
          theme: 'stripe',
          variables: {
            colorPrimary: '#1a4e8f',
            colorBackground: '#ffffff',
            colorText: '#1f2937',
            colorDanger: '#ef4444',
            fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
            borderRadius: '8px',
          },
        },
      }}
    >
      <PaymentForm {...props} paymentIntentId={paymentIntentId!} />
    </Elements>
  );
}

// ─── Inner Payment Form (needs to be inside <Elements>) ────────────────────────

interface PaymentFormProps extends StepPaymentProps {
  paymentIntentId: string;
}

function PaymentForm({ date, amountCents, buyerData, onSuccess, onBack }: PaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || '';
  const price = `$${(amountCents / 100).toFixed(0)}`;
  const [year, month, day] = date.split('-').map(Number);
  const dateDisplay = new Date(year, month - 1, day).toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setProcessing(true);
    setError(null);

    const { error: submitError } = await elements.submit();
    if (submitError) {
      setError(submitError.message ?? 'Please check your payment details.');
      setProcessing(false);
      return;
    }

    const { error: confirmError, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${appUrl}/confirmation`,
        payment_method_data: {
          billing_details: {
            name: `${buyerData.firstName} ${buyerData.lastName}`,
            email: buyerData.email,
            phone: buyerData.phone,
            address: {
              line1: buyerData.billingAddress.line1,
              line2: buyerData.billingAddress.line2 || undefined,
              city: buyerData.billingAddress.city,
              state: buyerData.billingAddress.state,
              postal_code: buyerData.billingAddress.postal_code,
              country: buyerData.billingAddress.country,
            },
          },
        },
      },
      redirect: 'if_required',
    });

    if (confirmError) {
      setError(confirmError.message ?? 'Payment failed. Please try again.');
      setProcessing(false);
      return;
    }

    if (paymentIntent?.status === 'succeeded') {
      // Poll for order ID (webhook may have a tiny delay)
      const orderId = await pollForOrderId(date);
      onSuccess(orderId || `PENDING-${paymentIntent.id.slice(-6)}`, new Date().toISOString());
    } else {
      setError('Payment was not completed. Please try again.');
      setProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="animate-slide-up">
      <h2 className="text-2xl font-bold text-gray-900 mb-1">Complete Your Donation</h2>
      <p className="text-gray-500 text-sm mb-6">
        Secured by Stripe. Your card information never touches our servers.
      </p>

      {/* Order summary */}
      <div className="bg-gray-50 rounded-xl p-4 mb-6 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-900">{dateDisplay}</p>
          <p className="text-xs text-gray-500 mt-0.5">2027 ACF Community Calendar Day</p>
          {buyerData.dedicationText && (
            <p className="text-xs text-acf-green mt-0.5 font-medium">
              "{buyerData.dedicationText}"
            </p>
          )}
        </div>
        <span className="text-2xl font-bold text-gray-900">{price}</span>
      </div>

      {/* Stripe PaymentElement */}
      <div className="mb-6">
        <PaymentElement
          options={{
            layout: 'tabs',
            fields: {
              billingDetails: 'never', // We collect billing details ourselves
            },
          }}
        />
      </div>

      {/* Error message */}
      {error && (
        <div
          role="alert"
          className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-start gap-2"
        >
          <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" />
          </svg>
          {error}
        </div>
      )}

      {/* Security note */}
      <p className="text-xs text-gray-400 mb-6 flex items-center gap-1.5">
        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" />
        </svg>
        Your payment is encrypted and processed securely by Stripe.
      </p>

      <div className="flex flex-col sm:flex-row gap-3">
        <button
          type="button" onClick={onBack} disabled={processing}
          className="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium disabled:opacity-50"
        >
          ← Back
        </button>
        <button
          type="submit"
          disabled={!stripe || !elements || processing}
          className={[
            'flex-1 py-3 px-6 rounded-xl font-semibold text-white transition-all shadow-sm',
            'flex items-center justify-center gap-2',
            processing || !stripe
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-acf-green hover:bg-acf-green-dark',
          ].join(' ')}
        >
          {processing ? (
            <>
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Processing…
            </>
          ) : (
            `Donate ${price} to ACF →`
          )}
        </button>
      </div>
    </form>
  );
}

/** Poll for order ID after payment (webhook can take a second) */
async function pollForOrderId(date: string, attempts = 10): Promise<string | null> {
  for (let i = 0; i < attempts; i++) {
    await new Promise((r) => setTimeout(r, 800));
    try {
      const res = await fetch(`/api/calendar`, { cache: 'no-store' });
      const data = await res.json();
      const day = data.days?.find((d: { date: string; status: string }) =>
        d.date === date && d.status === 'SOLD'
      );
      if (day) return null; // We'll get orderId from confirmation page
    } catch {
      // ignore
    }
  }
  return null;
}
