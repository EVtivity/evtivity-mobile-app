// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

/** The data the API attaches to a driver push (notification-dispatch). */
export interface PushData {
  eventType?: string;
  stationId?: string;
}

export type PushTarget =
  | { pathname: '/charge/[stationId]'; params: { stationId: string } }
  | '/support'
  | '/(tabs)'
  | '/account/payment-methods'
  | '/(tabs)/account';

// Fleet billing notices are about how the driver pays: the payment methods
// screen shows the fleet the driver is billed to, or the cards to add.
const PAYMENT_EVENTS = new Set(['fleet.AccountBillingChanged', 'payment.AccountCreditLimit']);

/** Where a tap on a push notification opens the app. */
export function pushTarget(data: PushData | null | undefined): PushTarget {
  const evt = data?.eventType ?? '';
  if (evt.startsWith('watch') && typeof data?.stationId === 'string' && data.stationId !== '') {
    return { pathname: '/charge/[stationId]', params: { stationId: data.stationId } };
  }
  if (evt.startsWith('support')) return '/support';
  if (evt.startsWith('session')) return '/(tabs)';
  if (PAYMENT_EVENTS.has(evt)) return '/account/payment-methods';
  return '/(tabs)/account';
}
