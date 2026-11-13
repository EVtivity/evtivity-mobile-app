// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

import React from 'react';
import { Tabs } from 'expo-router';
import { StackActions } from 'expo-router/react-navigation';
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
      {/* Support is entered from home, Account and push taps, never from the bar.
          Leaving it returns its stack to the list, so the next entry shows the
          list with back to where the driver came from, never a case below it.
          A blur listener, not popToTopOnBlur: that option pops only after the
          tab transition finishes, and a re-render during it skips the pop. */}
      <Tabs.Screen
        name="support"
        options={{ href: null }}
        listeners={({ navigation }) => ({
          blur: () => {
            const support = navigation
              .getState()
              .routes.find((r: { name: string }) => r.name === 'support');
            const stack = support?.state;
            if (stack?.key != null && (stack.index ?? 0) > 0) {
              navigation.dispatch({ ...StackActions.popToTop(), target: stack.key });
            }
          },
        })}
      />
      <Tabs.Screen name="favorites" options={{ href: null }} />
      <Tabs.Screen name="watching" options={{ href: null }} />
      <Tabs.Screen name="statement" options={{ href: null }} />
    </Tabs>
  );
}
