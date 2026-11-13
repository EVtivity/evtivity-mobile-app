// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

import { openRoute, pushTarget } from '@/lib/push-route';

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

  it('opens the vehicles for an Autocharge start', () => {
    expect(pushTarget({ eventType: 'session.AutochargeStarted', stationId: 'CS-1' })).toBe(
      '/account/vehicles',
    );
  });

  it('opens the payment methods for the fleet billing notices', () => {
    expect(pushTarget({ eventType: 'fleet.AccountBillingChanged' })).toBe(
      '/account/payment-methods',
    );
    expect(pushTarget({ eventType: 'payment.AccountCreditLimit' })).toBe(
      '/account/payment-methods',
    );
  });

  it('opens the invoice a member invoice notice names', () => {
    for (const eventType of [
      'invoice.MemberInvoice',
      'invoice.MemberCreditNote',
      'invoice.MemberOverdue',
    ]) {
      expect(pushTarget({ eventType, invoiceId: 'inv_1' })).toEqual({
        pathname: '/account/invoices/[id]',
        params: { id: 'inv_1' },
      });
    }
  });

  it('opens the invoice list for an invoice notice without an id', () => {
    expect(pushTarget({ eventType: 'invoice.MemberInvoice' })).toBe('/account/invoices');
    expect(pushTarget({ eventType: 'invoice.MemberOverdue', invoiceId: '' })).toBe(
      '/account/invoices',
    );
  });

  it('opens the account for anything else', () => {
    expect(pushTarget({ eventType: 'payment.Failed' })).toBe('/(tabs)/account');
    expect(pushTarget(null)).toBe('/(tabs)/account');
    expect(pushTarget(undefined)).toBe('/(tabs)/account');
  });
});

describe('openRoute', () => {
  const opener = () => ({ push: jest.fn(), dismissTo: jest.fn() });

  it('goes back to the open Support list from a support screen', () => {
    for (const pathname of ['/support', '/support/c1', '/support/new']) {
      const router = opener();
      openRoute(router, '/support', pathname);
      expect(router.dismissTo).toHaveBeenCalledWith('/support');
      expect(router.push).not.toHaveBeenCalled();
    }
  });

  it('pushes with the anchor from anywhere else', () => {
    const router = opener();
    openRoute(router, '/support', '/supporting');
    openRoute(router, '/account/vehicles', '/support/c1');
    expect(router.push).toHaveBeenNthCalledWith(1, '/support', { withAnchor: true });
    expect(router.push).toHaveBeenNthCalledWith(2, '/account/vehicles', { withAnchor: true });
    expect(router.dismissTo).not.toHaveBeenCalled();
  });
});
