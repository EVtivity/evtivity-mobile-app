// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

import {
  SESSION_REFETCH_MS,
  SETTLE_POLL_CAP_MS,
  createSettleTracker,
  isSessionSettled,
  sessionListStateKey,
  type RefreshableSession,
} from '@/lib/session-refresh';

function session(
  status: string,
  paymentStatus: string | null,
  accountBilling?: RefreshableSession['accountBilling'],
): RefreshableSession {
  return {
    status,
    payment: paymentStatus == null ? null : { status: paymentStatus },
    ...(accountBilling !== undefined ? { accountBilling } : {}),
  };
}

describe('isSessionSettled', () => {
  it('is never settled while the session charges', () => {
    expect(isSessionSettled(session('active', 'captured'))).toBe(false);
    expect(isSessionSettled(session('active', null))).toBe(false);
  });

  it.each(['pending', 'pre_authorized'])('waits on an ended session paid %s', (status) => {
    expect(isSessionSettled(session('completed', status))).toBe(false);
  });

  it.each(['captured', 'partially_refunded', 'refunded', 'failed', 'cancelled'])(
    'is settled once the payment is %s',
    (status) => {
      expect(isSessionSettled(session('completed', status))).toBe(true);
    },
  );

  it('is settled without a card payment: fleet on account, free or prepaid', () => {
    expect(isSessionSettled(session('completed', null, { state: 'unbilled' }))).toBe(true);
    expect(isSessionSettled(session('completed', null))).toBe(true);
    expect(isSessionSettled(session('failed', null))).toBe(true);
  });

  it('keeps polling a status it does not know', () => {
    expect(isSessionSettled(session('completed', 'unknown'))).toBe(false);
  });
});

describe('sessionListStateKey', () => {
  it('changes when the payment or the fleet billing state changes', () => {
    const preAuth = sessionListStateKey(session('completed', 'pre_authorized'));
    const captured = sessionListStateKey(session('completed', 'captured'));
    const unbilled = sessionListStateKey(session('completed', null, { state: 'unbilled' }));
    const invoiced = sessionListStateKey(session('completed', null, { state: 'invoiced' }));
    expect(preAuth).not.toBe(captured);
    expect(unbilled).not.toBe(invoiced);
    expect(sessionListStateKey(session('active', null, null))).toBe('active||');
  });
});

describe('createSettleTracker', () => {
  it('does not poll before the session loads', () => {
    expect(createSettleTracker().refetchInterval('s', undefined, 0)).toBe(false);
  });

  it('polls a charging session', () => {
    expect(createSettleTracker().refetchInterval('s', session('active', 'pre_authorized'), 0)).toBe(
      SESSION_REFETCH_MS,
    );
  });

  it('keeps polling an ended session until its payment settles, then stops', () => {
    const tracker = createSettleTracker();
    expect(tracker.refetchInterval('s', session('completed', 'pre_authorized'), 1_000)).toBe(
      SESSION_REFETCH_MS,
    );
    expect(tracker.refetchInterval('s', session('completed', 'pre_authorized'), 6_000)).toBe(
      SESSION_REFETCH_MS,
    );
    expect(tracker.refetchInterval('s', session('completed', 'captured'), 11_000)).toBe(false);
  });

  it('does not poll a settled fleet session', () => {
    const fleet = session('completed', null, { state: 'unbilled' });
    expect(createSettleTracker().refetchInterval('s', fleet, 0)).toBe(false);
  });

  it('stops polling a stuck payment at the cap', () => {
    const tracker = createSettleTracker();
    const stuck = session('completed', 'pre_authorized');
    expect(tracker.refetchInterval('s', stuck, 0)).toBe(SESSION_REFETCH_MS);
    expect(tracker.refetchInterval('s', stuck, SETTLE_POLL_CAP_MS - 1)).toBe(SESSION_REFETCH_MS);
    expect(tracker.refetchInterval('s', stuck, SETTLE_POLL_CAP_MS)).toBe(false);
    // Reopening the screen later does not restart the window.
    expect(tracker.refetchInterval('s', stuck, SETTLE_POLL_CAP_MS * 5)).toBe(false);
  });

  it('keeps the cap per session', () => {
    const tracker = createSettleTracker();
    const stuck = session('completed', 'pending');
    tracker.refetchInterval('a', stuck, 0);
    expect(tracker.refetchInterval('a', stuck, SETTLE_POLL_CAP_MS)).toBe(false);
    expect(tracker.refetchInterval('b', stuck, SETTLE_POLL_CAP_MS)).toBe(SESSION_REFETCH_MS);
  });

  it('restarts the window when the session charges again', () => {
    const tracker = createSettleTracker();
    const stuck = session('completed', 'pre_authorized');
    tracker.refetchInterval('s', stuck, 0);
    expect(tracker.refetchInterval('s', session('active', 'pre_authorized'), 1_000)).toBe(
      SESSION_REFETCH_MS,
    );
    expect(tracker.refetchInterval('s', stuck, SETTLE_POLL_CAP_MS)).toBe(SESSION_REFETCH_MS);
  });
});
