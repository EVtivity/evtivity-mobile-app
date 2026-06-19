// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import Svg, { Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Home, PlugZap, CalendarClock, Activity, User, type LucideIcon } from '@/components/icons';
import { Text } from '@/components/ui';
import { useFeatures } from '@/features/app-info';
import { hsl, SURFACE_TEXT_VARS } from '@/lib/theme';
import { shadow } from '@/lib/shadow';
import { tapLight } from '@/lib/haptics';

interface TabItem {
  name: string;
  labelKey: string;
  icon: LucideIcon;
}

const ITEMS: TabItem[] = [
  { name: 'index', labelKey: 'tabs.home', icon: Home },
  { name: 'charge', labelKey: 'tabs.charge', icon: PlugZap },
  { name: 'activity', labelKey: 'tabs.activity', icon: Activity },
  { name: 'reservations', labelKey: 'tabs.reservations', icon: CalendarClock },
  { name: 'account', labelKey: 'tabs.account', icon: User },
];

// Tabs whose route is a nested stack; pressing them returns to the stack root.
const STACK_TABS = new Set(['charge', 'reservations', 'account']);

// Diagonal brand gradient (deep green to slate) painted behind the bar. Dark on
// both ends so the green active icon/label and the muted inactive ones keep
// contrast. pointerEvents none so taps fall through to the tab buttons.
function TabBarGradient(): React.JSX.Element {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Svg width="100%" height="100%">
        <Defs>
          <LinearGradient id="tabBarGradient" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor="#103a2c" />
            <Stop offset="1" stopColor="#0f172a" />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#tabBarGradient)" />
      </Svg>
    </View>
  );
}

// Custom bottom tab bar: a brand gradient surface with a tinted pill behind the
// active icon (filled when active), Inter labels, soft top elevation, and a
// light haptic on switch.
export function TabBar({ state, navigation }: BottomTabBarProps): React.JSX.Element {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { data: features } = useFeatures();
  const activeName = state.routes[state.index]?.name;

  // Hide the Reserve tab when the operator has the reservation feature off.
  // Default to shown until features load so it never flickers.
  const reservationEnabled = features?.reservationEnabled ?? true;
  const items = ITEMS.filter((item) => item.name !== 'reservations' || reservationEnabled);

  return (
    <View
      style={[shadow.lg, SURFACE_TEXT_VARS, { paddingBottom: Math.max(insets.bottom, 8) }]}
      className="relative flex-row overflow-hidden border-t border-white/15 px-1 pt-2"
    >
      <TabBarGradient />
      {items.map((item) => {
        const focused = activeName === item.name;
        const Icon = item.icon;
        return (
          <Pressable
            key={item.name}
            testID={`tab-${item.name}`}
            accessibilityRole="button"
            accessibilityState={focused ? { selected: true } : {}}
            onPress={() => {
              tapLight();
              // Always land on the tab's main screen: for stack tabs, target the
              // nested index so any open detail screen is popped off.
              if (STACK_TABS.has(item.name)) {
                navigation.navigate(item.name, { screen: 'index' });
              } else {
                navigation.navigate(item.name);
              }
            }}
            className="flex-1 items-center gap-1"
          >
            <View
              className={`h-8 w-14 items-center justify-center rounded-full ${focused ? 'bg-primary/12' : ''}`}
            >
              <Icon
                size={22}
                weight={focused ? 'fill' : 'regular'}
                color={focused ? hsl('primary') : hsl('mutedForeground')}
              />
            </View>
            <Text
              numberOfLines={1}
              weight={focused ? 'semibold' : 'medium'}
              className={`text-[10px] ${focused ? 'text-primary' : 'text-white/70'}`}
            >
              {t(item.labelKey)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
