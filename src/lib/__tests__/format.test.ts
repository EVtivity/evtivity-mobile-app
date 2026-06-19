// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

import {
  formatCurrency,
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

describe('formatCurrency', () => {
  it('formats cents as currency', () => {
    expect(formatCurrency(1234)).toBe('$12.34');
  });
  it('honors an explicit currency code', () => {
    expect(formatCurrency(1000, 'EUR')).toContain('10.00');
  });
  it('defaults to USD when currency is null', () => {
    expect(formatCurrency(500, null)).toBe('$5.00');
  });
  it('falls back to a plain dollar string on an invalid currency code', () => {
    expect(formatCurrency(1234, 'INVALID')).toBe('$12.34');
  });
  it.each([null, undefined, NaN])('returns n/a for %p', (value) => {
    expect(formatCurrency(value)).toBe('n/a');
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
