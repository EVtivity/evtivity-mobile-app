// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

import React from 'react';
import { View, Pressable, StyleSheet, type ViewProps } from 'react-native';
import Svg, { Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import { CardSurface } from './surface';
import { cn } from '@/lib/cn';
import { shadow } from '@/lib/shadow';
import { SURFACE_TEXT_VARS } from '@/lib/theme';
import { tapLight } from '@/lib/haptics';

interface CardProps extends ViewProps {
  className?: string;
  onPress?: () => void;
  // Flat cards drop the shadow and sit on a hairline border, for nested or
  // secondary surfaces where a floating card would be too heavy.
  flat?: boolean;
}

// A barely-there diagonal sheen behind the card content: a light highlight at
// the top-left fading to a faint brand-green warmth at the bottom-right. The
// Rect is corner-rounded (rx) to match `rounded-2xl` instead of clipping the
// card with overflow-hidden, which would cut off the iOS shadow.
function CardSheen(): React.JSX.Element {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Svg width="100%" height="100%">
        <Defs>
          <LinearGradient id="cardSheen" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor="#ffffff" stopOpacity="0.045" />
            <Stop offset="1" stopColor="#34d399" stopOpacity="0.03" />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" rx={24} ry={24} fill="url(#cardSheen)" />
      </Svg>
    </View>
  );
}

export function Card({ className, onPress, flat = false, children, style, ...props }: CardProps): React.JSX.Element {
  // Translucent "glass" surface: the white card token over the branded backdrop
  // with a faint light rim so the green network shows through the edges. The
  // SURFACE_TEXT_VARS make text inside render dark. A plain (non-reanimated)
  // Pressable is used so those CSS vars propagate to the card's text.
  const classes = cn(
    'rounded-2xl border border-white/20 bg-card/[0.85] p-4',
    flat && 'bg-card/[0.7]',
    className,
  );
  const elevation = flat ? undefined : shadow.md;

  if (onPress != null) {
    return (
      <Pressable
        onPress={onPress}
        onPressIn={() => tapLight()}
        className={cn(classes, 'active:opacity-90')}
        style={[elevation, SURFACE_TEXT_VARS, style]}
        {...props}
      >
        <CardSheen />
        <CardSurface>{children}</CardSurface>
      </Pressable>
    );
  }
  return (
    <View className={classes} style={[elevation, SURFACE_TEXT_VARS, style]} {...props}>
      <CardSheen />
      <CardSurface>{children}</CardSurface>
    </View>
  );
}
