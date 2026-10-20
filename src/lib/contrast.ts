// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

// WCAG 2.x contrast ratio between two brand HSL tokens ("142 72% 33%"), so
// tests can check that a foreground and background token pair stays readable
// in every brand palette and color scheme.

function hslToRgb(token: string): [number, number, number] {
  const parts = token.trim().split(/\s+/);
  if (parts.length !== 3) throw new Error(`Invalid HSL token: ${token}`);
  const [h, s, l] = parts.map((p) => Number.parseFloat(p)) as [number, number, number];
  if ([h, s, l].some((n) => Number.isNaN(n))) throw new Error(`Invalid HSL token: ${token}`);
  const sat = s / 100;
  const light = l / 100;
  const k = (n: number): number => (n + h / 30) % 12;
  const a = sat * Math.min(light, 1 - light);
  const f = (n: number): number =>
    light - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [f(0), f(8), f(4)];
}

function relativeLuminance(token: string): number {
  const [r, g, b] = hslToRgb(token).map((c) =>
    c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4,
  ) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(foreground: string, background: string): number {
  const a = relativeLuminance(foreground);
  const b = relativeLuminance(background);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

// WCAG 2.x AA minimum for body text.
export const WCAG_AA_BODY_TEXT = 4.5;
