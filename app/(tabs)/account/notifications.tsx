// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

import React from 'react';
import { View, Switch } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Screen, Text, Card, Spinner, BackButton, useApiErrorToast } from '@/components/ui';
import { Lock } from '@/components/icons';
import { hsl } from '@/lib/theme';
import { useNotificationPrefs, useUpdateNotificationPrefs } from '@/features/account';
import {
  allControlUpdate,
  availableChannels,
  cellUpdate,
  channelState,
  groupEvents,
  type NotificationChannel,
  type NotificationPrefsUpdate,
} from '@/lib/notification-prefs';

const P = 'account.notificationPrefs';

// One switch per event and configured channel, grouped by topic, with an
// "All Notifications" row per channel. Each tap is saved at once and sends
// only what changed. Cells the operator made mandatory stay on and locked.
export default function NotificationSettingsScreen(): React.JSX.Element {
  const { t } = useTranslation();
  const showApiError = useApiErrorToast();
  const prefs = useNotificationPrefs();
  const update = useUpdateNotificationPrefs();

  const current = prefs.data;

  const save = (body: NotificationPrefsUpdate | null): void => {
    if (body == null) return;
    update.mutate(body, {
      onError: (err) => {
        showApiError(err);
      },
    });
  };

  const channelName = (channel: NotificationChannel): string => t(`${P}.channels.${channel}`);
  const eventName = (eventType: string): string =>
    t(`${P}.events.${eventType}`, { defaultValue: eventType });

  if (prefs.isLoading || current == null) {
    return (
      <Screen scroll>
        <BackButton />
        <Text variant="h1" className="mb-4">
          {t('account.notifications')}
        </Text>
        <Spinner />
      </Screen>
    );
  }

  const channels = availableChannels(current);
  const groups = groupEvents(current.events);
  const anyMandatory = current.events.some((event) =>
    channels.some((channel) => event[channel].mandatory),
  );

  return (
    <Screen scroll>
      <BackButton />
      <Text variant="h1" className="mb-2">
        {t('account.notifications')}
      </Text>
      <Text variant="muted" className="mb-4">
        {t(`${P}.intro`)}
      </Text>

      {!current.channels.email && !current.channels.sms ? (
        <Text testID="notif-no-channels" variant="muted" className="mb-4">
          {t(`${P}.noChannels`)}
        </Text>
      ) : null}

      <Card className="mb-4 gap-2">
        <Text variant="h3">{t(`${P}.allNotifications`)}</Text>
        <View className="flex-row flex-wrap gap-x-5 gap-y-2">
          {channels.map((channel) => {
            const state = channelState(current, channel);
            return (
              <View key={channel} className="flex-row items-center gap-2">
                <Text variant="label">{channelName(channel)}</Text>
                <Switch
                  testID={`notif-all-${channel}`}
                  accessibilityLabel={t(`${P}.allChannelLabel`, { channel: channelName(channel) })}
                  accessibilityState={{
                    checked: state === 'mixed' ? 'mixed' : state === 'on',
                    disabled: state === 'none',
                  }}
                  value={state === 'on'}
                  disabled={state === 'none'}
                  onValueChange={() => save(allControlUpdate(current, channel))}
                  trackColor={{ true: hsl('primary'), false: hsl('muted') }}
                />
              </View>
            );
          })}
        </View>
      </Card>

      {groups.map(({ group, events }) => (
        <View key={group} className="mb-4">
          <Text variant="h3" className="mb-2">
            {t(`${P}.groups.${group}`, { defaultValue: group })}
          </Text>
          <Card className="gap-1">
            {events.map((event) => (
              <View key={event.eventType} className="gap-2 py-2">
                <Text variant="label">{eventName(event.eventType)}</Text>
                <View className="flex-row flex-wrap gap-x-5 gap-y-2">
                  {channels.map((channel) => {
                    const cell = event[channel];
                    const label = t(`${P}.eventChannelLabel`, {
                      event: eventName(event.eventType),
                      channel: channelName(channel),
                    });
                    return (
                      <View key={channel} className="flex-row items-center gap-2">
                        <Text variant="caption">{channelName(channel)}</Text>
                        {cell.mandatory ? (
                          <View
                            testID={`notif-lock-${event.eventType}-${channel}`}
                            accessible
                            accessibilityLabel={t(`${P}.required`)}
                          >
                            <Lock size={14} color={hsl('mutedForeground')} />
                          </View>
                        ) : null}
                        <Switch
                          testID={`notif-${event.eventType}-${channel}`}
                          accessibilityLabel={
                            cell.mandatory ? `${label}, ${t(`${P}.required`)}` : label
                          }
                          value={cell.mandatory || cell.enabled}
                          disabled={cell.mandatory}
                          onValueChange={(v) =>
                            save(cellUpdate(current, event.eventType, channel, v))
                          }
                          trackColor={{ true: hsl('primary'), false: hsl('muted') }}
                        />
                      </View>
                    );
                  })}
                </View>
              </View>
            ))}
          </Card>
        </View>
      ))}

      {anyMandatory ? (
        <Text testID="notif-required-note" variant="muted" className="mb-2">
          {t(`${P}.requiredNote`)}
        </Text>
      ) : null}
      <Text variant="muted">{t(`${P}.alwaysSentNote`)}</Text>
    </Screen>
  );
}
