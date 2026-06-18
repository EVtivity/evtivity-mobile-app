// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

import React from 'react';
import { View } from 'react-native';

// Minimal portal so overlays (bottom sheets, dialogs) render at the app root
// instead of through react-native Modal, which renders blank / freezes on the
// New Architecture (Fabric/Bridgeless) on this RN version. PortalHost sits at
// the root as the last child so its content paints above the navigator;
// <Portal> mounts its children into the host from anywhere in the tree.

type Listener = () => void;

const nodes = new Map<number, React.ReactNode>();
const listeners = new Set<Listener>();
let counter = 0;

function emit(): void {
  listeners.forEach((l) => {
    l();
  });
}

export function PortalHost(): React.JSX.Element {
  const [, force] = React.useReducer((x: number) => x + 1, 0);
  React.useEffect(() => {
    listeners.add(force);
    return () => {
      listeners.delete(force);
    };
  }, []);
  return (
    <>
      {Array.from(nodes.entries()).map(([id, node]) => (
        <View
          key={id}
          pointerEvents="box-none"
          // No elevation: an elevated full-screen view casts an ambient edge
          // shadow that darkens the overlay's outer tint. zIndex stacks it above
          // the navigator without a shadow.
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 50 }}
        >
          {node}
        </View>
      ))}
    </>
  );
}

export function Portal({ children }: { children: React.ReactNode }): null {
  const idRef = React.useRef<number>(0);
  if (idRef.current === 0) idRef.current = ++counter;
  React.useEffect(() => {
    nodes.set(idRef.current, children);
    emit();
    return () => {
      nodes.delete(idRef.current);
      emit();
    };
  });
  return null;
}
