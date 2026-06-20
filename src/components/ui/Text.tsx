// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

import React from 'react';
import { Text as RNText, type TextProps, type TextStyle } from 'react-native';
import { cn } from '@/lib/cn';

type Variant =
  | 'display'
  | 'h1'
  | 'h2'
  | 'h3'
  | 'title'
  | 'body'
  | 'small'
  | 'label'
  | 'muted'
  | 'caption'
  | 'overline';

type Weight = 'regular' | 'medium' | 'semibold' | 'bold' | 'extrabold' | 'black';
type Tone = 'default' | 'muted';

const FAMILY: Record<Weight, string> = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
  extrabold: 'Inter_800ExtraBold',
  black: 'Inter_900Black',
};

// A deliberate weight ladder: 800 for the hero element, 700 for page titles, 600
// for section/card titles and primary list rows, 500 for labels, 400 for body.
// Color is NOT baked into the variant; it comes from the surface (light on the
// branded backdrop, dark inside cards) unless overridden via className.
const VARIANT: Record<Variant, { class: string; weight: Weight; tone: Tone }> = {
  display: {
    class: 'text-[32px] leading-tight tracking-tighter',
    weight: 'extrabold',
    tone: 'default',
  },
  h1: { class: 'text-[26px] leading-tight tracking-tight', weight: 'bold', tone: 'default' },
  h2: { class: 'text-[21px] leading-tight tracking-tight', weight: 'bold', tone: 'default' },
  h3: { class: 'text-[17px] tracking-tight', weight: 'semibold', tone: 'default' },
  title: { class: 'text-[15px] tracking-tight', weight: 'semibold', tone: 'default' },
  body: { class: 'text-[14px] leading-relaxed', weight: 'regular', tone: 'default' },
  small: { class: 'text-[13px]', weight: 'regular', tone: 'default' },
  label: { class: 'text-[14px]', weight: 'medium', tone: 'default' },
  muted: { class: 'text-[14px] leading-relaxed', weight: 'regular', tone: 'muted' },
  caption: { class: 'text-xs', weight: 'medium', tone: 'muted' },
  overline: { class: 'text-[11px] uppercase tracking-widest', weight: 'semibold', tone: 'muted' },
};

// text-foreground / text-muted-foreground resolve the surface-scoped vars, so
// the same variant reads light on the backdrop and dark inside cards.
function colorFor(tone: Tone): string {
  return tone === 'muted' ? 'text-muted-foreground' : 'text-foreground';
}

export function Text({
  variant = 'body',
  weight,
  tabular = false,
  className,
  style,
  ...props
}: TextProps & {
  variant?: Variant;
  weight?: Weight;
  tabular?: boolean;
  className?: string;
}): React.JSX.Element {
  const v = VARIANT[variant];
  const fontStyle: TextStyle = {
    fontFamily: FAMILY[weight ?? v.weight],
    ...(tabular ? { fontVariant: ['tabular-nums'] } : {}),
  };
  return (
    <RNText
      className={cn(v.class, colorFor(v.tone), className)}
      style={[fontStyle, style]}
      {...props}
    />
  );
}
