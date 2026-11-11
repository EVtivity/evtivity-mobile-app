// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

// WCAG 2.2 contrast (relative luminance) of the text and background token pairs
// of every theme, color scheme and registered brand. AA (4.5:1) for every pair,
// AAA (7:1) for body text in High Contrast. Every theme passes, Default
// included, with no allowlist (owner decision 2026-11-11).

import { brands } from '@brands/index';
import type { BrandColors } from '@brands/index';
import { contrastRatio, WCAG_AA_BODY_TEXT } from '@/lib/contrast';
import { themePalette, type Scheme } from '@/lib/theme-tokens';
import { UI_THEMES } from '@/lib/ui-theme';

const WCAG_AAA_BODY_TEXT = 7;

type Pair = [keyof BrandColors, keyof BrandColors];

const AA_PAIRS: Pair[] = [
  ['foreground', 'background'],
  ['cardForeground', 'card'],
  ['mutedForeground', 'background'],
  ['mutedForeground', 'card'],
  ['mutedForeground', 'muted'],
  ['primaryForeground', 'primary'],
  ['ctaForeground', 'cta'],
  ['accentForeground', 'accent'],
];

const AAA_BODY_PAIRS: Pair[] = [
  ['foreground', 'background'],
  ['cardForeground', 'card'],
  ['mutedForeground', 'card'],
];

const SCHEMES: Scheme[] = ['light', 'dark'];

const cases = Object.values(brands).flatMap((brand) =>
  UI_THEMES.flatMap((theme) =>
    SCHEMES.map((scheme) => ({
      brand: brand.slug,
      theme,
      scheme,
      palette: themePalette(theme, scheme, brand.colors[scheme]),
    })),
  ),
);

describe.each(cases)('$brand $theme $scheme', ({ theme, palette }) => {
  it.each(AA_PAIRS)('%s on %s meets AA 4.5:1', (fg, bg) => {
    expect(contrastRatio(palette[fg], palette[bg])).toBeGreaterThanOrEqual(WCAG_AA_BODY_TEXT);
  });

  if (theme === 'high-contrast') {
    it.each(AAA_BODY_PAIRS)('%s on %s meets AAA 7:1', (fg, bg) => {
      expect(contrastRatio(palette[fg], palette[bg])).toBeGreaterThanOrEqual(WCAG_AAA_BODY_TEXT);
    });
  }
});
