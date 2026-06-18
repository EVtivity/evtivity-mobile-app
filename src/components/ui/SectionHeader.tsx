// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

import React from 'react';
import { View } from 'react-native';
import { Text } from './Text';

// Consistent section title row with an optional trailing action (e.g. "View all").
export function SectionHeader({
  title,
  action,
}: {
  title: string;
  action?: React.ReactNode;
}): React.JSX.Element {
  return (
    <View className="flex-row items-center justify-between">
      <Text variant="h3">{title}</Text>
      {action ?? null}
    </View>
  );
}
