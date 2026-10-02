// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

import i18next from 'i18next';
import {
  formatCurrency,
  formatUnitPrice,
  resolveLocale,
  uiLocale,
  formatEnergyWh,
  formatPowerKw,
  formatDateTime,
  formatDate,
  formatRelative,
  formatDuration,
  formatMiles,
  formatMonth,
  NA,
} from '@/lib/format';

// Same cases as packages/lib/src/__tests__/currency.test.ts in the CSMS, so the
// app formats money like @evtivity/lib/currency.
describe('formatCurrency', () => {
  it('formats minor units in the given currency', () => {
    expect(formatCurrency(1250, 'USD')).toBe('$12.50');
    expect(formatCurrency(1250, 'EUR')).toBe('€12.50');
    expect(formatCurrency(-500, 'GBP')).toBe('-£5.00');
  });
  it('falls back to the code for an invalid currency', () => {
    expect(formatCurrency(1250, 'xx')).toBe('XX 12.50');
  });
  it('formats in the given locale', () => {
    expect(formatCurrency(1250, 'EUR', 'de')).toBe('12,50\u00a0€');
    expect(formatCurrency(123456, 'EUR', 'de')).toBe('1.234,56\u00a0€');
    expect(formatCurrency(1250, 'EUR', 'en')).toBe('€12.50');
  });
  it('falls back to en-US for an invalid locale', () => {
    expect(formatCurrency(1250, 'USD', 'not a locale!')).toBe('$12.50');
  });
  it.each([null, undefined, NaN])('returns n/a for %p', (value) => {
    expect(formatCurrency(value, 'USD')).toBe('n/a');
  });
});

describe('formatUnitPrice', () => {
  it('keeps up to four fraction digits', () => {
    expect(formatUnitPrice(0.256088, 'EUR')).toBe('€0.2561');
    expect(formatUnitPrice(0.1, 'USD')).toBe('$0.10');
  });
  it('uses the separators of the locale', () => {
    expect(formatUnitPrice(0.2561, 'EUR', 'de')).toBe('0,2561\u00a0€');
  });
  it('falls back to the code for an invalid currency', () => {
    expect(formatUnitPrice(0.256, 'xx')).toBe('XX 0.26');
  });
});

describe('resolveLocale', () => {
  it('canonicalizes a valid locale', () => {
    expect(resolveLocale('zh-tw')).toBe('zh-TW');
  });
  it('falls back to en-US for an invalid locale', () => {
    expect(resolveLocale('not a locale!')).toBe('en-US');
  });
  it('falls back to en-US when Intl returns no locale', () => {
    const spy = jest.spyOn(Intl, 'getCanonicalLocales').mockReturnValue([]);
    expect(resolveLocale('en')).toBe('en-US');
    spy.mockRestore();
  });
});

describe('uiLocale', () => {
  it('is "en" before i18next is initialized', () => {
    expect(uiLocale()).toBe('en');
  });
  it('follows the i18next language once initialized', async () => {
    // eslint-disable-next-line import/no-named-as-default-member -- init is the documented instance method on the default export.
    await i18next.init({ lng: 'de', resources: {} });
    expect(uiLocale()).toBe('de');
    expect(formatCurrency(1250, 'EUR')).toBe('12,50\u00a0€');
    expect(formatUnitPrice(0.2561, 'EUR')).toBe('0,2561\u00a0€');
  });
});

describe('formatEnergyWh', () => {
  it('formats watt-hours as kWh', () => {
    expect(formatEnergyWh(2500)).toBe('2.50 kWh');
  });
  it.each([null, undefined, NaN])('returns n/a for %p', (value) => {
    expect(formatEnergyWh(value)).toBe('n/a');
  });
});

describe('formatPowerKw', () => {
  it('formats kilowatts', () => {
    expect(formatPowerKw(7.25)).toBe('7.3 kW');
  });
  it.each([null, undefined, NaN])('returns n/a for %p', (value) => {
    expect(formatPowerKw(value)).toBe('n/a');
  });
});

describe('formatDateTime', () => {
  it('formats a valid ISO timestamp', () => {
    expect(formatDateTime('2026-01-02T03:04:00Z')).not.toBe('n/a');
  });
  it('returns n/a for null', () => {
    expect(formatDateTime(null)).toBe('n/a');
  });
  it('returns n/a for an unparseable value', () => {
    expect(formatDateTime('not-a-date')).toBe('n/a');
  });
});

describe('formatDate', () => {
  it('formats a valid date', () => {
    expect(formatDate('2026-01-02T00:00:00Z')).not.toBe('n/a');
  });
  it('returns n/a for null', () => {
    expect(formatDate(null)).toBe('n/a');
  });
  it('returns n/a for an unparseable value', () => {
    expect(formatDate('nope')).toBe('n/a');
  });
});

describe('formatRelative', () => {
  const ago = (ms: number): string => new Date(Date.now() - ms).toISOString();
  it('returns n/a for null', () => {
    expect(formatRelative(null)).toBe('n/a');
  });
  it('returns n/a for an unparseable value', () => {
    expect(formatRelative('nope')).toBe('n/a');
  });
  it('reports seconds', () => {
    expect(formatRelative(ago(5_000))).toMatch(/\ds ago/);
  });
  it('reports minutes', () => {
    expect(formatRelative(ago(5 * 60_000))).toMatch(/\dm ago/);
  });
  it('reports hours', () => {
    expect(formatRelative(ago(5 * 3_600_000))).toMatch(/\dh ago/);
  });
  it('falls back to an absolute date past a day', () => {
    expect(formatRelative(ago(3 * 86_400_000))).not.toMatch(/ago/);
  });
});

describe('formatDuration', () => {
  it('returns n/a for an unparseable start', () => {
    expect(formatDuration('nope')).toBe('n/a');
  });
  it('formats sub-hour durations as minutes', () => {
    expect(formatDuration('2026-01-01T00:00:00Z', '2026-01-01T00:45:00Z')).toBe('45m');
  });
  it('formats multi-hour durations with hours and minutes', () => {
    expect(formatDuration('2026-01-01T00:00:00Z', '2026-01-01T02:30:00Z')).toBe('2h 30m');
  });
  it('clamps a negative span to zero', () => {
    expect(formatDuration('2026-01-01T01:00:00Z', '2026-01-01T00:00:00Z')).toBe('0m');
  });
  it('measures against now when no end is given', () => {
    const start = new Date(Date.now() - 90 * 60_000).toISOString();
    expect(formatDuration(start)).toBe('1h 30m');
  });
});

describe('formatMiles', () => {
  it('estimates miles from energy at the default efficiency', () => {
    expect(formatMiles(10_000)).toBe('35 mi');
  });
  it('honors a custom efficiency', () => {
    expect(formatMiles(10_000, 4)).toBe('40 mi');
  });
  it.each([null, undefined, NaN])('returns n/a for %p', (value) => {
    expect(formatMiles(value)).toBe('n/a');
  });
});

describe('formatMonth', () => {
  it('formats a long month with year by default', () => {
    expect(formatMonth('2026-01')).toBe('January 2026');
  });
  it('formats a short month without the year', () => {
    expect(formatMonth('2026-03', { month: 'short', year: false })).toBe('Mar');
  });
  it('returns n/a for an unparseable key', () => {
    expect(formatMonth('nope')).toBe('n/a');
  });
});

describe('NA', () => {
  it('is the shared not-available token', () => {
    expect(NA).toBe('n/a');
  });
});
