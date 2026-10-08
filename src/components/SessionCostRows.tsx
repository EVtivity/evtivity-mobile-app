// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

import React from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Text } from '@/components/ui';
import { formatCurrency } from '@/lib/format';
import { formatTaxRatePercent, type PriceDisplay } from '@/lib/price-display';

// Label and value on one line, as in the session detail card. With a testID,
// the value carries `<testID>-value`, so a test can read the amount alone.
export function DetailRow({
  label,
  value,
  testID,
}: {
  label: string;
  value: string;
  testID?: string;
}): React.JSX.Element {
  return (
    <View testID={testID} className="flex-row items-center justify-between gap-3">
      <Text variant="muted">{label}</Text>
      <Text
        testID={testID != null ? `${testID}-value` : undefined}
        variant="label"
        tabular
        className="flex-1 text-right"
      >
        {value}
      </Text>
    </View>
  );
}

// The session cost rows. The cost always includes tax. The API splits out the
// tax it contains per tariff, as billed (netCents, taxCents, taxRate), and the
// app never splits a total itself. Gross display shows the total and the tax
// it contains. Net display shows the net amount, the tax, and the total.
// Without a split (no tax, or not known yet) only the total is shown, and
// while the price display is loading the tax rows wait. taxRate is null when
// tariffs with different rates applied, so the rows then show no percent.
// Mirrors the session detail of the driver portal.
export function SessionCostRows({
  costCents,
  currency,
  isActive,
  netCents,
  taxCents,
  taxRate,
  priceDisplay,
}: {
  costCents: number | null | undefined;
  currency: string;
  isActive: boolean;
  netCents: number | null;
  taxCents: number | null;
  taxRate: string | null;
  priceDisplay: PriceDisplay | null;
}): React.JSX.Element {
  const { t } = useTranslation();
  const hasTaxSplit = netCents != null && taxCents != null;
  const taxPercent = taxRate != null ? formatTaxRatePercent(Number(taxRate)) : null;
  const costLabel = hasTaxSplit
    ? t(isActive ? 'charge.detail.costInclTax' : 'charge.detail.totalCostInclTax')
    : t(isActive ? 'charge.live.cost' : 'charge.detail.totalCost');

  return (
    <>
      {hasTaxSplit && priceDisplay === 'net' ? (
        <>
          <DetailRow
            testID="session-net-cost"
            label={t('charge.detail.netCost')}
            value={formatCurrency(netCents, currency)}
          />
          <DetailRow
            testID="session-tax"
            label={
              taxPercent != null
                ? t('charge.detail.taxAdded', { rate: taxPercent })
                : t('charge.detail.taxAddedNoRate')
            }
            value={formatCurrency(taxCents, currency)}
          />
        </>
      ) : null}
      <DetailRow
        testID="session-cost"
        label={costLabel}
        value={formatCurrency(costCents, currency)}
      />
      {hasTaxSplit && priceDisplay === 'gross' ? (
        <DetailRow
          testID="session-tax"
          label={
            taxPercent != null
              ? t('charge.detail.taxContained', { rate: taxPercent })
              : t('charge.detail.taxContainedNoRate')
          }
          value={formatCurrency(taxCents, currency)}
        />
      ) : null}
    </>
  );
}
