'use client';

/**
 * DayTable.tsx
 * Admin table of calendar days with filtering, hold management, and refunds.
 */

import React, { useState, useEffect, useCallback } from 'react';
import type { AdminCalendarDay } from '@/types';

interface DayTableProps {
  onRefresh?: () => void;
}

const STATUS_BADGE: Record<string, string> = {
  AVAILABLE: 'bg-green-100 text-green-700',
  SOLD: 'bg-blue-100 text-blue-700',
  ADMIN_HOLD: 'bg-amber-100 text-amber-700',
  CHECKOUT_HOLD: 'bg-purple-100 text-purple-700',
};

export default function DayTable({ onRefresh }: DayTableProps) {
  const [days, setDays] = useState<AdminCalendarDay[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [monthFilter, setMonthFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);

  // Hold modal state
  const [holdModalDate, setHoldModalDate] = useState<string | null>(null);
  const [holdNote, setHoldNote] = useState('');
  const [holdLoading, setHoldLoading] = useState(false);

  // Edit dedication modal
  const [editDay, setEditDay] = useState<AdminCalendarDay | null>(null);
  const [editText, setEditText] = useState('');
  const [editLoading, setEditLoading] = useState(false);

  // Refund modal
  const [refundDay, setRefundDay] = useState<AdminCalendarDay | null>(null);
  const [restoreDate, setRestoreDate] = useState(true);
  const [refundLoading, setRefundLoading] = useState(false);
  const [refundReason, setRefundReason] = useState('');

  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchDays = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '31' });
      if (monthFilter) params.set('month', monthFilter);
      if (statusFilter) params.set('status', statusFilter);
      const res = await fetch(`/api/admin/days?${params}`);
      const data = await res.json();
      setDays(data.days || []);
      setTotal(data.total || 0);
    } finally {
      setLoading(false);
    }
  }, [page, monthFilter, statusFilter]);

  useEffect(() => { fetchDays(); }, [fetchDays]);

  const showMessage = (type: 'success' | 'error', text: string) => {
    setActionMessage({ type, text });
    setTimeout(() => setActionMessage(null), 4000);
  };

  // Create admin hold
  const handleCreateHold = async () => {
    if (!holdModalDate) return;
    setHoldLoading(true);
    try {
      const res = await fetch('/api/admin/holds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: holdModalDate, note: holdNote }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showMessage('success', `Admin hold created for ${holdModalDate}`);
      setHoldModalDate(null);
      setHoldNote('');
      fetchDays();
    } catch (err) {
      showMessage('error', err instanceof Error ? err.message : 'Failed');
    } finally {
      setHoldLoading(false);
    }
  };

  // Release admin hold
  const handleReleaseHold = async (date: string) => {
    if (!confirm(`Release hold on ${date}?`)) return;
    const res = await fetch('/api/admin/holds', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date }),
    });
    const data = await res.json();
    if (res.ok) { showMessage('success', `Hold released for ${date}`); fetchDays(); }
    else showMessage('error', data.error);
  };

  // Edit dedication text
  const handleEditSave = async () => {
    if (!editDay) return;
    setEditLoading(true);
    try {
      const res = await fetch(`/api/admin/days/${editDay.date}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dedicationText: editText, reason: 'Admin edit' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showMessage('success', 'Dedication updated');
      setEditDay(null);
      fetchDays();
    } catch (err) {
      showMessage('error', err instanceof Error ? err.message : 'Failed');
    } finally {
      setEditLoading(false);
    }
  };

  // Refund
  const handleRefund = async () => {
    if (!refundDay) return;
    if (!confirm(`Issue a refund for ${refundDay.date}? This cannot be undone.`)) return;
    setRefundLoading(true);
    try {
      const res = await fetch('/api/admin/refund', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: refundDay.date, restoreDate, reason: refundReason }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showMessage('success', `Refund issued. Stripe refund ID: ${data.refundId}`);
      setRefundDay(null);
      fetchDays();
    } catch (err) {
      showMessage('error', err instanceof Error ? err.message : 'Failed');
    } finally {
      setRefundLoading(false);
    }
  };

  const MONTHS = [
    '','2027-01','2027-02','2027-03','2027-04','2027-05','2027-06',
    '2027-07','2027-08','2027-09','2027-10','2027-11','2027-12',
  ];

  return (
    <div>
      {/* Action message */}
      {actionMessage && (
        <div className={`mb-4 p-3 rounded-lg text-sm ${
          actionMessage.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {actionMessage.text}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <select
          value={monthFilter}
          onChange={(e) => { setMonthFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-acf-blue focus:outline-none"
        >
          <option value="">All Months</option>
          {['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].map((m, i) => (
            <option key={m} value={MONTHS[i + 1]}>{m} 2027</option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-acf-blue focus:outline-none"
        >
          <option value="">All Statuses</option>
          <option value="AVAILABLE">Available</option>
          <option value="SOLD">Sold</option>
          <option value="ADMIN_HOLD">Admin Hold</option>
          <option value="CHECKOUT_HOLD">Checkout Hold</option>
        </select>
        <button
          onClick={fetchDays}
          className="px-3 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm hover:bg-gray-200 transition-colors"
        >
          Refresh
        </button>
        <span className="ml-auto self-center text-sm text-gray-500">{total} days</span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-gray-200">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Date</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Status</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Dedication</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Buyer</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Order</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Amount</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="text-center py-8 text-gray-400">Loading…</td></tr>
            ) : days.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-8 text-gray-400">No days found</td></tr>
            ) : days.map((day) => (
              <tr key={day.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 font-mono text-xs">{day.date}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[day.status]}`}>
                    {day.status.replace('_', ' ')}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-600 max-w-[120px] truncate">
                  {day.dedicationText || <span className="text-gray-300">—</span>}
                </td>
                <td className="px-4 py-3 text-xs">
                  {day.buyerEmail ? (
                    <div>
                      <p className="font-medium text-gray-800">{day.buyerFirstName} {day.buyerLastName}</p>
                      <p className="text-gray-400">{day.buyerEmail}</p>
                    </div>
                  ) : (
                    <span className="text-gray-300">—</span>
                  )}
                </td>
                <td className="px-4 py-3 font-mono text-xs text-gray-500">
                  {day.orderId || <span className="text-gray-300">—</span>}
                </td>
                <td className="px-4 py-3 text-sm font-medium">
                  {day.amountPaidCents
                    ? `$${(day.amountPaidCents / 100).toFixed(0)}`
                    : <span className="text-gray-300">—</span>}
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2 flex-wrap">
                    {day.status === 'AVAILABLE' && (
                      <button
                        onClick={() => { setHoldModalDate(day.date); setHoldNote(''); }}
                        className="text-xs px-2 py-1 bg-amber-100 text-amber-700 rounded hover:bg-amber-200 transition-colors"
                      >
                        Hold
                      </button>
                    )}
                    {day.status === 'ADMIN_HOLD' && (
                      <button
                        onClick={() => handleReleaseHold(day.date)}
                        className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors"
                      >
                        Release
                      </button>
                    )}
                    {day.status === 'SOLD' && (
                      <>
                        <button
                          onClick={() => { setEditDay(day); setEditText(day.dedicationText || ''); }}
                          className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                        >
                          Edit Text
                        </button>
                        <button
                          onClick={() => { setRefundDay(day); setRestoreDate(true); setRefundReason(''); }}
                          className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
                        >
                          Refund
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {total > 31 && (
        <div className="flex gap-2 mt-4 justify-center">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
            className="px-3 py-1.5 border border-gray-200 rounded text-sm disabled:opacity-40 hover:bg-gray-50">← Prev</button>
          <span className="px-3 py-1.5 text-sm text-gray-500">Page {page} of {Math.ceil(total / 31)}</span>
          <button onClick={() => setPage((p) => p + 1)} disabled={page >= Math.ceil(total / 31)}
            className="px-3 py-1.5 border border-gray-200 rounded text-sm disabled:opacity-40 hover:bg-gray-50">Next →</button>
        </div>
      )}

      {/* Hold Modal */}
      {holdModalDate && (
        <Modal title={`Create Admin Hold — ${holdModalDate}`} onClose={() => setHoldModalDate(null)}>
          <p className="text-sm text-gray-600 mb-4">This will mark the date as unavailable for purchase.</p>
          <label className="block text-sm font-medium text-gray-700 mb-1">Note (optional)</label>
          <input type="text" value={holdNote} onChange={(e) => setHoldNote(e.target.value)}
            maxLength={100} placeholder="e.g., Sponsor reserved, Board use"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm mb-4 focus:ring-2 focus:ring-acf-blue focus:outline-none" />
          <div className="flex gap-2 justify-end">
            <button onClick={() => setHoldModalDate(null)} className="px-4 py-2 border border-gray-200 rounded-lg text-sm hover:bg-gray-50">Cancel</button>
            <button onClick={handleCreateHold} disabled={holdLoading}
              className="px-4 py-2 bg-amber-500 text-white rounded-lg text-sm hover:bg-amber-600 disabled:opacity-50">
              {holdLoading ? 'Creating…' : 'Create Hold'}
            </button>
          </div>
        </Modal>
      )}

      {/* Edit Dedication Modal */}
      {editDay && (
        <Modal title={`Edit Dedication — ${editDay.date}`} onClose={() => setEditDay(null)}>
          <p className="text-sm text-gray-600 mb-4">Changes are logged in the audit trail.</p>
          <label className="block text-sm font-medium text-gray-700 mb-1">Dedication Text</label>
          <input type="text" value={editText} onChange={(e) => setEditText(e.target.value.slice(0, 20))}
            maxLength={20}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm mb-1 focus:ring-2 focus:ring-acf-blue focus:outline-none" />
          <p className="text-xs text-gray-400 mb-4">{editText.length}/20 characters</p>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setEditDay(null)} className="px-4 py-2 border border-gray-200 rounded-lg text-sm hover:bg-gray-50">Cancel</button>
            <button onClick={handleEditSave} disabled={editLoading}
              className="px-4 py-2 bg-acf-blue text-white rounded-lg text-sm hover:bg-acf-blue-dark disabled:opacity-50">
              {editLoading ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </Modal>
      )}

      {/* Refund Modal */}
      {refundDay && (
        <Modal title={`Refund — ${refundDay.date}`} onClose={() => setRefundDay(null)}>
          <p className="text-sm text-gray-600 mb-4">
            This will issue a Stripe refund of{' '}
            <strong>${((refundDay.amountPaidCents || 0) / 100).toFixed(0)}</strong> to the buyer.
          </p>
          <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
          <input type="text" value={refundReason} onChange={(e) => setRefundReason(e.target.value)}
            placeholder="e.g., Customer request"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm mb-4 focus:ring-2 focus:ring-acf-blue focus:outline-none" />
          <label className="flex items-center gap-2 mb-4 cursor-pointer">
            <input type="checkbox" checked={restoreDate} onChange={(e) => setRestoreDate(e.target.checked)}
              className="rounded border-gray-300 text-acf-blue" />
            <span className="text-sm text-gray-700">Restore date to Available after refund</span>
          </label>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setRefundDay(null)} className="px-4 py-2 border border-gray-200 rounded-lg text-sm hover:bg-gray-50">Cancel</button>
            <button onClick={handleRefund} disabled={refundLoading}
              className="px-4 py-2 bg-red-500 text-white rounded-lg text-sm hover:bg-red-600 disabled:opacity-50">
              {refundLoading ? 'Processing…' : 'Issue Refund'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function Modal({ title, onClose, children }: {
  title: string; onClose: () => void; children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
