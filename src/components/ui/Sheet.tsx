// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

import React from 'react';
import { KeyboardAvoidingView, Platform, Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X } from '@/components/icons';
import { Text } from './Text';
import { CardSurface } from './surface';
import { Portal } from './Portal';
import { hsl, SURFACE_TEXT_VARS } from '@/lib/theme';

// Bottom sheet rendered through the root Portal (not react-native Modal, which
// renders blank / freezes on the New Architecture on this RN version). Backdrop
// tap and the X close it.
export function Sheet({
  visible,
  onClose,
  title,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}): React.JSX.Element | null {
  if (!visible) return null;
  return (
    <Portal>
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable className="flex-1 justify-end bg-black/50" onPress={onClose}>
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={SURFACE_TEXT_VARS}
            className="max-h-[85%] rounded-t-2xl bg-card"
          >
            <SafeAreaView edges={['bottom']}>
              <CardSurface>
                <View className="flex-row items-center justify-between border-b border-border px-4 py-4">
                  <Text variant="h3">{title ?? ''}</Text>
                  <Pressable accessibilityLabel="Close" onPress={onClose} hitSlop={12}>
                    <X size={22} color={hsl('mutedForeground')} />
                  </Pressable>
                </View>
                <View className="gap-4 p-4">{children}</View>
              </CardSurface>
            </SafeAreaView>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Portal>
  );
}
