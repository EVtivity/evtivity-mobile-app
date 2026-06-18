// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

import React from 'react';
import { Pressable, type PressableProps } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { tapLight } from '@/lib/haptics';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// Tappable surface with a subtle spring-down on press, used by Button, Card,
// and list rows so the whole app shares one tactile feel. Opt into a light
// haptic tick with `haptic`.
export function PressableScale({
  children,
  onPressIn,
  onPressOut,
  haptic = false,
  scaleTo = 0.97,
  style,
  ...props
}: PressableProps & { haptic?: boolean; scaleTo?: number }): React.JSX.Element {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <AnimatedPressable
      onPressIn={(e) => {
        scale.value = withTiming(scaleTo, { duration: 90, easing: Easing.out(Easing.quad) });
        if (haptic) tapLight();
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        scale.value = withTiming(1, { duration: 140, easing: Easing.out(Easing.quad) });
        onPressOut?.(e);
      }}
      style={[animatedStyle, style]}
      {...props}
    >
      {children}
    </AnimatedPressable>
  );
}
