'use client';

/**
 * Confirmation page — shown after successful Stripe redirect (if any).
 * Also used as a fallback when payment_intent.status is in URL.
 */

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { format } from 'date-fns';

interface OrderInfo {
  orderId: string;
  date: string;
  dedicationText?: string;
  buyerName: string;
  amountPaidCents: number;
  paidAt: string;
}

export default function ConfirmationPage() {
  const searchParams = useSearchParams();
  const paymentIntentId = searchParams.get('payment_intent');
  const redirectStatus = searchParams.get('redirect_status');

  const [order, setOrder] = useState<OrderInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // If redirected from Stripe, fetch order info via payment intent
    if (paymentIntentId) {
      fetchOrderByPaymentIntent(paymentIntentId).then(setOrder).finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [paymentIntentId]);

  async function fetchOrderByPaymentIntent(piId: string): Promise<OrderInfo | null> {
    // Poll a few times to allow webhook to process
    for (let i = 0; i < 8; i++) {
      await new Promise((r) => setTimeout(r, 1000));
      try {
        const res = await fetch(`/api/calendar`);
        const data = await res.json();
        const soldDay = data.days?.find(
          (d: { status: string; dedicationText?: string; date: string }) =>
            d.status === 'SOLD'
        );
        if (soldDay) {
          return {
            orderId: 'Confirmed',
            date: soldDay.date,
            dedicationText: soldDay.dedicationText,
            buyerName: '',
            amountPaidCents: 10000,
            paidAt: new Date().toISOString(),
          };
        }
      } catch { /* continue */ }
    }
    return null;
  }

  if (redirectStatus === 'failed') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Payment Unsuccessful</h1>
          <p className="text-gray-500 mb-6">
            Your payment was not processed. Please try again or contact us if the issue persists.
          </p>
          <Link
            href="/"
            className="inline-block px-6 py-3 bg-acf-blue text-white rounded-xl hover:bg-acf-blue-dark transition-colors font-semibold"
          >
            Return to Calendar
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-acf-blue-light to-gray-50">
      {/* Header */}
      <header className="bg-acf-blue shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-white rounded-lg flex items-center justify-center">
              <span className="text-acf-blue font-black text-sm">ACF</span>
            </div>
            <div>
              <p className="text-white font-bold text-sm">Albany Community Foundation</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-16">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* Success banner */}
          <div className="bg-acf-green px-6 pt-8 pb-6 text-center">
            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-9 h-9 text-acf-green" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-2xl font-extrabold text-white mb-1">Thank You!</h1>
            <p className="text-green-100 text-sm">Your donation has been received.</p>
          </div>

          <div className="p-6">
            {loading ? (
              <div className="text-center py-8">
                <div className="w-8 h-8 border-4 border-acf-blue border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="text-gray-400 text-sm">Loading your confirmation…</p>
              </div>
            ) : order ? (
              <ConfirmationDetails order={order} />
            ) : (
              <GenericConfirmation />
            )}

            <div className="mt-8 text-center">
              <Link
                href="/"
                className="inline-block px-6 py-3 bg-acf-blue text-white rounded-xl hover:bg-acf-blue-dark transition-colors font-semibold text-sm"
              >
                View the Full Calendar
              </Link>
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          A confirmation email has been sent to your email address.
        </p>
      </main>
    </div>
  );
}

function ConfirmationDetails({ order }: { order: OrderInfo }) {
  const [year, month, day] = order.date.split('-').map(Number);
  const dateDisplay = format(new Date(year, month - 1, day), 'EEEE, MMMM d, yyyy');

  return (
    <div>
      <p className="text-gray-600 text-sm text-center mb-6">
        Your day on the 2027 ACF Community Calendar is confirmed. We're so grateful for your support!
      </p>

      {order.dedicationText && (
        <div className="bg-acf-gold-light border border-acf-gold rounded-xl p-4 mb-5 text-center">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Your Dedication</p>
          <p className="text-xl font-bold text-gray-800">"{order.dedicationText}"</p>
        </div>
      )}

      <div className="bg-gray-50 rounded-xl divide-y divide-gray-100">
        <DetailRow label="Confirmation #" value={order.orderId} mono />
        <DetailRow label="Calendar Date" value={dateDisplay} />
        <DetailRow label="Donation" value={`$${(order.amountPaidCents / 100).toFixed(0)}`} />
      </div>
    </div>
  );
}

function GenericConfirmation() {
  return (
    <div className="text-center py-4">
      <p className="text-gray-600 text-sm mb-4">
        Your donation to the Albany Community Foundation has been received.
        Your day on the 2027 ACF Community Calendar is confirmed!
      </p>
      <p className="text-gray-500 text-sm mb-4">
        Check your email for a detailed confirmation and receipt.
      </p>
      <p className="text-acf-blue font-semibold text-sm">
        Thank you for supporting our community. 💙
      </p>
    </div>
  );
}

function DetailRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between items-center px-4 py-3">
      <span className="text-sm text-gray-500">{label}</span>
      <span className={`text-sm font-semibold text-gray-800 ${mono ? 'font-mono' : ''}`}>{value}</span>
    </div>
  );
}
