// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(async () => undefined),
  WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'when_unlocked_this_device_only',
}));
jest.mock('@/lib/api', () => ({ api: { get: jest.fn(), post: jest.fn() } }));
jest.mock('@/lib/device', () => ({
  SECURE_STORE_OPTS: { keychainAccessible: 'when_unlocked_this_device_only' },
}));
jest.mock('@/lib/session', () => ({
  loadSession: jest.fn(),
  setSession: jest.fn(async () => undefined),
  clearSession: jest.fn(async () => undefined),
  hasSession: jest.fn(),
  getRefreshToken: jest.fn(),
  setOnLogout: jest.fn(),
}));
jest.mock('@/lib/push', () => ({ unregisterPushToken: jest.fn(async () => undefined) }));

type AuthModule = typeof import('@/lib/auth');
type ApiMock = { api: { get: jest.Mock; post: jest.Mock } };
type SessionMock = {
  loadSession: jest.Mock;
  setSession: jest.Mock;
  clearSession: jest.Mock;
  hasSession: jest.Mock;
  getRefreshToken: jest.Mock;
  setOnLogout: jest.Mock;
};
type StoreMock = { getItemAsync: jest.Mock; setItemAsync: jest.Mock };
type PushMock = { unregisterPushToken: jest.Mock };

interface Loaded {
  auth: AuthModule;
  api: ApiMock['api'];
  session: SessionMock;
  store: StoreMock;
  push: PushMock;
}

function load(): Loaded {
  let out = {} as Loaded;
  jest.isolateModules(() => {
    out = {
      auth: require('@/lib/auth'),
      api: (require('@/lib/api') as ApiMock).api,
      session: require('@/lib/session') as SessionMock,
      store: require('expo-secure-store') as StoreMock,
      push: require('@/lib/push') as PushMock,
    };
  });
  return out;
}

const driver = {
  id: '1',
  firstName: 'A',
  lastName: 'B',
  email: 'a@b.com',
  phone: null,
  language: 'en',
  timezone: 'UTC',
  themePreference: 'system',
  distanceUnit: 'mi',
  emailVerified: true,
};
const authSuccess = { driver, token: 't', refreshToken: 'r', expiresIn: 900 };

describe('hydrate', () => {
  it('registers the logout callback that resets the store', async () => {
    const m = load();
    m.session.loadSession.mockResolvedValue(false);
    m.store.getItemAsync.mockResolvedValue('0');
    await m.auth.useAuth.getState().hydrate();
    const onLogout = m.session.setOnLogout.mock.calls[0][0] as () => void;
    onLogout();
    expect(m.auth.useAuth.getState().status).toBe('unauthenticated');
  });

  it('stays unauthenticated when no session is restored', async () => {
    const m = load();
    m.session.loadSession.mockResolvedValue(false);
    m.store.getItemAsync.mockResolvedValue('1');
    await m.auth.useAuth.getState().hydrate();
    expect(m.auth.useAuth.getState().status).toBe('unauthenticated');
    expect(m.auth.useAuth.getState().biometricEnabled).toBe(true);
  });

  it('authenticates and locks when biometrics are enabled', async () => {
    const m = load();
    m.session.loadSession.mockResolvedValue(true);
    m.store.getItemAsync.mockResolvedValue('1');
    m.api.get.mockResolvedValue(driver);
    await m.auth.useAuth.getState().hydrate();
    const s = m.auth.useAuth.getState();
    expect(s.status).toBe('authenticated');
    expect(s.locked).toBe(true);
  });

  it('clears the session when the profile fetch fails', async () => {
    const m = load();
    m.session.loadSession.mockResolvedValue(true);
    m.store.getItemAsync.mockResolvedValue('0');
    m.api.get.mockRejectedValue(new Error('401'));
    await m.auth.useAuth.getState().hydrate();
    expect(m.session.clearSession).toHaveBeenCalled();
    expect(m.auth.useAuth.getState().status).toBe('unauthenticated');
  });
});

describe('login', () => {
  it('returns the MFA challenge without starting a session', async () => {
    const m = load();
    const challenge = { mfaRequired: true, mfaMethod: 'totp', mfaToken: 'mt' };
    m.api.post.mockResolvedValue(challenge);
    const result = await m.auth.useAuth.getState().login('a@b.com', 'pw');
    expect(result).toBe(challenge);
    expect(m.session.setSession).not.toHaveBeenCalled();
    expect(m.auth.useAuth.getState().status).toBe('loading');
  });

  it('starts a session on a direct success', async () => {
    const m = load();
    m.api.post.mockResolvedValue(authSuccess);
    await m.auth.useAuth.getState().login('a@b.com', 'pw');
    expect(m.session.setSession).toHaveBeenCalledWith({
      token: 't',
      refreshToken: 'r',
      expiresIn: 900,
    });
    expect(m.auth.useAuth.getState().status).toBe('authenticated');
  });
});

