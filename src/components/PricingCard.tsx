// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

import React from 'react';
import { useTranslation } from 'react-i18next';
import { DollarSign } from '@/components/icons';
import { Card, Text } from '@/components/ui';
import { hsl } from '@/lib/theme';
import { formatCurrency } from '@/lib/format';
import type { PricingInfo } from '@/features/charge';

function rateLabel(rate: number, currency: string): string {
  return formatCurrency(Math.round(rate * 100), currency);
}

export function PricingCard({ pricing }: { pricing: PricingInfo }): React.JSX.Element | null {
  const { t } = useTranslation();
  const { currency } = pricing;

  if (pricing.isFreeVend) {
    return (
      <Card className="flex-row items-center gap-3">
        <DollarSign size={20} color={hsl('primary')} />
        <Text weight="semibold" className="text-sm text-foreground">
          {t('charge.pricingFree')}
        </Text>
      </Card>
    );
  }

  const parts: string[] = [];
  if (pricing.pricePerKwh != null) {
    parts.push(t('charge.pricingPerKwh', { amount: rateLabel(pricing.pricePerKwh, currency) }));
  }
  if (pricing.pricePerMinute != null) {
    parts.push(
      t('charge.pricingPerMinute', { amount: rateLabel(pricing.pricePerMinute, currency) }),
    );
  }
  if (pricing.pricePerSession != null) {
    parts.push(
      t('charge.pricingPerSession', { amount: rateLabel(pricing.pricePerSession, currency) }),
    );
  }
  if (pricing.idleFeePricePerMinute != null) {
    parts.push(
      t('charge.pricingIdle', { amount: rateLabel(pricing.idleFeePricePerMinute, currency) }),
    );
  }
  if (pricing.taxRate != null) {
    parts.push(
      t('charge.pricingTax', { percent: (pricing.taxRate * 100).toFixed(2).replace(/\.?0+$/, '') }),
    );
  }

  if (parts.length === 0) return null;

  return (
    <Card className="flex-row items-center gap-3">
      <DollarSign size={20} color={hsl('primary')} />
      <Text className="flex-1 text-sm text-foreground">{parts.join(' · ')}</Text>
    </Card>
  );
}
