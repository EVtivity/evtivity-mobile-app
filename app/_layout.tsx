// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

import '../global.css';

import React from 'react';
import { AppState } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClientProvider } from '@tanstack/react-query';
import { Stack, usePathname, useRouter, useSegments } from 'expo-router';
import { openRoute, pushTarget, type PushData } from '@/lib/push-route';
import { StatusBar } from 'expo-status-bar';
import * as Notifications from 'expo-notifications';
import * as SplashScreen from 'expo-splash-screen';

import { queryClient } from '@/lib/query';
import { ThemeProvider } from '@/lib/theme';
import { applyDriverUiTheme, useUiTheme } from '@/lib/ui-theme';
import { ToastProvider, ConfirmProvider, PortalHost, Spinner } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { bootstrapLanguage, applyDriverLanguage } from '@/lib/i18n';
import { registerPushToken } from '@/lib/push';
import { useAppFonts } from '@/lib/fonts';
import { BiometricLock } from '@/components/BiometricLock';
import { AnimatedSplash } from '@/components/AnimatedSplash';

// Keep the native splash up until the animated splash overlay has drawn its
// first frame, so the brand mark never flashes to a blank screen on launch.
void SplashScreen.preventAutoHideAsync();

// Redirect between the auth group and the app based on session status.
function useAuthRedirect(): void {
  const status = useAuth((s) => s.status);
  const segments = useSegments();
  const router = useRouter();

  React.useEffect(() => {
    if (status === 'loading') return;
    const inAuthGroup = segments[0] === '(auth)';
    if (status === 'unauthenticated' && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (status === 'authenticated' && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [status, segments, router]);
}

function RootNavigator(): React.JSX.Element {
  const hydrate = useAuth((s) => s.hydrate);
  const status = useAuth((s) => s.status);
  const locked = useAuth((s) => s.locked);
  const biometricEnabled = useAuth((s) => s.biometricEnabled);
  const lock = useAuth((s) => s.lock);
  const driverLanguage = useAuth((s) => s.driver?.language);
  const driverUiTheme = useAuth((s) => s.driver?.uiTheme);
  const router = useRouter();

  React.useEffect(() => {
    void hydrate();
  }, [hydrate]);

  // Re-arm the biometric gate whenever the app leaves the foreground, so a
  // resume always re-prompts instead of exposing the session from the switcher.
  React.useEffect(() => {
    if (!biometricEnabled) return;
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'background' || next === 'inactive') lock();
    });
    return () => sub.remove();
  }, [biometricEnabled, lock]);

  // Apply a previously stored language choice on launch.
  React.useEffect(() => {
    void bootstrapLanguage();
  }, []);

  // Adopt the driver's server-side language preference once their profile loads,
  // unless they have made an explicit local choice.
  React.useEffect(() => {
    void applyDriverLanguage(driverLanguage);
  }, [driverLanguage]);

  // Adopt the account's theme once the profile loads (an older API without the
  // field keeps the device's copy).
  React.useEffect(() => {
    applyDriverUiTheme(driverUiTheme);
  }, [driverUiTheme]);

  // Route to the relevant area when the user taps a push notification.
  const pathname = usePathname();
  React.useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      openRoute(
        router,
        pushTarget(response.notification.request.content.data as PushData),
        pathname,
      );
    });
    return () => sub.remove();
  }, [router, pathname]);

  // Register for push once authenticated and unlocked.
  React.useEffect(() => {
    if (status === 'authenticated' && !locked) {
      void registerPushToken().catch(() => undefined);
    }
  }, [status, locked]);

  useAuthRedirect();

  if (status === 'loading') return <Spinner />;
  if (status === 'authenticated' && locked) return <BiometricLock />;

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#0f172a' } }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
    </Stack>
  );
}

export default function RootLayout(): React.JSX.Element {
  const [animDone, setAnimDone] = React.useState(false);
  // Keep the splash up until Inter is ready. Referencing fontsReady here
  // re-renders the tree the moment fonts finish, so text that mounted before the
  // font loaded repaints instead of staying blank.
  const fontsReady = useAppFonts();
  // Stable identity so AnimatedSplash's effect doesn't restart its animations on
  // every root re-render.
  const onSplashFinish = React.useCallback(() => setAnimDone(true), []);
  // The device's copy of the theme is read before the splash goes, so the first
  // screen already renders in the driver's theme (no flash of Default).
  const themeLoaded = useUiTheme((s) => s.loaded);
  const loadTheme = useUiTheme((s) => s.load);
  React.useEffect(() => {
    void loadTheme();
  }, [loadTheme]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider>
            <ToastProvider>
              <ConfirmProvider>
                <StatusBar style="light" />
                <RootNavigator />
                <PortalHost />
              </ConfirmProvider>
            </ToastProvider>
          </ThemeProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
      {animDone && fontsReady && themeLoaded ? null : <AnimatedSplash onFinish={onSplashFinish} />}
    </GestureHandlerRootView>
  );
}