describe('register', () => {
  it('returns the MFA challenge without starting a session', async () => {
    const m = load();
    const challenge = { mfaRequired: true, mfaMethod: 'email', mfaToken: 'mt' };
    m.api.post.mockResolvedValue(challenge);
    const result = await m.auth.useAuth.getState().register({
      firstName: 'A',
      lastName: 'B',
      email: 'a@b.com',
      password: 'pw',
    });
    expect(result).toBe(challenge);
    expect(m.auth.useAuth.getState().status).toBe('loading');
  });

  it('starts a session on a direct success', async () => {
    const m = load();
    m.api.post.mockResolvedValue(authSuccess);
    await m.auth.useAuth.getState().register({
      firstName: 'A',
      lastName: 'B',
      email: 'a@b.com',
      password: 'pw',
    });
    expect(m.auth.useAuth.getState().status).toBe('authenticated');
  });
});

describe('verifyMfa', () => {
  it('starts a session and clears the pending challenge', async () => {
    const m = load();
    m.auth.useAuth.getState().setMfaPending({ mfaToken: 'mt', method: 'totp' });
    m.api.post.mockResolvedValue(authSuccess);
    await m.auth.useAuth.getState().verifyMfa('mt', '123456');
    const s = m.auth.useAuth.getState();
    expect(s.status).toBe('authenticated');
    expect(s.mfaPending).toBeNull();
  });
});

describe('logout', () => {
  it('unregisters push, notifies the server, and clears state', async () => {
    const m = load();
    m.session.getRefreshToken.mockReturnValue('r');
    m.session.hasSession.mockReturnValue(true);
    await m.auth.useAuth.getState().logout();
    expect(m.push.unregisterPushToken).toHaveBeenCalled();
    expect(m.api.post).toHaveBeenCalledWith('/v1/portal/auth/logout', { refreshToken: 'r' });
    expect(m.session.clearSession).toHaveBeenCalled();
    expect(m.auth.useAuth.getState().status).toBe('unauthenticated');
  });

  it('tolerates push and server failures and still clears state', async () => {
    const m = load();
    m.push.unregisterPushToken.mockRejectedValue(new Error('push down'));
    m.session.getRefreshToken.mockReturnValue(null);
    m.session.hasSession.mockReturnValue(true);
    m.api.post.mockRejectedValue(new Error('server down'));
    await m.auth.useAuth.getState().logout();
    expect(m.api.post).toHaveBeenCalledWith('/v1/portal/auth/logout', {});
    expect(m.auth.useAuth.getState().status).toBe('unauthenticated');
  });

  it('skips the server call when there is no session', async () => {
    const m = load();
    m.session.getRefreshToken.mockReturnValue(null);
    m.session.hasSession.mockReturnValue(false);
    await m.auth.useAuth.getState().logout();
    expect(m.api.post).not.toHaveBeenCalled();
  });
});

describe('local state actions', () => {
  it('setDriver replaces the driver', () => {
    const m = load();
    m.auth.useAuth.getState().setDriver(driver);
    expect(m.auth.useAuth.getState().driver).toBe(driver);
  });
  it('lock and unlock toggle the lock flag', () => {
    const m = load();
    m.auth.useAuth.getState().lock();
    expect(m.auth.useAuth.getState().locked).toBe(true);
    m.auth.useAuth.getState().unlock();
    expect(m.auth.useAuth.getState().locked).toBe(false);
  });
  it('setBiometricEnabled persists the flag with hardened options', async () => {
    const m = load();
    await m.auth.useAuth.getState().setBiometricEnabled(true);
    expect(m.store.setItemAsync).toHaveBeenCalledWith('ev_biometric_lock', '1', {
      keychainAccessible: 'when_unlocked_this_device_only',
    });
    expect(m.auth.useAuth.getState().biometricEnabled).toBe(true);
    await m.auth.useAuth.getState().setBiometricEnabled(false);
    expect(m.store.setItemAsync).toHaveBeenLastCalledWith('ev_biometric_lock', '0', {
      keychainAccessible: 'when_unlocked_this_device_only',
    });
  });
  it('setMfaPending stores and clears the challenge', () => {
    const m = load();
    m.auth.useAuth.getState().setMfaPending({ mfaToken: 'mt', method: 'sms' });
    expect(m.auth.useAuth.getState().mfaPending).toEqual({ mfaToken: 'mt', method: 'sms' });
    m.auth.useAuth.getState().setMfaPending(null);
    expect(m.auth.useAuth.getState().mfaPending).toBeNull();
  });
});
