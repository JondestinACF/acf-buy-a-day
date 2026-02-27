'use client';

/**
 * Admin dashboard — overview stats, day management table, audit log, CSV export.
 */

import React, { useEffect, useState } from 'react';
import DayTable from '@/components/admin/DayTable';

interface Stats {
  available: number;
  sold: number;
  adminHold: number;
  checkoutHold: number;
  totalRevenue: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [auditLogs, setAuditLogs] = useState<Array<{
    id: string; date: string; action: string; performedBy: string; createdAt: string; notes?: string;
  }>>([]);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    fetchStats();
    fetchAuditLogs();
  }, []);

  async function fetchStats() {
    try {
      const res = await fetch('/api/admin/days?limit=400');
      const data = await res.json();
      const days = data.days || [];
      setStats({
        available: days.filter((d: { status: string }) => d.status === 'AVAILABLE').length,
        sold: days.filter((d: { status: string }) => d.status === 'SOLD').length,
        adminHold: days.filter((d: { status: string }) => d.status === 'ADMIN_HOLD').length,
        checkoutHold: days.filter((d: { status: string }) => d.status === 'CHECKOUT_HOLD').length,
        totalRevenue: days
          .filter((d: { status: string }) => d.status === 'SOLD')
          .reduce((sum: number, d: { amountPaidCents?: number }) => sum + (d.amountPaidCents || 0), 0),
      });
    } catch (e) {
      console.error('Failed to load stats', e);
    }
  }

  async function fetchAuditLogs() {
    try {
      const res = await fetch('/api/admin/audit-log?limit=10');
      const data = await res.json();
      setAuditLogs(data.logs || []);
    } catch (e) {
      console.error('Failed to load audit logs', e);
    }
  }

  async function handleExport() {
    setExporting(true);
    try {
      const res = await fetch('/api/admin/export');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = res.headers.get('content-disposition')?.split('filename="')[1]?.slice(0, -1)
        || 'acf-export.csv';
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-400 text-sm mt-1">2027 ACF Community Calendar — Buy a Day</p>
        </div>
        <button
          onClick={handleExport}
          disabled={exporting}
          className="flex items-center gap-2 px-4 py-2 bg-acf-green text-white rounded-xl text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-50"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          {exporting ? 'Exporting…' : 'Export CSV'}
        </button>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Available"
          value={stats?.available ?? '—'}
          color="text-green-600 bg-green-50"
          icon="🟢"
        />
        <StatCard
          label="Sold"
          value={stats?.sold ?? '—'}
          color="text-acf-blue bg-blue-50"
          icon="✅"
        />
        <StatCard
          label="Admin Hold"
          value={stats?.adminHold ?? '—'}
          color="text-amber-600 bg-amber-50"
          icon="⏸️"
        />
        <StatCard
          label="Revenue"
          value={stats ? `$${(stats.totalRevenue / 100).toLocaleString()}` : '—'}
          color="text-purple-600 bg-purple-50"
          icon="💰"
        />
      </div>

      {/* Days table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Calendar Days</h2>
        <DayTable onRefresh={fetchStats} />
      </div>

      {/* Recent audit log */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
          <button
            onClick={fetchAuditLogs}
            className="text-xs text-acf-blue hover:underline"
          >
            Refresh
          </button>
        </div>
        {auditLogs.length === 0 ? (
          <p className="text-gray-400 text-sm">No activity yet.</p>
        ) : (
          <div className="space-y-3">
            {auditLogs.map((log) => (
              <div key={log.id} className="flex items-start gap-3 text-sm">
                <span className="font-mono text-xs text-gray-400 flex-shrink-0 mt-0.5 w-20">
                  {log.date}
                </span>
                <div className="flex-1 min-w-0">
                  <span className="inline-block px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded text-xs font-mono mr-2">
                    {log.action}
                  </span>
                  <span className="text-gray-500 text-xs">{log.notes || ''}</span>
                </div>
                <span className="text-xs text-gray-400 flex-shrink-0">
                  {new Date(log.createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, color, icon }: {
  label: string; value: string | number; color: string; icon: string;
}) {
  return (
    <div className={`rounded-xl p-5 ${color}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium opacity-70 uppercase tracking-wider">{label}</span>
        <span className="text-lg">{icon}</span>
      </div>
      <p className="text-3xl font-extrabold">{value}</p>
    </div>
  );
}
