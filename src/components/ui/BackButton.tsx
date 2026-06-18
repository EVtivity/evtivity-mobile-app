// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

import React from 'react';
import { Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ChevronLeft } from '@/components/icons';
import { Text } from './Text';

// Shared back link for sub-screens. Lives on the branded backdrop, so the
// chevron and label are light. Keeps every screen's back affordance identical.
export function BackButton({ label }: { label?: string }): React.JSX.Element {
  const router = useRouter();
  const { t } = useTranslation();
  return (
    <Pressable
      testID="back-button"
      accessibilityRole="button"
      accessibilityLabel={label ?? t('common.back')}
      onPress={() => router.back()}
      hitSlop={12}
      className="-ml-1 mb-1 flex-row items-center self-start active:opacity-70"
    >
      <ChevronLeft size={28} color="#ffffff" />
      <Text variant="label" className="text-lg">
        {label ?? t('common.back')}
      </Text>
    </Pressable>
  );
}
