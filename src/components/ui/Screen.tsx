// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

import React from 'react';
import { View, ScrollView, RefreshControl } from 'react-native';
import { ImageBackground } from 'expo-image';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';
import { cn } from '@/lib/cn';
import { BACKDROP_TEXT_VARS } from '@/lib/theme';

const appBg = require('../../../assets/app-bg.jpg') as number;

// The branded green monogram backdrop with safe-area insets. Used by Screen and
// by custom layouts (e.g. the support chat) that cannot use Screen's body.
export function ScreenBackground({
  children,
  edges = ['top'],
}: {
  children: React.ReactNode;
  edges?: readonly Edge[];
}): React.JSX.Element {
  return (
    // expo-image keeps the decoded bitmap in its memory-disk cache, so the
    // backdrop is decoded once instead of per screen mount. The brand-dark
    // background paints behind it so there is no white flash during the first
    // decode.
    <ImageBackground
      source={appBg}
      contentFit="cover"
      cachePolicy="memory-disk"
      style={{ flex: 1, backgroundColor: '#0f172a' }}
    >
      <View style={BACKDROP_TEXT_VARS} className="flex-1">
        <SafeAreaView edges={edges} className="flex-1">
          {children}
        </SafeAreaView>
      </View>
    </ImageBackground>
  );
}

interface ScreenProps {
  children: React.ReactNode;
  scroll?: boolean;
  className?: string;
  edges?: readonly Edge[];
  refreshing?: boolean;
  onRefresh?: () => void;
  // Plain screens (camera, full-bleed) opt out of the branded backdrop.
  plain?: boolean;
}

// Standard screen wrapper: the branded green monogram backdrop with safe-area
// insets, optional scroll and pull-to-refresh. Content floats on the pattern in
// elevated cards. Page padding follows the css-spec portal override (16px).
export function Screen({
  children,
  scroll = false,
  className,
  edges = ['top'],
  refreshing,
  onRefresh,
  plain = false,
}: ScreenProps): React.JSX.Element {
  const body = scroll ? (
    <ScrollView
      contentContainerClassName={cn('px-4 py-4 gap-4', className)}
      keyboardShouldPersistTaps="handled"
      automaticallyAdjustKeyboardInsets
      showsVerticalScrollIndicator={false}
      refreshControl={
        onRefresh != null ? (
          <RefreshControl
            refreshing={refreshing ?? false}
            onRefresh={onRefresh}
            tintColor="#ffffff"
          />
        ) : undefined
      }
    >
      {children}
    </ScrollView>
  ) : (
    <View className={cn('flex-1 px-4 py-4', className)}>{children}</View>
  );

  if (plain) {
    return (
      <SafeAreaView edges={edges} className="flex-1 bg-background">
        {body}
      </SafeAreaView>
    );
  }

  return <ScreenBackground edges={edges}>{body}</ScreenBackground>;
}
