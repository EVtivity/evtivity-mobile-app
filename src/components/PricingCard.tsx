// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

import React from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { DollarSign } from '@/components/icons';
import { Card, Text } from '@/components/ui';
import { hsl } from '@/lib/theme';
import { formatUnitPrice } from '@/lib/format';
import { formatTaxRatePercent, priceForDisplay, type PriceDisplay } from '@/lib/price-display';
import type { PricingInfo } from '@/features/charge';

function toNumber(value: string | null): number {
  return value != null ? Number(value) : 0;
}

// Tariff prices are net. With priceDisplay 'gross' every price is shown with
// the tax rate added, and the note below the prices says which one it is.
// Mirrors PricingDisplay in the driver portal.
export function PricingCard({
  pricing,
  priceDisplay,
}: {
  pricing: PricingInfo;
  priceDisplay: PriceDisplay;
}): React.JSX.Element {
  const { t } = useTranslation();
  const { currency } = pricing;
  const perKwh = toNumber(pricing.pricePerKwh);
  const perMin = toNumber(pricing.pricePerMinute);
  const perSession = toNumber(pricing.pricePerSession);
  const idleFee = toNumber(pricing.idleFeePricePerMinute);
  const taxRate = toNumber(pricing.taxRate);
  const formatPrice = (price: number): string =>
    formatUnitPrice(priceForDisplay(price, taxRate, priceDisplay), currency);

  const parts: string[] = [];
  if (perKwh > 0) parts.push(t('charge.pricingPerKwh', { amount: formatPrice(perKwh) }));
  if (perMin > 0) parts.push(t('charge.pricingPerMinute', { amount: formatPrice(perMin) }));
  if (perSession > 0) {
    parts.push(t('charge.pricingPerSession', { amount: formatPrice(perSession) }));
  }
  if (idleFee > 0) parts.push(t('charge.pricingIdle', { amount: formatPrice(idleFee) }));

  if (pricing.isFreeVend || parts.length === 0) {
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
    taxRate > 0
      ? t(priceDisplay === 'gross' ? 'charge.taxIncluded' : 'charge.taxExcluded', {
          rate: formatTaxRatePercent(taxRate),
        })
      : null;

  return (
    <Card className="flex-row items-center gap-3">
      <DollarSign size={20} color={hsl('primary')} />
      <View className="flex-1 gap-1">
        <Text className="text-sm text-foreground">{parts.join(' · ')}</Text>
        {taxNote != null ? (
          <Text testID="pricing-tax-note" className="text-xs text-muted-foreground">
            {taxNote}
          </Text>
        ) : null}
      </View>
    </Card>
  );
}
