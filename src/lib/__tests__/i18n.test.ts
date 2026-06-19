// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

jest.mock('react-i18next', () => ({
  initReactI18next: { type: '3rdParty', init: () => undefined },
}));
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: { getItem: jest.fn(), setItem: jest.fn() },
}));
jest.mock('@/lib/config', () => ({
  SUPPORTED_LANGUAGES: ['en', 'es', 'zh', 'de', 'ko', 'zh-TW'],
  ENABLED_LANGUAGES: ['en', 'es', 'de'],
  DEFAULT_LANGUAGE: 'en',
}));

import AsyncStorage from '@react-native-async-storage/async-storage';
import i18n, {
  LANGUAGE_LABELS,
  enabledLanguageOptions,
  setAppLanguage,
  bootstrapLanguage,
  applyDriverLanguage,
} from '@/lib/i18n';

const store = AsyncStorage as unknown as { getItem: jest.Mock; setItem: jest.Mock };

beforeEach(async () => {
  jest.clearAllMocks();
  store.getItem.mockResolvedValue(null);
  store.setItem.mockResolvedValue(undefined);
  await i18n.changeLanguage('en');
});

describe('static metadata', () => {
  it('labels every supported language in its own script', () => {
    expect(LANGUAGE_LABELS.zh).toBe('简体中文');
    expect(LANGUAGE_LABELS['zh-TW']).toBe('繁體中文');
  });
  it('lists only the enabled languages in display order', () => {
    expect(enabledLanguageOptions()).toEqual([
      { code: 'en', label: 'English' },
      { code: 'es', label: 'Español' },
      { code: 'de', label: 'Deutsch' },
    ]);
  });
});

describe('setAppLanguage', () => {
  it('ignores a language the brand has not enabled', async () => {
    await setAppLanguage('zh');
    expect(i18n.language).toBe('en');
    expect(store.setItem).not.toHaveBeenCalled();
  });

  it('switches to an enabled language and remembers it', async () => {
    await setAppLanguage('es');
    expect(i18n.language).toBe('es');
    expect(store.setItem).toHaveBeenCalledWith('app.language', 'es');
  });

  it('loads each catalogue only once', async () => {
    await setAppLanguage('es');
    await setAppLanguage('es');
    expect(i18n.language).toBe('es');
  });

  it('tolerates a storage write failure', async () => {
    store.setItem.mockRejectedValue(new Error('disk full'));
    await expect(setAppLanguage('de')).resolves.toBeUndefined();
    expect(i18n.language).toBe('de');
  });
});

describe('bootstrapLanguage', () => {
  it('applies a previously stored supported choice', async () => {
    store.getItem.mockResolvedValue('es');
    await bootstrapLanguage();
    expect(i18n.language).toBe('es');
  });
  it('does nothing without a stored choice', async () => {
    store.getItem.mockResolvedValue(null);
    await bootstrapLanguage();
    expect(i18n.language).toBe('en');
  });
  it('ignores a stored value that is not supported', async () => {
    store.getItem.mockResolvedValue('fr');
    await bootstrapLanguage();
    expect(i18n.language).toBe('en');
  });
  it('skips re-applying the current language', async () => {
    store.getItem.mockResolvedValue('en');
    await bootstrapLanguage();
    expect(i18n.language).toBe('en');
  });
  it('falls back silently when storage read throws', async () => {
    store.getItem.mockRejectedValue(new Error('unreadable'));
    await bootstrapLanguage();
    expect(i18n.language).toBe('en');
  });
});

describe('applyDriverLanguage', () => {
  it('ignores a null or unsupported preference', async () => {
    await applyDriverLanguage(null);
    await applyDriverLanguage('fr');
    expect(i18n.language).toBe('en');
  });
  it('defers to an explicit local choice', async () => {
    store.getItem.mockResolvedValue('en');
    await applyDriverLanguage('es');
    expect(i18n.language).toBe('en');
  });
  it('adopts the server preference when no local choice exists', async () => {
    store.getItem.mockResolvedValue(null);
    await applyDriverLanguage('de');
    expect(i18n.language).toBe('de');
  });
  it('applies the preference even when storage is unreadable', async () => {
    store.getItem.mockRejectedValue(new Error('unreadable'));
    await applyDriverLanguage('es');
    expect(i18n.language).toBe('es');
  });
  it('skips the switch when already on the server preference', async () => {
    await i18n.changeLanguage('es');
    store.getItem.mockResolvedValue(null);
    await applyDriverLanguage('es');
    expect(i18n.language).toBe('es');
  });
});

describe('lazy catalogue loading', () => {
  it('loads the simplified Chinese catalogue on demand', async () => {
    store.getItem.mockResolvedValue('zh');
    await bootstrapLanguage();
    expect(i18n.language).toBe('zh');
  });
  it('loads the Korean catalogue on demand', async () => {
    store.getItem.mockResolvedValue('ko');
    await bootstrapLanguage();
    expect(i18n.language).toBe('ko');
  });
  it('loads the traditional Chinese catalogue on demand', async () => {
    store.getItem.mockResolvedValue(null);
    await applyDriverLanguage('zh-TW');
    expect(i18n.language).toBe('zh-TW');
  });
});
