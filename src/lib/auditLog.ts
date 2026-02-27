/**
 * src/lib/auditLog.ts
 * Helpers for creating audit log entries.
 */

import { prisma } from './prisma';

interface AuditEntry {
  calendarDayId: string;
  action: string;
  oldValue?: Record<string, unknown>;
  newValue?: Record<string, unknown>;
  performedBy: string;
  ipAddress?: string;
  notes?: string;
}

export async function createAuditLog(entry: AuditEntry): Promise<void> {
  await prisma.auditLog.create({
    data: {
      calendarDayId: entry.calendarDayId,
      action: entry.action,
      oldValue: entry.oldValue ?? undefined,
      newValue: entry.newValue ?? undefined,
      performedBy: entry.performedBy,
      ipAddress: entry.ipAddress,
      notes: entry.notes,
    },
  });
}

// Common action constants
export const AUDIT_ACTIONS = {
  STATUS_CHANGE: 'STATUS_CHANGE',
  TEXT_EDIT: 'TEXT_EDIT',
  HOLD_CREATED: 'HOLD_CREATED',
  HOLD_RELEASED: 'HOLD_RELEASED',
  CHECKOUT_HOLD_CREATED: 'CHECKOUT_HOLD_CREATED',
  CHECKOUT_HOLD_EXPIRED: 'CHECKOUT_HOLD_EXPIRED',
  PAYMENT_RECEIVED: 'PAYMENT_RECEIVED',
  REFUND_ISSUED: 'REFUND_ISSUED',
  DATE_RESTORED: 'DATE_RESTORED',
} as const;
