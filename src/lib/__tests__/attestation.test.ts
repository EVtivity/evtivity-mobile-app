// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

jest.mock('@/lib/config', () => ({ API_BASE_URL: 'http://api.test' }));
jest.mock('@/lib/device', () => ({
  deviceHeaders: jest.fn(async () => ({
    Accept: 'application/json',
    'X-Client': 'mobile',
    'X-Device-Id': 'dev-1',
  })),
}));
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(async () => undefined),
}));

import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { getAttestationHeaders } from '@/lib/attestation';
import * as attestNative from '../../../modules/evtivity-attest';

const native = attestNative as jest.Mocked<typeof attestNative>;
const store = SecureStore as jest.Mocked<typeof SecureStore>;

function setPlatform(os: string): void {
  Object.defineProperty(Platform, 'OS', { value: os, configurable: true });
}

const challengeOk = (): Response =>
  ({ ok: true, json: async () => ({ challenge: 'chal' }) }) as unknown as Response;

beforeEach(() => {
  jest.clearAllMocks();
  native.isAttestationSupported.mockReturnValue(true);
  native.generateKey.mockResolvedValue('new-key');
  native.attestKey.mockResolvedValue('attestation');
  native.generateAssertion.mockResolvedValue('assertion');
  native.requestIntegrityToken.mockResolvedValue('integrity');
  store.getItemAsync.mockResolvedValue(null);
  (global as unknown as { fetch: jest.Mock }).fetch = jest.fn().mockResolvedValue(challengeOk());
  setPlatform('ios');
});

describe('getAttestationHeaders', () => {
  it('returns nothing when attestation is unsupported', async () => {
    native.isAttestationSupported.mockReturnValue(false);
    await expect(getAttestationHeaders()).resolves.toEqual({});
  });

  it('returns nothing when the challenge fetch is not ok', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({ ok: false } as Response);
    await expect(getAttestationHeaders()).resolves.toEqual({});
  });

  it('returns nothing when the challenge fetch throws', async () => {
    (global.fetch as jest.Mock).mockRejectedValue(new Error('offline'));
    await expect(getAttestationHeaders()).resolves.toEqual({});
  });

  it('returns nothing when the challenge payload is not a string', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ challenge: 123 }),
    } as unknown as Response);
    await expect(getAttestationHeaders()).resolves.toEqual({});
  });

  it('returns nothing when isSupported itself throws', async () => {
    native.isAttestationSupported.mockImplementation(() => {
      throw new Error('boom');
    });
    await expect(getAttestationHeaders()).resolves.toEqual({});
  });

  describe('iOS', () => {
    it('assembles headers from a stored key', async () => {
      store.getItemAsync.mockResolvedValue('stored-key');
      const headers = await getAttestationHeaders();
      expect(headers).toEqual({
        'X-Attest-Platform': 'ios',
        'X-Attest-Challenge': 'chal',
        'X-Device-Attestation': 'assertion',
      });
      expect(native.generateAssertion).toHaveBeenCalledWith('stored-key', 'chal');
    });

    it('registers a new key when none is stored', async () => {
      store.getItemAsync.mockResolvedValue(null);
      const headers = await getAttestationHeaders();
      expect(native.generateKey).toHaveBeenCalled();
      expect(store.setItemAsync).toHaveBeenCalledWith('ev_attest_key_id', 'new-key');
      expect(headers['X-Attest-Platform']).toBe('ios');
    });

    it('returns nothing when registration cannot be persisted', async () => {
      store.getItemAsync.mockResolvedValue(null);
      // challenge ok for the outer + register fetches, but the register POST fails.
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce(challengeOk())
        .mockResolvedValueOnce(challengeOk())
        .mockResolvedValueOnce({ ok: false } as Response);
      await expect(getAttestationHeaders()).resolves.toEqual({});
    });

    it('returns nothing when key generation throws during registration', async () => {
      store.getItemAsync.mockResolvedValue(null);
      native.generateKey.mockRejectedValue(new Error('no secure enclave'));
      await expect(getAttestationHeaders()).resolves.toEqual({});
    });

    it('returns nothing when the register POST throws', async () => {
      store.getItemAsync.mockResolvedValue(null);
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce(challengeOk())
        .mockResolvedValueOnce(challengeOk())
        .mockRejectedValueOnce(new Error('offline'));
      await expect(getAttestationHeaders()).resolves.toEqual({});
    });

    it('re-registers and retries when the first assertion fails', async () => {
      store.getItemAsync.mockResolvedValue('stale-key');
      native.generateAssertion
        .mockRejectedValueOnce(new Error('invalid key'))
        .mockResolvedValueOnce('fresh-assertion');
      const headers = await getAttestationHeaders();
      expect(headers['X-Device-Attestation']).toBe('fresh-assertion');
      expect(native.generateKey).toHaveBeenCalled();
    });

    it('gives up when re-registration cannot get a challenge', async () => {
      store.getItemAsync.mockResolvedValue('stale-key');
      native.generateAssertion.mockRejectedValue(new Error('invalid key'));
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce(challengeOk())
        .mockResolvedValueOnce({ ok: false } as Response);
      await expect(getAttestationHeaders()).resolves.toEqual({});
    });

    it('gives up when the retried assertion also fails', async () => {
      store.getItemAsync.mockResolvedValue('stale-key');
      native.generateAssertion.mockRejectedValue(new Error('invalid key'));
      await expect(getAttestationHeaders()).resolves.toEqual({});
    });
  });

  describe('Android', () => {
    it('assembles headers from a Play Integrity token', async () => {
      setPlatform('android');
      const headers = await getAttestationHeaders();
      expect(headers).toEqual({
        'X-Attest-Platform': 'android',
        'X-Attest-Challenge': 'chal',
        'X-Device-Attestation': 'integrity',
      });
      expect(native.requestIntegrityToken).toHaveBeenCalledWith('chal', null);
    });
  });

  it('returns nothing on an unrecognized platform', async () => {
    setPlatform('web');
    await expect(getAttestationHeaders()).resolves.toEqual({});
  });
});
