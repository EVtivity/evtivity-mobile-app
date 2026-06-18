// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

import React from 'react';
import { View } from 'react-native';
import Svg, { Rect, Line, Text as SvgText } from 'react-native-svg';
import { hsl } from '@/lib/theme';
import type { PopularTime } from '@/features/location';

const PAD = { left: 30, right: 10, top: 12, bottom: 22 };
const HOUR_TICKS = [0, 6, 12, 18, 23];

// Vertical bar chart of average sessions per hour for one day of week. Mirrors
// the portal's popular-times look, rebuilt for react-native-svg with the same
// primary series color and dashed gridlines as TrendAreaChart.
export function PopularTimesChart({
  times,
  height = 180,
}: {
  times: PopularTime[];
  height?: number;
}): React.JSX.Element {
  const [width, setWidth] = React.useState(0);

  const primary = hsl('primary');
  const muted = hsl('mutedForeground');
  const border = hsl('border');

  // Bucket by hour so missing hours render as zero-height gaps.
  const byHour = new Array<number>(24).fill(0);
  for (const tt of times) {
    if (tt.hour >= 0 && tt.hour < 24) byHour[tt.hour] = tt.avgSessions;
  }
  const rawMax = Math.max(0, ...byHour);
  const yMax = rawMax > 0 ? Math.ceil(rawMax) : 1;

  const chartW = Math.max(0, width - PAD.left - PAD.right);
  const chartH = height - PAD.top - PAD.bottom;
  const slot = chartW / 24;
  const barW = Math.max(1, slot * 0.62);

  const py = (v: number): number => PAD.top + (1 - Math.min(Math.max(v, 0), yMax) / yMax) * chartH;
  const yTicks = [0, yMax / 2, yMax];

  return (
    <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)} style={{ height }}>
      {width > 0 ? (
        <Svg width={width} height={height}>
          {yTicks.map((v, i) => {
            const y = py(v);
            return (
              <React.Fragment key={`y${i}`}>
                <Line
                  x1={PAD.left}
                  y1={y}
                  x2={width - PAD.right}
                  y2={y}
                  stroke={border}
                  strokeWidth={1}
                  strokeDasharray="3 5"
                />
                <SvgText
                  x={PAD.left - 6}
                  y={y + 4}
                  fontSize={10}
                  fill={muted}
                  textAnchor="end"
                  fontFamily="Inter_500Medium"
                >
                  {v % 1 === 0 ? v.toFixed(0) : v.toFixed(1)}
                </SvgText>
              </React.Fragment>
            );
          })}

          {byHour.map((v, h) => {
            const x = PAD.left + h * slot + (slot - barW) / 2;
            const top = py(v);
            const barH = Math.max(0, py(0) - top);
            return (
              <Rect
                key={`b${h}`}
                x={x}
                y={top}
                width={barW}
                height={barH}
                rx={2}
                fill={primary}
                opacity={v > 0 ? 0.9 : 0}
              />
            );
          })}

          {HOUR_TICKS.map((h, i) => (
            <SvgText
              key={`x${i}`}
              x={PAD.left + h * slot + slot / 2}
              y={height - 6}
              fontSize={10}
              fill={muted}
              textAnchor={i === 0 ? 'start' : i === HOUR_TICKS.length - 1 ? 'end' : 'middle'}
              fontFamily="Inter_500Medium"
            >
              {`${h}:00`}
            </SvgText>
          ))}
        </Svg>
      ) : null}
    </View>
  );
}
