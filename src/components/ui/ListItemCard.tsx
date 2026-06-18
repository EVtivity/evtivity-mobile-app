// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

import React from 'react';
import { View } from 'react-native';
import { Card } from './Card';
import { Text } from './Text';

interface ListItemCardProps {
  title: string;
  subtitle?: string;
  left?: React.ReactNode;
  right?: React.ReactNode;
  footer?: React.ReactNode;
  testID?: string;
}

// Standard list item for the account management screens (payment cards, vehicles,
// RFID tokens). A card row with an optional leading icon, title/subtitle, a
// trailing accessory, and an optional footer for actions. Centralizes the layout
// and padding so every managed list looks the same.
export function ListItemCard({
  title,
  subtitle,
  left,
  right,
  footer,
  testID,
}: ListItemCardProps): React.JSX.Element {
  return (
    <Card testID={testID} className="gap-3 p-5">
      <View className="flex-row items-center gap-3">
        {left != null ? left : null}
        <View className="flex-1">
          <Text variant="title">{title}</Text>
          {subtitle != null ? <Text variant="muted">{subtitle}</Text> : null}
        </View>
        {right ?? null}
      </View>
      {footer ?? null}
    </Card>
  );
}
