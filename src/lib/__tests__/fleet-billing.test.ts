// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

import {
  accountBillingAt,
  accountBillingStateKey,
  billedToFleet,
  isMemberBilled,
} from '@/lib/fleet-billing';

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

  it('words the state for the driver when the fleet invoices its members', () => {
    expect(accountBillingStateKey('invoiced', 'member')).toBe('fleetBilling.stateMember.invoiced');
    expect(accountBillingStateKey('paid', 'fleet')).toBe('fleetBilling.state.paid');
  });
});

describe('accountBillingAt', () => {
  const member = { mode: 'account' as const, fleetName: 'Acme', invoicedTo: 'member' as const };

  it('says who gets the invoice', () => {
    expect(accountBillingAt({ billing: member }, card)).toEqual({
      fleetName: 'Acme',
      invoicedTo: 'member',
    });
    expect(accountBillingAt(undefined, { ...member, invoicedTo: 'fleet' })).toEqual({
      fleetName: 'Acme',
      invoicedTo: 'fleet',
    });
  });

  it('treats an API without invoicedTo as the fleet', () => {
    expect(accountBillingAt({ billing: account }, undefined)).toEqual({
      fleetName: 'Acme',
      invoicedTo: 'fleet',
    });
  });

  it('is null for card, a free vend site and an account without a fleet name', () => {
    expect(accountBillingAt({ billing: card }, member)).toBeNull();
    expect(accountBillingAt({ billing: null }, member)).toBeNull();
    expect(accountBillingAt({ billing: { mode: 'account', fleetName: null } }, member)).toBeNull();
  });
});

describe('isMemberBilled', () => {
  it('is true only for member invoicing', () => {
    expect(isMemberBilled({ invoicedTo: 'member' })).toBe(true);
    expect(isMemberBilled({ invoicedTo: 'fleet' })).toBe(false);
    expect(isMemberBilled({ invoicedTo: null })).toBe(false);
    expect(isMemberBilled(undefined)).toBe(false);
  });
});
