// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

import type { PaymentStatus } from '@/lib/types';

export type BadgeVariant = 'success' | 'secondary' | 'warning' | 'destructive' | 'info';

const PAYMENT_STATUSES: ReadonlySet<string> = new Set<PaymentStatus>([
  'pending',
  'pre_authorized',
  'captured',
  'partially_refunded',
  'refunded',
  'failed',
  'cancelled',
]);

export function isPaymentStatus(status: string): status is PaymentStatus {
  return PAYMENT_STATUSES.has(status);
}

// Session payment status -> Badge variant. Values outside PaymentStatus (an API
// newer than the app) fall back to secondary. The switch is exhaustive, so a new
// PaymentStatus member fails the typecheck until it gets a variant.
export function paymentStatusVariant(status: string): BadgeVariant {
  if (!isPaymentStatus(status)) return 'secondary';
  switch (status) {
    case 'pending':
    case 'pre_authorized':
      return 'info';
    case 'captured':
      return 'success';
    case 'partially_refunded':
    case 'refunded':
      return 'warning';
    case 'failed':
      return 'destructive';
    case 'cancelled':
      return 'secondary';
    default: {
      const unhandled: never = status;
      return unhandled;
    }
  }
}

// Reservation status -> Badge variant. Shared by the reservation list and detail.
export function reservationStatusVariant(status: string): BadgeVariant {
  switch (status) {
    case 'active':
      return 'success';
    case 'scheduled':
      return 'info';
    case 'used':
      return 'secondary';
    case 'cancelled':
    case 'system_cancelled':
      return 'destructive';
    case 'expired':
      return 'warning';
    default:
      return 'secondary';
  }
}

// Support case status -> Badge variant. Shared by the support list and detail.
// Amber is reserved for the one state that needs the driver's action
// (waiting_on_driver); in_progress is neutral, resolved is positive.
export function supportCaseStatusVariant(status: string): BadgeVariant {
  switch (status) {
    case 'open':
      return 'info';
    case 'in_progress':
      return 'info';
    case 'waiting_on_driver':
      return 'warning';
    case 'resolved':
      return 'success';
    case 'closed':
      return 'secondary';
    default:
      return 'secondary';
  }
}
