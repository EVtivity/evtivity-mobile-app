// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

import { pushTarget } from '@/lib/push-route';

describe('pushTarget', () => {
  it('opens the watched station', () => {
    expect(pushTarget({ eventType: 'watch.Available', stationId: 'CS-1' })).toEqual({
      pathname: '/charge/[stationId]',
      params: { stationId: 'CS-1' },
    });
  });

  it('opens the account for a watch push without a station', () => {
    expect(pushTarget({ eventType: 'watch.Available', stationId: '' })).toBe('/(tabs)/account');
    expect(pushTarget({ eventType: 'watch.Available' })).toBe('/(tabs)/account');
  });

  it('opens support and the home tab', () => {
    expect(pushTarget({ eventType: 'support.CaseReply' })).toBe('/support');
    expect(pushTarget({ eventType: 'session.Completed' })).toBe('/(tabs)');
  });

  it('opens the payment methods for the fleet billing notices', () => {
    expect(pushTarget({ eventType: 'fleet.AccountBillingChanged' })).toBe(
      '/account/payment-methods',
    );
    expect(pushTarget({ eventType: 'payment.AccountCreditLimit' })).toBe(
      '/account/payment-methods',
    );
  });

  it('opens the account for anything else', () => {
    expect(pushTarget({ eventType: 'payment.Failed' })).toBe('/(tabs)/account');
    expect(pushTarget(null)).toBe('/(tabs)/account');
    expect(pushTarget(undefined)).toBe('/(tabs)/account');
  });
});
