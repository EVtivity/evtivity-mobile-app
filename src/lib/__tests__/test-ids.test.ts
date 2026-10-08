// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

import {
  stationCardTestId,
  connectorTileTestId,
  sessionStateTestId,
  paymentStatusTestId,
  fleetBillingStateTestId,
} from '@/lib/test-ids';

describe('test ids', () => {
  it('keys station cards and connector tiles', () => {
    expect(stationCardTestId('CS-0001')).toBe('station-card-CS-0001');
    expect(connectorTileTestId(2)).toBe('station-connector-2');
  });

  it('names the session state: charging, idle, or the ended status', () => {
    expect(sessionStateTestId('active', false)).toBe('session-state-charging');
    expect(sessionStateTestId('active', true)).toBe('session-state-idle');
    expect(sessionStateTestId('completed', false)).toBe('session-state-completed');
    expect(sessionStateTestId('faulted', false)).toBe('session-state-faulted');
  });

  it('carries the payment status and the fleet billing state', () => {
    expect(paymentStatusTestId('captured')).toBe('session-payment-status-captured');
    expect(fleetBillingStateTestId('unbilled')).toBe('session-fleet-billing-state-unbilled');
  });
});
