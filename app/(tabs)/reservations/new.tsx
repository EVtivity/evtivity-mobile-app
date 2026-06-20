// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

import React from 'react';
import { View, Pressable, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { MapPin } from '@/components/icons';
import {
  Screen,
  Text,
  Field,
  Button,
  Card,
  Badge,
  Chip,
  ChipGroup,
  Spinner,
  BackButton,
  useToast,
  useApiErrorToast,
} from '@/components/ui';
import { hsl } from '@/lib/theme';
import { useCreateReservation } from '@/features/reservations';
import { useSearchChargers, type SearchStation } from '@/features/charge';

const DURATION_OPTIONS = [30, 60, 120] as const;
const DATE_DAYS = 7; // Today plus the next six days.
const SLOT_MINUTES = 30; // Granularity of the time-slot list.
const MS_PER_MINUTE = 60_000;

// Midnight of `day`, expressed as ms since epoch.
function startOfDay(day: Date): number {
  const d = new Date(day);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export default function NewReservationScreen(): React.JSX.Element {
  const { t } = useTranslation();
  const router = useRouter();
  const toast = useToast();
  const showApiError = useApiErrorToast();
  const params = useLocalSearchParams<{ stationId?: string }>();
  const create = useCreateReservation();

  const locked = params.stationId != null;
  const [stationId, setStationId] = React.useState(params.stationId ?? '');
  const [search, setSearch] = React.useState('');
  // `now` true means an immediate window (no startsAt). Otherwise the start is
  // the selected day's midnight plus `slotMinutes`.
  const [now, setNow] = React.useState(true);
  const [dayOffset, setDayOffset] = React.useState(0);
  const [slotMinutes, setSlotMinutes] = React.useState(0);
  const [durationMinutes, setDurationMinutes] = React.useState<number>(60);

  const results = useSearchChargers(search);

  // The seven selectable days, anchored to local midnight.
  const days = React.useMemo(() => {
    const base = startOfDay(new Date());
    return Array.from({ length: DATE_DAYS }, (_, i) => base + i * 24 * 60 * MS_PER_MINUTE);
  }, []);

  // 30-minute slots for the chosen day. Past slots on today are excluded.
  const slots = React.useMemo(() => {
    const nowMs = Date.now();
    const dayMs = days[dayOffset] ?? startOfDay(new Date());
    const result: number[] = [];
    for (let m = 0; m < 24 * 60; m += SLOT_MINUTES) {
      if (dayMs + m * MS_PER_MINUTE > nowMs) result.push(m);
    }
    return result;
  }, [days, dayOffset]);

  const startMs = now ? Date.now() : (days[dayOffset] ?? 0) + slotMinutes * MS_PER_MINUTE;
  const startInFuture = now || startMs > Date.now();

  const dayLabel = (dayMs: number, index: number): string => {
    if (index === 0) return t('reservations.today');
    return new Date(dayMs).toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' });
  };

  const slotLabel = (m: number): string => {
    const dayMs = days[dayOffset] ?? 0;
    return new Date(dayMs + m * MS_PER_MINUTE).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const onSubmit = async (): Promise<void> => {
    const trimmed = stationId.trim();
    if (trimmed.length === 0 || !startInFuture) return;

    const expiresMs = startMs + durationMinutes * MS_PER_MINUTE;

    const input = {
      stationId: trimmed,
      expiresAt: new Date(expiresMs).toISOString(),
      ...(now ? {} : { startsAt: new Date(startMs).toISOString() }),
    };

    try {
      await create.mutateAsync(input);
      toast.show(t('reservations.new'), 'success');
      router.back();
    } catch (err) {
      showApiError(err);
    }
  };

  return (
    <Screen scroll>
      <BackButton />
      <Text variant="h1" className="mb-4">
        {t('reservations.new')}
      </Text>

      {locked ? (
        <Field label={t('reservations.station')} value={stationId} editable={false} />
      ) : stationId !== '' ? (
        <View className="gap-2">
          <Text variant="label">{t('reservations.station')}</Text>
          <Card flat className="flex-row items-center justify-between">
            <View className="flex-1 flex-row items-center gap-2 pr-2">
              <MapPin size={18} color={hsl('primary')} />
              <Text variant="title">{stationId}</Text>
            </View>
            <Button
              title={t('common.search')}
              variant="ghost"
              size="sm"
              onPress={() => setStationId('')}
            />
          </Card>
        </View>
      ) : (
        <View className="gap-2">
          <Field
            testID="reservation-station"
            label={t('reservations.station')}
            value={search}
            onChangeText={setSearch}
            placeholder={t('charge.searchPlaceholder')}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {results.isFetching ? (
            <Spinner />
          ) : search.trim() !== '' && (results.data?.length ?? 0) === 0 ? (
            <Text variant="muted">{t('charge.noResults')}</Text>
          ) : (
            <View className="gap-2">
              {(results.data ?? []).map((s: SearchStation) => (
                <Pressable
                  key={s.stationId}
                  onPress={() => {
                    setStationId(s.stationId);
                    setSearch('');
                  }}
                >
                  <Card flat className="flex-row items-center justify-between">
                    <View className="flex-1 pr-2">
                      <Text variant="title">{s.stationId}</Text>
                      {s.siteName != null ? <Text variant="muted">{s.siteName}</Text> : null}
                    </View>
                    <Badge
                      label={s.isOnline ? t('reservations.online') : t('reservations.offline')}
                      variant={s.isOnline ? 'success' : 'secondary'}
                    />
                  </Card>
                </Pressable>
              ))}
            </View>
          )}
        </View>
      )}

      <View className="gap-2">
        <Text variant="label">{t('reservations.starts')}</Text>
        <View className="flex-row flex-wrap gap-2">
          <Chip label={t('reservations.now')} active={now} onPress={() => setNow(true)} />
          <Chip
            label={t('reservations.schedule')}
            active={!now}
            onPress={() => {
              setNow(false);
              setSlotMinutes(slots[0] ?? 0);
            }}
          />
        </View>
      </View>

      {now ? null : (
        <>
          <View className="gap-2">
            <Text variant="label">{t('reservations.date')}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View className="flex-row gap-2">
                {days.map((dayMs, i) => (
                  <Chip
                    key={dayMs}
                    label={dayLabel(dayMs, i)}
                    active={i === dayOffset}
                    onPress={() => {
                      setDayOffset(i);
                      setSlotMinutes(0);
                    }}
                  />
                ))}
              </View>
            </ScrollView>
          </View>

          <View className="gap-2">
            <Text variant="label">{t('reservations.time')}</Text>
            {slots.length === 0 ? (
              <Text variant="muted">{t('reservations.noSlots')}</Text>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View className="flex-row gap-2">
                  {slots.map((m) => (
                    <Chip
                      key={m}
                      label={slotLabel(m)}
                      active={m === slotMinutes}
                      onPress={() => setSlotMinutes(m)}
                    />
                  ))}
                </View>
              </ScrollView>
            )}
          </View>
        </>
      )}

      <ChipGroup
        label={t('reservations.duration')}
        value={durationMinutes}
        onSelect={setDurationMinutes}
        options={DURATION_OPTIONS.map((m) => ({
          value: m,
          label: t('reservations.minutes', { count: m }),
        }))}
      />

      <Button
        testID="reservation-submit"
        title={t('common.confirm')}
        loading={create.isPending}
        disabled={stationId.trim().length === 0 || !startInFuture}
        onPress={() => void onSubmit()}
        className="mt-2"
      />
    </Screen>
  );
}
