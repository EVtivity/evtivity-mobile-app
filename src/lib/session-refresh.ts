// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

import type { PaymentStatus } from '@/lib/types';

/** Poll interval of the session detail while it charges or its payment settles. */
export const SESSION_REFETCH_MS = 5_000;

/** Longest time an ended session is polled for its payment to settle. */
export const SETTLE_POLL_CAP_MS = 2 * 60_000;

const FINAL_PAYMENT_STATUSES: ReadonlySet<string> = new Set<PaymentStatus>([
  'captured',
  'partially_refunded',
  'refunded',
  'failed',
  'cancelled',
]);

/** The fields of GET /v1/portal/sessions/:id that decide whether to keep polling. */
export interface RefreshableSession {
  status: string;
  payment: { status: string } | null;
  accountBilling?: { state: string } | null;
}

/**
 * True when the session has ended and its payment can no longer change: the
 * card payment is captured, refunded, failed or cancelled, or there is no card
 * payment at all (billed to a fleet on account, free, or prepaid).
 */
export function isSessionSettled(session: RefreshableSession): boolean {
  if (session.status === 'active') return false;
  return session.payment == null || FINAL_PAYMENT_STATUSES.has(session.payment.status);
}

/**
 * The parts of a session the Activity list also shows. When it changes on the
 * detail screen, the list is out of date.
 */
export function sessionListStateKey(session: RefreshableSession): string {
  return [session.status, session.payment?.status ?? '', session.accountBilling?.state ?? ''].join(
    '|',
  );
}

export interface SettleTracker {
  /** TanStack Query refetchInterval for the session detail with this id. */
  refetchInterval(id: string, session: RefreshableSession | undefined, now: number): number | false;
}

/**
 * Decides how often to refetch a session detail. A charging session polls. An
 * ended session keeps polling until its payment settles, for at most
 * SETTLE_POLL_CAP_MS from the first time it was seen unsettled, so a stuck
 * payment never polls forever. The start time is kept per session id, so
 * reopening the screen does not restart the window.
 */
export function createSettleTracker(): SettleTracker {
  const unsettledSince = new Map<string, number>();
  return {
    refetchInterval(id, session, now) {
      if (session == null) return false;
      if (session.status === 'active' || isSessionSettled(session)) {
        unsettledSince.delete(id);
        return session.status === 'active' ? SESSION_REFETCH_MS : false;
      }
      const since = unsettledSince.get(id);
      if (since == null) {
        unsettledSince.set(id, now);
        return SESSION_REFETCH_MS;
      }
      return now - since < SETTLE_POLL_CAP_MS ? SESSION_REFETCH_MS : false;
    },
  };
}
