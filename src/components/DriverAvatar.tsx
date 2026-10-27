// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

import React from 'react';
import { View } from 'react-native';
import { Image } from 'expo-image';
import { SvgXml } from 'react-native-svg';
import { useTranslation } from 'react-i18next';
import { Text } from '@/components/ui';
import { checkedGeneratedAvatarSvg, initialsOf, type DriverAvatar as Avatar } from '@/lib/avatar';

// The driver's avatar: a generated one rendered on the device from the stored
// options (never SVG text from the server), the uploaded image, or initials.
export function DriverAvatar({
  avatar,
  firstName,
  lastName,
  size = 80,
}: {
  avatar: Avatar | null | undefined;
  firstName?: string | null;
  lastName?: string | null;
  size?: number;
}): React.JSX.Element {
  const { t } = useTranslation();
  const imageUrl = avatar?.kind === 'image' ? avatar.url : null;
  // The URL that failed to load: a new URL (a refetch, another upload) is tried again.
  const [failedUrl, setFailedUrl] = React.useState<string | null>(null);
  const imageFailed = imageUrl != null && failedUrl === imageUrl;

  const generated = avatar?.kind === 'generated' ? avatar : null;
  // Options off the allow-list render nothing: the avatar falls back to initials.
  const svg = React.useMemo(
    () =>
      generated != null
        ? checkedGeneratedAvatarSvg({
            style: 'avataaars',
            seed: generated.seed,
            options: generated.options,
          })
        : null,
    [generated],
  );
  const label = t('account.avatarAlt', { name: `${firstName ?? ''} ${lastName ?? ''}`.trim() });
  const frame = { width: size, height: size, borderRadius: size / 2 };

  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={label}
      testID="driver-avatar"
      style={frame}
      className="items-center justify-center overflow-hidden bg-muted"
    >
      {svg != null ? (
        <SvgXml xml={svg} width={size} height={size} />
      ) : imageUrl != null && !imageFailed ? (
        <Image
          source={{ uri: imageUrl }}
          // No disk or memory cache: a removed or replaced photo never shows again.
          cachePolicy="none"
          style={frame}
          contentFit="cover"
          onError={() => setFailedUrl(imageUrl)}
        />
      ) : (
        <Text weight="bold" className="text-muted-foreground" style={{ fontSize: size * 0.36 }}>
          {initialsOf(firstName, lastName)}
        </Text>
      )}
    </View>
  );
}
