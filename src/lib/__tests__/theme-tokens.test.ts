// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

import { defaultBrand } from '@brands/index';
import { contrastRatio } from '@/lib/contrast';
import {
  balancedTone,
  BACKDROP_TEXT,
  DEFAULT_RADIUS,
  radiusVars,
  readableUnder,
  textReadableOn,
  themePalette,
  themeRadius,
  themeShadows,
} from '@/lib/theme-tokens';

const light = defaultBrand.colors.light;
const dark = defaultBrand.colors.dark;

function lightnessOf(token: string): number {
  return Number.parseFloat(token.trim().split(/\s+/)[2] ?? '');
}

describe('themePalette', () => {
  it('Default is the brand palette as it is', () => {
    expect(themePalette('default', 'light', light)).toBe(light);
    expect(themePalette('default', 'dark', dark)).toBe(dark);
  });

  it('Soft keeps the brand surfaces and makes the border subtler', () => {
    const soft = themePalette('soft', 'light', light);
    expect(soft.background).toBe(light.background);
    expect(soft.card).toBe(light.card);
    expect(soft.success).toBe(light.success);
    // Light page: the border moves toward the lighter background.
    expect(lightnessOf(soft.border)).toBeGreaterThan(lightnessOf(light.border));
    // Dark page: the border moves toward the darker background.
    const softDark = themePalette('soft', 'dark', dark);
    expect(lightnessOf(softDark.border)).toBeLessThan(lightnessOf(dark.border));
  });

  it('High Contrast uses neutral black and white surfaces with the brand hue on primary', () => {
    const hcLight = themePalette('high-contrast', 'light', light);
    expect(hcLight.background).toBe('0 0% 100%');
    expect(hcLight.card).toBe('0 0% 100%');
    expect(hcLight.foreground).toBe('0 0% 0%');
    expect(hcLight.muted.startsWith('0 0%')).toBe(true);
    expect(hcLight.accent.startsWith('0 0%')).toBe(true);
    expect(hcLight.primary.split(' ')[0]).toBe(light.primary.split(' ')[0]);
    const hcDark = themePalette('high-contrast', 'dark', dark);
    expect(hcDark.background).toBe('0 0% 0%');
    expect(hcDark.card).toBe('0 0% 0%');
    expect(hcDark.foreground).toBe('0 0% 100%');
    expect(hcDark.primaryForeground).toBe('0 0% 0%');
    // The cta button always renders white text.
    expect(hcDark.ctaForeground).toBe('0 0% 100%');
    expect(contrastRatio(hcDark.ctaForeground, hcDark.cta)).toBeGreaterThanOrEqual(7);
  });

  it('High Contrast tones read on white, on black and under white text', () => {
    for (const scheme of ['light', 'dark'] as const) {
      const hc = themePalette('high-contrast', scheme, defaultBrand.colors[scheme]);
      for (const tone of [hc.success, hc.warning, hc.destructive, hc.info]) {
        expect(contrastRatio(tone, '0 0% 100%')).toBeGreaterThanOrEqual(4.5);
        expect(contrastRatio(tone, '0 0% 0%')).toBeGreaterThanOrEqual(4.5);
      }
    }
  });
});

describe('lightness helpers', () => {
  it('readableUnder keeps a color that already reads and moves one that does not', () => {
    expect(readableUnder('0 0% 20%', '0 0% 100%', 4.5)).toBe('0 0% 20%');
    const moved = readableUnder('142 71% 45%', '0 0% 100%', 4.5);
    expect(contrastRatio('0 0% 100%', moved)).toBeGreaterThanOrEqual(4.5);
    const lighter = readableUnder('142 71% 30%', '0 0% 0%', 7);
    expect(lightnessOf(lighter)).toBeGreaterThan(30);
  });

  it('readableUnder falls back to black or white when no lightness reaches the target', () => {
    expect(readableUnder('142 71% 45%', '0 0% 100%', 22)).toBe('0 0% 0%');
    expect(readableUnder('142 71% 45%', '0 0% 0%', 22)).toBe('0 0% 100%');
  });

  it('textReadableOn moves text away from its backgrounds, with a fallback', () => {
    const darker = textReadableOn('0 0% 60%', ['0 0% 95%', '0 0% 100%'], 4.5);
    expect(lightnessOf(darker)).toBeLessThan(60);
    const lighter = textReadableOn('0 0% 40%', ['0 0% 5%'], 7);
    expect(lightnessOf(lighter)).toBeGreaterThan(40);
    expect(textReadableOn('0 0% 50%', ['0 0% 100%'], 22)).toBe('0 0% 0%');
    // No background: the text stays as it is.
    expect(textReadableOn('0 0% 50%', [], 4.5)).toBe('0 0% 50%');
    expect(textReadableOn('0 0% 50%', ['0 0% 0%'], 22)).toBe('0 0% 100%');
  });

  it('balancedTone reads at about 4.6:1 against both black and white', () => {
    const tone = balancedTone('0 75% 55%');
    expect(contrastRatio(tone, '0 0% 100%')).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(tone, '0 0% 0%')).toBeGreaterThanOrEqual(4.5);
  });
});

describe('radius, shadows and backdrop', () => {
  it('keeps the Default radius tiers and rounds Soft more', () => {
    expect(themeRadius('default')).toBe(DEFAULT_RADIUS);
    expect(themeRadius('high-contrast')).toBe(DEFAULT_RADIUS);
    const soft = themeRadius('soft');
    for (const tier of Object.keys(DEFAULT_RADIUS) as (keyof typeof DEFAULT_RADIUS)[]) {
      expect(soft[tier]).toBeGreaterThan(DEFAULT_RADIUS[tier]);
    }
    expect(radiusVars('default')).toEqual({
      '--radius-sm': '6px',
      '--radius-md': '10px',
      '--radius-lg': '14px',
      '--radius-xl': '18px',
      '--radius-2xl': '24px',
    });
  });

  it('softens the shadows only in Soft', () => {
    expect(themeShadows('high-contrast')).toBe(themeShadows('default'));
    const soft = themeShadows('soft');
    const base = themeShadows('default');
    expect(soft.md.shadowOpacity).toBeLessThan(base.md.shadowOpacity as number);
    expect(soft.md.shadowRadius).toBeGreaterThan(base.md.shadowRadius as number);
  });

  it('gives the High Contrast backdrop brighter muted text', () => {
    expect(BACKDROP_TEXT['high-contrast']['--foreground']).toBe('0 0% 100%');
    expect(BACKDROP_TEXT.brand['--muted-foreground']).toBe('150 20% 84%');
  });
});
