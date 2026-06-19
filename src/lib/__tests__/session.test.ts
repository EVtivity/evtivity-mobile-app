// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

export {};

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
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

type SessionModule = typeof import('@/lib/session');
interface StoreMock {
  getItemAsync: jest.Mock;
  setItemAsync: jest.Mock;
  deleteItemAsync: jest.Mock;
}

function load(): { session: SessionModule; store: StoreMock } {
  let out = {} as { session: SessionModule; store: StoreMock };
  jest.isolateModules(() => {
    const store = require('expo-secure-store') as StoreMock;
    const session = require('@/lib/session') as SessionModule;
    out = { session, store };
  });
  return out;
}

const okJson = (body: unknown): Response =>
  ({ ok: true, json: async () => body }) as unknown as Response;

beforeEach(() => {
  (global as unknown as { fetch: jest.Mock }).fetch = jest.fn();
});

describe('loadSession', () => {
  it('hydrates state and reports a session when a refresh token exists', async () => {
    const { session, store } = load();
    store.getItemAsync
      .mockResolvedValueOnce('access')
      .mockResolvedValueOnce('refresh')
      .mockResolvedValueOnce('123');
    await expect(session.loadSession()).resolves.toBe(true);
    expect(session.getAccessToken()).toBe('access');
    expect(session.getRefreshToken()).toBe('refresh');
    expect(session.hasSession()).toBe(true);
  });

  it('reports no session and zero expiry when nothing is stored', async () => {
    const { session, store } = load();
    store.getItemAsync.mockResolvedValue(null);
    await expect(session.loadSession()).resolves.toBe(false);
    expect(session.isAccessTokenStale()).toBe(true);
  });
});

describe('setSession / clearSession', () => {
  it('persists all three values with hardened keychain options', async () => {
    const { session, store } = load();
    await session.setSession({ token: 'a', refreshToken: 'r', expiresIn: 900 });
    const opts = { keychainAccessible: 'when_unlocked_this_device_only' };
    expect(store.setItemAsync).toHaveBeenCalledWith('ev_access_token', 'a', opts);
    expect(store.setItemAsync).toHaveBeenCalledWith('ev_refresh_token', 'r', opts);
    expect(store.setItemAsync).toHaveBeenCalledWith('ev_expires_at', expect.any(String), opts);
    expect(session.isAccessTokenStale()).toBe(false);
  });

  it('deletes all three values', async () => {
    const { session, store } = load();
    await session.setSession({ token: 'a', refreshToken: 'r', expiresIn: 900 });
    await session.clearSession();
    expect(store.deleteItemAsync).toHaveBeenCalledTimes(3);
    expect(session.hasSession()).toBe(false);
  });
});

describe('isAccessTokenStale', () => {
  it('is stale when no access token is present', () => {
    const { session } = load();
    expect(session.isAccessTokenStale()).toBe(true);
  });
  it('is stale once inside the refresh skew window', async () => {
    const { session } = load();
    await session.setSession({ token: 'a', refreshToken: 'r', expiresIn: 0 });
    expect(session.isAccessTokenStale()).toBe(true);
  });
});

describe('refreshSession', () => {
  it('returns false without a refresh token and never calls the network', async () => {
    const { session } = load();
    await expect(session.refreshSession()).resolves.toBe(false);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('stores the rotated tokens on success', async () => {
    const { session } = load();
    await session.setSession({ token: 'a', refreshToken: 'r', expiresIn: 0 });
    (global.fetch as jest.Mock).mockResolvedValue(
      okJson({ token: 'a2', refreshToken: 'r2', expiresIn: 900 }),
    );
    await expect(session.refreshSession()).resolves.toBe(true);
    expect(session.getAccessToken()).toBe('a2');
    expect(global.fetch).toHaveBeenCalledWith(
      'http://api.test/v1/portal/auth/refresh',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('forces logout when the server rejects the refresh token', async () => {
    const { session } = load();
    const onLogout = jest.fn();
    session.setOnLogout(onLogout);
    await session.setSession({ token: 'a', refreshToken: 'r', expiresIn: 0 });
    (global.fetch as jest.Mock).mockResolvedValue({ ok: false } as Response);
    await expect(session.refreshSession()).resolves.toBe(false);
    expect(onLogout).toHaveBeenCalledTimes(1);
    expect(session.hasSession()).toBe(false);
  });

  it('keeps the session on a transport error', async () => {
    const { session } = load();
    await session.setSession({ token: 'a', refreshToken: 'r', expiresIn: 0 });
    (global.fetch as jest.Mock).mockRejectedValue(new Error('offline'));
    await expect(session.refreshSession()).resolves.toBe(false);
    expect(session.hasSession()).toBe(true);
  });

  it('shares a single in-flight refresh across concurrent callers', async () => {
    const { session } = load();
    await session.setSession({ token: 'a', refreshToken: 'r', expiresIn: 0 });
    let resolveFetch: (r: Response) => void = () => undefined;
    (global.fetch as jest.Mock).mockReturnValue(
      new Promise<Response>((r) => {
        resolveFetch = r;
      }),
    );
    const p1 = session.refreshSession();
    const p2 = session.refreshSession();
    expect(p1).toBe(p2);
    resolveFetch(okJson({ token: 'a2', refreshToken: 'r2', expiresIn: 900 }));
    await Promise.all([p1, p2]);
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });
});
