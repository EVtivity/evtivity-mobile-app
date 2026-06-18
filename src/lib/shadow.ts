// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

import type { ViewStyle } from 'react-native';

// Soft elevation system. NativeWind does not reliably map Tailwind shadow
// utilities to native iOS/Android, so cards, buttons, sheets, and the tab bar
// apply these style objects directly. Shadows are low-opacity with generous
// blur for the floating, layered look; `elevation` covers Android.
export const shadow: Record<'sm' | 'md' | 'lg' | 'xl', ViewStyle> = {
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

// A brand-tinted glow for the primary CTA so the main action lifts off the page.
export function glow(color: string): ViewStyle {
  return {
    shadowColor: color,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
  };
}
