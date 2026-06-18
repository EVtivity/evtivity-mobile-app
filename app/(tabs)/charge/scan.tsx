// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

import React from 'react';
import { View, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import type { Href } from 'expo-router';
import { X } from '@/components/icons';
import { Text, Button, Spinner } from '@/components/ui';
import { hsl } from '@/lib/theme';

// Parses ".../charge/:stationId" or ".../charge/:stationId/:evseId" out of a
// scanned URL and returns the station detail route, preselecting the scanned
// connector via the `evseId` param when present. Returns null when the URL does
// not look like an EVtivity charging link.
function routeForScan(data: string): Href | null {
  const match = /\/charge\/([^/?#]+)(?:\/([^/?#]+))?/.exec(data);
  if (match == null) return null;
  const stationId = decodeURIComponent(match[1] ?? '');
  if (stationId.length === 0) return null;
  const evseId = match[2] != null ? decodeURIComponent(match[2]) : null;
  if (evseId != null && evseId.length > 0) {
    return { pathname: '/charge/[stationId]', params: { stationId, evseId } };
  }
  return { pathname: '/charge/[stationId]', params: { stationId } };
}

export default function ScanScreen(): React.JSX.Element {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [error, setError] = React.useState<string | null>(null);
  const handledRef = React.useRef(false);

  const onScanned = React.useCallback(
    ({ data }: { data: string }) => {
      if (handledRef.current) return;
      const route = routeForScan(data);
      if (route == null) {
        setError('That QR code is not an EVtivity charger.');
        return;
      }
      handledRef.current = true;
      router.replace(route);
    },
    [router],
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
          Camera access needed
        </Text>
        <Text className="text-center text-sm text-muted-foreground">
          Allow camera access to scan a charger QR code.
        </Text>
        <Button title="Grant access" onPress={() => void requestPermission()} />
        <Button title="Back" variant="outline" onPress={() => router.back()} />
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
            accessibilityLabel="Close"
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
            Point your camera at the charger QR code
          </Text>
          {error != null ? (
            <View className="rounded-xl bg-destructive px-4 py-2">
              <Text weight="semibold" className="text-sm text-white">{error}</Text>
            </View>
          ) : null}
          {error != null ? (
            <Button
              title="Scan again"
              variant="secondary"
              onPress={() => {
                handledRef.current = false;
                setError(null);
              }}
            />
          ) : null}
        </View>
      </SafeAreaView>
      <View pointerEvents="none" className="absolute inset-0 items-center justify-center">
        <View
          className="h-64 w-64 rounded-2xl border-2"
          style={{ borderColor: hsl('primary') }}
        />
      </View>
    </View>
  );
}
