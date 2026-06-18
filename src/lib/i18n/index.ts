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
import en from './en.json';
import es from './es.json';
import zh from './zh.json';
import de from './de.json';
import ko from './ko.json';
import zhTW from './zh-TW.json';

// Native-script display names, shown in the language picker.
export const LANGUAGE_LABELS: Record<LanguageCode, string> = {
  en: 'English',
  es: 'Español',
  zh: '简体中文',
  de: 'Deutsch',
  ko: '한국어',
  'zh-TW': '繁體中文',
};

const CATALOGUES: Record<LanguageCode, Record<string, unknown>> = {
  en,
  es,
  zh,
  de,
  ko,
  'zh-TW': zhTW,
};

const STORAGE_KEY = 'app.language';

// All catalogues are bundled (a few KB each); the brand only controls which
// appear in the picker, so a language is still resolvable when a stored or
// server value falls outside the enabled set.
const resources = Object.fromEntries(
  SUPPORTED_LANGUAGES.map((code) => [code, { translation: CATALOGUES[code] }]),
);

void i18n.use(initReactI18next).init({
  resources,
  lng: DEFAULT_LANGUAGE,
  fallbackLng: 'en',
  supportedLngs: [...SUPPORTED_LANGUAGES],
  interpolation: { escapeValue: false },
  returnNull: false,
  // Hermes ships without Intl.PluralRules; v3 plural handling avoids the runtime
  // Intl dependency (and its dev warning).
  compatibilityJSON: 'v3',
});

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
    if (stored != null && isEnabled(stored) && i18n.language !== stored) {
      await i18n.changeLanguage(stored);
    }
  } catch {
    /* fall back to the brand default already set at init */
  }
}

// Adopt the server-side driver preference, but only when the user has not made
// an explicit local choice (a stored value always wins).
export async function applyDriverLanguage(code: string | null | undefined): Promise<void> {
  if (code == null || !isEnabled(code)) return;
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    if (stored != null) return;
  } catch {
    /* if storage is unreadable, still apply the server preference */
  }
  if (i18n.language !== code) await i18n.changeLanguage(code);
}

export default i18n;
