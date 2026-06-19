// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

import React from 'react';
import { Pressable, View } from 'react-native';
import { Image } from 'expo-image';
import { useQuery } from '@tanstack/react-query';
import { ImageIcon } from '@/components/icons';
import { Spinner } from '@/components/ui';
import { hsl } from '@/lib/theme';
import { fetchImageDownloadUrl } from '@/features/location';

// Resolves a single location image's signed download URL lazily, then renders a
// rounded thumbnail. Tapping it reports the resolved URL up so the parent can
// open the full-screen viewer.
export function LocationImageThumb({
  siteId,
  imageId,
  onPress,
}: {
  siteId: string;
  imageId: number;
  onPress: (url: string) => void;
}): React.JSX.Element {
  const { data: url, isLoading } = useQuery({
    queryKey: ['location', siteId, 'image-url', imageId],
    queryFn: () => fetchImageDownloadUrl(siteId, imageId),
    enabled: siteId.length > 0,
    staleTime: 5 * 60 * 1000,
  });

  return (
    <Pressable
      accessibilityRole="imagebutton"
      disabled={url == null}
      onPress={() => {
        if (url != null) onPress(url);
      }}
      className="h-28 w-40 overflow-hidden rounded-xl bg-muted active:opacity-80"
    >
      {url != null ? (
        <Image
          source={{ uri: url }}
          contentFit="cover"
          cachePolicy="memory-disk"
          style={{ width: '100%', height: '100%' }}
        />
      ) : (
        <View className="h-full w-full items-center justify-center">
          {isLoading ? <Spinner /> : <ImageIcon size={22} color={hsl('mutedForeground')} />}
        </View>
      )}
    </Pressable>
  );
}
