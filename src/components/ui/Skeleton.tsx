// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

import React from 'react';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { cn } from '@/lib/cn';

// Shimmering placeholder block. Use instead of a spinner for content that has a
// known shape (cards, list rows, metric tiles) so loading feels designed.
export function Skeleton({ className }: { className?: string }): React.JSX.Element {
  const opacity = useSharedValue(0.5);

  React.useEffect(() => {
    opacity.value = withRepeat(
      withTiming(1, { duration: 850, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, [opacity]);

  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return <Animated.View style={style} className={cn('rounded-xl bg-muted', className)} />;
}
