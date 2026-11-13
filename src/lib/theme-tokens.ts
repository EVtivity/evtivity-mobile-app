// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

import type { ViewStyle } from 'react-native';
import type { BrandColors } from '@brands/index';
import { contrastRatio } from './contrast';
import type { UiTheme } from './ui-theme';

// Token sets of the three themes, built on the active brand palette so a
// white-label brand gets every theme without its own values:
// - Default: the brand palette as it is.
// - Soft: the brand palette with subtler borders, rounder corners and softer
//   shadows, and every text pair at WCAG AA at least.
// - High Contrast: neutral, untinted surfaces (pure black and white), strong
//   borders, black or white text and tone colors that read on every surface.
//   The brand hue stays on primary and cta, at a lightness their text reads on.

export type Scheme = 'light' | 'dark';

interface Hsl {
  h: number;
  s: number;
  l: number;
}

function parse(token: string): Hsl {
  const [h, s, l] = token
    .trim()
    .split(/\s+/)
    .map((p) => Number.parseFloat(p)) as [number, number, number];
  return { h, s, l };
}

function format({ h, s, l }: Hsl): string {
  const round = (n: number): number => Math.round(n * 10) / 10;
  return `${round(h)} ${round(s)}% ${round(l)}%`;
}

const WHITE = '0 0% 100%';
const BLACK = '0 0% 0%';

// The brand color at the lightness nearest its own whose contrast with `text`
// reaches `target`: darker under white text, lighter under black text.
export function readableUnder(token: string, text: string, target: number): string {
  const c = parse(token);
  const textIsLight = parse(text).l >= 50;
  for (let step = 0; step <= 1000; step += 1) {
    const l = textIsLight ? c.l - step / 10 : c.l + step / 10;
    if (l < 0 || l > 100) break;
    const candidate = format({ ...c, l });
    if (contrastRatio(text, candidate) >= target) return candidate;
  }
  return textIsLight ? BLACK : WHITE;
}

// A tone color (success, warning, destructive, info) at the lightness that
// reads best against both white and black: on a white card, on a black card
// and under white text alike (about 4.6:1 each way).
export function balancedTone(token: string): string {
  const c = parse(token);
  let best = format(c);
  let bestScore = 0;
  for (let step = 0; step <= 1000; step += 1) {
    const candidate = format({ ...c, l: step / 10 });
    const score = Math.min(contrastRatio(WHITE, candidate), contrastRatio(BLACK, candidate));
    if (score > bestScore) {
      bestScore = score;
      best = candidate;
    }
  }
  return best;
}

// Soft: the border moves 40 percent of the way to the page background, so it
// reads lighter on light pages and less bright on dark pages.
function softBorder(c: BrandColors): string {
  const border = parse(c.border);
  const background = parse(c.background);
  return format({ ...border, l: border.l + (background.l - border.l) * 0.4 });
}

// A text color at the lightness nearest its own that reaches `target` on every
// one of `backgrounds`: darker on light backgrounds, lighter on dark ones.
export function textReadableOn(text: string, backgrounds: string[], target: number): string {
  const c = parse(text);
  const lightBackground = parse(backgrounds[0] ?? WHITE).l >= 50;
  for (let step = 0; step <= 1000; step += 1) {
    const l = lightBackground ? c.l - step / 10 : c.l + step / 10;
    if (l < 0 || l > 100) break;
    const candidate = format({ ...c, l });
    if (backgrounds.every((bg) => contrastRatio(candidate, bg) >= target)) return candidate;
  }
  return lightBackground ? BLACK : WHITE;
}

// Soft keeps the brand colors, with the text pairs the shipped palette leaves
// below WCAG AA (4.5:1) moved to the nearest lightness that reaches it: the
// primary and cta fills under their text, the muted text on its backgrounds.
function softPalette(c: BrandColors): BrandColors {
  const AA = 4.5;
  return {
    ...c,
    border: softBorder(c),
    primary: readableUnder(c.primary, c.primaryForeground, AA),
    cta: readableUnder(c.cta, c.ctaForeground, AA),
    accentForeground: textReadableOn(c.accentForeground, [c.accent], AA),
    foreground: textReadableOn(c.foreground, [c.background], AA),
    cardForeground: textReadableOn(c.cardForeground, [c.card], AA),
    mutedForeground: textReadableOn(c.mutedForeground, [c.muted, c.card, c.background], AA),
    warningText: textReadableOn(c.warningText, [c.card, c.background], AA),
  };
}

