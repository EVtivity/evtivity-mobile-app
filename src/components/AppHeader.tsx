// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

import React from 'react';
import { View, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Star, Bell } from '@/components/icons';
import { Text } from '@/components/ui';
import { BrandLogo } from '@/components/BrandLogo';
import { NotificationsSheet } from '@/components/NotificationsSheet';
import { useUnreadCount } from '@/features/notifications';
import { useFavorites } from '@/features/favorites';
import { useBranding } from '@/features/app-info';
import { APP_NAME } from '@/lib/config';
import { hsl } from '@/lib/theme';

// Global app header: operator-branded logo and company name from the CSMS, with
// Favorites and Notifications actions. The brand falls back to the bundled
// defaults until /v1/portal/branding loads.
export function AppHeader(): React.JSX.Element {
  const router = useRouter();
  const unread = useUnreadCount();
  const favorites = useFavorites();
  const { data: branding } = useBranding();
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const count = unread.data ?? 0;
  const hasFavorites = (favorites.data?.length ?? 0) > 0;

  const name = branding?.name != null && branding.name !== '' ? branding.name : APP_NAME;

  return (
    <View className="mb-1 flex-row items-center justify-between">
      <View className="flex-row items-center gap-2.5">
        <BrandLogo uri={branding?.logo} />
        <Text weight="bold" className="text-2xl tracking-tight text-white">
          {name}
        </Text>
      </View>
      <View className="flex-row items-center gap-2">
        <Pressable
          accessibilityLabel="Favorites"
          onPress={() => router.push('/favorites')}
          hitSlop={8}
          className="h-10 w-10 items-center justify-center rounded-full bg-muted active:opacity-60"
        >
          <Star
            size={20}
            weight={hasFavorites ? 'fill' : 'regular'}
            color={hasFavorites ? hsl('warning') : hsl('mutedForeground')}
          />
        </Pressable>
        <Pressable
          accessibilityLabel="Notifications"
          onPress={() => setSheetOpen(true)}
          hitSlop={8}
          className="h-10 w-10 items-center justify-center rounded-full bg-muted active:opacity-60"
        >
          <Bell size={20} color={hsl('mutedForeground')} />
          {count > 0 ? (
            <View className="absolute -right-2 -top-1 h-[18px] min-w-[18px] items-center justify-center rounded-full bg-destructive px-1.5">
              <Text
                weight="bold"
                tabular
                className="text-[11px] text-white"
                style={{ lineHeight: 14, textAlign: 'center', includeFontPadding: false }}
              >
                {count > 99 ? '99+' : count}
              </Text>
            </View>
          ) : null}
        </Pressable>
      </View>
      <NotificationsSheet visible={sheetOpen} onClose={() => setSheetOpen(false)} />
    </View>
  );
}
