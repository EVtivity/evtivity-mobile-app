// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

import React from 'react';
import Svg, { Circle, Path } from 'react-native-svg';
import { plugInConnectorKind, plugInFace } from '@/lib/plug-in';

// A connector's face pictogram, from the generated copy of the CSMS faces the
// portal port cards and the plug-in animation draw; an unknown type shows a
// neutral round face. Decorative: the type label stands next to it.
export function ConnectorFaceIcon({
  type,
  color,
  size = 16,
}: {
  type: string | null;
  color: string;
  size?: number;
}): React.JSX.Element {
  const kind = plugInConnectorKind(type);
  const face = plugInFace(kind);
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      testID={`connector-face-${kind ?? 'neutral'}`}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {face == null ? (
        <Circle cx={8} cy={8} r={6.5} fill="none" stroke={color} strokeWidth={1.4} />
      ) : (
        <>
          <Path
            d={face.outline}
            fill="none"
            stroke={color}
            strokeWidth={face.stroke}
            strokeLinejoin="round"
          />
          {face.contacts.map((c, i) =>
            c.ring ? (
              <Circle
                key={i}
                cx={c.cx}
                cy={c.cy}
                r={c.r}
                fill="none"
                stroke={color}
                strokeWidth={c.stroke}
              />
            ) : (
              <Circle key={i} cx={c.cx} cy={c.cy} r={c.r} fill={color} />
            ),
          )}
        </>
      )}
    </Svg>
  );
}
