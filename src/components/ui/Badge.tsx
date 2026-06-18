// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

import React from 'react';
import { View } from 'react-native';
import { Text } from './Text';
import { cn } from '@/lib/cn';

type Variant = 'default' | 'secondary' | 'success' | 'warning' | 'destructive' | 'info' | 'outline';

// Soft tinted pills: a low-opacity color wash with the same color text. A
// same-color hairline border keeps the pill shape visible even when the faint
// fill blends into the surface behind it.
const CONTAINER: Record<Variant, string> = {
  default: 'bg-primary/12 border border-primary/35',
  secondary: 'bg-muted border border-border',
  success: 'bg-success/14 border border-success/35',
  warning: 'bg-warning/16 border border-warning/40',
  destructive: 'bg-destructive/12 border border-destructive/35',
  info: 'bg-info/14 border border-info/35',
  outline: 'border border-border',
};

const LABEL: Record<Variant, string> = {
  default: 'text-primary',
  secondary: 'text-muted-foreground',
  success: 'text-success',
  warning: 'text-warning',
  destructive: 'text-destructive',
  info: 'text-info',
  outline: 'text-muted-foreground',
};

export function Badge({
  label,
  variant = 'default',
  className,
}: {
  label: string;
  variant?: Variant;
  className?: string;
}): React.JSX.Element {
  return (
    <View className={cn('self-start rounded-full px-2.5 py-1', CONTAINER[variant], className)}>
      <Text weight="semibold" className={cn('text-sm', LABEL[variant])}>
        {label}
      </Text>
    </View>
  );
}
