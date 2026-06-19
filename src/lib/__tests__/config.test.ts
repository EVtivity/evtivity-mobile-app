// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

export {};

type ConfigModule = typeof import('@/lib/config');

interface Scenario {
  env?: string;
  platform: string;
  expoConfig: unknown;
  defaultBrand: unknown;
}

const palette = (primary: string): Record<string, string> => ({ primary });

function loadConfig(s: Scenario): ConfigModule {
  let out = {} as ConfigModule;
  jest.isolateModules(() => {
    jest.doMock('react-native', () => ({ Platform: { OS: s.platform } }));
    jest.doMock('expo-constants', () => ({ __esModule: true, default: { expoConfig: s.expoConfig } }));
    jest.doMock('@brands/index', () => ({ defaultBrand: s.defaultBrand }));
    if (s.env === undefined) delete process.env.EXPO_PUBLIC_API_URL;
    else process.env.EXPO_PUBLIC_API_URL = s.env;
    out = require('@/lib/config') as ConfigModule;
  });
  return out;
}

afterAll(() => {
  delete process.env.EXPO_PUBLIC_API_URL;
});

describe('baked brand on Android with a localhost API alias', () => {
  const cfg = loadConfig({
    platform: 'android',
    expoConfig: {
      version: '9.9.9',
      extra: {
        brand: {
          name: 'Baked',
          slug: 'baked',
          apiUrl: 'http://localhost:7102/',
          colors: { light: palette('9'), dark: palette('19') },
          termsUrl: 'https://terms.example',
          privacyUrl: 'https://privacy.example',
          languages: ['es', 'en', 'xx'],
        },
      },
    },
    defaultBrand: {
      name: 'Def',
      slug: 'def',
      apiUrl: 'http://def.test',
      colors: { light: palette('1'), dark: palette('2') },
      termsUrl: 'https://def-terms',
      privacyUrl: 'https://def-privacy',
      languages: ['en'],
    },
  });

  it('prefers the baked brand fields', () => {
    expect(cfg.BRAND.name).toBe('Baked');
    expect(cfg.APP_NAME).toBe('Baked');
    expect(cfg.BRAND.colors.light.primary).toBe('9');
  });
  it('rewrites a localhost alias to the Android host loopback', () => {
    // Driven through the brand apiUrl: Expo inlines EXPO_PUBLIC_API_URL at
    // transform time, so the env-precedence branch is fixed per build.
    expect(cfg.API_BASE_URL).toBe('http://10.0.2.2:7102');
  });
  it('enables the baked languages in catalogue order, dropping unknowns', () => {
    expect(cfg.ENABLED_LANGUAGES).toEqual(['en', 'es']);
    expect(cfg.DEFAULT_LANGUAGE).toBe('en');
  });
  it('uses the brand legal URLs when present', () => {
    expect(cfg.resolveLegalUrls('https://ignored')).toEqual({
      terms: 'https://terms.example',
      privacy: 'https://privacy.example',
    });
  });
  it('reads the app version from expo config', () => {
    expect(cfg.APP_VERSION).toBe('9.9.9');
  });
});

describe('no baked brand on iOS, defaults supply everything', () => {
  const cfg = loadConfig({
    platform: 'ios',
    expoConfig: { extra: {} },
    defaultBrand: {
      name: 'Def',
      slug: 'def',
      apiUrl: 'http://localhost:8000',
      colors: { light: palette('1'), dark: palette('2') },
    },
  });

  it('falls back to the default brand', () => {
    expect(cfg.BRAND.name).toBe('Def');
  });
  it('rewrites localhost to IPv4 loopback on iOS using the brand apiUrl', () => {
    expect(cfg.API_BASE_URL).toBe('http://127.0.0.1:8000');
  });
  it('enables every shipped language when neither source lists any', () => {
    expect(cfg.ENABLED_LANGUAGES).toEqual(['en', 'es', 'zh', 'de', 'ko', 'zh-TW']);
  });
  it('derives legal URLs from the portal, or empty when absent', () => {
    expect(cfg.resolveLegalUrls('https://portal.test/')).toEqual({
      terms: 'https://portal.test/terms-of-service',
      privacy: 'https://portal.test/privacy-policy',
    });
    expect(cfg.resolveLegalUrls()).toEqual({ terms: '', privacy: '' });
  });
  it('defaults the app version to an empty string', () => {
    expect(cfg.APP_VERSION).toBe('');
  });
});

describe('remote host with no merchant id and an empty language list', () => {
  const cfg = loadConfig({
    platform: 'android',
    expoConfig: {
      extra: {
        brand: {
          name: 'Remote',
          slug: 'remote',
          apiUrl: 'https://remote.example.com/',
          colors: { light: palette('3'), dark: palette('4') },
          languages: [],
        },
      },
    },
    defaultBrand: {
      name: 'Def',
      slug: 'def',
      apiUrl: 'http://def.test',
      colors: { light: palette('1'), dark: palette('2') },
    },
  });

  it('passes a non-alias remote host through untouched', () => {
    expect(cfg.API_BASE_URL).toBe('https://remote.example.com');
  });
  it('falls back to English when the enabled list resolves empty', () => {
    expect(cfg.ENABLED_LANGUAGES).toEqual(['en']);
    expect(cfg.DEFAULT_LANGUAGE).toBe('en');
  });
});

describe('unparseable API URL', () => {
  const cfg = loadConfig({
    platform: 'android',
    expoConfig: {
      extra: {
        brand: {
          name: 'Empty',
          slug: 'empty',
          apiUrl: '',
          colors: { light: palette('1'), dark: palette('2') },
        },
      },
    },
    defaultBrand: {
      name: 'Def',
      slug: 'def',
      apiUrl: '',
      colors: { light: palette('1'), dark: palette('2') },
    },
  });

  it('returns an empty base URL rather than throwing', () => {
    expect(cfg.API_BASE_URL).toBe('');
  });
});

describe('missing expo config', () => {
  const cfg = loadConfig({
    platform: 'ios',
    expoConfig: null,
    defaultBrand: {
      name: 'Def',
      slug: 'def',
      apiUrl: 'http://def.test',
      colors: { light: palette('1'), dark: palette('2') },
    },
  });

  it('falls back to the default brand and an empty version', () => {
    expect(cfg.BRAND.name).toBe('Def');
    expect(cfg.APP_VERSION).toBe('');
  });
});
