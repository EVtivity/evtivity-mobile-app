// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

import { resolveLocale, uiLocale } from '@/lib/format';

// Whether prices shown to the driver include tax ('gross') or exclude it
// ('net'). Display only: tariff prices are stored net, and every session cost
// from the API already includes tax.
//
// Mirrors the display rules of @evtivity/lib/price-display in the CSMS, which
// is the single source of truth. The app does no other tax math: session net
// amounts, tax amounts, and rates come from the API (netCents, taxCents,
// taxRate on GET /v1/portal/sessions/:id). Keep these functions identical to
// the lib and its tests when the lib changes.

export const PRICE_DISPLAYS = ['gross', 'net'] as const;

export type PriceDisplay = (typeof PRICE_DISPLAYS)[number];

// Used when neither the driver nor the company setting company.priceDisplay is set.
export const DEFAULT_PRICE_DISPLAY: PriceDisplay = 'net';

export function isPriceDisplay(value: unknown): value is PriceDisplay {
  return typeof value === 'string' && (PRICE_DISPLAYS as readonly string[]).includes(value);
}

// The driver's choice, else the company setting, else the default.
export function resolvePriceDisplay(driverValue: unknown, companyValue: unknown): PriceDisplay {
  if (isPriceDisplay(driverValue)) return driverValue;
  if (isPriceDisplay(companyValue)) return companyValue;
  return DEFAULT_PRICE_DISPLAY;
}

// A net tariff price as shown: with the tax rate (a decimal, 0.19) added for
// 'gross'. The only price computation the app makes.
export function priceForDisplay(
  netPrice: number,
  taxRate: number,
  priceDisplay: PriceDisplay,
): number {
  return priceDisplay === 'gross' ? netPrice * (1 + taxRate) : netPrice;
}

// A tax rate (a decimal, 0.19) as a percentage number in the locale, with at
// most 2 fraction digits and no trailing zeros: "19", "7.5" (en), "7,5" (de).
export function formatTaxRatePercent(taxRate: number, locale: string = uiLocale()): string {
  return new Intl.NumberFormat(resolveLocale(locale), { maximumFractionDigits: 2 }).format(
    taxRate * 100,
  );
}

// Whether a session cost contains tax: an amount above 0 billed with a tariff
// tax rate above 0. Labels such as "incl. tax" are shown only then.
export function costIncludesTax(
  costCents: number | null | undefined,
  taxRate: string | number | null | undefined,
): boolean {
  return costCents != null && costCents > 0 && Number(taxRate ?? 0) > 0;
}
