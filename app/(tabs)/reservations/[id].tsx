// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

import React from 'react';
import { View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { MapPin, Zap } from '@/components/icons';
import {
  Screen,
  Text,
  Card,
  Badge,
  Button,
  Spinner,
  EmptyState,
  BackButton,
  useToast,
  useConfirm,
} from '@/components/ui';
import { hsl } from '@/lib/theme';
import { formatDateTime, formatCurrency } from '@/lib/format';
import { apiErrorMessage } from '@/lib/api';
import { reservationStatusVariant } from '@/lib/status-variants';
import { useFeatures } from '@/features/app-info';
import {
  useReservation,
  useCancelReservation,
  type ReservationDetail,
} from '@/features/reservations';

const UPCOMING_STATUSES = new Set(['scheduled', 'active']);

// Joins the non-empty site address parts into a single readable line.
function addressLine(d: ReservationDetail): string | null {
  const parts = [d.siteAddress, d.siteCity, d.siteState].filter(
    (p) => p != null && p.trim().length > 0,
  );
  return parts.length > 0 ? parts.join(', ') : null;
}

function Row({ label, value }: { label: string; value: string }): React.JSX.Element {
  return (
    <View className="flex-row items-center justify-between">
      <Text variant="muted" className="text-sm">
        {label}
      </Text>
      <Text variant="title" className="text-sm">
        {value}
      </Text>
    </View>
  );
}

export default function ReservationDetailScreen(): React.JSX.Element {
  const { t } = useTranslation();
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const { id } = useLocalSearchParams<{ id: string }>();

  const reservation = useReservation(id ?? '');
  const cancel = useCancelReservation();
  const features = useFeatures();

  const data = reservation.data;

  const onCancel = async (): Promise<void> => {
    if (data == null) return;
    const feeCents = features.data?.reservationCancellationFeeCents ?? 0;
    const windowMin = features.data?.reservationCancellationWindowMinutes ?? 0;
    const currency = features.data?.currency ?? 'USD';
    const startMs = data.startsAt != null ? new Date(data.startsAt).getTime() : Date.now();
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
    try {
      await cancel.mutateAsync(data.id);
      toast.show(t('reservations.cancelled'), 'success');
      router.back();
    } catch (err) {
      toast.show(apiErrorMessage(err, t), 'error');
    }
  };

  return (
    <Screen scroll>
      <BackButton />
      {reservation.isLoading ? (
        <Spinner />
      ) : data == null ? (
        <EmptyState
          icon={<MapPin size={40} color={hsl('mutedForeground')} />}
          title={t('reservations.notFound')}
        />
      ) : (
        <View className="gap-4">
          <View className="flex-row items-start justify-between">
            <Text variant="h1" className="flex-1 pr-2">
              {data.stationOcppId}
            </Text>
            <Badge
              label={t(`reservations.status.${data.status}`, { defaultValue: data.status })}
              variant={reservationStatusVariant(data.status)}
            />
          </View>

          {data.siteName != null || addressLine(data) != null ? (
            <Card flat className="gap-1">
              {data.siteName != null ? (
                <View className="flex-row items-center gap-2">
                  <MapPin size={18} color={hsl('primary')} />
                  <Text variant="title">{data.siteName}</Text>
                </View>
              ) : null}
              {addressLine(data) != null ? (
                <Text variant="muted" className="text-sm">
                  {addressLine(data)}
                </Text>
              ) : null}
            </Card>
          ) : null}

          <Card flat className="gap-2">
            <Row
              label={t('reservations.starts')}
              value={formatDateTime(data.startsAt ?? data.createdAt)}
            />
            <Row label={t('reservations.expires')} value={formatDateTime(data.expiresAt)} />
            <Row label={t('reservations.created')} value={formatDateTime(data.createdAt)} />
            {data.evseId != null ? (
              <Row label={t('reservations.evse')} value={String(data.evseId)} />
            ) : null}
          </Card>

          {data.sessionId != null ? (
            <Card
              className="flex-row items-center justify-between"
              onPress={() =>
                router.push({ pathname: '/session/[id]', params: { id: data.sessionId ?? '' } })
              }
            >
              <View className="flex-row items-center gap-2">
                <Zap size={18} color={hsl('primary')} />
                <Text variant="title">{t('reservations.viewSession')}</Text>
              </View>
            </Card>
          ) : null}

          {UPCOMING_STATUSES.has(data.status) ? (
            <Button
              title={t('reservations.cancel')}
              variant="outline"
              loading={cancel.isPending}
              onPress={() => void onCancel()}
            />
          ) : null}
        </View>
      )}
    </Screen>
  );
}
