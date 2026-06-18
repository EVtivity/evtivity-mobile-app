// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

import React from 'react';
import { useFonts } from 'expo-font';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
  Inter_900Black,
} from '@expo-google-fonts/inter';

// Inter carries the whole UI. Each weight is a distinct face (custom fonts do
// not synthesize weights reliably on Android), so the Text component selects the
// family by name rather than relying on fontWeight. Family names match the
// Tailwind fontFamily keys in tailwind.config.js. Icons are SVG (Phosphor), so
// no glyph font is needed.
export const FONT_MAP = {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
  Inter_900Black,
};

// Returns true once Inter and the Ionicons glyph font are ready, or after a
// short safety timeout so a slow/failed font load can never hang the splash.
export function useAppFonts(): boolean {
  const [loaded] = useFonts(FONT_MAP);
  const [timedOut, setTimedOut] = React.useState(false);
  React.useEffect(() => {
    const h = setTimeout(() => setTimedOut(true), 4000);
    return () => clearTimeout(h);
  }, []);
  return loaded || timedOut;
}
