// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

import React from 'react';
import { View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Leaf } from '@/components/icons';
import { Screen, Text, Card, Spinner, EmptyState, BackButton } from '@/components/ui';
import { hsl } from '@/lib/theme';
import { formatCurrency, formatEnergyWh, formatDate } from '@/lib/format';
import { useMonthlyStatement } from '@/features/sessions';
import { usePullToRefresh } from '@/lib/use-pull-to-refresh';

function monthLabel(month: string): string {
  const [y, m] = month.split('-');
  const d = new Date(Date.UTC(Number(y), Number(m) - 1, 1));
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });
}

export default function StatementScreen(): React.JSX.Element {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ month?: string }>();
  const month = params.month ?? '';

  const statement = useMonthlyStatement(month);
  const { refreshing, onRefresh } = usePullToRefresh(() => statement.refetch());
  const data = statement.data;

  return (
    <Screen
      scroll
      refreshing={refreshing}
      onRefresh={onRefresh}
    >
      <BackButton />
      <Text variant="h1">{t('statement.title')}</Text>

      {month.length > 0 && (
        <View>
          <Text variant="h3">{monthLabel(month)}</Text>
          {data?.driverName != null && <Text variant="muted">{data.driverName}</Text>}
        </View>
      )}

      {statement.isLoading ? (
        <Spinner />
      ) : (data?.sessions.length ?? 0) === 0 ? (
        <EmptyState title={t('statement.empty')} />
      ) : (
        <>
          <Card className="py-0">
            {data?.sessions.map((s, i) => (
              <View
                key={s.id}
                className={i > 0 ? 'border-t border-muted-foreground/30 py-3' : 'py-3'}
              >
                <View className="flex-row items-start justify-between gap-3">
                  <View className="flex-1">
                    <Text variant="label">{formatDate(s.startedAt)}</Text>
                    <Text variant="muted">
                      {[s.siteName, s.siteCity].filter((v) => v != null).join(', ') ||
                        t('common.na')}
                    </Text>
                  </View>
                  <View className="items-end">
                    <Text variant="label" tabular>
                      {formatCurrency(s.finalCostCents, s.currency)}
                    </Text>
                    <Text variant="muted" tabular>
                      {formatEnergyWh(s.energyDeliveredWh)}
                    </Text>
                  </View>
                </View>
                {(s.co2AvoidedKg ?? 0) > 0 && (
                  <View className="mt-1 flex-row items-center gap-1.5">
                    <Leaf size={14} color={hsl('primary')} />
                    <Text variant="muted">
                      {t('statement.co2Row', { kg: (s.co2AvoidedKg ?? 0).toFixed(1) })}
                    </Text>
                  </View>
                )}
              </View>
            ))}
          </Card>

          {data != null && (
            <Card className="gap-2">
              <Text variant="h3">{t('statement.totals')}</Text>
              <View className="flex-row justify-between">
                <Text variant="muted">{t('statement.sessionCount')}</Text>
                <Text variant="label" tabular>
                  {data.totals.sessionCount}
                </Text>
              </View>
              <View className="flex-row justify-between">
                <Text variant="muted">{t('activity.energy')}</Text>
                <Text variant="label" tabular>
                  {formatEnergyWh(data.totals.totalEnergyWh)}
                </Text>
              </View>
              <View className="flex-row justify-between">
                <Text variant="muted">{t('activity.cost')}</Text>
                <Text variant="label" tabular>
                  {formatCurrency(data.totals.totalCostCents, data.totals.currency)}
                </Text>
              </View>
              <View className="flex-row justify-between">
                <Text variant="muted">{t('activity.co2Avoided')}</Text>
                <Text variant="label" tabular>
                  {t('statement.co2Row', { kg: data.totals.totalCo2AvoidedKg.toFixed(1) })}
                </Text>
              </View>
            </Card>
          )}
        </>
      )}
    </Screen>
  );
}
