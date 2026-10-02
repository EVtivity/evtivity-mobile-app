// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

/* eslint-disable import/no-named-as-default-member -- i18n.use/init are the documented instance methods on the default export. */
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from '@/lib/i18n/en.json';

// Initializes the global i18next instance with the English catalogue, so
// component tests assert the real UI copy and money is formatted in "en".
export async function initTestI18n(): Promise<void> {
  await i18n.use(initReactI18next).init({
    resources: { en: { translation: en } },
    lng: 'en',
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
  });
}
