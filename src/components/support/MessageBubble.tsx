// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

import React from 'react';
import { View } from 'react-native';
import { Text } from '@/components/ui';
import { useSurfaceTextVars } from '@/lib/theme';
import { cn } from '@/lib/cn';
import { formatDateTime } from '@/lib/format';
import type { SupportMessage } from '@/lib/types';

// A driver, operator or system message of a support case. Every bubble has an
// opaque background from the theme tokens with its paired text color, so the
// text keeps WCAG AA contrast over the branded backdrop in both color schemes.
export function MessageBubble({ message }: { message: SupportMessage }): React.JSX.Element {
  const surfaceVars = useSurfaceTextVars();
  if (message.senderType === 'system') {
    return (
      <View className="items-center py-1">
        <View
          testID={`support-message-bubble-${message.id}`}
          style={surfaceVars}
          className="rounded-full bg-muted px-3 py-1.5"
        >
          <Text className="text-xs text-foreground">{message.body}</Text>
        </View>
      </View>
    );
  }
  const isDriver = message.senderType === 'driver';
  return (
    <View className={cn('w-full', isDriver ? 'items-end' : 'items-start')}>
      <View
        style={isDriver ? undefined : surfaceVars}
        testID={`support-message-bubble-${message.id}`}
        className={cn('max-w-[80%] rounded-2xl px-4 py-2.5', isDriver ? 'bg-accent' : 'bg-muted')}
      >
        <Text
          className={cn(
            'text-base leading-relaxed',
            isDriver ? 'text-accent-foreground' : 'text-foreground',
          )}
        >
          {message.body}
        </Text>
      </View>
      <Text className="mt-1 px-1 text-xs text-muted-foreground">
        {formatDateTime(message.createdAt)}
      </Text>
    </View>
  );
}
