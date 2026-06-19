// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

export {};

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'when_unlocked_this_device_only',
}));
jest.mock('expo-crypto', () => ({
  getRandomBytes: jest.fn(() => new Uint8Array(16).fill(0xab)),
}));

interface Loaded {
  store: { getItemAsync: jest.Mock; setItemAsync: jest.Mock };
  crypto: { getRandomBytes: jest.Mock };
  getDeviceId: () => Promise<string>;
  deviceHeaders: () => Promise<Record<string, string>>;
  SECURE_STORE_OPTS: { keychainAccessible: string };
}

function load(): Loaded {
  let loaded: Loaded = {} as Loaded;
  jest.isolateModules(() => {
    const store = require('expo-secure-store');
    const crypto = require('expo-crypto');
    const { getDeviceId, deviceHeaders, SECURE_STORE_OPTS } = require('@/lib/device');
    loaded = { store, crypto, getDeviceId, deviceHeaders, SECURE_STORE_OPTS };
  });
  return loaded;
}

describe('getDeviceId', () => {
  it('returns the stored id without generating a new one', async () => {
    const m = load();
    m.store.getItemAsync.mockResolvedValue('existing-device-id');
    await expect(m.getDeviceId()).resolves.toBe('existing-device-id');
    expect(m.store.setItemAsync).not.toHaveBeenCalled();
  });

  it('generates and persists a CSPRNG id when none is stored', async () => {
    const m = load();
    m.store.getItemAsync.mockResolvedValue(null);
    const id = await m.getDeviceId();
    expect(id).toBe('ab'.repeat(16));
    expect(m.crypto.getRandomBytes).toHaveBeenCalledWith(16);
    expect(m.store.setItemAsync).toHaveBeenCalledWith('ev_device_id', id, {
      keychainAccessible: 'when_unlocked_this_device_only',
    });
  });

  it('treats an empty stored value as missing', async () => {
    const m = load();
    m.store.getItemAsync.mockResolvedValue('');
    const id = await m.getDeviceId();
    expect(id).toBe('ab'.repeat(16));
    expect(m.store.setItemAsync).toHaveBeenCalled();
  });

  it('caches the id after the first resolution', async () => {
    const m = load();
    m.store.getItemAsync.mockResolvedValue(null);
    const first = await m.getDeviceId();
    const second = await m.getDeviceId();
    expect(second).toBe(first);
    expect(m.store.getItemAsync).toHaveBeenCalledTimes(1);
  });
});

describe('deviceHeaders', () => {
  it('builds the base client/device headers', async () => {
    const m = load();
    m.store.getItemAsync.mockResolvedValue('dev-1');
    await expect(m.deviceHeaders()).resolves.toEqual({
      Accept: 'application/json',
      'X-Client': 'mobile',
      'X-Device-Id': 'dev-1',
    });
  });
});

describe('SECURE_STORE_OPTS', () => {
  it('restricts secrets to this device while unlocked', () => {
    const m = load();
    expect(m.SECURE_STORE_OPTS).toEqual({
      keychainAccessible: 'when_unlocked_this_device_only',
    });
  });
});
