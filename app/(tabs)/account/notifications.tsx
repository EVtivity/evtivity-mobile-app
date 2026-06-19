// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

import React from 'react';
import { View, Switch } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Screen, Text, Card, Spinner, BackButton, useApiErrorToast } from '@/components/ui';
import { hsl } from '@/lib/theme';
import {
  useNotificationPrefs,
  useUpdateNotificationPrefs,
  type NotificationPrefs,
} from '@/features/account';

export default function NotificationSettingsScreen(): React.JSX.Element {
  const { t } = useTranslation();
  const showApiError = useApiErrorToast();
  const prefs = useNotificationPrefs();
  const update = useUpdateNotificationPrefs();

  const current = prefs.data;

  const save = (next: NotificationPrefs): void => {
    update.mutate(next, {
      onError: (err) => {
        showApiError(err);
      },
    });
  };

  const toggle = (key: keyof NotificationPrefs, value: boolean): void => {
    if (current == null) return;
    save({
      emailEnabled: current.emailEnabled,
      smsEnabled: current.smsEnabled,
      pushEnabled: current.pushEnabled ?? true,
      [key]: value,
    });
  };

  return (
    <Screen scroll>
      <BackButton />
      <Text variant="h1" className="mb-4">
        {t('account.notifications')}
      </Text>

      {prefs.isLoading || current == null ? (
        <Spinner />
      ) : (
        <Card className="gap-1">
          <Row
            testID="notif-email"
            label={t('account.emailNotifications')}
            value={current.emailEnabled}
            onValueChange={(v) => toggle('emailEnabled', v)}
          />
          <Row
            testID="notif-sms"
            label={t('account.smsNotifications')}
            value={current.smsEnabled}
            onValueChange={(v) => toggle('smsEnabled', v)}
          />
          <Row
            testID="notif-push"
            label={t('account.pushNotifications')}
            value={current.pushEnabled ?? true}
            onValueChange={(v) => toggle('pushEnabled', v)}
          />
        </Card>
      )}
    </Screen>
  );
}

function Row({
  testID,
  label,
  value,
  onValueChange,
}: {
  testID?: string;
  label: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
}): React.JSX.Element {
  return (
    <View className="flex-row items-center justify-between py-3">
      <Text variant="label" className="flex-1 pr-3">
        {label}
      </Text>
      <Switch
        testID={testID}
        value={value}
        onValueChange={onValueChange}
        trackColor={{ true: hsl('primary'), false: hsl('muted') }}
      />
    </View>
  );
}
