// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

import React from 'react';
import { View, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { CameraView, useCameraPermissions } from 'expo-camera';
import type { Href } from 'expo-router';
import { X } from '@/components/icons';
import { Text, Button, Spinner } from '@/components/ui';
import { hsl } from '@/lib/theme';

// Station and connector ids are opaque tokens: letters, digits, and a few
// separators, bounded in length. Anything else in a scanned code is rejected
// rather than navigated to.
const ID_RE = /^[A-Za-z0-9._:-]{1,128}$/;

// Parses ".../charge/:stationId" or ".../charge/:stationId/:evseId" out of a
// scanned URL and returns the station detail route, preselecting the scanned
// connector via the `evseId` param when present. Returns null when the URL does
// not look like an EVtivity charging link.
function routeForScan(data: string): Href | null {
  const match = /\/charge\/([^/?#]+)(?:\/([^/?#]+))?/.exec(data);
  if (match == null) return null;
  try {
    const stationId = decodeURIComponent(match[1] ?? '');
    if (!ID_RE.test(stationId)) return null;
    const evseId = match[2] != null ? decodeURIComponent(match[2]) : null;
    if (evseId != null && ID_RE.test(evseId)) {
      return { pathname: '/charge/[stationId]', params: { stationId, evseId } };
    }
    return { pathname: '/charge/[stationId]', params: { stationId } };
  } catch {
    // Malformed percent-encoding in the scanned code: treat as not a charger
    // link rather than letting decodeURIComponent throw out of the scan handler.
    return null;
  }
}

export default function ScanScreen(): React.JSX.Element {
  const { t } = useTranslation();
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [error, setError] = React.useState<string | null>(null);
  const handledRef = React.useRef(false);

  const onScanned = React.useCallback(
    ({ data }: { data: string }) => {
      if (handledRef.current) return;
      const route = routeForScan(data);
      if (route == null) {
        setError(t('charge.scan.invalid'));
        return;
      }
      handledRef.current = true;
      router.replace(route);
    },
    [router, t],
  );

  if (permission == null) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <Spinner />
      </SafeAreaView>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center gap-4 bg-background px-6">
        <Text variant="h3" className="text-center">
          {t('charge.scan.permissionTitle')}
        </Text>
        <Text className="text-center text-sm text-muted-foreground">
          {t('charge.scan.permissionBody')}
        </Text>
        <Button title={t('charge.scan.grant')} onPress={() => void requestPermission()} />
        <Button title={t('common.back')} variant="outline" onPress={() => router.back()} />
      </SafeAreaView>
    );
  }

  return (
    <View className="flex-1 bg-black">
      <CameraView
        style={{ flex: 1 }}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={onScanned}
      />
      <SafeAreaView edges={['top']} className="absolute inset-x-0 top-0">
        <View className="flex-row items-center justify-between px-4 py-3">
          <Pressable
            accessibilityLabel={t('common.close')}
            onPress={() => router.back()}
            hitSlop={12}
            className="h-10 w-10 items-center justify-center rounded-full bg-black/50"
          >
            <X size={22} color="#ffffff" />
          </Pressable>
        </View>
      </SafeAreaView>
      <SafeAreaView edges={['bottom']} className="absolute inset-x-0 bottom-0">
        <View className="items-center gap-3 px-6 py-6">
          <Text weight="medium" className="text-center text-base text-white">
            {t('charge.scan.prompt')}
          </Text>
          {error != null ? (
            <>
              <View className="rounded-xl bg-destructive px-4 py-2">
                <Text weight="semibold" className="text-sm text-white">
                  {error}
                </Text>
              </View>
              <Button
                title={t('charge.scan.again')}
                variant="secondary"
                onPress={() => {
                  handledRef.current = false;
                  setError(null);
                }}
              />
            </>
          ) : null}
        </View>
      </SafeAreaView>
      <View pointerEvents="none" className="absolute inset-0 items-center justify-center">
        <View className="h-64 w-64 rounded-2xl border-2" style={{ borderColor: hsl('primary') }} />
      </View>
    </View>
  );
}
