// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

import type { ViewStyle } from 'react-native';
import { activeUiTheme } from './ui-theme';
import { themeShadows, type ShadowTier } from './theme-tokens';

// Soft elevation system. NativeWind does not reliably map Tailwind shadow
// utilities to native iOS/Android, so cards, buttons, sheets, and the tab bar
// apply these style objects directly. Shadows are low-opacity with generous
// blur for the floating, layered look; `elevation` covers Android. Each tier
// reads the active theme when a component renders (Soft spreads them wider and
// lighter, src/lib/theme-tokens.ts).
function tier(name: ShadowTier): PropertyDescriptor {
  return { enumerable: true, get: () => themeShadows(activeUiTheme())[name] };
}

export const shadow = Object.defineProperties({} as Record<ShadowTier, ViewStyle>, {
  sm: tier('sm'),
  md: tier('md'),
  lg: tier('lg'),
  xl: tier('xl'),
});

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
