// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

import React from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { LifeBuoy } from '@/components/icons';
import {
  Screen,
  Text,
  Card,
  Badge,
  AddButton,
  Spinner,
  EmptyState,
  BackButton,
} from '@/components/ui';
import { hsl } from '@/lib/theme';
import { formatDate } from '@/lib/format';
import { useSupportCases } from '@/features/support';
import { usePullToRefresh } from '@/lib/use-pull-to-refresh';
import { supportCaseStatusVariant } from '@/lib/status-variants';

export default function SupportListScreen(): React.JSX.Element {
  const { t } = useTranslation();
  const router = useRouter();
  const cases = useSupportCases();
  const { refreshing, onRefresh } = usePullToRefresh(() => cases.refetch());

  const items = cases.data ?? [];

  return (
    <Screen scroll refreshing={refreshing} onRefresh={onRefresh}>
      <BackButton />
      <Text variant="h1" className="mb-4">
        {t('support.title')}
      </Text>
      <AddButton title={t('support.newCase')} onPress={() => router.push('/support/new')} />

      {cases.isLoading ? (
        <Spinner />
      ) : items.length === 0 ? (
        <EmptyState
          icon={<LifeBuoy size={40} color={hsl('mutedForeground')} />}
          title={t('support.none')}
        />
      ) : (
        <View className="gap-3">
          {items.map((c) => (
            <Card
              key={c.id}
              testID={`support-case-${c.id}`}
              onPress={() => router.push({ pathname: '/support/[id]', params: { id: c.id } })}
              className="gap-2"
            >
              <View className="flex-row items-center justify-between">
                <Text className="text-sm text-muted-foreground">{c.caseNumber}</Text>
                <Badge
                  label={t(`support.status.${c.status}`, { defaultValue: c.status })}
                  variant={supportCaseStatusVariant(c.status)}
                />
              </View>
              <Text weight="medium" className="text-sm text-foreground" numberOfLines={1}>
                {c.subject}
              </Text>
              <View className="flex-row items-center justify-between">
                <Text className="text-xs text-muted-foreground">
                  {t(`support.categories.${c.category}`, { defaultValue: c.category })}
                </Text>
                <Text className="text-xs text-muted-foreground">{formatDate(c.updatedAt)}</Text>
              </View>
            </Card>
          ))}
        </View>
      )}
    </Screen>
  );
}
