// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

// Same cases as packages/lib/src/__tests__/price-display.test.ts in the CSMS,
// so the app's display rules stay identical to @evtivity/lib/price-display.

import {
  DEFAULT_PRICE_DISPLAY,
  costContainsTax,
  formatTaxRatePercent,
  isPriceDisplay,
  priceForDisplay,
  resolvePriceDisplay,
} from '@/lib/price-display';

describe('isPriceDisplay', () => {
  it('accepts gross and net only', () => {
    expect(isPriceDisplay('gross')).toBe(true);
    expect(isPriceDisplay('net')).toBe(true);
    expect(isPriceDisplay('brutto')).toBe(false);
    expect(isPriceDisplay(null)).toBe(false);
  });
});

describe('resolvePriceDisplay', () => {
  it('prefers the driver choice over the company setting', () => {
    expect(resolvePriceDisplay('net', 'gross')).toBe('net');
    expect(resolvePriceDisplay(null, 'gross')).toBe('gross');
  });

  it('falls back to net when neither is set', () => {
    expect(DEFAULT_PRICE_DISPLAY).toBe('net');
    expect(resolvePriceDisplay(null, undefined)).toBe('net');
    expect(resolvePriceDisplay('invalid', 'invalid')).toBe('net');
  });
});

describe('priceForDisplay', () => {
  it('adds the tax rate for gross display only', () => {
    expect(priceForDisplay(0.2152, 0.19, 'gross')).toBeCloseTo(0.256088, 6);
    expect(priceForDisplay(0.2152, 0.19, 'net')).toBe(0.2152);
    expect(priceForDisplay(0.2152, 0, 'gross')).toBe(0.2152);
  });

  it('matches grossPrice for gross display', () => {
    expect(priceForDisplay(0.1, 0.19, 'gross')).toBeCloseTo(0.119, 10);
    expect(priceForDisplay(2, 0, 'gross')).toBe(2);
  });
});

describe('formatTaxRatePercent', () => {
  it('formats a tax rate as a percentage without trailing zeros', () => {
    expect(formatTaxRatePercent(0.19)).toBe('19');
    expect(formatTaxRatePercent(0.075)).toBe('7.5');
    expect(formatTaxRatePercent(0.075, 'de')).toBe('7,5');
    expect(formatTaxRatePercent(0.12345)).toBe('12.35');
  });
});

describe('costContainsTax', () => {
  it('is true only for an amount above 0 whose stored tax is above 0', () => {
    expect(costContainsTax(1190, 190)).toBe(true);
    expect(costContainsTax(1190, 0)).toBe(false);
    expect(costContainsTax(1190, null)).toBe(false);
    expect(costContainsTax(0, 0)).toBe(false);
    expect(costContainsTax(null, 190)).toBe(false);
    expect(costContainsTax(undefined, undefined)).toBe(false);
  });
});
