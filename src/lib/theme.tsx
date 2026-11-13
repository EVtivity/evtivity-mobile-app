// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

import React from 'react';
import { View } from 'react-native';
import { colorScheme as nativeColorScheme, vars, useColorScheme } from 'nativewind';
import { BRAND } from './config';
import type { BrandColors } from '@brands/index';
import { activeUiTheme, useUiTheme, type UiTheme } from './ui-theme';
import { BACKDROP_TEXT, radiusVars, themePalette, type Scheme } from './theme-tokens';

// Applies the active brand's palette, in the driver's theme, as CSS variables at
// the root so every NativeWind `bg-primary` / `text-foreground` class resolves
// to the brand color for the current theme and light/dark scheme. White-label
// theming needs no CSS edits: a brand only supplies HSL triplets in
// brands/<slug>.ts, and the themes are built on them (src/lib/theme-tokens.ts).
function toVars(c: BrandColors): Record<string, string> {
  return {
    '--background': c.background,
    '--foreground': c.foreground,
    '--card': c.card,
    '--card-foreground': c.cardForeground,
    '--elevated': c.elevated,
    '--primary': c.primary,
    '--primary-foreground': c.primaryForeground,
    '--cta': c.cta,
    '--cta-foreground': c.ctaForeground,
    '--accent': c.accent,
    '--accent-foreground': c.accentForeground,
    '--muted': c.muted,
    '--muted-foreground': c.mutedForeground,
    '--border': c.border,
    '--ring': c.ring,
    '--success': c.success,
    '--warning': c.warning,
    '--warning-text': c.warningText,
    '--destructive': c.destructive,
    '--info': c.info,
  };
}

function schemeOf(colorScheme: string | undefined): Scheme {
  return colorScheme === 'dark' ? 'dark' : 'light';
}

// The palette of a theme and scheme, built once per pair.
const paletteCache = new Map<string, BrandColors>();

export function activePalette(theme: UiTheme, scheme: Scheme): BrandColors {
  const key = `${theme}:${scheme}`;
  const cached = paletteCache.get(key);
  if (cached != null) return cached;
  const brand = scheme === 'dark' ? BRAND.colors.dark : BRAND.colors.light;
  const palette = themePalette(theme, scheme, brand);
  paletteCache.set(key, palette);
  return palette;
}

// Text variables on the screen backdrop: light text on the branded picture
// (Default, Soft) or on the plain black backdrop (High Contrast).
export const BACKDROP_TEXT_VARS = vars(BACKDROP_TEXT.brand);
const HIGH_CONTRAST_BACKDROP_TEXT_VARS = vars(BACKDROP_TEXT['high-contrast']);

export function backdropTextVars(theme: UiTheme): ReturnType<typeof vars> {
  return theme === 'high-contrast' ? HIGH_CONTRAST_BACKDROP_TEXT_VARS : BACKDROP_TEXT_VARS;
}

// Surface-scoped text variables. Cards, inputs, sheets, and the tab bar set the
// card text vars of the current theme and color scheme, matching the card
// background that ThemeProvider sets. Because these override --foreground /
// --muted-foreground for their subtree, even screens that hard-code
// `text-foreground` / `text-muted-foreground` read correctly without
// per-screen edits. Built once per theme and scheme so every surface gets a
// stable style reference.
const surfaceVarsCache = new Map<string, ReturnType<typeof vars>>();

export function surfaceTextVars(
  scheme: string | undefined,
  theme: UiTheme = activeUiTheme(),
): ReturnType<typeof vars> {
  const s = schemeOf(scheme);
  const key = `${theme}:${s}`;
  const cached = surfaceVarsCache.get(key);
  if (cached != null) return cached;
  const c = activePalette(theme, s);
  const value = vars({
    '--foreground': c.cardForeground,
    '--card-foreground': c.cardForeground,
    '--muted-foreground': c.mutedForeground,
  });
  surfaceVarsCache.set(key, value);
  return value;
}

// The surface text vars for the active theme and color scheme, the same source
// the ThemeProvider uses for the card background.
export function useSurfaceTextVars(): ReturnType<typeof vars> {
  const { colorScheme } = useColorScheme();
  const theme = useUiTheme((st) => st.theme);
  return surfaceTextVars(colorScheme, theme);
}

export function ThemeProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const { colorScheme } = useColorScheme();
  const theme = useUiTheme((st) => st.theme);
  const style = React.useMemo(
    () => vars({ ...toVars(activePalette(theme, schemeOf(colorScheme))), ...radiusVars(theme) }),
    [theme, colorScheme],
  );
  return (
    <View style={style} className="flex-1 bg-background">
      {children}
    </View>
  );
}

// Resolve a brand HSL token to an `hsl(...)` string for the rare API that needs
// a raw color (icon fills, chart series, shadow colors, backgrounds). The brand
// tokens are stored space-separated ("142 72% 33%"); React Native's core color
// parser only accepts the comma form, so emit "hsl(142, 72%, 33%)". SVG and
// reanimated accept both, so this is safe everywhere hsl() is used.
// The value follows the active theme. Each theme, scheme and token resolves to
// a constant string; it is cached so callers in render hot paths (headers,
// charts, spinners) get a stable reference instead of re-parsing every render.
const hslCache = new Map<string, string>();

// The color scheme NativeWind renders the `dark:` classes and ThemeProvider's
// palette with, read at call time.
export function activeScheme(): Scheme {
  return schemeOf(nativeColorScheme.get());
}

// Without `scheme`, the value follows the active color scheme too, so an icon
// drawn in dark mode gets the dark palette (it read the light one before).
export function hsl(token: keyof BrandColors, scheme: Scheme = activeScheme()): string {
  const theme = activeUiTheme();
  const key = `${theme}:${scheme}:${token}`;
  const cached = hslCache.get(key);
  if (cached != null) return cached;
  const raw = activePalette(theme, scheme)[token];
  const value =
    raw == null || raw === '' ? 'transparent' : `hsl(${raw.trim().replace(/\s+/g, ', ')})`;
  hslCache.set(key, value);
  return value;
}
