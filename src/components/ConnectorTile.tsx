// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

import React from 'react';
import { Pressable, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Zap } from '@/components/icons';
import { ConnectorFaceIcon } from '@/components/ConnectorFaceIcon';
import { Text, StatusBadge } from '@/components/ui';
import { cn } from '@/lib/cn';
import { hsl, useSurfaceTextVars } from '@/lib/theme';
import { connectorStatusLabel, isStartable } from '@/lib/status';
import { formatPowerKw } from '@/lib/format';
import { useConnectorTypeLabel } from '@/lib/connector-label';
import type { ConnectorStatus } from '@/lib/types';

/** One connector of the port (EVSE): its own line with its face, type and rating. */
export interface ConnectorTileConnector {
  /** The connector id within the EVSE: the lines follow it when given. */
  connectorId?: number;
  connectorType: string | null;
  maxPowerKw: number | null;
  maxCurrentAmps?: number | null;
}

// The port (EVSE) tile of the station and location screens, the portal port
// card: the EVSE status (it charges one vehicle at a time through any of its
// connectors), then one line per connector (owner decision 2026-11-13).
interface ConnectorTileProps {
  connectors: readonly ConnectorTileConnector[];
  status: ConnectorStatus;
  port: number;
  selected: boolean;
  // Overrides the status-derived default so callers can gate on reservation,
  // online, and maintenance state too. Falls back to !isStartable(status).
  disabled?: boolean;
  onPress: () => void;
  testID?: string;
}

const CHARGING: ConnectorStatus[] = ['charging', 'discharging'];
const IDLE: ConnectorStatus[] = ['suspended_ev', 'suspended_evse', 'idle'];

function specOf(c: ConnectorTileConnector): string {
  const power = c.maxPowerKw != null && c.maxPowerKw > 0 ? formatPowerKw(c.maxPowerKw) : '';
  const amps =
    c.maxCurrentAmps != null && c.maxCurrentAmps > 0 ? `${String(c.maxCurrentAmps)}A` : '';
  return [power, amps].filter(Boolean).join(' / ');
}

export function ConnectorTile({
  connectors,
  status,
  port,
  selected,
  disabled: disabledProp,
  onPress,
  testID,
}: ConnectorTileProps): React.JSX.Element {
  const { t } = useTranslation();
  const surfaceVars = useSurfaceTextVars();
  const disabled = disabledProp ?? !isStartable(status);
  const isCharging = CHARGING.includes(status);
  const isIdle = IDLE.includes(status);

  const typeLabel = useConnectorTypeLabel();
  const lines = connectors
    .map((c, index) => ({ c, index }))
    .sort((a, b) => (a.c.connectorId ?? a.index) - (b.c.connectorId ?? b.index))
    .map(({ c }) => c);
  const muted = hsl('mutedForeground');

  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={[
        t('charge.connectorPort', { id: port }),
        t(`connectorStatus.${status}`, { defaultValue: connectorStatusLabel(status) }),
        ...lines.map((c) => typeLabel(c.connectorType)),
      ].join(', ')}
      accessibilityState={{ selected, disabled }}
      style={surfaceVars}
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
      <View className="gap-1.5">
        {lines.length === 0 ? <Text variant="label">{typeLabel(null)}</Text> : null}
        {lines.map((c, index) => {
          const spec = specOf(c);
          return (
            <View
              key={c.connectorId ?? index}
              testID="connector-tile-line"
              className="flex-row items-start gap-1.5"
            >
              <View className="mt-0.5">
                <ConnectorFaceIcon type={c.connectorType} color={muted} />
              </View>
              <View className="shrink">
                <Text variant="label">{typeLabel(c.connectorType)}</Text>
                {spec !== '' ? <Text className="text-xs text-muted-foreground">{spec}</Text> : null}
              </View>
            </View>
          );
        })}
        <Text className="text-xs text-muted-foreground">
          {t('charge.connectorPort', { id: port })}
        </Text>
      </View>
    </Pressable>
  );
}
