// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

import en from '@/lib/i18n/en.json';
import {
  isPaymentStatus,
  paymentStatusVariant,
  reservationStatusVariant,
  supportCaseStatusVariant,
} from '@/lib/status-variants';
import type { PaymentStatus } from '@/lib/types';

const PAYMENT_STATUSES: PaymentStatus[] = [
  'pending',
  'pre_authorized',
  'captured',
  'partially_refunded',
  'refunded',
  'failed',
  'cancelled',
];

describe('paymentStatusVariant', () => {
  it.each([
    ['pending', 'info'],
    ['pre_authorized', 'info'],
    ['captured', 'success'],
    ['partially_refunded', 'warning'],
    ['refunded', 'warning'],
    ['failed', 'destructive'],
    ['cancelled', 'secondary'],
  ])('maps %s to %s', (status, variant) => {
    expect(paymentStatusVariant(status)).toBe(variant);
  });

  it.each(['paid', 'succeeded', 'declined', 'voided', 'processing', ''])(
    'falls back to secondary for the unknown status %p',
    (status) => {
      expect(isPaymentStatus(status)).toBe(false);
      expect(paymentStatusVariant(status)).toBe('secondary');
    },
  );

  it('recognizes every PaymentStatus', () => {
    for (const status of PAYMENT_STATUSES) expect(isPaymentStatus(status)).toBe(true);
  });

  it('has a label for exactly the PaymentStatus values', () => {
    expect(Object.keys(en.paymentStatus).sort()).toEqual([...PAYMENT_STATUSES].sort());
  });
});

describe('reservationStatusVariant', () => {
  it.each([
    ['active', 'success'],
    ['scheduled', 'info'],
    ['used', 'secondary'],
    ['cancelled', 'destructive'],
    ['system_cancelled', 'destructive'],
    ['expired', 'warning'],
    ['unknown', 'secondary'],
  ])('maps %s to %s', (status, variant) => {
    expect(reservationStatusVariant(status)).toBe(variant);
  });
});

describe('supportCaseStatusVariant', () => {
  it.each([
    ['open', 'info'],
    ['in_progress', 'info'],
    ['waiting_on_driver', 'warning'],
    ['resolved', 'success'],
    ['closed', 'secondary'],
    ['unknown', 'secondary'],
  ])('maps %s to %s', (status, variant) => {
    expect(supportCaseStatusVariant(status)).toBe(variant);
  });
});
