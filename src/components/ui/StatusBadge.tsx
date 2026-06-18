// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

import React from 'react';
import { View } from 'react-native';
import { cn } from '@/lib/cn';
import { Text } from './Text';
import { connectorStatusLabel, connectorStatusColor } from '@/lib/status';
import type { ConnectorStatus } from '@/lib/types';

// Connector status pill colored to match the driver portal (solid status color,
// near-white text), e.g. available green, charging blue, idle yellow, faulted red.
export function StatusBadge({ status }: { status: ConnectorStatus }): React.JSX.Element {
  return (
    <View className={cn('self-start rounded-full px-2.5 py-1', connectorStatusColor(status))}>
      <Text weight="semibold" className="text-sm text-white">
        {connectorStatusLabel(status)}
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
