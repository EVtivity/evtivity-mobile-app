// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

import React from 'react';
import { Dimensions, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import * as SplashScreen from 'expo-splash-screen';

const BG = '#0f172a';
const GREEN = '#22c55e';

const { width, height } = Dimensions.get('window');
// The native splash is a solid color with no logo, so this animated mark is
// the only logo shown. Size it to 60% of the shorter side.
const LOGO = Math.round(Math.min(width, height) * 0.6);

// The brand mark, split into two layers so each can animate on its own: the
// ring spins, the bolt pulses. Both share the 120-unit viewBox from
// evtivity-logo.svg, drawn at LOGO size and stacked. The broken ring is two
// stroked arcs (endpoints derived from the brand SVG's gap geometry) rather
// than a circle + SVG mask: react-native-svg masks render clipped under the
// new architecture, which cut the ring off.
function Ring(): React.JSX.Element {
  return (
    <Svg width={LOGO} height={LOGO} viewBox="0 0 120 120">
      <Path
        d="M73.45 11.84 A 50 50 0 0 1 56.16 109.85"
        fill="none"
        stroke={GREEN}
        strokeWidth="12"
      />
      <Path
        d="M48.24 108.60 A 50 50 0 0 1 65.57 10.31"
        fill="none"
        stroke={GREEN}
        strokeWidth="12"
      />
    </Svg>
  );
}

function Bolt(): React.JSX.Element {
  return (
    <Svg width={LOGO} height={LOGO} viewBox="0 0 120 120">
      <Path d="M68 20L38 68h22l-6 32 30-48H62l6-32z" fill={GREEN} />
    </Svg>
  );
}

export function AnimatedSplash({ onFinish }: { onFinish: () => void }): React.JSX.Element {
  const ringSpin = useSharedValue(0);
  const boltScale = useSharedValue(0.85);
  const fade = useSharedValue(1);

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${ringSpin.value}deg` }],
  }));
  const boltStyle = useAnimatedStyle(() => ({
    transform: [{ scale: boltScale.value }],
  }));
  const containerStyle = useAnimatedStyle(() => ({ opacity: fade.value }));

  const hideNative = React.useCallback(() => {
    void SplashScreen.hideAsync().catch(() => undefined);
  }, []);

  React.useEffect(() => {
    // One continuous, constant-speed spin. Linear easing + a 360deg loop makes
    // the wrap from 360->0 seamless, so the ring never visibly stops.
    ringSpin.value = withRepeat(
      withTiming(360, { duration: 2200, easing: Easing.linear }),
      -1,
      false,
    );
    // Subtle continuous pulse on the bolt.
    boltScale.value = withRepeat(
      withTiming(0.98, { duration: 800, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
    // Hold briefly, fade out, then hand control to the app.
    fade.value = withDelay(
      1500,
      withTiming(0, { duration: 350, easing: Easing.in(Easing.ease) }, (done) => {
        if (done) runOnJS(onFinish)();
      }),
    );
    return () => {
      cancelAnimation(ringSpin);
      cancelAnimation(boltScale);
      cancelAnimation(fade);
    };
  }, [ringSpin, boltScale, fade, onFinish]);

  return (
    <Animated.View
      style={[StyleSheet.absoluteFill, styles.container, containerStyle]}
      onLayout={hideNative}
    >
      <View style={{ width: LOGO, height: LOGO }}>
        <Animated.View style={[StyleSheet.absoluteFill, ringStyle]}>
          <Ring />
        </Animated.View>
        <Animated.View style={[StyleSheet.absoluteFill, boltStyle]}>
          <Bolt />
        </Animated.View>
      </View>
      <Text style={styles.poweredBy}>Powered by EVtivity</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: BG,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  poweredBy: {
    position: 'absolute',
    bottom: 56,
    color: 'rgba(255, 255, 255, 0.55)',
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
});
