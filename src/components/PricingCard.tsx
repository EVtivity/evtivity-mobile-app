// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

import React from 'react';
import { View } from 'react-native';
import type { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';
import { DollarSign } from '@/components/icons';
import { Card, Text } from '@/components/ui';
import { hsl } from '@/lib/theme';
import { formatUnitPrice } from '@/lib/format';
import {
  formatTaxRatePercent,
  priceForDisplay,
  resolveTaxBasis,
  type PriceDisplay,
  type TaxBasis,
} from '@/lib/price-display';
import type { PricingInfo } from '@/features/charge';

function toNumber(value: string | null): number {
  return value != null ? Number(value) : 0;
}

interface PriceFields {
  pricePerKwh: string | null;
  pricePerMinute: string | null;
  pricePerSession: string | null;
  idleFeePricePerMinute: string | null;
  taxRate: string | null;
}

// The price lines of one tariff (energy, time, session fee, idle fee), as the
// driver chose to see them; empty when the tariff charges nothing.
function priceLines(
  prices: PriceFields,
  priceDisplay: PriceDisplay,
  basis: TaxBasis,
  currency: string,
  t: TFunction,
): string[] {
  const rate = toNumber(prices.taxRate);
  const fmt = (price: number): string =>
    formatUnitPrice(priceForDisplay(price, rate, priceDisplay, basis), currency);
  const lines: string[] = [];
  const kwh = toNumber(prices.pricePerKwh);
  const min = toNumber(prices.pricePerMinute);
  const fee = toNumber(prices.pricePerSession);
  const idle = toNumber(prices.idleFeePricePerMinute);
  if (kwh > 0) lines.push(t('charge.pricingPerKwh', { amount: fmt(kwh) }));
  if (min > 0) lines.push(t('charge.pricingPerMinute', { amount: fmt(min) }));
  if (fee > 0) lines.push(t('charge.pricingPerSession', { amount: fmt(fee) }));
  if (idle > 0) lines.push(t('charge.pricingIdle', { amount: fmt(idle) }));
  return lines;
}

function taxNoteOf(taxRate: number, priceDisplay: PriceDisplay, t: TFunction): string | null {
  return taxRate > 0
    ? t(priceDisplay === 'gross' ? 'charge.taxIncluded' : 'charge.taxExcluded', {
        rate: formatTaxRatePercent(taxRate),
      })
    : null;
}

// Prices are shown as the driver chose (with or without tax), in the basis
// the tariff was entered in, with a note below them. A station with AC and DC
// EVSEs whose prices differ shows each kind's lines; it is free only when
// every kind is free. Mirrors PricingDisplay in the driver portal.
export function PricingCard({
  pricing,
  priceDisplay,
}: {
  pricing: PricingInfo;
  priceDisplay: PriceDisplay;
}): React.JSX.Element {
  const { t } = useTranslation();
  const { currency } = pricing;
  const basis = resolveTaxBasis(pricing.taxBasis);
  const parts = priceLines(pricing, priceDisplay, basis, currency, t);

  const kinds = (pricing.byChargingKind ?? []).length > 1 ? (pricing.byChargingKind ?? []) : [];
  const kindRates = kinds.map((k) => toNumber(k.taxRate));
  const sharedRate = kindRates.every((r) => r === kindRates[0]) ? (kindRates[0] ?? 0) : null;
  const kindLines = kinds.map((k) => {
    const label = t(k.chargingKind === 'ac' ? 'charge.chargingKindAc' : 'charge.chargingKindDc');
    const lines = priceLines(k, priceDisplay, basis, currency, t);
    return {
      kind: k.chargingKind,
      free: lines.length === 0,
      text: `${label}: ${lines.length > 0 ? lines.join(' · ') : t('charge.pricingFree')}`,
      // Each kind names its own tax only when the kinds' rates differ.
      taxNote: sharedRate == null ? taxNoteOf(toNumber(k.taxRate), priceDisplay, t) : null,
    };
  });

  const free =
    pricing.isFreeVend ||
    (kindLines.length > 0 ? kindLines.every((line) => line.free) : parts.length === 0);
  if (free) {
    return (
      <Card className="flex-row items-center gap-3">
        <DollarSign size={20} color={hsl('primary')} />
        <Text weight="semibold" className="text-sm text-foreground">
          {t('charge.pricingFree')}
        </Text>
      </Card>
    );
  }

  const taxNote =
    kindLines.length > 0
      ? sharedRate != null
        ? taxNoteOf(sharedRate, priceDisplay, t)
        : null
      : taxNoteOf(toNumber(pricing.taxRate), priceDisplay, t);

  return (
    <Card className="flex-row items-center gap-3">
      <DollarSign size={20} color={hsl('primary')} />
      <View className="flex-1 gap-1">
        {kindLines.length > 0 ? (
          kindLines.map((line) => (
            <View key={line.kind} className="gap-0.5">
              <Text testID={`pricing-kind-${line.kind}`} className="text-sm text-foreground">
                {line.text}
              </Text>
              {line.taxNote != null ? (
                <Text
                  testID={`pricing-kind-tax-note-${line.kind}`}
                  className="text-xs text-muted-foreground"
                >
                  {line.taxNote}
                </Text>
              ) : null}
            </View>
          ))
        ) : (
          <Text className="text-sm text-foreground">{parts.join(' · ')}</Text>
        )}
        {taxNote != null ? (
          <Text testID="pricing-tax-note" className="text-xs text-muted-foreground">
            {taxNote}
          </Text>
        ) : null}
      </View>
    </Card>
  );
}
