'use client';

import React, { useState, useEffect } from 'react';
import type { Settings } from '@/types';

export default function SettingsForm() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetch('/api/admin/settings')
      .then((r) => r.json())
      .then(setSettings);
  }, []);

  const save = async () => {
    if (!settings) return;
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emojisAllowed: settings.emojisAllowed,
          textRequired: settings.textRequired,
          priceInCents: settings.priceInCents,
          salesStartDate: settings.salesStartDate || null,
          salesEndDate: settings.salesEndDate || null,
          acfAdminEmail: settings.acfAdminEmail,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMessage({ type: 'success', text: 'Settings saved successfully.' });
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Save failed' });
    } finally {
      setSaving(false);
    }
  };

  if (!settings) {
    return <div className="py-8 text-center text-gray-400">Loading settings…</div>;
  }

  const set = <K extends keyof Settings>(key: K, value: Settings[K]) => {
    setSettings((s) => s ? { ...s, [key]: value } : s);
  };

  return (
    <div className="max-w-xl">
      {message && (
        <div className={`mb-6 p-3 rounded-lg text-sm ${
          message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {message.text}
        </div>
      )}

      <div className="space-y-6">
        {/* Price */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-900 mb-4">Pricing</h3>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Price per Day (in cents)
            </label>
            <div className="flex items-center gap-2">
              <span className="text-gray-500 text-sm">$</span>
              <input
                type="number"
                min={100}
                max={100000}
                step={100}
                value={settings.priceInCents / 100}
                onChange={(e) => set('priceInCents', Math.round(parseFloat(e.target.value) * 100))}
                className="w-32 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-acf-blue focus:outline-none"
              />
              <span className="text-xs text-gray-400">per day</span>
            </div>
            <p className="text-xs text-gray-400 mt-1">Default: $100. Change takes effect for new purchases only.</p>
          </div>
        </div>

        {/* Dedication text settings */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-900 mb-4">Dedication Text</h3>
          <div className="space-y-4">
            <ToggleSetting
              id="textRequired"
              label="Require dedication text"
              description="When on, buyers must enter a dedication before purchasing."
              checked={settings.textRequired}
              onChange={(v) => set('textRequired', v)}
            />
            <ToggleSetting
              id="emojisAllowed"
              label="Allow emojis in dedication text"
              description="When off, only letters, numbers, and basic punctuation are allowed."
              checked={settings.emojisAllowed}
              onChange={(v) => set('emojisAllowed', v)}
            />
          </div>
        </div>

        {/* Sales window */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-900 mb-4">Sales Window</h3>
          <p className="text-xs text-gray-400 mb-4">Leave blank to allow purchases at any time.</p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sales Start Date</label>
              <input
                type="datetime-local"
                value={settings.salesStartDate ? settings.salesStartDate.replace('Z', '') : ''}
                onChange={(e) => set('salesStartDate', e.target.value ? new Date(e.target.value).toISOString() : undefined)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-acf-blue focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sales End Date</label>
              <input
                type="datetime-local"
                value={settings.salesEndDate ? settings.salesEndDate.replace('Z', '') : ''}
                onChange={(e) => set('salesEndDate', e.target.value ? new Date(e.target.value).toISOString() : undefined)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-acf-blue focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Notification email */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-900 mb-4">Admin Notifications</h3>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Internal Notification Email
            </label>
            <input
              type="email"
              value={settings.acfAdminEmail}
              onChange={(e) => set('acfAdminEmail', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-acf-blue focus:outline-none"
              placeholder="admin@albanycf.org"
            />
            <p className="text-xs text-gray-400 mt-1">New purchase notifications are sent here.</p>
          </div>
        </div>
      </div>

      <div className="mt-6">
        <button
          onClick={save}
          disabled={saving}
          className="px-6 py-3 bg-acf-blue text-white rounded-xl hover:bg-acf-blue-dark transition-colors font-semibold disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save Settings'}
        </button>
      </div>
    </div>
  );
}

function ToggleSetting({ id, label, description, checked, onChange }: {
  id: string; label: string; description: string; checked: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start gap-3">
      <button
        id={id}
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={[
          'relative flex-shrink-0 w-11 h-6 rounded-full transition-colors mt-0.5',
          checked ? 'bg-acf-blue' : 'bg-gray-200',
        ].join(' ')}
      >
        <span className={[
          'absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform',
          checked ? 'translate-x-5' : 'translate-x-0',
        ].join(' ')} />
      </button>
      <label htmlFor={id} className="cursor-pointer" onClick={() => onChange(!checked)}>
        <span className="block text-sm font-medium text-gray-700">{label}</span>
        <span className="block text-xs text-gray-400 mt-0.5">{description}</span>
      </label>
    </div>
  );
}
