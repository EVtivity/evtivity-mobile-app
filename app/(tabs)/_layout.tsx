// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

import React from 'react';
import { Tabs } from 'expo-router';
import { TabBar } from '@/components/TabBar';

export default function TabsLayout(): React.JSX.Element {
  return (
    <Tabs
      backBehavior="history"
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: '#0f172a' } }}
      tabBar={(props) => <TabBar {...props} />}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="charge" />
      <Tabs.Screen name="activity" />
      <Tabs.Screen name="reservations" />
      <Tabs.Screen name="account" />
      {/* Detail flows render inside the tab navigator so the bar stays visible,
          hidden from the bar itself via href: null. */}
      <Tabs.Screen name="session" options={{ href: null }} />
      <Tabs.Screen name="support" options={{ href: null }} />
      <Tabs.Screen name="favorites" options={{ href: null }} />
      <Tabs.Screen name="statement" options={{ href: null }} />
    </Tabs>
  );
}
