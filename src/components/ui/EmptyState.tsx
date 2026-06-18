// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

import React from 'react';
import { View } from 'react-native';
import { Text } from './Text';

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}): React.JSX.Element {
  return (
    <View className="items-center justify-center gap-3 px-6 py-14">
      {icon != null ? (
        <View className="mb-1 h-16 w-16 items-center justify-center rounded-full bg-muted">
          {icon}
        </View>
      ) : null}
      <Text variant="h3" className="text-center">
        {title}
      </Text>
      {description != null ? (
        <Text variant="muted" className="max-w-[280px] text-center leading-relaxed">
          {description}
        </Text>
      ) : null}
      {action != null ? <View className="mt-3">{action}</View> : null}
    </View>
  );
}
