// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

import React from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { FileText } from '@/components/icons';
import {
  Screen,
  Text,
  Card,
  Badge,
  Button,
  Spinner,
  EmptyState,
  BackButton,
} from '@/components/ui';
import { hsl } from '@/lib/theme';
import { formatCurrency, formatDate } from '@/lib/format';
import { invoiceStatusVariant } from '@/lib/invoices';
import { useInvoices } from '@/features/account';
import { usePullToRefresh } from '@/lib/use-pull-to-refresh';

// The driver's invoices and credit notes, newest first: ordinary driver
// invoices and the member invoices a fleet addresses to the driver.
export default function InvoicesScreen(): React.JSX.Element {
  const { t } = useTranslation();
  const router = useRouter();
  const invoices = useInvoices();
  const { refreshing, onRefresh } = usePullToRefresh(() => invoices.refetch());

  const items = invoices.data?.pages.flatMap((p) => p.data) ?? [];

  return (
    <Screen scroll refreshing={refreshing} onRefresh={onRefresh}>
      <BackButton />
      <Text variant="h1" className="mb-4">
        {t('invoices.title')}
      </Text>

      {invoices.isLoading ? (
        <Spinner />
      ) : invoices.isError && items.length === 0 ? (
        <EmptyState
          icon={<FileText size={40} color={hsl('mutedForeground')} />}
          title={t('invoices.loadFailed')}
        />
      ) : items.length === 0 ? (
        <EmptyState
          icon={<FileText size={40} color={hsl('mutedForeground')} />}
          title={t('invoices.empty')}
        />
      ) : (
        <View className="gap-3">
          {items.map((inv) => (
            <Card
              key={inv.id}
              testID={`invoice-row-${inv.id}`}
              onPress={() =>
                router.push({ pathname: '/account/invoices/[id]', params: { id: inv.id } })
              }
              className="gap-2"
            >
              <View className="flex-row items-center justify-between gap-2">
                <Text weight="medium" className="flex-1 text-sm text-foreground" numberOfLines={1}>
                  {inv.kind === 'credit_note' ? t('invoices.creditNote') : t('invoices.invoice')}{' '}
                  {inv.invoiceNumber}
                </Text>
                <Badge
                  label={t(`invoices.status.${inv.status}`, { defaultValue: inv.status })}
                  variant={invoiceStatusVariant(inv.status)}
                />
              </View>
              {inv.viaFleetName != null ? (
                <Text className="text-xs text-muted-foreground" numberOfLines={1}>
                  {t('invoices.viaFleet', { fleet: inv.viaFleetName })}
                </Text>
              ) : null}
              <View className="flex-row items-center justify-between">
                <Text className="text-xs text-muted-foreground">
                  {formatDate(inv.issuedAt ?? inv.createdAt)}
                </Text>
                <Text testID={`invoice-row-total-${inv.id}`} variant="title" tabular>
                  {formatCurrency(inv.totalCents, inv.currency)}
                </Text>
              </View>
            </Card>
          ))}
          {invoices.hasNextPage ? (
            <Button
              testID="invoices-load-more"
              title={t('invoices.loadMore')}
              variant="outline"
              loading={invoices.isFetchingNextPage}
              onPress={() => void invoices.fetchNextPage()}
            />
          ) : null}
        </View>
      )}
    </Screen>
  );
}
