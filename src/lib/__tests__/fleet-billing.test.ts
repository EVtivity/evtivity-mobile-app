// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

import { accountBillingStateKey, billedToFleet } from '@/lib/fleet-billing';

const account = { mode: 'account' as const, fleetName: 'Acme' };
const card = { mode: 'card' as const, fleetName: null };

describe('billedToFleet', () => {
  it('uses the charger pricing once it is loaded', () => {
    expect(billedToFleet({ billing: account }, card)).toBe('Acme');
    expect(billedToFleet({ billing: card }, account)).toBeNull();
  });

  it('bills nothing to the fleet at a free vend site', () => {
    expect(billedToFleet({ billing: null }, account)).toBeNull();
  });

  it('treats an API without the field as card', () => {
    expect(billedToFleet({}, account)).toBeNull();
  });

  it('falls back to the driver profile while the pricing is missing', () => {
    expect(billedToFleet(undefined, account)).toBe('Acme');
    expect(billedToFleet(undefined, card)).toBeNull();
    expect(billedToFleet(undefined, undefined)).toBeNull();
  });
});

describe('accountBillingStateKey', () => {
  it('names the state key', () => {
    expect(accountBillingStateKey('invoiced')).toBe('fleetBilling.state.invoiced');
  });
});
