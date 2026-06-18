// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

import React from 'react';
import { View, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight, Leaf, Receipt } from '@/components/icons';
import { Screen, Text, Card, Segmented, Spinner, EmptyState } from '@/components/ui';
import { AppHeader } from '@/components/AppHeader';
import { SessionRow } from '@/components/SessionRow';
import { hsl } from '@/lib/theme';
import { cn } from '@/lib/cn';
import { formatCurrency, formatEnergyWh, formatMiles } from '@/lib/format';
import {
  useSessionsByMonth,
  useMonthlySummary,
  useMonthlySummaries,
  type MonthlySummary,
} from '@/features/sessions';
import { usePullToRefresh } from '@/lib/use-pull-to-refresh';

type Metric = 'cost' | 'energy' | 'distance';

function monthKey(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

function monthLabel(month: string): string {
  const [y, m] = month.split('-');
  const d = new Date(Date.UTC(Number(y), Number(m) - 1, 1));
  return d
    .toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' })
    .toUpperCase();
}

function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split('-');
  return monthKey(new Date(Date.UTC(Number(y), Number(m) - 1 + delta, 1)));
}

function monthAbbrev(month: string): string {
  const [y, m] = month.split('-');
  return new Date(Date.UTC(Number(y), Number(m) - 1, 1)).toLocaleDateString('en-US', {
    month: 'short',
    timeZone: 'UTC',
  });
}

const CHART_HEIGHT = 110;

export default function ActivityScreen(): React.JSX.Element {
  const { t } = useTranslation();
  const router = useRouter();

  const [month, setMonth] = React.useState(() => monthKey(new Date()));
  const [metric, setMetric] = React.useState<Metric>('cost');

  const summary = useMonthlySummary(month);
  const sessions = useSessionsByMonth(month);

  // Trailing 6 months ending at the selected month, for the trend chart.
  const months = React.useMemo(
    () => Array.from({ length: 6 }, (_, k) => shiftMonth(month, k - 5)),
    [month],
  );
  const trend = useMonthlySummaries(months);

  const { refreshing, onRefresh } = usePullToRefresh(() =>
    Promise.all([summary.refetch(), sessions.refetch()]),
  );

  const isCurrentMonth = month >= monthKey(new Date());

  const metricValue = (s: MonthlySummary | undefined): number => {
    if (s == null) return 0;
    if (metric === 'cost') return s.totalCostCents;
    return s.totalEnergyWh; // energy and distance scale together
  };

  const summaryValue = (): string => {
    const s = summary.data;
    if (s == null) return t('common.na');
    if (metric === 'cost') return formatCurrency(s.totalCostCents, s.currency ?? undefined);
    if (metric === 'energy') return formatEnergyWh(s.totalEnergyWh);
    return formatMiles(s.totalEnergyWh);
  };

  const trendValues = trend.map((q) => metricValue(q.data));
  const trendMax = Math.max(...trendValues, 1);
  const trendLoading = trend.some((q) => q.isLoading);

  return (
    <Screen
      scroll
      refreshing={refreshing}
      onRefresh={onRefresh}
    >
      <AppHeader />
      <Text variant="h1">{t('activity.title')}</Text>

      <View className="flex-row items-center justify-between">
        <Pressable
          testID="activity-prev-month"
          accessibilityLabel={t('common.back')}
          onPress={() => setMonth((m) => shiftMonth(m, -1))}
          hitSlop={12}
          className="h-10 w-10 items-center justify-center rounded-full active:opacity-70"
        >
          <ChevronLeft size={22} color={hsl('foreground')} />
        </Pressable>
        <Text variant="h3">{monthLabel(month)}</Text>
        <Pressable
          testID="activity-next-month"
          accessibilityLabel={t('common.done')}
          onPress={() => setMonth((m) => shiftMonth(m, 1))}
          disabled={isCurrentMonth}
          hitSlop={12}
          className="h-10 w-10 items-center justify-center rounded-full active:opacity-70"
        >
          <ChevronRight
            size={22}
            color={isCurrentMonth ? hsl('mutedForeground') : hsl('foreground')}
          />
        </Pressable>
      </View>

      <Segmented<Metric>
        value={metric}
        onChange={setMetric}
        segments={[
          { value: 'cost', label: t('activity.cost') },
          { value: 'energy', label: t('activity.energy') },
          { value: 'distance', label: t('activity.distance') },
        ]}
      />

      <Card className="gap-4 py-6">
        <View className="items-center gap-1">
          <Text variant="display" tabular>
            {summaryValue()}
          </Text>
          <Text variant="muted">
            {summary.data?.sessionCount ?? 0} {t('activity.sessions').toLowerCase()}
          </Text>
        </View>
        {trendLoading ? (
          <Spinner size="small" />
        ) : (
          <View className="flex-row items-end justify-between gap-2">
            {months.map((mk, i) => {
              const active = mk === month;
              const value = trendValues[i] ?? 0;
              const barHeight = Math.max((value / trendMax) * CHART_HEIGHT, value > 0 ? 6 : 2);
              return (
                <Pressable
                  key={mk}
                  onPress={() => setMonth(mk)}
                  hitSlop={6}
                  className="flex-1 items-center gap-1.5 active:opacity-70"
                >
                  <View
                    style={{ height: barHeight }}
                    className={cn(
                      'w-full rounded-t-md',
                      active ? 'bg-primary' : 'bg-muted-foreground/25',
                    )}
                  />
                  <Text
                    className={cn(
                      'text-xs',
                      active ? 'font-semibold text-foreground' : 'text-muted-foreground',
                    )}
                  >
                    {monthAbbrev(mk)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        )}
      </Card>

      {(summary.data?.totalCo2AvoidedKg ?? 0) > 0 && (
        <Card className="flex-row items-center gap-3">
          <Leaf size={22} color={hsl('primary')} />
          <Text variant="muted">
            {t('activity.co2AvoidedLine', {
              kg: (summary.data?.totalCo2AvoidedKg ?? 0).toFixed(1),
            })}
          </Text>
        </Card>
      )}

      <Card
        testID="activity-statement"
        className="flex-row items-center gap-3"
        onPress={() => router.push({ pathname: '/statement', params: { month } })}
      >
        <Receipt size={22} color={hsl('primary')} />
        <View className="flex-1">
          <Text variant="label">{t('activity.statement')}</Text>
          <Text variant="muted">{t('activity.viewStatement')}</Text>
        </View>
        <ChevronRight size={22} color={hsl('mutedForeground')} />
      </Card>

      <Text variant="h3">{t('activity.sessions')}</Text>
      {sessions.isLoading ? (
        <Spinner />
      ) : (sessions.data?.length ?? 0) === 0 ? (
        <EmptyState title={t('activity.noSessions')} />
      ) : (
        <Card className="py-0">
          {sessions.data?.map((s, i) => (
            <View
              key={s.id}
              className={i > 0 ? 'border-t border-muted-foreground/30' : undefined}
            >
              <SessionRow
                session={s}
                onPress={() => router.push({ pathname: '/session/[id]', params: { id: s.id } })}
              />
            </View>
          ))}
        </Card>
      )}
    </Screen>
  );
}
