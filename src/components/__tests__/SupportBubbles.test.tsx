// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

// The support chat bubbles (automatic answer, driver, operator, system) sit on
// the branded green backdrop. Each needs an opaque background, and its text must
// meet WCAG AA in both color schemes: each text color and the background it sits
// on are resolved from the brand palette of the scheme (and the surface text vars
// the bubble sets) and checked for 4.5:1.

// vars() returns an opaque style object; the identity keeps the variable map
// readable so the test can resolve the surface text colors.
jest.mock('nativewind', () => ({
  ...jest.requireActual<typeof import('nativewind')>('nativewind'),
  vars: (obj: Record<string, string>) => obj,
  useColorScheme: jest.fn(() => ({ colorScheme: 'light' })),
}));

// The ui barrel pulls in reanimated; the bubble only needs Text.
jest.mock('@/components/ui', () => ({
  Text: jest.requireActual<typeof import('@/components/ui/Text')>('@/components/ui/Text').Text,
}));

import React from 'react';
import { StyleSheet } from 'react-native';
import { render, within } from '@testing-library/react-native';
import { useColorScheme } from 'nativewind';
import { initTestI18n } from '@/test-utils/i18n';
import { BRAND } from '@/lib/config';
import { surfaceTextVars } from '@/lib/theme';
import { contrastRatio, WCAG_AA_BODY_TEXT } from '@/lib/contrast';
import { AssistantMessage } from '@/components/support/AssistantMessage';
import { MessageBubble } from '@/components/support/MessageBubble';
import type { BrandColors } from '@brands/index';

const mockUseColorScheme = useColorScheme as jest.Mock;

// The surface text vars as a plain variable map.
function vars(scheme: 'light' | 'dark'): Record<string, string> {
  return StyleSheet.flatten(surfaceTextVars(scheme) as unknown as object) as Record<string, string>;
}

const MESSAGE = {
  id: 7,
  senderType: 'assistant' as const,
  body: 'The connector reported a fault. Try another connector.',
  createdAt: '2026-10-20T09:41:00Z',
};

// Tailwind size and layout classes that also start with text-.
const NON_COLOR_TEXT = /^text-(xs|sm|base|lg|xl|\d?xl|\[.*\]|left|right|center)$/;

// The props of a rendered host node.
interface Node {
  props: { className?: string; testID?: string; style?: unknown };
}

function classes(node: Node): string[] {
  const c = node.props.className;
  return c == null ? [] : c.split(/\s+/).filter(Boolean);
}

function colorClass(node: Node, prefix: 'bg' | 'text'): string {
  const found = classes(node).filter(
    (c) => c.startsWith(`${prefix}-`) && !(prefix === 'text' && NON_COLOR_TEXT.test(c)),
  );
  const last = found[found.length - 1];
  if (last == null) throw new Error(`no ${prefix} color on ${String(node.props.testID)}`);
  return last;
}

function camel(token: string): keyof BrandColors {
  return token.replace(/-([a-z])/g, (_, ch: string) => ch.toUpperCase()) as keyof BrandColors;
}

// Resolves a color class to its HSL token: the surface vars first (they
// override foreground, card-foreground and muted-foreground), then the palette.
function resolve(cls: string, palette: BrandColors, surface: Record<string, string>): string {
  const [, token, alpha] = /^(?:bg|text)-([a-z-]+)(\/.*)?$/.exec(cls) ?? [];
  if (token == null) throw new Error(`unknown color class ${cls}`);
  // Translucent colors blend with the backdrop photo, so no ratio is defined.
  expect(alpha).toBeUndefined();
  const fromSurface = surface[`--${token}`];
  if (fromSurface != null) return fromSurface;
  const value = palette[camel(token)];
  if (value == null || value === '') throw new Error(`no palette token for ${cls}`);
  return value;
}

describe.each(['light', 'dark'] as const)('AssistantMessage in %s mode', (scheme) => {
  beforeAll(async () => {
    await initTestI18n();
  });

  beforeEach(() => {
    mockUseColorScheme.mockReturnValue({ colorScheme: scheme });
  });

  it('is an opaque card surface with the surface text vars of the scheme', async () => {
    const { getByTestId } = await render(<AssistantMessage message={MESSAGE} />);
    const bubble = getByTestId('support-ai-answer-bubble');
    expect(StyleSheet.flatten(bubble.props.style)).toEqual(vars(scheme));
    const palette = BRAND.colors[scheme];
    expect(resolve(colorClass(bubble, 'bg'), palette, vars(scheme))).toBe(palette.card);
    expect(vars(scheme)['--foreground']).toBe(palette.cardForeground);
  });

  it('meets WCAG AA for every text in the bubble', async () => {
    const palette = BRAND.colors[scheme];
    const surface = vars(scheme);
    const { getByTestId } = await render(
      <AssistantMessage message={MESSAGE} driverActions={['try_other_connector']} />,
    );
    const bubble = getByTestId('support-ai-answer-bubble');
    const bubbleBg = resolve(colorClass(bubble, 'bg'), palette, surface);

    const texts = within(bubble).getAllByText(/.+/);
    expect(texts.length).toBeGreaterThanOrEqual(3);
    const chip = getByTestId('support-ai-action-try_other_connector');
    const chipBg = resolve(colorClass(chip, 'bg'), palette, surface);
    const chipTexts = within(chip).getAllByText(/.+/);

    for (const text of texts) {
      const bg = chipTexts.includes(text) ? chipBg : bubbleBg;
      const fg = resolve(colorClass(text, 'text'), palette, surface);
      expect(contrastRatio(fg, bg)).toBeGreaterThanOrEqual(WCAG_AA_BODY_TEXT);
    }
  });
});

describe.each(['light', 'dark'] as const)('MessageBubble in %s mode', (scheme) => {
  beforeEach(() => {
    mockUseColorScheme.mockReturnValue({ colorScheme: scheme });
  });

  it.each(['driver', 'operator', 'system'] as const)(
    'gives the %s bubble an opaque background with AA text',
    async (senderType) => {
      const palette = BRAND.colors[scheme];
      const { getByTestId } = await render(
        <MessageBubble message={{ ...MESSAGE, id: 3, senderType }} />,
      );
      const bubble = getByTestId('support-message-bubble-3');
      const surface =
        bubble.props.style == null
          ? {}
          : (StyleSheet.flatten(bubble.props.style as object) as Record<string, string>);
      if (senderType !== 'driver') expect(surface).toEqual(vars(scheme));
      const bg = resolve(colorClass(bubble, 'bg'), palette, surface);
      const texts = within(bubble).getAllByText(/.+/);
      expect(texts).toHaveLength(1);
      for (const text of texts) {
        const fg = resolve(colorClass(text, 'text'), palette, surface);
        expect(contrastRatio(fg, bg)).toBeGreaterThanOrEqual(WCAG_AA_BODY_TEXT);
      }
    },
  );
});
