// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

import { resolveLocale, uiLocale } from '@/lib/format';

// Whether prices shown to the driver include tax ('gross') or exclude it
// ('net'). Display only: tariff prices are stored in the company tax basis
// (the pricing reply's taxBasis), and every session cost from the API already
// includes tax.
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

// How tariff prices are entered and stored: excluding ('net') or including
// ('gross') tax (company.taxBasis).
export const TAX_BASES = ['net', 'gross'] as const;

export type TaxBasis = (typeof TAX_BASES)[number];

export const DEFAULT_TAX_BASIS: TaxBasis = 'net';

export function isTaxBasis(value: unknown): value is TaxBasis {
  return typeof value === 'string' && (TAX_BASES as readonly string[]).includes(value);
}

// The tax basis of a reply, or the default for a value that is not one.
export function resolveTaxBasis(value: unknown): TaxBasis {
  return isTaxBasis(value) ? value : DEFAULT_TAX_BASIS;
}

// A tariff unit price excluding tax: the stored price on the 'net' basis, else
// with the rate taken out.
export function netUnitPrice(price: number, taxRate: number, basis: TaxBasis): number {
  return basis === 'gross' ? price / (1 + taxRate) : price;
}

// A tariff unit price including tax: the stored price on the 'gross' basis,
// else with the rate added.
export function grossUnitPrice(price: number, taxRate: number, basis: TaxBasis): number {
  return basis === 'gross' ? price : price * (1 + taxRate);
}

// A stored tariff price as shown: including tax (a decimal rate, 0.19) for the
// 'gross' display, excluding it for 'net', whichever basis it was entered in.
// The only price computation the app makes.
export function priceForDisplay(
  price: number,
  taxRate: number,
  priceDisplay: PriceDisplay,
  basis: TaxBasis,
): number {
  return priceDisplay === 'gross'
    ? grossUnitPrice(price, taxRate, basis)
    : netUnitPrice(price, taxRate, basis);
}

// A tax rate (a decimal, 0.19) as a percentage number in the locale, with at
// most 2 fraction digits and no trailing zeros: "19", "7.5" (en), "7,5" (de).
export function formatTaxRatePercent(taxRate: number, locale: string = uiLocale()): string {
  return new Intl.NumberFormat(resolveLocale(locale), { maximumFractionDigits: 2 }).format(
    taxRate * 100,
  );
}

// Whether a session cost contains tax, from the tax the API stores with it
// (taxCents): an amount above 0 whose tax is above 0. Labels such as
// "incl. tax" are shown only then, as in the driver portal (costContainsTax).
export function costContainsTax(
  costCents: number | null | undefined,
  taxCents: number | null | undefined,
): boolean {
  return costCents != null && costCents > 0 && taxCents != null && taxCents > 0;
}
