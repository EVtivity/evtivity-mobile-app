// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

import React from 'react';
import { View, Pressable } from 'react-native';
import { Text } from './Text';
import { cn } from '@/lib/cn';
import { shadow } from '@/lib/shadow';
import { SURFACE_TEXT_VARS } from '@/lib/theme';
import { tapLight } from '@/lib/haptics';

interface Segment<T extends string> {
  value: T;
  label: string;
}

export function Segmented<T extends string>({
  segments,
  value,
  onChange,
}: {
  segments: Segment<T>[];
  value: T;
  onChange: (value: T) => void;
}): React.JSX.Element {
  return (
    <View style={SURFACE_TEXT_VARS} className="flex-row rounded-xl bg-muted p-1">
      {segments.map((s) => {
        const active = s.value === value;
        return (
          <Pressable
            key={s.value}
            onPress={() => {
              if (!active) tapLight();
              onChange(s.value);
            }}
            style={active ? shadow.sm : undefined}
            className={cn('flex-1 items-center rounded-lg py-2.5', active && 'bg-primary')}
          >
            <Text
              weight={active ? 'semibold' : 'medium'}
              className={cn('text-sm', active ? 'text-primary-foreground' : 'text-muted-foreground')}
            >
              {s.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
