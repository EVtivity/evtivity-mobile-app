// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

// The plug-in step (owner decision 2026-11-12), as on the portal: a generic
// charging handle with its cable moves to the car's charge port, plugs in, and
// the port light turns on, in a gentle 4 s loop. The inlet shows the measured
// face of the EVSE's connector type (connector-faces.generated, from the CSMS
// connector geometry); an unknown type shows a neutral round inlet. Colors are
// theme tokens. With the system's reduced motion setting the still frame shows
// the handle plugged in and the light on.

import React from 'react';
import { AccessibilityInfo, Animated, Easing, View } from 'react-native';
import { useColorScheme } from 'nativewind';
import { useTranslation } from 'react-i18next';
import Svg, { Circle, G, Path, Rect } from 'react-native-svg';
import { hsl } from '@/lib/theme';
import {
  PLUG_IN_HANDLE_STEPS,
  PLUG_IN_LIGHT_STEPS,
  PLUG_IN_LOOP_MS,
  PLUG_IN_OFFSET,
  plugInConnectorKind,
  plugInFace,
} from '@/lib/plug-in';

const W = 260;
const H = 130;
const FACE_X = 132;
const FACE_Y = 66;
const FACE_SIZE = 28;

/** Whether the system asks for less motion; follows a change. */
function useReduceMotion(): boolean {
  const [reduced, setReduced] = React.useState(false);
  React.useEffect(() => {
    let live = true;
    void AccessibilityInfo.isReduceMotionEnabled()
      .then((on) => {
        if (live) setReduced(on);
      })
      .catch(() => {
        // fail-open: keep the loop when the setting cannot be read
      });
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    return () => {
      live = false;
      sub.remove();
    };
  }, []);
  return reduced;
}

