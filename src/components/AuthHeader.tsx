// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

import React from 'react';
import { View } from 'react-native';
import { Text } from '@/components/ui';
import { BrandLogo } from '@/components/BrandLogo';
import { useBranding } from '@/features/app-info';
import { APP_NAME } from '@/lib/config';

// Auth-screen header: operator logo and company name from the CSMS branding,
// falling back to the bundled defaults until /v1/portal/branding loads. The
// optional title/subtitle mirror the portal's screen heading structure.
export function AuthHeader({
  title,
  subtitle,
}: {
  title?: string;
  subtitle?: string;
}): React.JSX.Element {
  const { data: branding } = useBranding();
  const name = branding?.name != null && branding.name !== '' ? branding.name : APP_NAME;

  return (
    <View className="items-center gap-3 pt-8 pb-6">
      <View className="flex-row items-center gap-3">
        <BrandLogo uri={branding?.logo} size={43} />
        <Text
          variant="h1"
          weight="bold"
          className="text-[34px]"
          style={{
            textShadowColor: 'rgba(0, 0, 0, 0.45)',
            textShadowOffset: { width: 0, height: 2 },
            textShadowRadius: 5,
          }}
        >
          {name}
        </Text>
      </View>
      {title != null ? (
        <Text variant="h2" weight="semibold" className="mt-3 text-center">
          {title}
        </Text>
      ) : null}
      {subtitle != null ? (
        <Text className="max-w-[300px] text-center text-base leading-relaxed text-foreground/70">
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}
