// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

/** The data the API attaches to a driver push (notification-dispatch). */
export interface PushData {
  eventType?: string;
  stationId?: string;
  /** Member invoice notices: the invoice or credit note the push is about. */
  invoiceId?: string;
}

export type PushTarget =
  | { pathname: '/charge/[stationId]'; params: { stationId: string } }
  | { pathname: '/account/invoices/[id]'; params: { id: string } }
  | '/support'
  | '/(tabs)'
  | '/account/payment-methods'
  | '/account/invoices'
  | '/account/vehicles'
  | '/(tabs)/account';

// Fleet billing notices are about how the driver pays: the payment methods
// screen shows the fleet the driver is billed to, or the cards to add.
const PAYMENT_EVENTS = new Set(['fleet.AccountBillingChanged', 'payment.AccountCreditLimit']);

export const AUTOCHARGE_STARTED = 'session.AutochargeStarted';

// A member invoice, its credit note and the overdue reminder open the invoice
// the push names, or the invoice list when the push carries no id.
const INVOICE_EVENTS = new Set([
  'invoice.MemberInvoice',
  'invoice.MemberCreditNote',
  'invoice.MemberOverdue',
]);

/** Where a tap on a push notification opens the app. */
export function pushTarget(data: PushData | null | undefined): PushTarget {
  const evt = data?.eventType ?? '';
  if (evt.startsWith('watch') && typeof data?.stationId === 'string' && data.stationId !== '') {
    return { pathname: '/charge/[stationId]', params: { stationId: data.stationId } };
  }
  if (INVOICE_EVENTS.has(evt)) {
    const id = data?.invoiceId;
    if (typeof id === 'string' && id !== '') {
      return { pathname: '/account/invoices/[id]', params: { id } };
    }
    return '/account/invoices';
  }
  if (evt.startsWith('support')) return '/support';
  // An Autocharge start opens the Vehicles screen, where the driver turns
  // Autocharge off if it was not them (the portal notice links there too).
  if (evt === AUTOCHARGE_STARTED) return '/account/vehicles';
  if (evt.startsWith('session')) return '/(tabs)';
  if (PAYMENT_EVENTS.has(evt)) return '/account/payment-methods';
  return '/(tabs)/account';
}
