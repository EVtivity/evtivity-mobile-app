// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

import React from 'react';
import { View, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Star, Trash2, MapPin } from '@/components/icons';
import {
  Screen,
  Text,
  Card,
  Spinner,
  EmptyState,
  StatusDot,
  BackButton,
  useToast,
  useConfirm,
} from '@/components/ui';
import { hsl } from '@/lib/theme';
import { apiErrorMessage } from '@/lib/api';
import { useFavorites, useToggleFavorite } from '@/features/favorites';

export default function FavoritesScreen(): React.JSX.Element {
  const { t } = useTranslation();
  const router = useRouter();
  const toast = useToast();

  const favorites = useFavorites();
  const toggle = useToggleFavorite();
  const confirm = useConfirm();

  const onRemove = async (stationId: string, favoriteId: number): Promise<void> => {
    const ok = await confirm({
      title: t('favorites.removeTitle'),
      message: t('favorites.removeMessage'),
      confirmText: t('common.remove'),
      destructive: true,
    });
    if (!ok) return;
    toggle.mutate(
      { stationId, favoriteId, isFavorited: true },
      {
        onSuccess: () => toast.show(t('common.remove'), 'success'),
        onError: (err) =>
          toast.show(
            apiErrorMessage(err, t),
            'error',
          ),
      },
    );
  };

  const items = favorites.data ?? [];

  return (
    <Screen scroll>
      <BackButton />
      <Text variant="h1" className="mb-4">
        {t('favorites.title')}
      </Text>

      {favorites.isLoading ? (
        <Spinner />
      ) : items.length === 0 ? (
        <EmptyState
          icon={<Star size={40} color={hsl('mutedForeground')} />}
          title={t('favorites.none')}
        />
      ) : (
        <View className="gap-3">
          {items.map((fav) => (
            <Card
              key={fav.id}
              className="flex-row items-center justify-between"
              onPress={() =>
                router.push({
                  pathname: '/charge/[stationId]',
                  params: { stationId: fav.stationId },
                })
              }
            >
              <View className="flex-1 pr-3">
                <View className="flex-row items-center gap-2">
                  <StatusDot tone={fav.isOnline ? 'success' : 'muted'} />
                  <Text variant="label">{fav.siteName ?? fav.stationId}</Text>
                </View>
                {fav.siteAddress != null ? (
                  <View className="mt-1 flex-row items-center gap-1">
                    <MapPin size={14} color={hsl('mutedForeground')} />
                    <Text className="text-sm text-muted-foreground">
                      {[fav.siteAddress, fav.siteCity, fav.siteState].filter(Boolean).join(', ')}
                    </Text>
                  </View>
                ) : null}
                <Text className="mt-1 text-sm text-muted-foreground">
                  {`${String(fav.availableCount)} / ${String(fav.evseCount)} available`}
                </Text>
              </View>
              <Pressable
                accessibilityLabel={t('common.remove')}
                hitSlop={8}
                onPress={(e) => {
                  e.stopPropagation();
                  void onRemove(fav.stationId, fav.id);
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
