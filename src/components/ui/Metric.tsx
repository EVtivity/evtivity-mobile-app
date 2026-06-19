// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

import React from 'react';
import { View } from 'react-native';
import { Text } from './Text';
import { Card } from './Card';
import { cn } from '@/lib/cn';

type Tone = 'primary' | 'success' | 'info' | 'warning' | 'muted';

const TINT: Record<Tone, string> = {
  primary: 'bg-primary/25',
  success: 'bg-success/25',
  info: 'bg-info/25',
  warning: 'bg-warning/25',
  muted: 'bg-muted',
};

// A single metric tile: tinted icon chip, label, and a large tabular value with
// an optional trailing unit. The instrument-readout look for energy/cost/power.
export function Metric({
  icon,
  label,
  value,
  valueNode,
  unit,
  tone = 'muted',
  className,
}: {
  icon?: React.ReactNode;
  label: string;
  // Provide either a plain string `value` or a `valueNode` element (e.g. a
  // self-ticking live counter) so a frequently-updating value can re-render in
  // isolation without re-rendering the whole screen.
  value?: string;
  valueNode?: React.ReactNode;
  unit?: string;
  tone?: Tone;
  className?: string;
}): React.JSX.Element {
  return (
    <Card className={cn('flex-1 items-center gap-2', className)}>
      {icon != null ? (
        <View className={cn('h-10 w-10 items-center justify-center rounded-full', TINT[tone])}>
          {icon}
        </View>
      ) : null}
      <Text variant="overline">{label}</Text>
      <View className="flex-row items-baseline justify-center gap-1">
        {valueNode ?? (
          <Text variant="h3" tabular numberOfLines={1} adjustsFontSizeToFit>
            {value}
          </Text>
        )}
        {unit != null ? (
          <Text variant="label" className="text-muted-foreground">
            {unit}
          </Text>
        ) : null}
      </View>
    </Card>
  );
}
