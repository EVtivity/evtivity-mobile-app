// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

import Constants from 'expo-constants';
import { Platform } from 'react-native';
import type { Brand } from '@brands/index';
import { defaultBrand } from '@brands/index';

// The runtime brand comes from the `extra.brand` block that app.config.ts bakes
// in at build time. Falling back to defaultBrand keeps the app working under a
// bare `expo start` where extra may be partially populated.
interface RuntimeBrand {
  name: string;
  slug: string;
  apiUrl: string;
  colors: Brand['colors'];
  termsUrl?: string;
  privacyUrl?: string;
  languages?: string[];
}

const extra = (Constants.expoConfig?.extra ?? {}) as { brand?: RuntimeBrand };
const baked = extra.brand;

// Merge the live defaultBrand palette as the base under the baked colors. The
// baked `extra.brand` is frozen into the native binary at build time, so any
// color token added to brands/index.js after the last native build would be
// missing at runtime; the spread backfills it from the current JS module while
// still letting a real white-label brand override each value.
export const BRAND: RuntimeBrand = {
  name: baked?.name ?? defaultBrand.name,
  slug: baked?.slug ?? defaultBrand.slug,
  apiUrl: baked?.apiUrl ?? defaultBrand.apiUrl,
  colors: {
    light: { ...defaultBrand.colors.light, ...(baked?.colors?.light ?? {}) },
    dark: { ...defaultBrand.colors.dark, ...(baked?.colors?.dark ?? {}) },
  },
  termsUrl: baked?.termsUrl ?? defaultBrand.termsUrl,
  privacyUrl: baked?.privacyUrl ?? defaultBrand.privacyUrl,
};

// Resolve the legal-link URLs. A white-label brand can hardcode full URLs
// (termsUrl/privacyUrl); otherwise they derive from the operator's CSMS portal
// URL. Returns empty strings when neither source provides a link.
export function resolveLegalUrls(portalUrl?: string): { terms: string; privacy: string } {
  const base = (portalUrl ?? '').replace(/\/$/, '');
  const fromPortal = (path: string): string => (base !== '' ? `${base}/${path}` : '');
  return {
    terms: BRAND.termsUrl != null && BRAND.termsUrl !== '' ? BRAND.termsUrl : fromPortal('terms-of-service'),
    privacy:
      BRAND.privacyUrl != null && BRAND.privacyUrl !== '' ? BRAND.privacyUrl : fromPortal('privacy-policy'),
  };
}

// A dev API host that points at the developer's own machine needs a different
// alias per platform: the Android emulator reaches the host at 10.0.2.2, the iOS
// simulator (and iOS ATS, which blocks cleartext to private LAN IPs) reaches it
// at loopback. Rewriting a localhost-style alias to the right one per platform
// lets a single .env value work on both. Real remote hosts pass through untouched.
const DEV_HOST_ALIASES = new Set(['localhost', '127.0.0.1', '10.0.2.2']);
function resolveDevHost(url: string): string {
  const m = url.match(/^(https?:\/\/)([^/:]+)(.*)$/i);
  if (m == null) return url;
  // The regex guarantees groups 1-3 when m is non-null; the defaults exist only
  // to satisfy noUncheckedIndexedAccess and are unreachable at runtime.
  /* istanbul ignore next */
  const [, scheme = '', host = '', rest = ''] = m;
  if (!DEV_HOST_ALIASES.has(host.toLowerCase())) return url;
  // iOS uses explicit IPv4 loopback: NSURLSession resolves `localhost` to IPv6
  // ::1 first, where the host's IPv4-only Docker listener is unreachable.
  return `${scheme}${Platform.OS === 'android' ? '10.0.2.2' : '127.0.0.1'}${rest}`;
}

// EXPO_PUBLIC_API_URL is inlined into the JS bundle by Metro on every bundle, so
// it reflects the current .env even in a dev build whose embedded Constants.extra
// was baked at build time. It takes precedence; the brand apiUrl is the fallback
// for production builds where the env is fixed at build.
const envApiUrl = process.env.EXPO_PUBLIC_API_URL;
// babel-preset-expo inlines EXPO_PUBLIC_API_URL at transform time, so under jest
// envApiUrl is a fixed literal and only one side of this choice can run; the
// brand-apiUrl fallback is covered directly via config tests.
/* istanbul ignore next */
const resolvedApiUrl = envApiUrl != null && envApiUrl !== '' ? envApiUrl : BRAND.apiUrl;
export const API_BASE_URL = resolveDevHost(resolvedApiUrl).replace(/\/$/, '');
export const APP_NAME = BRAND.name;

// Every language the app ships a catalogue for. Order is the display order in
// the picker. A brand enables a subset via brand.languages.
export const SUPPORTED_LANGUAGES = ['en', 'es', 'zh', 'de', 'ko', 'zh-TW'] as const;
export type LanguageCode = (typeof SUPPORTED_LANGUAGES)[number];

// Languages this brand enables, validated against the shipped catalogues. Falls
// back to the live defaultBrand list (then all) when the baked value predates
// this field. Never empty; always includes at least 'en'.
function resolveEnabledLanguages(): LanguageCode[] {
  const raw =
    baked?.languages ??
    (defaultBrand as { languages?: string[] }).languages ??
    SUPPORTED_LANGUAGES;
  const valid = raw.filter((c): c is LanguageCode =>
    (SUPPORTED_LANGUAGES as readonly string[]).includes(c),
  );
  const ordered = SUPPORTED_LANGUAGES.filter((c) => valid.includes(c));
  return ordered.length > 0 ? ordered : ['en'];
}

export const ENABLED_LANGUAGES: LanguageCode[] = resolveEnabledLanguages();
// resolveEnabledLanguages never returns an empty array, so the fallback exists
// only to satisfy noUncheckedIndexedAccess and is unreachable at runtime.
/* istanbul ignore next */
export const DEFAULT_LANGUAGE: LanguageCode = ENABLED_LANGUAGES[0] ?? 'en';

// The mobile app's own version, set from app.config.ts `version` at build time.
export const APP_VERSION = Constants.expoConfig?.version ?? '';
