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
  currentAppLanguage,
  enabledLanguageOf,
} from '@/lib/i18n';

const store = AsyncStorage as unknown as { getItem: jest.Mock; setItem: jest.Mock };

// The device locale the app reads at launch (Intl follows the device on Hermes).
let deviceLocaleValue = 'en-US';
jest.spyOn(Intl, 'DateTimeFormat').mockImplementation(
  () =>
    ({
      resolvedOptions: () => ({ locale: deviceLocaleValue }),
    }) as unknown as Intl.DateTimeFormat,
);

// Stored values by key: the explicit choice and the last account language.
function storeValues(values: Record<string, string>): void {
  store.getItem.mockImplementation((key: string) => Promise.resolve(values[key] ?? null));
}

beforeEach(async () => {
  jest.clearAllMocks();
  deviceLocaleValue = 'en-US';
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

describe('currentAppLanguage', () => {
  it('answers the language the app shows', async () => {
    expect(currentAppLanguage()).toBe('en');
    await setAppLanguage('de');
    expect(currentAppLanguage()).toBe('de');
  });

  it('answers the default language for one the API does not offer', async () => {
    await i18n.changeLanguage('fr');
    expect(currentAppLanguage()).toBe('en');
    const shown = i18n.language;
    (i18n as { language: string }).language = 'fr';
    try {
      expect(currentAppLanguage()).toBe('en');
    } finally {
      (i18n as { language: string }).language = shown;
    }
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
  it('starts in the account language of the last profile load, with no server reply', async () => {
    storeValues({ 'app.accountLanguage': 'de' });
    deviceLocaleValue = 'es-ES';
    await bootstrapLanguage();
    expect(i18n.language).toBe('de');
  });
  it('keeps the explicit choice over the account language', async () => {
    storeValues({ 'app.language': 'es', 'app.accountLanguage': 'de' });
    await bootstrapLanguage();
    expect(i18n.language).toBe('es');
  });
  it('falls back to the device language when nothing is stored', async () => {
    deviceLocaleValue = 'de-AT';
    await bootstrapLanguage();
    expect(i18n.language).toBe('de');
  });
  it('falls back to the device language when storage is unreadable', async () => {
    store.getItem.mockRejectedValue(new Error('unreadable'));
    deviceLocaleValue = 'es-MX';
    await bootstrapLanguage();
    expect(i18n.language).toBe('es');
  });
  it('keeps the default for a device language the brand has not enabled', async () => {
    deviceLocaleValue = 'ko-KR';
    await bootstrapLanguage();
    expect(i18n.language).toBe('en');
    deviceLocaleValue = 'fr-FR';
    await bootstrapLanguage();
    expect(i18n.language).toBe('en');
  });
  it('shows the server unreachable text in the stored language', async () => {
    storeValues({ 'app.accountLanguage': 'de' });
    await bootstrapLanguage();
    expect(i18n.t('common.offlineTitle')).toBe('Verbindungsproblem');
    expect(i18n.t('common.offline')).toBe('Server nicht erreichbar. Prüfe deine Verbindung.');
  });
});

describe('enabledLanguageOf', () => {
  it('maps a locale to an enabled language only', () => {
    expect(enabledLanguageOf('de-DE')).toBe('de');
    expect(enabledLanguageOf('es-419')).toBe('es');
    expect(enabledLanguageOf('ko-KR')).toBeNull();
    expect(enabledLanguageOf('fr')).toBeNull();
    expect(enabledLanguageOf('')).toBeNull();
    expect(enabledLanguageOf(null)).toBeNull();
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
  it('remembers the account language for a launch with the server down', async () => {
    await applyDriverLanguage('de');
    expect(store.setItem).toHaveBeenCalledWith('app.accountLanguage', 'de');
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
