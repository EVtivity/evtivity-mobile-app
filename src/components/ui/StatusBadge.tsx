// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

import React from 'react';
import { View, type ViewStyle } from 'react-native';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/cn';
import { Text } from './Text';
import { connectorStatusLabel, connectorStatusColor } from '@/lib/status';
import type { ConnectorStatus } from '@/lib/types';

// Solid-color status pill with near-white text, matching the driver portal.
// Pass `status` to derive the connector color/label from the Tailwind palette,
// or pass an explicit `label` + `colorStyle` (e.g. a portal-palette session
// tone that has no Tailwind class).
export function StatusBadge({
  status,
  label,
  colorStyle,
}: {
  status?: ConnectorStatus;
  label?: string;
  colorStyle?: ViewStyle;
}): React.JSX.Element {
  const { t } = useTranslation();
  const colorClass = status != null ? connectorStatusColor(status) : undefined;
  const text =
    label ??
    (status != null
      ? t(`connectorStatus.${status}`, { defaultValue: connectorStatusLabel(status) })
      : '');
  return (
    <View style={colorStyle} className={cn('self-start rounded-full px-2.5 py-1', colorClass)}>
      <Text weight="semibold" className="text-sm text-white">
        {text}
      </Text>
    </View>
  );
}

// Compact colored dot for list rows.
export function StatusDot({
  tone,
}: {
  tone: 'success' | 'muted' | 'destructive' | 'warning' | 'info';
}): React.JSX.Element {
  const cls =
    tone === 'success'
      ? 'bg-success'
      : tone === 'destructive'
        ? 'bg-destructive'
        : tone === 'warning'
          ? 'bg-warning'
          : tone === 'info'
            ? 'bg-info'
            : 'bg-muted-foreground';
  return <View className={cn('h-2 w-2 rounded-full', cls)} />;
}
