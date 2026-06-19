// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

import React from 'react';
import { View, ScrollView, RefreshControl } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Leaf } from '@/components/icons';
import { ScreenBackground, Text, Card, Spinner, EmptyState, BackButton } from '@/components/ui';
import { hsl } from '@/lib/theme';
import { cn } from '@/lib/cn';
import { formatCurrency, formatEnergyWh, formatDate, formatMonth } from '@/lib/format';
import { useMonthlyStatement } from '@/features/sessions';
import { usePullToRefresh } from '@/lib/use-pull-to-refresh';

function TotalRow({ label, value }: { label: string; value: string }): React.JSX.Element {
  return (
    <View className="flex-row justify-between">
      <Text variant="muted">{label}</Text>
      <Text variant="label" tabular>
        {value}
      </Text>
    </View>
  );
}

export default function StatementScreen(): React.JSX.Element {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ month?: string }>();
  const month = params.month ?? '';

  const statement = useMonthlyStatement(month);
  const { refreshing, onRefresh } = usePullToRefresh(() => statement.refetch());
  const data = statement.data;
  const sessions = data?.sessions ?? [];

  return (
    <ScreenBackground>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#ffffff" />
        }
      >
        <View className="gap-4">
          <BackButton />
          <Text variant="h1">{t('statement.title')}</Text>
          {month.length > 0 && (
            <View>
              <Text variant="h3">{formatMonth(month)}</Text>
              {data?.driverName != null && <Text variant="muted">{data.driverName}</Text>}
            </View>
          )}

          {statement.isLoading ? (
            <Spinner />
          ) : sessions.length === 0 ? (
            <EmptyState title={t('statement.empty')} />
          ) : (
            <>
              {/* Sessions as a standardized divided list, not per-item cards. */}
              <Card className="p-0 px-5">
                {sessions.map((s, i) => {
                  const location =
                    [s.siteName, s.siteCity].filter((v) => v != null).join(', ') || t('common.na');
                  return (
                    <View
                      key={String(s.id)}
                      testID={`statement-row-${String(s.id)}`}
                      className={cn('py-4', i > 0 && 'border-t border-muted-foreground/30')}
                    >
                      <View className="flex-row items-start justify-between gap-3">
                        <View className="flex-1">
                          <Text variant="label">{formatDate(s.startedAt)}</Text>
                          <Text variant="muted">{location}</Text>
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
                  );
                })}
              </Card>

              <Card className="gap-2">
                <Text variant="h3">{t('statement.totals')}</Text>
                <TotalRow
                  label={t('statement.sessionCount')}
                  value={String(data?.totals.sessionCount ?? 0)}
                />
                <TotalRow
                  label={t('activity.energy')}
                  value={formatEnergyWh(data?.totals.totalEnergyWh ?? 0)}
                />
                <TotalRow
                  label={t('activity.cost')}
                  value={formatCurrency(data?.totals.totalCostCents ?? 0, data?.totals.currency)}
                />
                <TotalRow
                  label={t('activity.co2Avoided')}
                  value={t('statement.co2Row', {
                    kg: (data?.totals.totalCo2AvoidedKg ?? 0).toFixed(1),
                  })}
                />
              </Card>
            </>
          )}
        </View>
      </ScrollView>
    </ScreenBackground>
  );
}
