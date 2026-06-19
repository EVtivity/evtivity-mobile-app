// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

// Brand registry. Plain JS (not TS) because app.config.ts is evaluated by the
// Expo config loader, which requires this module via Node without TS
// transpilation. Types live in brands/index.d.ts so the app still gets full
// type-checking. Operators add a brand by copying the defaultBrand object,
// editing the values, registering it under `brands`, and setting ACTIVE_BRAND.

/** @type {import('./index').BrandColors} */
const lightColors = {
  primary: '142 71% 45%',
  primaryForeground: '0 0% 100%',
  cta: '142 72% 33%',
  ctaForeground: '0 0% 100%',
  accent: '142 72% 40%',
  accentForeground: '150 80% 8%',
  background: '160 24% 98%',
  foreground: '158 30% 11%',
  card: '0 0% 100%',
  cardForeground: '158 30% 11%',
  elevated: '0 0% 100%',
  muted: '160 20% 95.5%',
  mutedForeground: '156 10% 42%',
  border: '156 18% 90%',
  ring: '142 71% 45%',
  success: '142 71% 41%',
  warning: '32 95% 50%',
  destructive: '0 75% 55%',
  info: '199 89% 48%',
};

/** @type {import('./index').BrandColors} */
const darkColors = {
  primary: '142 68% 49%',
  primaryForeground: '0 0% 100%',
  cta: '142 64% 38%',
  ctaForeground: '0 0% 100%',
  accent: '142 66% 54%',
  accentForeground: '150 85% 7%',
  background: '160 28% 7%',
  foreground: '160 18% 96%',
  card: '160 22% 11%',
  cardForeground: '160 18% 96%',
  elevated: '160 20% 14%',
  muted: '160 16% 17%',
  mutedForeground: '156 12% 64%',
  border: '160 14% 20%',
  ring: '142 68% 50%',
  success: '142 64% 48%',
  warning: '35 92% 56%',
  destructive: '0 72% 58%',
  info: '198 90% 56%',
};

/** @type {import('./index').Brand} */
const defaultBrand = {
  name: 'EVtivity',
  slug: 'default',
  scheme: 'evtivity',
  iosBundleId: 'com.evtivity.driver',
  androidPackage: 'com.evtivity.driver',
  apiUrl: process.env.EXPO_PUBLIC_API_URL || 'https://api.evtivity.com',
  appleMerchantId: 'merchant.com.evtivity.driver',
  // EAS project id. Required for getExpoPushTokenAsync to mint a push token.
  easProjectId: 'a38c536f-3b16-4d02-b070-31fe6117b892',
  // Languages offered in the app. First entry is the default. A white-label
  // brand can narrow this (e.g. ['en'] or ['en', 'es']).
  languages: ['en', 'es', 'zh', 'de', 'ko', 'zh-TW'],
  // Empty = derive the legal links from the operator's CSMS portal URL (the
  // pages live at the portal's /terms-of-service and /privacy-policy). A
  // white-label brand can hardcode full URLs here to override that.
  termsUrl: '',
  privacyUrl: '',
  colors: { light: lightColors, dark: darkColors },
  icon: './assets/icon.png',
  adaptiveIcon: './assets/adaptive-icon.png',
  splash: './assets/splash.png',
};

/** @type {Record<string, import('./index').Brand>} */
const brands = {
  default: defaultBrand,
};

/** @type {(slug) => import('./index').Brand} */
function resolveBrand(slug) {
  const key = slug || process.env.ACTIVE_BRAND || 'default';
  return brands[key] || defaultBrand;
}

module.exports = { defaultBrand, resolveBrand, brands };
