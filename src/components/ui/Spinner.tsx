// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { hsl } from '@/lib/theme';

export function Spinner({ size = 'large' }: { size?: 'small' | 'large' }): React.JSX.Element {
  return (
    <View
      accessibilityRole="progressbar"
      className="flex-1 items-center justify-center py-8"
    >
      <ActivityIndicator size={size} color={hsl('primary')} />
    </View>
  );
}
