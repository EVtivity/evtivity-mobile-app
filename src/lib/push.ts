// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import * as SecureStore from 'expo-secure-store';
import { api } from './api';

const LAST_TOKEN_KEY = 'ev_push_token';

// Foreground presentation: show the banner even while the app is open.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

function projectId(): string | undefined {
  const extra = Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined;
  return extra?.eas?.projectId;
}

// Requests permission, obtains the Expo push token, and registers it with the
// API. Idempotent and fail-soft: a denied permission or a missing EAS project
// id (local dev) simply skips registration without throwing.
export async function registerPushToken(): Promise<void> {
  const settings = await Notifications.getPermissionsAsync();
  let granted = settings.granted;
  if (!granted && settings.canAskAgain) {
    const req = await Notifications.requestPermissionsAsync();
    granted = req.granted;
  }
  if (!granted) return;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Default',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  const id = projectId();
  if (id == null) return;

  try {
    const tokenResponse = await Notifications.getExpoPushTokenAsync({ projectId: id });
    const token = tokenResponse.data;
    // This runs again on every unlock/foreground. Skip the round-trip when the
    // token already matches the last successfully-registered one.
    const lastToken = await SecureStore.getItemAsync(LAST_TOKEN_KEY);
    if (token === lastToken) return;
    await api.post('/v1/portal/notifications/push-token', {
      token,
      platform: Platform.OS === 'ios' ? 'ios' : 'android',
    });
    // Persist only after the POST succeeds, so a failed registration is retried
    // next time instead of being skipped by the dedup check above.
    await SecureStore.setItemAsync(LAST_TOKEN_KEY, token);
  } catch {
    // No APNs/FCM device token on simulators/emulators (and none when offline).
    // Skip registration instead of crashing the app on launch.
  }
}

// Removes the registered token server-side (called on logout). Reads the last
// token from secure storage so the right row is deleted even if the live token
// is momentarily unavailable.
export async function unregisterPushToken(): Promise<void> {
  const token = await SecureStore.getItemAsync(LAST_TOKEN_KEY);
  if (token == null) return;
  await api.del(`/v1/portal/notifications/push-token?token=${encodeURIComponent(token)}`);
  await SecureStore.deleteItemAsync(LAST_TOKEN_KEY);
}
