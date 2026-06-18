// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

import React from 'react';
import { ScrollView, View, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Bell } from '@/components/icons';
import { Sheet, Text, Spinner, EmptyState } from '@/components/ui';
import { hsl } from '@/lib/theme';
import { formatRelative } from '@/lib/format';
import { useNotifications, useMarkAllRead, type PortalNotification } from '@/features/notifications';

type NotificationRoute = '/support' | '/reservations' | '/(tabs)/activity';

function routeFor(eventType: string | null): NotificationRoute | null {
  const evt = eventType ?? '';
  if (evt.startsWith('support')) return '/support';
  if (evt.startsWith('reservation')) return '/reservations';
  if (evt.startsWith('session') || evt.startsWith('payment')) return '/(tabs)/activity';
  return null;
}

export function NotificationsSheet({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}): React.JSX.Element {
  const { t } = useTranslation();
  const router = useRouter();
  const notifications = useNotifications();
  const markAllRead = useMarkAllRead();

  // Clear the unread badge as soon as the drawer opens.
  React.useEffect(() => {
    if (visible) markAllRead.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const items = notifications.data ?? [];

  const onTap = (n: PortalNotification): void => {
    onClose();
    const path = routeFor(n.eventType);
    if (path != null) router.push(path);
  };

  return (
    <Sheet visible={visible} onClose={onClose} title={t('notifications.title')}>
      {notifications.isLoading ? (
        <Spinner />
      ) : items.length === 0 ? (
        <EmptyState
          icon={<Bell size={40} color={hsl('mutedForeground')} />}
          title={t('notifications.none')}
        />
      ) : (
        <ScrollView className="max-h-96">
          <View className="gap-3">
            {items.map((n) => (
              <Pressable
                key={n.id}
                onPress={() => onTap(n)}
                className="gap-1 border-b border-muted-foreground/30 pb-3 active:opacity-70"
              >
                <Text variant="label" numberOfLines={1}>
                  {n.subject ?? n.eventType ?? t('notifications.title')}
                </Text>
                <Text className="text-xs text-muted-foreground">
                  {formatRelative(n.createdAt)}
                </Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>
      )}
    </Sheet>
  );
}
