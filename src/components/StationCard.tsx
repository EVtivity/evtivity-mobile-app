// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

import React from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { MapPin, Zap } from '@/components/icons';
import { Card, Text, Badge } from '@/components/ui';
import { hsl } from '@/lib/theme';

interface StationCardProps {
  name: string;
  address?: string | null;
  isOnline: boolean;
  availableCount: number;
  evseCount: number;
  distanceKm?: number | null;
  onPress: () => void;
}

export const StationCard = React.memo(function StationCard({
  name,
  address,
  isOnline,
  availableCount,
  evseCount,
  distanceKm,
  onPress,
}: StationCardProps): React.JSX.Element {
  const { t } = useTranslation();
  const hasAvail = availableCount > 0 && isOnline;
  return (
    <Card onPress={onPress} className="gap-3">
      <View className="flex-row items-start justify-between gap-3">
        <View className="flex-1 gap-1">
          <Text variant="title" className="flex-1" numberOfLines={1}>
            {name}
          </Text>
          {address != null && address.length > 0 ? (
            <View className="flex-row items-center gap-1.5">
              <MapPin size={13} color={hsl('mutedForeground')} />
              <Text variant="muted" className="flex-1" numberOfLines={1}>
                {address}
              </Text>
            </View>
          ) : null}
        </View>
        {distanceKm != null ? (
          <Text variant="caption" tabular className="text-muted-foreground">
            {distanceKm.toFixed(1)} km
          </Text>
        ) : null}
      </View>
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-1.5">
          <Zap size={14} color={hasAvail ? hsl('primary') : hsl('mutedForeground')} />
          <Text variant="caption" className="text-muted-foreground">
            {t('charge.availableOfTotal', { available: availableCount, total: evseCount })}
          </Text>
        </View>
        <Badge
          variant={!isOnline ? 'secondary' : hasAvail ? 'success' : 'warning'}
          label={!isOnline ? t('charge.offline') : hasAvail ? t('charge.available') : t('charge.inUse')}
        />
      </View>
    </Card>
  );
});
