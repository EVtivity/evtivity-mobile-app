// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

import i18next from 'i18next';

// Formatting helpers mirroring the portal css-spec data-formatting rules.
// Currency is stored in cents. Empty values render as "n/a", never null/NaN.

export const NA = 'n/a';

const FALLBACK_LOCALE = 'en-US';

// Returns the locale when Intl supports it, otherwise "en-US". Mirrors
// resolveLocale in @evtivity/lib/number.
export function resolveLocale(locale: string): string {
  try {
    return Intl.getCanonicalLocales(locale)[0] ?? FALLBACK_LOCALE;
  } catch {
    return FALLBACK_LOCALE;
  }
}

// The selected UI language, which drives number and currency formatting. Read
// from the global i18next instance that @/lib/i18n initializes, and "en" before
// initialization (e.g. in unit tests).
export function uiLocale(): string {
  return i18next.isInitialized ? i18next.language : 'en';
}

// Formats cents in a currency (the session's, else the company currency) in the
// UI language, e.g. 1250 EUR as "€12.50" (en) or "12,50 €" (de). Falls back to
// "CODE 12.50" when the code is not a valid ISO 4217 currency. Mirrors
// formatCurrencyAmount in @evtivity/lib/currency.
export function formatCurrency(
  cents: number | null | undefined,
  currency: string,
  locale: string = uiLocale(),
): string {
  if (cents == null || Number.isNaN(cents)) return NA;
  try {
    return new Intl.NumberFormat(resolveLocale(locale), { style: 'currency', currency }).format(
      cents / 100,
    );
  } catch {
    return `${currency.toUpperCase()} ${(cents / 100).toFixed(2)}`;
  }
}

// Formats a unit price in major units (e.g. a tariff rate of 0.2561 EUR/kWh)
// with 2 to 4 fraction digits, so rates finer than a cent are not rounded away.
// Falls back like formatCurrency. Mirrors formatUnitPrice in
// @evtivity/lib/currency.
export function formatUnitPrice(
  amount: number,
  currency: string,
  locale: string = uiLocale(),
): string {
  try {
    return new Intl.NumberFormat(resolveLocale(locale), {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    }).format(amount);
  } catch {
    return `${currency.toUpperCase()} ${amount.toFixed(2)}`;
  }
}

export function formatEnergyWh(wh: number | null | undefined): string {
  if (wh == null || Number.isNaN(wh)) return NA;
  return `${(wh / 1000).toFixed(2)} kWh`;
}

export function formatPowerKw(kw: number | null | undefined): string {
  if (kw == null || Number.isNaN(kw)) return NA;
  return `${kw.toFixed(1)} kW`;
}

export function formatDateTime(value: string | null | undefined): string {
  if (value == null) return NA;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return NA;
  return d.toLocaleString('en-US', {
    month: 'numeric',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function formatDate(value: string | null | undefined): string {
  if (value == null) return NA;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return NA;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function formatRelative(value: string | null | undefined): string {
  if (value == null) return NA;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return NA;
  const diffMs = Date.now() - d.getTime();
  const sec = Math.floor(diffMs / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  return formatDate(value);
}

export function formatDuration(start: string, end?: string | null): string {
  const startMs = new Date(start).getTime();
  const endMs = end != null ? new Date(end).getTime() : Date.now();
  if (Number.isNaN(startMs) || Number.isNaN(endMs)) return NA;
  const totalMin = Math.max(0, Math.floor((endMs - startMs) / 60000));
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export function formatMiles(energyWh: number | null | undefined, efficiency = 3.5): string {
  if (energyWh == null || Number.isNaN(energyWh)) return NA;
  return `${((energyWh / 1000) * efficiency).toFixed(0)} mi`;
}

// Format a "YYYY-MM" key as a UTC month label, e.g. "January 2026" or "Jan".
export function formatMonth(
  month: string,
  opts: { month?: 'long' | 'short'; year?: boolean } = {},
): string {
  const { month: style = 'long', year = true } = opts;
  const [y, m] = month.split('-');
  const d = new Date(Date.UTC(Number(y), Number(m) - 1, 1));
  if (Number.isNaN(d.getTime())) return NA;
  return d.toLocaleDateString('en-US', {
    month: style,
    ...(year ? { year: 'numeric' as const } : {}),
    timeZone: 'UTC',
  });
}
