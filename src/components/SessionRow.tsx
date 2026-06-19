// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

import React from 'react';
import { Pressable, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Text, StatusBadge } from '@/components/ui';
import { cn } from '@/lib/cn';
import { formatCurrency, formatEnergyWh, formatDuration, formatDate } from '@/lib/format';
import { sessionStatusTone, sessionStatusLabelKey, SESSION_TONE_COLOR } from '@/lib/status';
import type { ChargingSession } from '@/lib/types';

interface SessionRowProps {
  session: ChargingSession;
  onPress?: () => void;
}

// Memoized: in lists this row only re-renders when its session or handler
// actually changes, not whenever the parent screen re-renders (e.g. polling).
export const SessionRow = React.memo(function SessionRow({
  session,
  onPress,
}: SessionRowProps): React.JSX.Element {
  const { t } = useTranslation();
  const cost =
    session.status === 'completed'
      ? session.finalCostCents
      : (session.currentCostCents ?? session.finalCostCents);
  return (
    <Pressable
      testID={`session-row-${session.id}`}
      onPress={onPress}
      disabled={onPress == null}
      className={cn('gap-1 py-3', onPress != null && 'active:opacity-70')}
    >
      <View className="flex-row items-center gap-2">
        <Text variant="title" numberOfLines={1} className="flex-1">
          {session.stationName ?? session.stationId}
        </Text>
        <StatusBadge
          label={t(sessionStatusLabelKey(session.status), { defaultValue: session.status })}
          colorStyle={{ backgroundColor: SESSION_TONE_COLOR[sessionStatusTone(session.status)] }}
        />
      </View>
      <View className="flex-row items-center gap-2">
        <Text variant="muted" numberOfLines={1} className="flex-1">
          {formatDate(session.startedAt)} · {formatDuration(session.startedAt, session.endedAt)} ·{' '}
          {formatEnergyWh(session.energyDeliveredWh)}
        </Text>
        <Text variant="title" tabular>
          {formatCurrency(cost, session.currency)}
        </Text>
      </View>
    </Pressable>
  );
});
