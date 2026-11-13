// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

// Type surface for the JS brand registry (brands/index.js). The app and
// app.config.ts type-check against these declarations.

export interface BrandColors {
  // HSL triplets ("142 71% 45%") matching the portal css-spec tokens.
  primary: string;
  primaryForeground: string;
  cta: string;
  ctaForeground: string;
  accent: string;
  accentForeground: string;
  background: string;
  foreground: string;
  card: string;
  cardForeground: string;
  elevated: string;
  muted: string;
  mutedForeground: string;
  border: string;
  ring: string;
  success: string;
  // The warning fill (badge tints, dots, solid chips), bright amber.
  warning: string;
  // Warning text and icons on card and background: a deep amber in light mode
  // (the fill reads about 2.3:1 on white), at least 4.5:1 on its surfaces.
  warningText: string;
  destructive: string;
  info: string;
}

// A language the CSMS supports. The mobile app ships catalogues for all of
// these; a brand enables a subset via Brand.languages.
export type LanguageCode = 'en' | 'de' | 'es' | 'ko' | 'zh' | 'zh-TW';

export interface Brand {
  name: string;
  slug: string;
  scheme: string;
  iosBundleId: string;
  androidPackage: string;
  apiUrl: string;
  // Languages this brand offers in the app. The first entry is the default for
  // a fresh install before the user picks one or the server preference loads.
  // Omit to offer all supported languages.
  languages?: LanguageCode[];
  // Optional white-label overrides for the legal links. When set, they take
  // precedence over the CSMS portal URL; when empty, the app derives the links
  // from the operator's configured portal URL.
  termsUrl?: string;
  privacyUrl?: string;
  colors: { light: BrandColors; dark: BrandColors };
  icon: string;
  adaptiveIcon: string;
  splash: string;
  easProjectId?: string;
}

export declare const defaultBrand: Brand;
export declare const brands: Record<string, Brand>;
export declare function resolveBrand(slug?: string): Brand;
