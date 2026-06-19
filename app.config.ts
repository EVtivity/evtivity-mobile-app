// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

import type { ConfigContext, ExpoConfig } from 'expo/config';
import { resolveBrand } from './brands/index';

// Dynamic Expo config. The active brand (ACTIVE_BRAND env, default "default")
// drives the app name, store identifiers, scheme, icons, and the API URL that
// is baked into the JS bundle as EXPO_PUBLIC_API_URL. Operators never edit this
// file; they add a brand under brands/ and set ACTIVE_BRAND.
export default ({ config }: ConfigContext): ExpoConfig => {
  const brand = resolveBrand();

  // iOS App Transport Security blocks plain HTTP to public hosts. When the API
  // URL is a cleartext remote (http, and not a localhost alias), allow that one
  // host. Derived from the API URL so the host is never duplicated.
  const apiHost =
    (process.env.EXPO_PUBLIC_API_URL ?? brand.apiUrl ?? '').match(/^http:\/\/([^/:]+)/i)?.[1] ?? '';
  const isLocalAlias = ['localhost', '127.0.0.1', '10.0.2.2'].includes(apiHost);
  const cleartextException =
    apiHost !== '' && !isLocalAlias
      ? { [apiHost]: { NSExceptionAllowsInsecureHTTPLoads: true, NSIncludesSubdomains: false } }
      : undefined;

  return {
    ...config,
    name: brand.name,
    slug: 'evtivity-mobile-app',
    scheme: brand.scheme,
    version: '0.1.0',
    orientation: 'portrait',
    icon: brand.icon,
    userInterfaceStyle: 'automatic',
    newArchEnabled: true,
    splash: {
      image: brand.splash,
      resizeMode: 'contain',
      backgroundColor: '#0f172a',
    },
    assetBundlePatterns: ['**/*'],
    ios: {
      bundleIdentifier: brand.iosBundleId,
      supportsTablet: true,
      infoPlist: {
        NSCameraUsageDescription: `${brand.name} uses the camera to scan charger QR codes.`,
        NSFaceIDUsageDescription: `${brand.name} uses Face ID to unlock the app and confirm payments.`,
        NSLocationWhenInUseUsageDescription: `${brand.name} uses your location to find nearby chargers.`,
        ITSAppUsesNonExemptEncryption: false,
        NSAppTransportSecurity: {
          NSAllowsLocalNetworking: true,
          ...(cleartextException != null ? { NSExceptionDomains: cleartextException } : {}),
        },
      },
    },
    android: {
      package: brand.androidPackage,
      adaptiveIcon: {
        foregroundImage: brand.adaptiveIcon,
        backgroundColor: '#0f172a',
      },
      permissions: [
        'CAMERA',
        'USE_BIOMETRIC',
        'USE_FINGERPRINT',
        'POST_NOTIFICATIONS',
        'ACCESS_COARSE_LOCATION',
        'ACCESS_FINE_LOCATION',
      ],
    },
    plugins: [
      'expo-router',
      'expo-asset',
      'expo-secure-store',
      'expo-local-authentication',
      'expo-notifications',
      [
        'expo-camera',
        {
          cameraPermission: `${brand.name} uses the camera to scan charger QR codes.`,
          // QR scanning needs video only; never request the microphone.
          microphonePermission: false,
          recordAudioAndroid: false,
        },
      ],
      // Props object is required: the Stripe config plugin destructures props
      // and crashes on a bare string. No wallet payments, so Google Pay stays off
      // and no Apple Pay merchant entitlement is added.
      ['@stripe/stripe-react-native', { enableGooglePay: false }],
      [
        './plugins/withAppAttest',
        { environment: process.env.EXPO_PUBLIC_APPATTEST_ENV ?? 'development' },
      ],
      // Disable adb backup and strip unused permissions on Android.
      './plugins/withAndroidSecurity',
      // Mirror the iOS cleartext exception on Android: allow HTTP when the API
      // host is a non-local cleartext remote, so release builds can reach it.
      ...(cleartextException != null ? ['./plugins/withAndroidCleartext'] : []),
    ],
    extra: {
      brand: {
        name: brand.name,
        slug: brand.slug,
        apiUrl: brand.apiUrl,
        colors: brand.colors,
        termsUrl: brand.termsUrl,
        privacyUrl: brand.privacyUrl,
        languages: brand.languages,
      },
      ...(brand.easProjectId ? { eas: { projectId: brand.easProjectId } } : {}),
    },
    experiments: { typedRoutes: true },
  };
};
