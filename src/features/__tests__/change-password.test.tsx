// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

// A password change ends every session of the driver. A current server answers
// a mobile client with a new session, which the app stores so this device stays
// signed in. An older server answers { success } only and the session is kept.

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async () => null),
  setItemAsync: jest.fn(async () => undefined),
  deleteItemAsync: jest.fn(async () => undefined),
  WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'when_unlocked_this_device_only',
}));
jest.mock('@/lib/config', () => ({ API_BASE_URL: 'http://api.test' }));
jest.mock('@/lib/device', () => ({
  deviceHeaders: jest.fn(async () => ({
    Accept: 'application/json',
    'X-Client': 'mobile',
    'X-Device-Id': 'dev-1',
  })),
  SECURE_STORE_OPTS: { keychainAccessible: 'when_unlocked_this_device_only' },
}));
jest.mock('@/lib/attestation', () => ({ getAttestationHeaders: jest.fn(async () => ({})) }));
jest.mock('@/lib/auth', () => ({ useAuth: () => null }));
const mockRegisterPush = jest.fn(async () => undefined);
jest.mock('@/lib/push', () => ({
  registerPushToken: (...args: unknown[]) => mockRegisterPush(...(args as [])),
}));

import React from 'react';
import * as SecureStore from 'expo-secure-store';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { clearSession, getAccessToken, getRefreshToken, setSession } from '@/lib/session';
import { useChangePassword, useMfaConfirm } from '@/features/account';

const store = SecureStore as jest.Mocked<typeof SecureStore>;
let fetchMock: jest.Mock;

const jsonResponse = (body: unknown): Response =>
  ({ status: 200, ok: true, text: async () => JSON.stringify(body) }) as unknown as Response;

function wrapper({ children }: { children: React.ReactNode }): React.JSX.Element {
  const client = new QueryClient({
    defaultOptions: { mutations: { retry: false, gcTime: Infinity } },
  });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

async function changePassword(): Promise<void> {
  const { result } = await renderHook(() => useChangePassword(), { wrapper });
  await act(async () => {
    result.current.mutate({ currentPassword: 'Old-pass-123', newPassword: 'New-pass-456' });
  });
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
}

function authorizationOf(call: unknown[]): string | undefined {
  const init = call[1] as { headers: Record<string, string> };
  return init.headers.Authorization;
}

beforeEach(async () => {
  jest.clearAllMocks();
  fetchMock = jest.fn();
  (global as unknown as { fetch: jest.Mock }).fetch = fetchMock;
  await clearSession();
  await setSession({ token: 'old-access', refreshToken: 'old-refresh', expiresIn: 900 });
  store.setItemAsync.mockClear();
});

it('stores the new session from the reply and uses it for the next request', async () => {
  fetchMock
    .mockResolvedValueOnce(
      jsonResponse({
        success: true,
        token: 'new-access',
        refreshToken: 'new-refresh',
        expiresIn: 900,
      }),
    )
    .mockResolvedValueOnce(jsonResponse({ id: 'drv_1' }));

  await changePassword();

  expect(fetchMock.mock.calls[0]?.[0]).toBe('http://api.test/v1/portal/driver/password');
  expect(authorizationOf(fetchMock.mock.calls[0] as unknown[])).toBe('Bearer old-access');
  expect(getAccessToken()).toBe('new-access');
  expect(getRefreshToken()).toBe('new-refresh');
  expect(store.setItemAsync).toHaveBeenCalledWith(
    'ev_refresh_token',
    'new-refresh',
    expect.anything(),
  );

  await api.get('/v1/portal/auth/me');
  expect(authorizationOf(fetchMock.mock.calls[1] as unknown[])).toBe('Bearer new-access');
  // Ending the sessions deleted this device's push token: post it again,
  // without a permission prompt.
  expect(mockRegisterPush).toHaveBeenCalledWith({ force: true, askPermission: false });
});

it('stores the new session after turning MFA on and registers the push token again', async () => {
  fetchMock.mockResolvedValueOnce(
    jsonResponse({
      success: true,
      recoveryCodes: ['a'],
      token: 'mfa-access',
      refreshToken: 'mfa-refresh',
      expiresIn: 900,
    }),
  );
  const { result } = await renderHook(() => useMfaConfirm(), { wrapper });
  await act(async () => {
    result.current.mutate({ method: 'totp', code: '123456' });
  });
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(fetchMock.mock.calls[0]?.[0]).toBe('http://api.test/v1/portal/driver/mfa/confirm');
  expect(getAccessToken()).toBe('mfa-access');
  expect(getRefreshToken()).toBe('mfa-refresh');
  expect(mockRegisterPush).toHaveBeenCalledWith({ force: true, askPermission: false });
});

it('keeps the current session when an older server answers without tokens', async () => {
  fetchMock
    .mockResolvedValueOnce(jsonResponse({ success: true }))
    .mockResolvedValueOnce(jsonResponse({ id: 'drv_1' }));

  await changePassword();

  expect(getAccessToken()).toBe('old-access');
  expect(getRefreshToken()).toBe('old-refresh');
  expect(store.setItemAsync).not.toHaveBeenCalled();
  expect(mockRegisterPush).not.toHaveBeenCalled();

  await api.get('/v1/portal/auth/me');
  expect(authorizationOf(fetchMock.mock.calls[1] as unknown[])).toBe('Bearer old-access');
});
