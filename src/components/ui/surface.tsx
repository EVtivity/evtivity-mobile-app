// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

import React from 'react';

// Which surface text is currently sitting on. The branded green backdrop is
// 'background' (text renders light); white elevated surfaces (Card, Sheet) push
// 'card' so their text renders dark. Text reads this to pick its default color,
// so screens never have to hand-color titles for the dark backdrop.
export type Surface = 'background' | 'card';

export const SurfaceContext = React.createContext<Surface>('background');

export function useSurface(): Surface {
  return React.useContext(SurfaceContext);
}

export function CardSurface({ children }: { children: React.ReactNode }): React.JSX.Element {
  return <SurfaceContext.Provider value="card">{children}</SurfaceContext.Provider>;
}
