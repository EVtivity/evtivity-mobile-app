// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

import { evseIsFree, type PricingInfo } from '@/features/charge';

const PRICING: PricingInfo = {
  currency: 'EUR',
  pricePerKwh: '0',
  pricePerMinute: null,
  pricePerSession: null,
  idleFeePricePerMinute: null,
  taxRate: null,
  isFreeVend: false,
  evseFree: [
    { evseId: 1, free: true },
    { evseId: 2, free: false },
  ],
};

describe('evseIsFree', () => {
  it('reads free or paid for the picked EVSE', () => {
    expect(evseIsFree(PRICING, 1)).toBe(true);
    expect(evseIsFree(PRICING, 2)).toBe(false);
  });

  it('says nothing without an EVSE, a reply or a server that sends it', () => {
    expect(evseIsFree(PRICING, null)).toBeNull();
    expect(evseIsFree(undefined, 1)).toBeNull();
    expect(evseIsFree({ ...PRICING, evseFree: undefined }, 1)).toBeNull();
    expect(evseIsFree(PRICING, 3)).toBeNull();
  });
});
