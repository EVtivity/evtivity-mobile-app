// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  setNotificationChannelAsync: jest.fn(async () => undefined),
  getExpoPushTokenAsync: jest.fn(),
  AndroidImportance: { DEFAULT: 3 },
}));
jest.mock('expo-constants', () => ({
  __esModule: true,
  default: { expoConfig: { extra: { eas: { projectId: 'proj-1' } } } },
}));
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(async () => undefined),
  deleteItemAsync: jest.fn(async () => undefined),
}));
jest.mock('@/lib/api', () => ({ api: { post: jest.fn(async () => undefined), del: jest.fn(async () => undefined) } }));

import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';
import { registerPushToken, unregisterPushToken } from '@/lib/push';

const notif = Notifications as jest.Mocked<typeof Notifications>;
const store = SecureStore as jest.Mocked<typeof SecureStore>;
const apiMock = (require('@/lib/api') as { api: { post: jest.Mock; del: jest.Mock } }).api;

// Captured at module-eval time (the handler is registered once at import) before
// any beforeEach clears the recorded mock calls.
const registeredHandler = notif.setNotificationHandler.mock.calls[0]?.[0] as unknown as {
  handleNotification: (n: unknown) => Promise<Record<string, boolean>>;
};

function setPlatform(os: string): void {
  Object.defineProperty(Platform, 'OS', { value: os, configurable: true });
}

beforeEach(() => {
  jest.clearAllMocks();
  (Constants.expoConfig as { extra: { eas?: { projectId?: string } } }).extra = {
    eas: { projectId: 'proj-1' },
  };
  notif.getPermissionsAsync.mockResolvedValue({ granted: true, canAskAgain: true } as never);
  notif.getExpoPushTokenAsync.mockResolvedValue({ data: 'ExpoToken[x]' } as never);
  // Default to no previously-registered token (clearAllMocks resets call history
  // but not mockResolvedValue, so set it explicitly each test to avoid leakage).
  store.getItemAsync.mockResolvedValue(null);
  setPlatform('ios');
});

describe('foreground notification handler', () => {
  it('shows the banner while the app is open', async () => {
    await expect(registeredHandler.handleNotification({})).resolves.toMatchObject({
      shouldShowBanner: true,
      shouldShowAlert: true,
      shouldPlaySound: false,
    });
  });
});

describe('registerPushToken', () => {
  it('registers the token with the API when permission is already granted', async () => {
    await registerPushToken();
    expect(store.setItemAsync).toHaveBeenCalledWith('ev_push_token', 'ExpoToken[x]');
    expect(apiMock.post).toHaveBeenCalledWith('/v1/portal/notifications/push-token', {
      token: 'ExpoToken[x]',
      platform: 'ios',
    });
  });

  it('skips the round-trip when the token is already registered', async () => {
    store.getItemAsync.mockResolvedValue('ExpoToken[x]');
    await registerPushToken();
    expect(apiMock.post).not.toHaveBeenCalled();
    expect(store.setItemAsync).not.toHaveBeenCalled();
  });

  it('requests permission when it can ask again', async () => {
    notif.getPermissionsAsync.mockResolvedValue({ granted: false, canAskAgain: true } as never);
    notif.requestPermissionsAsync.mockResolvedValue({ granted: true } as never);
    await registerPushToken();
    expect(notif.requestPermissionsAsync).toHaveBeenCalled();
    expect(apiMock.post).toHaveBeenCalled();
  });

  it('bails out when permission stays denied', async () => {
    notif.getPermissionsAsync.mockResolvedValue({ granted: false, canAskAgain: false } as never);
    await registerPushToken();
    expect(notif.requestPermissionsAsync).not.toHaveBeenCalled();
    expect(apiMock.post).not.toHaveBeenCalled();
  });

  it('creates the Android notification channel', async () => {
    setPlatform('android');
    await registerPushToken();
    expect(notif.setNotificationChannelAsync).toHaveBeenCalledWith('default', expect.any(Object));
    expect(apiMock.post).toHaveBeenCalledWith(
      '/v1/portal/notifications/push-token',
      expect.objectContaining({ platform: 'android' }),
    );
  });

  it('skips registration when no EAS project id is configured', async () => {
    (Constants.expoConfig as { extra: Record<string, unknown> }).extra = {};
    await registerPushToken();
    expect(notif.getExpoPushTokenAsync).not.toHaveBeenCalled();
  });

  it('swallows a failure to obtain the device token', async () => {
    notif.getExpoPushTokenAsync.mockRejectedValue(new Error('no APNs token'));
    await expect(registerPushToken()).resolves.toBeUndefined();
    expect(apiMock.post).not.toHaveBeenCalled();
  });
});

describe('unregisterPushToken', () => {
  it('removes the stored token server-side and locally', async () => {
    store.getItemAsync.mockResolvedValue('ExpoToken[x]');
    await unregisterPushToken();
    expect(apiMock.del).toHaveBeenCalledWith(
      '/v1/portal/notifications/push-token?token=ExpoToken%5Bx%5D',
    );
    expect(store.deleteItemAsync).toHaveBeenCalledWith('ev_push_token');
  });

  it('does nothing when no token is stored', async () => {
    store.getItemAsync.mockResolvedValue(null);
    await unregisterPushToken();
    expect(apiMock.del).not.toHaveBeenCalled();
  });
});
