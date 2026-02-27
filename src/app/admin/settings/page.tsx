'use client';

import React from 'react';
import SettingsForm from '@/components/admin/SettingsForm';

export default function AdminSettingsPage() {
  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-400 text-sm mt-1">Configure the Buy a Day experience and sales rules.</p>
      </div>
      <SettingsForm />
    </div>
  );
}
