// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

/* eslint-disable import/no-named-as-default-member -- i18n.use/changeLanguage are the documented instance methods on the default export. */
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ENABLED_LANGUAGES,
  DEFAULT_LANGUAGE,
  SUPPORTED_LANGUAGES,
  type LanguageCode,
} from '@/lib/config';

// Native-script display names, shown in the language picker.
export const LANGUAGE_LABELS: Record<LanguageCode, string> = {
  en: 'English',
  es: 'Español',
  zh: '简体中文',
  de: 'Deutsch',
  ko: '한국어',
  'zh-TW': '繁體中文',
};

// Lazy loaders: only the active language's catalogue is parsed at startup; the
// rest are required on demand when the user (or server preference) switches.
// Static require strings keep each catalogue bundle-analyzable.
const LOADERS: Record<LanguageCode, () => Record<string, unknown>> = {
  en: () => require('./en.json') as Record<string, unknown>,
  es: () => require('./es.json') as Record<string, unknown>,
  zh: () => require('./zh.json') as Record<string, unknown>,
  de: () => require('./de.json') as Record<string, unknown>,
  ko: () => require('./ko.json') as Record<string, unknown>,
  'zh-TW': () => require('./zh-TW.json') as Record<string, unknown>,
};

const STORAGE_KEY = 'app.language';
const loadedCatalogues = new Set<LanguageCode>();

function isSupported(code: string): code is LanguageCode {
  return (SUPPORTED_LANGUAGES as readonly string[]).includes(code);
}

// Register a language's catalogue with i18next once, on first use.
function ensureCatalogue(code: LanguageCode): void {
  if (loadedCatalogues.has(code)) return;
  i18n.addResourceBundle(code, 'translation', LOADERS[code](), true, true);
  loadedCatalogues.add(code);
}

void i18n.use(initReactI18next).init({
  // Start with only the default language; 'en' is also loaded below as the
  // fallback so missing keys never render blank.
  resources: { [DEFAULT_LANGUAGE]: { translation: LOADERS[DEFAULT_LANGUAGE]() } },
  lng: DEFAULT_LANGUAGE,
  fallbackLng: 'en',
  supportedLngs: [...SUPPORTED_LANGUAGES],
  interpolation: { escapeValue: false },
  returnNull: false,
  // Hermes ships without Intl.PluralRules; v3 plural handling avoids the runtime
  // Intl dependency (and its dev warning).
  compatibilityJSON: 'v3',
});
loadedCatalogues.add(DEFAULT_LANGUAGE);
ensureCatalogue('en');

function isEnabled(code: string): code is LanguageCode {
  return (ENABLED_LANGUAGES as string[]).includes(code);
}

// Options for the language picker, in brand-configured display order.
export function enabledLanguageOptions(): { code: LanguageCode; label: string }[] {
  return ENABLED_LANGUAGES.map((code) => ({ code, label: LANGUAGE_LABELS[code] }));
}

// User's explicit choice: switch live and remember it across launches.
export async function setAppLanguage(code: string): Promise<void> {
  if (!isEnabled(code)) return;
  ensureCatalogue(code);
  await i18n.changeLanguage(code);
  try {
    await AsyncStorage.setItem(STORAGE_KEY, code);
  } catch {
    /* best-effort persistence */
  }
}

// Run once on launch: honor a previously stored choice before anything renders.
export async function bootstrapLanguage(): Promise<void> {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    if (stored != null && isSupported(stored) && i18n.language !== stored) {
      ensureCatalogue(stored);
      await i18n.changeLanguage(stored);
    }
  } catch {
    /* fall back to the brand default already set at init */
  }
}

// Adopt the server-side driver preference, but only when the user has not made
// an explicit local choice (a stored value always wins).
export async function applyDriverLanguage(code: string | null | undefined): Promise<void> {
  if (code == null || !isSupported(code)) return;
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    if (stored != null) return;
  } catch {
    /* if storage is unreadable, still apply the server preference */
  }
  if (i18n.language !== code) {
    ensureCatalogue(code);
    await i18n.changeLanguage(code);
  }
}

export default i18n;
