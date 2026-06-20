// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

import React from 'react';
import { View } from 'react-native';
import { vars, useColorScheme } from 'nativewind';
import { BRAND } from './config';
import type { BrandColors } from '@brands/index';

// Applies the active brand's palette as CSS variables at the root so every
// NativeWind `bg-primary` / `text-foreground` class resolves to the brand color
// for the current light/dark scheme. White-label theming needs no CSS edits:
// a brand only supplies HSL triplets in brands/<slug>.ts.
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
    '--destructive': c.destructive,
    '--info': c.info,
  };
}

// Surface-scoped text variables. The branded green backdrop sets light text
// vars; cards, inputs, sheets, and the tab bar set dark vars. Because these
// override --foreground / --muted-foreground for their subtree, even screens
// that hard-code `text-foreground` / `text-muted-foreground` read correctly
// without per-screen edits.
const L = BRAND.colors.light;

export const BACKDROP_TEXT_VARS = vars({
  '--foreground': '0 0% 100%',
  '--muted-foreground': '150 20% 84%',
});

export const SURFACE_TEXT_VARS = vars({
  '--foreground': L.cardForeground,
  '--card-foreground': L.cardForeground,
  '--muted-foreground': L.mutedForeground,
});

export function ThemeProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const { colorScheme } = useColorScheme();
  const palette = colorScheme === 'dark' ? BRAND.colors.dark : BRAND.colors.light;
  return (
    <View style={vars(toVars(palette))} className="flex-1 bg-background">
      {children}
    </View>
  );
}

// Resolve a brand HSL token to an `hsl(...)` string for the rare API that needs
// a raw color (icon fills, chart series, shadow colors, backgrounds). The brand
// tokens are stored space-separated ("142 72% 33%"); React Native's core color
// parser only accepts the comma form, so emit "hsl(142, 72%, 33%)". SVG and
// reanimated accept both, so this is safe everywhere hsl() is used.
// The palette is static, so each token resolves to a constant string. Cache it
// so callers in render hot paths (headers, charts, spinners) get a stable
// reference instead of re-parsing the token every render.
const hslCache = new Map<string, string>();

export function hsl(token: keyof BrandColors, scheme: 'light' | 'dark' = 'light'): string {
  const key = `${scheme}:${token}`;
  const cached = hslCache.get(key);
  if (cached != null) return cached;
  const palette = scheme === 'dark' ? BRAND.colors.dark : BRAND.colors.light;
  const raw = palette[token];
  const value =
    raw == null || raw === '' ? 'transparent' : `hsl(${raw.trim().replace(/\s+/g, ', ')})`;
  hslCache.set(key, value);
  return value;
}
