// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

import React from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { CalendarClock } from '@/components/icons';
import {
  Screen,
  Text,
  Card,
  Badge,
  Button,
  AddButton,
  Segmented,
  Spinner,
  EmptyState,
  useToast,
  useConfirm,
} from '@/components/ui';
import { AppHeader } from '@/components/AppHeader';
import { hsl } from '@/lib/theme';
import { formatDateTime, formatCurrency } from '@/lib/format';
import { apiErrorMessage } from '@/lib/api';
import { reservationStatusVariant } from '@/lib/status-variants';
import { useFeatures } from '@/features/app-info';
import {
  useReservations,
  useCancelReservation,
  type ReservationItem,
} from '@/features/reservations';
import { usePullToRefresh } from '@/lib/use-pull-to-refresh';

type Tab = 'upcoming' | 'past';

const UPCOMING_STATUSES = new Set(['scheduled', 'active']);

export default function ReservationsScreen(): React.JSX.Element {
  const { t } = useTranslation();
  const router = useRouter();
  const toast = useToast();

  const reservations = useReservations();
  const { refreshing, onRefresh } = usePullToRefresh(() => reservations.refetch());
  const cancel = useCancelReservation();
  const features = useFeatures();
  const confirm = useConfirm();

  const [tab, setTab] = React.useState<Tab>('upcoming');
  // Track which reservation is cancelling so only its button spins, not every
  // row's (the shared mutation isPending applies to the whole list otherwise).
  const [cancellingId, setCancellingId] = React.useState<string | null>(null);

  const all = reservations.data ?? [];
  const items = all.filter((r) =>
    tab === 'upcoming' ? UPCOMING_STATUSES.has(r.status) : !UPCOMING_STATUSES.has(r.status),
  );

  const onCancel = async (r: ReservationItem): Promise<void> => {
    const feeCents = features.data?.reservationCancellationFeeCents ?? 0;
    const windowMin = features.data?.reservationCancellationWindowMinutes ?? 0;
    const currency = features.data?.currency ?? 'USD';
    const startMs = r.startsAt != null ? new Date(r.startsAt).getTime() : Date.now();
    const minutesUntilStart = (startMs - Date.now()) / 60_000;
    const feeApplies = feeCents > 0 && minutesUntilStart < windowMin;
    const message = feeApplies
      ? t('reservations.cancelFeeWarning', { fee: formatCurrency(feeCents, currency) })
      : t('reservations.cancelMessage');

    const ok = await confirm({
      title: t('reservations.cancel'),
      message,
      confirmText: t('reservations.cancel'),
      destructive: true,
    });
    if (!ok) return;
    setCancellingId(r.id);
    try {
      await cancel.mutateAsync(r.id);
      toast.show(t('reservations.cancelled'), 'success');
    } catch (err) {
      toast.show(apiErrorMessage(err, t), 'error');
    } finally {
      setCancellingId(null);
    }
  };

  return (
    <Screen
      scroll
      refreshing={refreshing}
      onRefresh={onRefresh}
    >
      <AppHeader />
      <Text variant="h1">{t('reservations.title')}</Text>
      <AddButton title={t('reservations.new')} onPress={() => router.push('/reservations/new')} />

      <Segmented<Tab>
        value={tab}
        onChange={setTab}
        segments={[
          { value: 'upcoming', label: t('reservations.upcoming') },
          { value: 'past', label: t('reservations.past') },
        ]}
      />

      {reservations.isLoading ? (
        <Spinner />
      ) : items.length === 0 ? (
        <EmptyState
          icon={<CalendarClock size={40} color={hsl('mutedForeground')} />}
          title={t('reservations.none')}
        />
      ) : (
        <View className="gap-3">
          {items.map((r) => (
            <Card
              key={r.id}
              testID={`reservation-card-${r.id}`}
              className="gap-2"
              onPress={() => router.push({ pathname: '/reservations/[id]', params: { id: r.id } })}
            >
              <View className="flex-row items-start justify-between">
                <Text variant="h3" className="flex-1 pr-2">
                  {r.stationOcppId}
                </Text>
                <Badge
                  label={t(`reservations.status.${r.status}`, { defaultValue: r.status })}
                  variant={reservationStatusVariant(r.status)}
                />
              </View>
              <View className="gap-0.5">
                <Text className="text-sm text-muted-foreground">
                  {t('reservations.starts')}: {formatDateTime(r.startsAt ?? r.createdAt)}
                </Text>
                <Text className="text-sm text-muted-foreground">
                  {t('reservations.expires')}: {formatDateTime(r.expiresAt)}
                </Text>
              </View>
              {tab === 'upcoming' ? (
                <Button
                  title={t('reservations.cancel')}
                  variant="outline"
                  size="sm"
                  loading={cancel.isPending && cancellingId === r.id}
                  disabled={cancel.isPending && cancellingId !== r.id}
                  onPress={() => void onCancel(r)}
                  className="mt-1"
                />
              ) : null}
            </Card>
          ))}
        </View>
      )}
    </Screen>
  );
}