function highContrastPalette(c: BrandColors, scheme: Scheme): BrandColors {
  const light = scheme === 'light';
  // Primary carries its foreground token (white on light pages, black on dark
  // pages). The cta button always renders white text, so cta stays dark.
  const primaryForeground = light ? WHITE : BLACK;
  const primary = readableUnder(c.primary, primaryForeground, 7);
  return {
    background: light ? WHITE : BLACK,
    foreground: light ? BLACK : WHITE,
    card: light ? WHITE : BLACK,
    cardForeground: light ? BLACK : WHITE,
    elevated: light ? WHITE : '0 0% 10%',
    muted: light ? '0 0% 93%' : '0 0% 16%',
    mutedForeground: light ? '0 0% 22%' : '0 0% 82%',
    accent: light ? '0 0% 88%' : '0 0% 22%',
    accentForeground: light ? BLACK : WHITE,
    border: light ? '0 0% 15%' : '0 0% 85%',
    ring: primary,
    primary,
    primaryForeground,
    cta: readableUnder(c.cta, WHITE, 7),
    ctaForeground: WHITE,
    success: balancedTone(c.success),
    warning: balancedTone(c.warning),
    // Warning text and icons at AAA on the neutral page.
    warningText: textReadableOn(c.warningText, [light ? WHITE : BLACK], 7),
    destructive: balancedTone(c.destructive),
    info: balancedTone(c.info),
  };
}

export function themePalette(theme: UiTheme, scheme: Scheme, brand: BrandColors): BrandColors {
  if (theme === 'soft') return softPalette(brand);
  if (theme === 'high-contrast') return highContrastPalette(brand, scheme);
  return brand;
}

// Corner radius tiers (px). Every rounded-sm to rounded-2xl class reads the
// CSS variable of its tier (tailwind.config.js), so the tiers follow the theme.
export type RadiusTier = 'sm' | 'md' | 'lg' | 'xl' | '2xl';

export const DEFAULT_RADIUS: Record<RadiusTier, number> = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 18,
  '2xl': 24,
};

const SOFT_RADIUS: Record<RadiusTier, number> = {
  sm: 8,
  md: 14,
  lg: 18,
  xl: 24,
  '2xl': 32,
};

export function themeRadius(theme: UiTheme): Record<RadiusTier, number> {
  return theme === 'soft' ? SOFT_RADIUS : DEFAULT_RADIUS;
}

export function radiusVars(theme: UiTheme): Record<string, string> {
  const r = themeRadius(theme);
  return {
    '--radius-sm': `${r.sm}px`,
    '--radius-md': `${r.md}px`,
    '--radius-lg': `${r.lg}px`,
    '--radius-xl': `${r.xl}px`,
    '--radius-2xl': `${r['2xl']}px`,
  };
}

// Elevation tiers. NativeWind does not reliably map Tailwind shadow utilities
// to native iOS/Android, so cards, buttons, sheets and the tab bar apply these
// style objects directly; `elevation` covers Android.
export type ShadowTier = 'sm' | 'md' | 'lg' | 'xl';

const DEFAULT_SHADOWS: Record<ShadowTier, ViewStyle> = {
  sm: {
    shadowColor: '#0b1f17',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#0b1f17',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 4,
  },
  lg: {
    shadowColor: '#0b1f17',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.12,
    shadowRadius: 26,
    elevation: 10,
  },
  xl: {
    shadowColor: '#0b1f17',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.16,
    shadowRadius: 40,
    elevation: 18,
  },
};

// Soft: lower opacity spread over a wider blur.
const SOFT_SHADOWS: Record<ShadowTier, ViewStyle> = {
  sm: {
    shadowColor: '#0b1f17',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  md: {
    shadowColor: '#0b1f17',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 22,
    elevation: 3,
  },
  lg: {
    shadowColor: '#0b1f17',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.07,
    shadowRadius: 36,
    elevation: 7,
  },
  xl: {
    shadowColor: '#0b1f17',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.1,
    shadowRadius: 52,
    elevation: 12,
  },
};

export function themeShadows(theme: UiTheme): Record<ShadowTier, ViewStyle> {
  return theme === 'soft' ? SOFT_SHADOWS : DEFAULT_SHADOWS;
}

// The text colors on the screen backdrop. Default and Soft keep the branded
// green picture with light text; High Contrast replaces the picture with plain
// black, so the light text stays and the muted text gets brighter.
export const BACKDROP_TEXT: Record<'brand' | 'high-contrast', Record<string, string>> = {
  brand: { '--foreground': '0 0% 100%', '--muted-foreground': '150 20% 84%' },
  'high-contrast': { '--foreground': WHITE, '--muted-foreground': '0 0% 85%' },
};

export const HIGH_CONTRAST_BACKDROP = '#000000';
