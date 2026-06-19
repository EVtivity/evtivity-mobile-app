// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

import { reservationStatusVariant, supportCaseStatusVariant } from '@/lib/status-variants';

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
