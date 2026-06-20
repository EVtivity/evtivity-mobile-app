// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

import React from 'react';
import { View, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Eye, Trash2, MapPin } from '@/components/icons';
import {
  Screen,
  Text,
  Card,
  Spinner,
  EmptyState,
  StatusDot,
  BackButton,
  useToast,
  useApiErrorToast,
  useConfirm,
} from '@/components/ui';
import { hsl } from '@/lib/theme';
import { useWatches, useToggleWatch } from '@/features/station-watch';

export default function WatchingScreen(): React.JSX.Element {
  const { t } = useTranslation();
  const router = useRouter();
  const toast = useToast();
  const showApiError = useApiErrorToast();
  const confirm = useConfirm();

  const watches = useWatches();
  const toggle = useToggleWatch();

  const onRemove = async (stationId: string, watchId: number): Promise<void> => {
    const ok = await confirm({
      title: t('watch.removeTitle'),
      message: t('watch.removeMessage'),
      confirmText: t('common.remove'),
      destructive: true,
    });
    if (!ok) return;
    toggle.mutate(
      { stationId, watchId, isWatching: true },
      {
        onSuccess: () => toast.show(t('watch.removed'), 'success'),
        onError: (err) => showApiError(err),
      },
    );
  };

  const items = watches.data ?? [];

  return (
    <Screen scroll>
      <BackButton />
      <Text variant="h1" className="mb-4">
        {t('watch.title')}
      </Text>

      {watches.isLoading ? (
        <Spinner />
      ) : items.length === 0 ? (
        <EmptyState
          icon={<Eye size={40} color={hsl('mutedForeground')} />}
          title={t('watch.empty')}
        />
      ) : (
        <View className="gap-3">
          {items.map((w) => (
            <Card
              key={w.id}
              className="flex-row items-center justify-between"
              onPress={() =>
                router.push({
                  pathname: '/charge/[stationId]',
                  params: { stationId: w.stationId },
                })
              }
            >
              <View className="flex-1 pr-3">
                <View className="flex-row items-center gap-2">
                  <StatusDot tone={w.isOnline ? 'success' : 'muted'} />
                  <Text variant="label">{w.siteName ?? w.stationId}</Text>
                </View>
                {w.siteAddress != null ? (
                  <View className="mt-1 flex-row items-center gap-1">
                    <MapPin size={14} color={hsl('mutedForeground')} />
                    <Text className="text-sm text-muted-foreground">
                      {[w.siteAddress, w.siteCity, w.siteState].filter(Boolean).join(', ')}
                    </Text>
                  </View>
                ) : null}
                <Text className="mt-1 text-sm text-muted-foreground">
                  {t('charge.availableOfTotal', {
                    available: w.availableCount,
                    total: w.evseCount,
                  })}
                </Text>
              </View>
              <Pressable
                accessibilityLabel={t('common.remove')}
                hitSlop={8}
                onPress={(e) => {
                  e.stopPropagation();
                  void onRemove(w.stationId, w.id);
                }}
              >
                <Trash2 size={20} color={hsl('destructive')} />
              </Pressable>
            </Card>
          ))}
        </View>
      )}
    </Screen>
  );
}
