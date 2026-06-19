// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

import React from 'react';
import { View, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Card, Text } from '@/components/ui';
import { cn } from '@/lib/cn';
import { TrendAreaChart, type ChartPoint } from './TrendAreaChart';
import { hsl } from '@/lib/theme';
import type { PowerPoint, EnergyPoint } from '@/features/sessions';

type Mode = 'energy' | 'power';
const MODES: Mode[] = ['energy', 'power'];

function formatTime(ms: number): string {
  return new Date(ms).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function formatPowerW(w: number): string {
  return w >= 1000 ? `${(w / 1000).toFixed(1)}kW` : `${Math.round(w)}W`;
}

function formatEnergyKwh(kwh: number): string {
  if (kwh >= 10) return `${kwh.toFixed(0)}`;
  if (kwh >= 1) return `${kwh.toFixed(1)}`;
  return kwh.toFixed(2);
}

// Round a power ceiling up to a clean 500/1000 W step.
function niceWatts(maxW: number): number {
  if (maxW <= 0) return 1000;
  const step = maxW <= 3000 ? 500 : 1000;
  return Math.ceil(maxW / step) * step;
}

// Round a kWh ceiling up to a pleasant maximum.
function niceKwh(maxKwh: number): number {
  if (maxKwh <= 0) return 1;
  for (const n of [0.1, 0.5, 1, 2, 5, 10]) if (maxKwh <= n) return n;
  return Math.ceil(maxKwh / 5) * 5;
}

export const SessionCharts = React.memo(function SessionCharts({
  powerData,
  energyData,
  currentPowerW,
  energyDeliveredWh,
}: {
  powerData: PowerPoint[];
  energyData: EnergyPoint[];
  currentPowerW: number | null | undefined;
  energyDeliveredWh: number | null | undefined;
}): React.JSX.Element {
  const { t } = useTranslation();
  const [mode, setMode] = React.useState<Mode>('energy');

  // Derive point arrays + axis ceilings only when the underlying data changes,
  // not on every parent re-render (the session screen re-renders on each poll).
  const powerPoints = React.useMemo<ChartPoint[]>(
    () => powerData.map((p) => ({ x: new Date(p.timestamp).getTime(), y: p.powerW })),
    [powerData],
  );
  const energyPoints = React.useMemo<ChartPoint[]>(
    () => energyData.map((p) => ({ x: new Date(p.timestamp).getTime(), y: p.energyWh / 1000 })),
    [energyData],
  );

  const points = mode === 'power' ? powerPoints : energyPoints;
  const color = mode === 'power' ? hsl('info') : hsl('primary');
  const collecting = points.length < 2;

  const powerMax = React.useMemo(
    () => niceWatts(Math.max(0, ...powerPoints.map((p) => p.y))),
    [powerPoints],
  );
  const energyMax = React.useMemo(
    () => niceKwh(Math.max(0, ...energyPoints.map((p) => p.y))),
    [energyPoints],
  );

  const headerValue =
    mode === 'power'
      ? currentPowerW != null
        ? formatPowerW(currentPowerW)
        : '--'
      : energyDeliveredWh != null
        ? `${formatEnergyKwh(energyDeliveredWh / 1000)} kWh`
        : '--';

  return (
    <Card className="gap-4">
      <View className="flex-row items-center justify-between">
        <View className="flex-row gap-1 rounded-xl bg-muted p-1">
          {MODES.map((m) => {
            const active = mode === m;
            return (
              <Pressable
                key={m}
                onPress={() => setMode(m)}
                className={cn('rounded-lg px-3 py-1.5', active ? 'bg-card' : '')}
              >
                <Text
                  weight="semibold"
                  className={cn('text-xs', active ? 'text-foreground' : 'text-muted-foreground')}
                >
                  {t(`charge.charts.${m}`)}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <Text variant="label" tabular className="text-foreground">
          {headerValue}
        </Text>
      </View>

      {collecting ? (
        <View className="h-[160px] items-center justify-center">
          <Text variant="muted">{t('charge.charts.collecting')}</Text>
        </View>
      ) : mode === 'power' ? (
        <TrendAreaChart
          points={powerPoints}
          color={color}
          yMax={powerMax}
          formatY={formatPowerW}
          formatX={formatTime}
        />
      ) : (
        <TrendAreaChart
          points={energyPoints}
          color={color}
          yMax={energyMax}
          formatY={(v) => `${formatEnergyKwh(v)}`}
          formatX={formatTime}
        />
      )}
    </Card>
  );
});