export function EvPlugAnimation({
  connectorType,
}: {
  /** The EVSE's connector type as the station reports it; null or unknown shows a neutral inlet. */
  connectorType?: string | null;
}): React.JSX.Element {
  const { t } = useTranslation();
  const { colorScheme } = useColorScheme();
  const scheme = colorScheme === 'dark' ? 'dark' : 'light';
  const c = (token: Parameters<typeof hsl>[0]): string => hsl(token, scheme);
  const still = useReduceMotion();
  const kind = plugInConnectorKind(connectorType);
  const face = plugInFace(kind);
  const [progress] = React.useState(() => new Animated.Value(0));

  React.useEffect(() => {
    if (still) {
      progress.setValue(1);
      return;
    }
    progress.setValue(0);
    const loop = Animated.loop(
      Animated.timing(progress, {
        toValue: 1,
        duration: PLUG_IN_LOOP_MS,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [still, progress]);

  const handleIn = still
    ? 1
    : progress.interpolate({
        inputRange: PLUG_IN_HANDLE_STEPS.input,
        outputRange: PLUG_IN_HANDLE_STEPS.output,
      });
  const light = still
    ? 1
    : progress.interpolate({
        inputRange: PLUG_IN_LIGHT_STEPS.input,
        outputRange: PLUG_IN_LIGHT_STEPS.output,
      });
  const offset = (v: number): Animated.AnimatedInterpolation<number> | number =>
    typeof handleIn === 'number'
      ? v * (1 - handleIn)
      : handleIn.interpolate({ inputRange: [0, 1], outputRange: [v, 0] });

  const scale = FACE_SIZE / 16;
  const faceColor = c('mutedForeground');
  return (
    <View
      testID="ev-plug-animation"
      accessible
      accessibilityRole="image"
      accessibilityLabel={t('charge.plugInAnimationLabel')}
      className="self-center"
      style={{ width: W, height: H }}
    >
      <View testID={still ? 'ev-plug-still' : 'ev-plug-loop'} style={{ width: W, height: H }}>
        <Svg width={W} height={H} viewBox={`0 0 ${String(W)} ${String(H)}`}>
          <Path
            d="M110 112 L110 80 C110 66 118 58 132 55 L176 48 C188 30 206 22 230 20 L260 20 L260 112 Z"
            fill={c('muted')}
            stroke={c('border')}
            strokeWidth={1.5}
          />
          <Path
            d="M184 46 C193 33 208 27 228 26 L256 26 L256 46 Z"
            fill={c('card')}
            stroke={c('border')}
            strokeWidth={1.2}
          />
          <Path d="M178 50 L178 106" stroke={c('border')} strokeWidth={1.2} />
          <Rect x={110} y={80} width={5} height={14} rx={2} fill={c('destructive')} opacity={0.7} />
          <Circle cx={204} cy={114} r={22} fill={c('card')} />
          <Circle cx={204} cy={114} r={18} fill={c('foreground')} opacity={0.75} />
          <Circle cx={204} cy={114} r={8} fill={faceColor} />
          <Rect
            x={128}
            y={62}
            width={36}
            height={36}
            rx={8}
            fill={c('card')}
            stroke={c('border')}
            strokeWidth={1.5}
          />
          {face == null ? (
            <Circle
              testID="ev-plug-face-neutral"
              cx={FACE_X + FACE_SIZE / 2}
              cy={FACE_Y + FACE_SIZE / 2}
              r={FACE_SIZE / 2 - 2}
              fill="none"
              stroke={faceColor}
              strokeWidth={1.6}
            />
          ) : (
            <G
              testID={`ev-plug-face-${kind ?? ''}`}
              transform={`translate(${String(FACE_X)} ${String(FACE_Y)}) scale(${String(scale)})`}
            >
              <Path d={face.outline} fill="none" stroke={faceColor} strokeWidth={face.stroke} />
              {face.contacts.map((ct, i) =>
                ct.ring ? (
                  <Circle
                    key={i}
                    cx={ct.cx}
                    cy={ct.cy}
                    r={ct.r}
                    fill="none"
                    stroke={faceColor}
                    strokeWidth={ct.stroke}
                  />
                ) : (
                  <Circle key={i} cx={ct.cx} cy={ct.cy} r={ct.r} fill={faceColor} />
                ),
              )}
            </G>
          )}
        </Svg>
      </View>

      <Animated.View
        testID="ev-plug-light"
        pointerEvents="none"
        style={{ position: 'absolute', left: 0, top: 0, width: W, height: H, opacity: light }}
      >
        <Svg width={W} height={H} viewBox={`0 0 ${String(W)} ${String(H)}`}>
          <Rect
            x={124}
            y={58}
            width={44}
            height={44}
            rx={11}
            fill="none"
            stroke={c('success')}
            strokeWidth={3}
          />
        </Svg>
      </Animated.View>

      <Animated.View
        testID="ev-plug-handle"
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: W,
          height: H,
          transform: [
            { translateX: offset(PLUG_IN_OFFSET.x) },
            { translateY: offset(PLUG_IN_OFFSET.y) },
          ],
        }}
      >
        <Svg width={W} height={H} viewBox={`0 0 ${String(W)} ${String(H)}`}>
          <Path
            d="M66 126 C46 140 20 116 -10 124"
            fill="none"
            stroke={c('foreground')}
            strokeWidth={7}
            strokeLinecap="round"
            opacity={0.7}
          />
          <Path
            d="M72 120 L62 130"
            stroke={c('foreground')}
            strokeWidth={10}
            strokeLinecap="round"
            opacity={0.8}
          />
          <Path d="M96 88 L70 116 Q72 125 82 123 L110 95 Z" fill={c('primary')} opacity={0.9} />
          <Path
            d="M140 64 L104 64 C96 64 92 70 92 78 L92 82 C92 90 98 96 106 96 L140 96 Z"
            fill={c('primary')}
          />
          <Rect x={136} y={69} width={24} height={22} rx={5} fill={c('primary')} />
          <Path
            d="M100 64 Q118 54 136 64"
            fill="none"
            stroke={c('primary')}
            strokeWidth={4}
            strokeLinecap="round"
          />
          <Path
            d="M118 70 L112 80 L118 80 L113 90"
            fill="none"
            stroke={c('primaryForeground')}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      </Animated.View>
    </View>
  );
}
