'use client';

/**
 * Step C: Collect buyer information — name, email, phone, billing address.
 */

import React, { useState } from 'react';
import { buyerInfoSchema } from '@/lib/validation';
import type { BuyerFormData } from '@/types';

interface StepBuyerInfoProps {
  initialData: Partial<BuyerFormData>;
  onNext: (data: BuyerFormData) => void;
  onBack: () => void;
}

type FormState = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  contactOptIn: boolean;
};

const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA',
  'ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK',
  'OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY',
];

// Defined outside component so React doesn't remount it on every render
function Field({ id, label, children, required = false, error }: {
  id: string; label: string; children: React.ReactNode; required?: boolean; error?: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
      {error && (
        <p className="mt-1 text-xs text-red-600" role="alert">{error}</p>
      )}
    </div>
  );
}

export default function StepBuyerInfo({ initialData, onNext, onBack }: StepBuyerInfoProps) {
  const [form, setForm] = useState<FormState>({
    firstName: initialData.firstName ?? '',
    lastName: initialData.lastName ?? '',
    email: initialData.email ?? '',
    phone: initialData.phone ?? '',
    line1: initialData.billingAddress?.line1 ?? '',
    line2: initialData.billingAddress?.line2 ?? '',
    city: initialData.billingAddress?.city ?? '',
    state: initialData.billingAddress?.state ?? 'NY',
    postal_code: initialData.billingAddress?.postal_code ?? '',
    country: initialData.billingAddress?.country ?? 'US',
    contactOptIn: initialData.contactOptIn ?? false,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);

  const set = (field: keyof FormState, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: '' }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);

    const parsed = buyerInfoSchema.safeParse({
      firstName: form.firstName,
      lastName: form.lastName,
      email: form.email,
      phone: form.phone || undefined,
      billingAddress: {
        line1: form.line1,
        line2: form.line2 || undefined,
        city: form.city,
        state: form.state,
        postal_code: form.postal_code,
        country: form.country,
      },
      contactOptIn: form.contactOptIn,
      dedicationText: '',
    });

    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path.join('.');
        fieldErrors[key] = issue.message;
      }
      // Flatten nested billing address errors
      const flatErrors: Record<string, string> = {};
      for (const [k, v] of Object.entries(fieldErrors)) {
        const flatKey = k.replace('billingAddress.', '');
        flatErrors[flatKey] = v;
      }
      setErrors(flatErrors);
      return;
    }

    const data = parsed.data;
    onNext({
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      phone: data.phone || undefined,
      billingAddress: {
        line1: form.line1,
        line2: form.line2 || undefined,
        city: form.city,
        state: form.state,
        postal_code: form.postal_code,
        country: form.country,
      },
      contactOptIn: data.contactOptIn,
      dedicationText: initialData.dedicationText ?? '',
    });
  };

  const inputClass = (field: string) => [
    'w-full px-3 py-2.5 rounded-lg border text-sm',
    'focus:outline-none focus:ring-2 focus:ring-acf-green focus:border-acf-green transition-colors',
    errors[field] ? 'border-red-400 bg-red-50' : 'border-gray-300',
  ].join(' ');

  return (
    <form onSubmit={handleSubmit} noValidate className="animate-slide-up">
      <h2 className="text-2xl font-bold text-gray-900 mb-1">Your Information</h2>
      <p className="text-gray-500 text-sm mb-6">
        We'll send your confirmation and donation receipt to the email below.
      </p>

      {/* Name row */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <Field id="firstName" label="First Name" required error={errors.firstName}>
          <input
            id="firstName" type="text" value={form.firstName} autoComplete="given-name"
            onChange={(e) => set('firstName', e.target.value)}
            className={inputClass('firstName')} aria-required="true"
          />
        </Field>
        <Field id="lastName" label="Last Name" required error={errors.lastName}>
          <input
            id="lastName" type="text" value={form.lastName} autoComplete="family-name"
            onChange={(e) => set('lastName', e.target.value)}
            className={inputClass('lastName')} aria-required="true"
          />
        </Field>
      </div>

      {/* Email */}
      <div className="mb-4">
        <Field id="email" label="Email Address" required error={errors.email}>
          <input
            id="email" type="email" value={form.email} autoComplete="email"
            onChange={(e) => set('email', e.target.value)}
            className={inputClass('email')} aria-required="true"
            placeholder="you@example.com"
          />
        </Field>
      </div>

      {/* Phone */}
      <div className="mb-6">
        <Field id="phone" label="Phone Number" error={errors.phone}>
          <input
            id="phone" type="tel" value={form.phone} autoComplete="tel"
            onChange={(e) => set('phone', e.target.value)}
            className={inputClass('phone')}
            placeholder="(518) 555-0100"
          />
        </Field>
      </div>

      {/* Billing address */}
      <div className="border-t border-gray-100 pt-5 mb-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Billing Address</h3>
        <div className="space-y-3">
          <Field id="line1" label="Street Address" required error={errors.line1}>
            <input
              id="line1" type="text" value={form.line1} autoComplete="address-line1"
              onChange={(e) => set('line1', e.target.value)}
              className={inputClass('line1')} aria-required="true"
            />
          </Field>
          <Field id="line2" label="Apt, Suite, etc." error={errors.line2}>
            <input
              id="line2" type="text" value={form.line2} autoComplete="address-line2"
              onChange={(e) => set('line2', e.target.value)}
              className={inputClass('line2')}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field id="city" label="City" required error={errors.city}>
              <input
                id="city" type="text" value={form.city} autoComplete="address-level2"
                onChange={(e) => set('city', e.target.value)}
                className={inputClass('city')} aria-required="true"
              />
            </Field>
            <Field id="state" label="State" required error={errors.state}>
              <select
                id="state" value={form.state} autoComplete="address-level1"
                onChange={(e) => set('state', e.target.value)}
                className={inputClass('state')} aria-required="true"
              >
                {US_STATES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field id="postal_code" label="ZIP Code" required error={errors.postal_code}>
              <input
                id="postal_code" type="text" value={form.postal_code} autoComplete="postal-code"
                onChange={(e) => set('postal_code', e.target.value)}
                className={inputClass('postal_code')} aria-required="true"
                maxLength={10}
              />
            </Field>
            <Field id="country" label="Country" error={errors.country}>
              <select
                id="country" value={form.country} autoComplete="country"
                onChange={(e) => set('country', e.target.value)}
                className={inputClass('country')}
              >
                <option value="US">United States</option>
                <option value="CA">Canada</option>
              </select>
            </Field>
          </div>
        </div>
      </div>

      {/* Contact opt-in */}
      <div className="mb-8">
        <label className="flex items-start gap-3 cursor-pointer group">
          <input
            type="checkbox"
            checked={form.contactOptIn}
            onChange={(e) => set('contactOptIn', e.target.checked)}
            className="mt-0.5 w-4 h-4 rounded border-gray-300 text-acf-green focus:ring-acf-green cursor-pointer"
          />
          <span className="text-sm text-gray-600 group-hover:text-gray-800 transition-colors">
            ACF may contact me about my donation and future programs.
          </span>
        </label>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <button
          type="button" onClick={onBack}
          className="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium"
        >
          ← Back
        </button>
        <button
          type="submit"
          className="flex-1 px-6 py-3 bg-acf-green text-white rounded-xl hover:bg-acf-green-dark transition-colors font-semibold shadow-sm"
        >
          Continue to Payment →
        </button>
      </div>
    </form>
  );
}
