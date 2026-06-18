// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

import React from 'react';
import { View } from 'react-native';
import Svg, {
  Path,
  Line,
  Circle,
  Defs,
  LinearGradient,
  Stop,
  Text as SvgText,
} from 'react-native-svg';
import { hsl } from '@/lib/theme';

export interface ChartPoint {
  x: number; // epoch ms
  y: number;
}

const PAD = { left: 44, right: 14, top: 12, bottom: 26 };

// Smooth-ish area + line chart with three y gridlines, a few time ticks, and a
// glowing endpoint dot. Mirrors the portal's PowerChart/EnergyChart look,
// rebuilt for react-native-svg. The caller supplies the rounded yMax and the
// value/time formatters so energy and power share one renderer.
export function TrendAreaChart({
  points,
  color,
  yMax,
  height = 180,
  formatY,
  formatX,
}: {
  points: ChartPoint[];
  color: string;
  yMax: number;
  height?: number;
  formatY: (v: number) => string;
  formatX: (ms: number) => string;
}): React.JSX.Element {
  const [width, setWidth] = React.useState(0);

  const chartW = Math.max(0, width - PAD.left - PAD.right);
  const chartH = height - PAD.top - PAD.bottom;
  const muted = hsl('mutedForeground');
  const border = hsl('border');

  const xs = points.map((p) => p.x);
  const xMin = xs.length > 0 ? Math.min(...xs) : 0;
  const xMaxV = xs.length > 0 ? Math.max(...xs) : 1;
  const xSpan = xMaxV - xMin || 1;
  const safeMax = yMax > 0 ? yMax : 1;

  const px = (x: number): number => PAD.left + ((x - xMin) / xSpan) * chartW;
  const py = (v: number): number =>
    PAD.top + (1 - Math.min(Math.max(v, 0), safeMax) / safeMax) * chartH;

  const linePath =
    points.length > 0
      ? points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${px(p.x).toFixed(1)} ${py(p.y).toFixed(1)}`).join(' ')
      : '';
  const baseY = py(0);
  const areaPath =
    points.length > 1
      ? `${linePath} L ${px(points[points.length - 1]!.x).toFixed(1)} ${baseY.toFixed(1)} L ${px(points[0]!.x).toFixed(1)} ${baseY.toFixed(1)} Z`
      : '';

  const yTicks = [0, safeMax / 2, safeMax];
  const xTickVals =
    points.length > 1 ? [xMin, xMin + xSpan / 2, xMaxV] : points.length === 1 ? [xMin] : [];

  const last = points[points.length - 1];

  return (
    <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)} style={{ height }}>
      {width > 0 ? (
        <Svg width={width} height={height}>
          <Defs>
            <LinearGradient id="area" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={color} stopOpacity={0.22} />
              <Stop offset="1" stopColor={color} stopOpacity={0} />
            </LinearGradient>
          </Defs>

          {yTicks.map((v, i) => {
            const y = py(v);
            return (
              <React.Fragment key={`y${i}`}>
                <Line x1={PAD.left} y1={y} x2={width - PAD.right} y2={y} stroke={border} strokeWidth={1} strokeDasharray="3 5" />
                <SvgText x={PAD.left - 8} y={y + 4} fontSize={10} fill={muted} textAnchor="end" fontFamily="Inter_500Medium">
                  {formatY(v)}
                </SvgText>
              </React.Fragment>
            );
          })}

          {areaPath !== '' ? <Path d={areaPath} fill="url(#area)" /> : null}
          {linePath !== '' ? (
            <Path d={linePath} fill="none" stroke={color} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
          ) : null}

          {last != null ? (
            <>
              <Circle cx={px(last.x)} cy={py(last.y)} r={6} fill={color} opacity={0.18} />
              <Circle cx={px(last.x)} cy={py(last.y)} r={3.5} fill={color} />
            </>
          ) : null}

          {xTickVals.map((x, i) => (
            <SvgText
              key={`x${i}`}
              x={px(x)}
              y={height - 8}
              fontSize={10}
              fill={muted}
              textAnchor={i === 0 ? 'start' : i === xTickVals.length - 1 ? 'end' : 'middle'}
              fontFamily="Inter_500Medium"
            >
              {formatX(x)}
            </SvgText>
          ))}
        </Svg>
      ) : null}
    </View>
  );
}
