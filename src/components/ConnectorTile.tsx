// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

import React from 'react';
import { Pressable, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Plug, Zap } from '@/components/icons';
import { Text, StatusBadge } from '@/components/ui';
import { cn } from '@/lib/cn';
import { hsl, SURFACE_TEXT_VARS } from '@/lib/theme';
import { isStartable } from '@/lib/status';
import { formatPowerKw, NA } from '@/lib/format';
import type { ConnectorStatus } from '@/lib/types';

interface ConnectorTileProps {
  connectorType: string | null;
  maxPowerKw: number | null;
  maxCurrentAmps: number | null;
  status: ConnectorStatus;
  port: number;
  selected: boolean;
  onPress: () => void;
}

const CHARGING: ConnectorStatus[] = ['charging', 'discharging'];
const IDLE: ConnectorStatus[] = ['suspended_ev', 'suspended_evse', 'idle'];

export function ConnectorTile({
  connectorType,
  maxPowerKw,
  maxCurrentAmps,
  status,
  port,
  selected,
  onPress,
}: ConnectorTileProps): React.JSX.Element {
  const { t } = useTranslation();
  const disabled = !isStartable(status);
  const isCharging = CHARGING.includes(status);
  const isIdle = IDLE.includes(status);

  const power = maxPowerKw != null && maxPowerKw > 0 ? formatPowerKw(maxPowerKw) : '';
  const amps = maxCurrentAmps != null && maxCurrentAmps > 0 ? `${String(maxCurrentAmps)}A` : '';
  const spec = [power, amps].filter(Boolean).join(' / ');

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      style={SURFACE_TEXT_VARS}
      className={cn(
        'grow basis-[47%] gap-2 rounded-lg border-2 bg-card p-3',
        selected ? 'border-primary' : 'border-border',
        isCharging ? 'border-blue-500' : isIdle ? 'border-yellow-500' : '',
        disabled ? 'opacity-50' : 'active:opacity-80',
      )}
    >
      <View className="flex-row items-center justify-between">
        <StatusBadge status={status} />
        {selected ? <Zap size={16} color={hsl('primary')} /> : null}
      </View>
      <View className="gap-0.5">
        <View className="flex-row items-center gap-1">
          <Plug size={14} color={hsl('mutedForeground')} />
          <Text variant="label">{connectorType ?? NA}</Text>
        </View>
        {spec !== '' ? <Text className="text-xs text-muted-foreground">{spec}</Text> : null}
        <Text className="text-xs text-muted-foreground">
          {t('charge.connectorPort', { id: port })}
        </Text>
      </View>
    </Pressable>
  );
}
