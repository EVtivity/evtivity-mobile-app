// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

import React from 'react';
import { View, Pressable } from 'react-native';
import { Text } from './Text';
import { cn } from '@/lib/cn';
import { SURFACE_TEXT_VARS } from '@/lib/theme';

// A single selectable pill.
export function Chip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}): React.JSX.Element {
  return (
    <Pressable
      onPress={onPress}
      style={SURFACE_TEXT_VARS}
      className={cn(
        'rounded-xl border px-4 py-2.5',
        active ? 'border-primary bg-primary/12' : 'border-border bg-card',
      )}
    >
      <Text weight="semibold" className={cn('text-sm', active ? 'text-primary' : 'text-foreground')}>
        {label}
      </Text>
    </Pressable>
  );
}

// A labelled, wrapping group of single-select chips.
export function ChipGroup<T extends string | number>({
  label,
  options,
  value,
  onSelect,
  emptyHint,
}: {
  label: string;
  options: { value: T; label: string }[];
  value: T;
  onSelect: (v: T) => void;
  emptyHint?: string;
}): React.JSX.Element {
  return (
    <View className="gap-2">
      <Text variant="label">{label}</Text>
      {options.length === 0 ? (
        <Text variant="muted">{emptyHint ?? ''}</Text>
      ) : (
        <View className="flex-row flex-wrap gap-2">
          {options.map((opt) => (
            <Chip
              key={String(opt.value)}
              label={opt.label}
              active={opt.value === value}
              onPress={() => onSelect(opt.value)}
            />
          ))}
        </View>
      )}
    </View>
  );
}
