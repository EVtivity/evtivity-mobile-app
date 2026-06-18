// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

import React from 'react';
import { Pressable, View } from 'react-native';
import { ChevronRight } from '@/components/icons';
import { Text } from './Text';
import { hsl } from '@/lib/theme';
import { cn } from '@/lib/cn';

// Tappable row for settings and list screens. Optional left icon, right accessory
// or chevron.
export function ListRow({
  title,
  subtitle,
  left,
  right,
  onPress,
  showChevron = true,
  className,
  testID,
}: {
  title: string;
  subtitle?: string;
  left?: React.ReactNode;
  right?: React.ReactNode;
  onPress?: () => void;
  showChevron?: boolean;
  className?: string;
  testID?: string;
}): React.JSX.Element {
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      disabled={onPress == null}
      className={cn('flex-row items-center gap-3 py-4', onPress != null && 'active:opacity-70', className)}
    >
      {left != null ? <View>{left}</View> : null}
      <View className="flex-1">
        <Text variant="title">{title}</Text>
        {subtitle != null ? <Text variant="muted">{subtitle}</Text> : null}
      </View>
      {right ?? (showChevron && onPress != null ? (
        <ChevronRight size={18} color={hsl('mutedForeground')} />
      ) : null)}
    </Pressable>
  );
}
