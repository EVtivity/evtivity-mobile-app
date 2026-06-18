// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

import React from 'react';
import { View, Pressable } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useLocalSearchParams, useRouter, Redirect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import {
  Zap,
  Pause,
  DollarSign,
  Clock,
  Leaf,
  MapPin,
  Car,
  Check,
  AlertTriangle,
  CalendarClock,
  LifeBuoy,
} from '@/components/icons';
import {
  Screen,
  Text,
  Button,
  Card,
  Spinner,
  EmptyState,
  Metric,
  Badge,
  ListRow,
  Sheet,
  BackButton,
  useToast,
  useConfirm,
} from '@/components/ui';
import { SessionCharts } from '@/components/charts/SessionCharts';
import { hsl } from '@/lib/theme';
import { sessionStatusTone, sessionStatusLabelKey, SESSION_TONE_COLOR } from '@/lib/status';
import {
  formatCurrency,
  formatEnergyWh,
  formatDuration,
  formatMiles,
  formatDateTime,
} from '@/lib/format';
import {
  useSession,
  useStopSession,
  useSetSessionVehicle,
  useSessionPowerHistory,
  useSessionEnergyHistory,
  type SessionDetail,
} from '@/features/sessions';
import { useVehicles } from '@/features/account';
import { notifyError } from '@/lib/haptics';
import type { ChargingSession, ConnectorStatus, Vehicle } from '@/lib/types';
import { apiErrorMessage } from '@/lib/api';

interface LiveSession extends ChargingSession {
  currentPowerW?: number | null;
  batteryPercent?: number | null;
  connectorStatus?: ConnectorStatus | null;
}

// The screen consumes both the live charging fields and the full detail shape.
type SessionData = LiveSession & SessionDetail;

function paymentVariant(
  status: string,
): 'success' | 'warning' | 'destructive' | 'info' | 'secondary' {
  switch (status) {
    case 'captured':
    case 'paid':
    case 'succeeded':
      return 'success';
    case 'pre_authorized':
    case 'pending':
    case 'processing':
      return 'info';
    case 'failed':
    case 'declined':
      return 'destructive';
    case 'refunded':
    case 'voided':
      return 'warning';
    default:
      return 'secondary';
  }
}

function vehicleLabel(v: { make: string | null; model: string | null; year: string | null }): string {
  const name = [v.make, v.model].filter((p) => p != null && p !== '').join(' ');
  return v.year != null && v.year !== '' ? `${name} (${v.year})` : name;
}

type PillTone = 'success' | 'warning' | 'destructive' | 'primary';

// Big centered status badge for every session state (Charging, Idle, Completed,
// Faulted), mirroring the driver portal. Pulses only while charging.
function StatusPill({
  label,
  icon,
  tone,
  pulse,
}: {
  label: string;
  icon: React.ReactNode;
  tone: PillTone;
  pulse: boolean;
}): React.JSX.Element {
  const scale = useSharedValue(1);
  React.useEffect(() => {
    if (!pulse) {
      scale.value = 1;
      return;
    }
    scale.value = withRepeat(
      withTiming(1.05, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, [scale, pulse]);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <Animated.View
      style={[style, { backgroundColor: SESSION_TONE_COLOR[tone] }]}
      className="flex-row items-center gap-2.5 self-center rounded-full px-7 py-3.5"
    >
      {icon}
      <Text weight="bold" className="text-xl text-white">
        {label}
      </Text>
    </Animated.View>
  );
}

function Row({ label, value }: { label: string; value: string }): React.JSX.Element {
  return (
    <View className="flex-row items-center justify-between gap-3">
      <Text variant="muted">{label}</Text>
      <Text variant="label" tabular className="flex-1 text-right">
        {value}
      </Text>
    </View>
  );
}

export default function SessionScreen(): React.JSX.Element {
  const { t } = useTranslation();
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const { id } = useLocalSearchParams<{ id: string }>();
  const sid = id ?? '';
  const session = useSession(sid);
  const stop = useStopSession();
  const setVehicle = useSetSessionVehicle(sid);
  const [stopping, setStopping] = React.useState(false);
  const [vehicleSheet, setVehicleSheet] = React.useState(false);
  const vehicles = useVehicles();

  const data = session.data as SessionData | undefined;
  const isActive = data?.status === 'active';

  const power = useSessionPowerHistory(sid, isActive === true);
  const energy = useSessionEnergyHistory(sid, isActive === true);

  // Tick once a second so the live duration counts up while charging.
  const [, setTick] = React.useState(0);
  React.useEffect(() => {
    if (isActive !== true) return;
    const h = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(h);
  }, [isActive]);

  const onStop = React.useCallback(async () => {
    const ok = await confirm({
      title: t('charge.stopTitle'),
      message: t('charge.stopMessage'),
      confirmText: t('charge.stop'),
      destructive: true,
    });
    if (!ok) return;
    setStopping(true);
    stop.mutate(sid, {
      onError: (err) => {
        setStopping(false);
        notifyError();
        toast.show(apiErrorMessage(err, t), 'error');
      },
    });
  }, [confirm, sid, stop, t, toast]);

  const onPickVehicle = React.useCallback(
    (vehicleId: string | null) => {
      setVehicleSheet(false);
      setVehicle.mutate(vehicleId, {
        onError: () => toast.show(t('charge.detail.vehicleUpdateFailed'), 'error'),
      });
    },
    [setVehicle, t, toast],
  );

  // The API only acks the stop request; the session actually ends after the
  // OCPP roundtrip. Hold the spinner until the polled status leaves 'active'.
  React.useEffect(() => {
    if (stopping && data != null && data.status !== 'active') setStopping(false);
  }, [stopping, data]);

  // Safety net: clear the spinner if the station never acks.
  React.useEffect(() => {
    if (!stopping) return;
    const h = setTimeout(() => {
      setStopping(false);
      toast.show(t('charge.stopTimeout'), 'error');
    }, 30_000);
    return () => clearTimeout(h);
  }, [stopping, toast, t]);

  if (id == null || id.length === 0) {
    return <Redirect href="/(tabs)" />;
  }

  if (session.isLoading) {
    return (
      <Screen>
        <Spinner />
      </Screen>
    );
  }

  if (session.isError || data == null) {
    return (
      <Screen>
        <EmptyState
          title={t('common.somethingWrong')}
          action={<Button title={t('common.retry')} onPress={() => void session.refetch()} />}
        />
      </Screen>
    );
  }

  const cost = isActive ? data.currentCostCents : data.finalCostCents;
  const chargingIdle =
    isActive &&
    (data.connectorStatus === 'idle' ||
      data.connectorStatus === 'suspended_ev' ||
      data.connectorStatus === 'suspended_evse' ||
      data.idleStartedAt != null);
  const isFaulted = data.status === 'failed' || (data.status as string) === 'faulted';
  // Big status pill, colored from the shared tone so it matches the sessions list.
  const pillTone: PillTone = sessionStatusTone(data.status, chargingIdle === true);
  const pillLabel = chargingIdle
    ? t('status.idle')
    : t(sessionStatusLabelKey(data.status), { defaultValue: data.status });
  const pillIcon = chargingIdle ? (
    <Pause size={24} color="#ffffff" />
  ) : isActive ? (
    <Zap size={24} color="#ffffff" />
  ) : isFaulted ? (
    <AlertTriangle size={24} color="#ffffff" />
  ) : (
    <Check size={24} color="#ffffff" />
  );
  const powerData = power.data ?? [];
  const energyData = energy.data ?? [];
  const hasChart = powerData.length > 0 || energyData.length > 0;

  const efficiency = data.vehicle?.efficiencyMiPerKwh ?? 3.5;
  const miles = formatMiles(data.energyDeliveredWh, efficiency);
  const address = [data.siteAddress, data.siteCity, data.siteState].filter(Boolean).join(', ');
  const vehicleList = vehicles.data ?? [];

  return (
    <Screen scroll>
      <BackButton />

      {/* Status + tappable mileage estimate (sets the vehicle for the estimate) */}
      <View className="items-center gap-2">
        <StatusPill tone={pillTone} icon={pillIcon} label={pillLabel} pulse={isActive} />

        <Pressable
          className="items-center active:opacity-70"
          onPress={() => setVehicleSheet(true)}
          accessibilityLabel={t('charge.detail.changeVehicle')}
        >
          {data.energyDeliveredWh != null ? (
            <Text variant="display" tabular>
              {miles}
            </Text>
          ) : null}
          <Text variant="muted" className="mt-0.5">
            {data.vehicle != null ? vehicleLabel(data.vehicle) : t('charge.detail.tapToSetVehicle')}
          </Text>
        </Pressable>

        {isActive && data.updatedAt != null ? (
          <Text className="text-xs text-muted-foreground">
            {t('charge.detail.lastUpdated', { time: formatDateTime(data.updatedAt) })}
          </Text>
        ) : null}
      </View>

      {/* Stats grid */}
      <View className="flex-row gap-3">
        <Metric
          tone="info"
          icon={<Clock size={18} color={hsl('info')} />}
          label={t('charge.live.duration')}
          value={formatDuration(data.startedAt, data.endedAt)}
        />
        <Metric
          tone="warning"
          icon={<DollarSign size={18} color={hsl('warning')} />}
          label={isActive ? t('charge.live.cost') : t('charge.detail.totalCost')}
          value={formatCurrency(cost, data.currency)}
        />
        <Metric
          tone="success"
          icon={<Zap size={18} color={hsl('success')} />}
          label={t('charge.live.energy')}
          value={formatEnergyWh(data.energyDeliveredWh)}
        />
      </View>

      {data.co2AvoidedKg != null ? (
        <Card className="flex-row items-center gap-3">
          <View className="h-11 w-11 items-center justify-center rounded-2xl bg-success/14">
            <Leaf size={22} color={hsl('success')} />
          </View>
          <View className="flex-1">
            <Text variant="overline">{t('charge.detail.co2')}</Text>
            <Text variant="h3" tabular>
              {t('charge.detail.co2Value', { value: data.co2AvoidedKg.toFixed(1) })}
            </Text>
          </View>
        </Card>
      ) : null}

      {isActive && hasChart ? (
        <SessionCharts
          powerData={powerData}
          energyData={energyData}
          currentPowerW={data.currentPowerW}
          energyDeliveredWh={data.energyDeliveredWh}
        />
      ) : null}

      {isActive ? (
        <Button
          title={stopping || stop.isPending ? t('charge.stopping') : t('charge.stop')}
          variant="destructive"
          loading={stopping || stop.isPending}
          onPress={() => void onStop()}
        />
      ) : null}

      {/* Station info */}
      <Card className="flex-row items-start gap-3">
        <MapPin size={20} color={hsl('mutedForeground')} />
        <View className="flex-1">
          <Text variant="title">{data.stationName ?? t('charge.detail.unknownStation')}</Text>
          {data.siteName != null ? <Text variant="muted">{data.siteName}</Text> : null}
          {address !== '' ? (
            <Text className="text-xs text-muted-foreground">{address}</Text>
          ) : null}
        </View>
      </Card>

      {data.reservationId != null ? (
        <Card className="py-0">
          <ListRow
            title={t('charge.detail.reservation')}
            left={
              <View className="h-9 w-9 items-center justify-center rounded-xl bg-muted">
                <CalendarClock size={18} color={hsl('mutedForeground')} />
              </View>
            }
            onPress={() =>
              router.push({
                pathname: '/reservations/[id]',
                params: { id: data.reservationId ?? '' },
              })
            }
          />
        </Card>
      ) : null}

      {/* Details */}
      <Card className="gap-3">
        <Text weight="semibold" className="text-sm text-muted-foreground">
          {t('charge.detail.details')}
        </Text>
        <Row label={t('charge.detail.started')} value={formatDateTime(data.startedAt)} />
        {data.endedAt != null ? (
          <Row label={t('charge.detail.ended')} value={formatDateTime(data.endedAt)} />
        ) : null}
        <Row label={t('charge.live.energy')} value={formatEnergyWh(data.energyDeliveredWh)} />
        {data.batteryPercent != null ? (
          <Row label={t('charge.detail.battery')} value={`${Math.round(data.batteryPercent)}%`} />
        ) : null}
        <Row
          label={isActive ? t('charge.live.cost') : t('charge.detail.totalCost')}
          value={formatCurrency(cost, data.currency)}
        />
        {data.stoppedReason != null ? (
          <Row label={t('charge.detail.stopReason')} value={data.stoppedReason} />
        ) : null}
        {data.token != null ? (
          <Row label={t('charge.detail.rfid')} value={data.token.idToken} />
        ) : null}
      </Card>

      {data.payment != null ? (
        <Card className="gap-3">
          <View className="flex-row items-center justify-between">
            <Text weight="semibold" className="text-sm text-muted-foreground">
              {t('charge.detail.payment')}
            </Text>
            <Badge label={data.payment.status} variant={paymentVariant(data.payment.status)} />
          </View>
          <Row
            label={t('charge.detail.preAuth')}
            value={formatCurrency(data.payment.preAuthAmountCents, data.payment.currency)}
          />
          <Row
            label={t('charge.detail.captured')}
            value={formatCurrency(data.payment.capturedAmountCents, data.payment.currency)}
          />
        </Card>
      ) : null}

      <Button
        title={t('charge.detail.reportIssue')}
        variant="outline"
        leftIcon={<LifeBuoy size={18} />}
        onPress={() => router.push({ pathname: '/support/new', params: { sessionId: sid } })}
      />

      <Sheet
        visible={vehicleSheet}
        onClose={() => setVehicleSheet(false)}
        title={t('charge.detail.changeVehicle')}
      >
        {vehicleList.length === 0 ? (
          <View className="gap-3">
            <Text variant="muted">{t('charge.detail.noVehicles')}</Text>
            <Button
              title={t('charge.detail.addVehicle')}
              onPress={() => {
                setVehicleSheet(false);
                router.push('/account');
              }}
            />
          </View>
        ) : (
          <View className="gap-2">
            <Card flat className="flex-row items-center gap-3" onPress={() => onPickVehicle(null)}>
              <Text className="flex-1 text-sm text-foreground">
                {t('charge.detail.clearVehicle')}
              </Text>
              {data.vehicle == null ? <Check size={18} color={hsl('primary')} /> : null}
            </Card>
            {vehicleList.map((v: Vehicle) => (
              <Card
                key={v.id}
                flat
                className="flex-row items-center gap-3"
                onPress={() => onPickVehicle(v.id)}
              >
                <Car size={20} color={hsl('primary')} />
                <Text className="flex-1 text-sm text-foreground">{vehicleLabel(v)}</Text>
                {data.vehicle?.id === v.id ? <Check size={18} color={hsl('primary')} /> : null}
              </Card>
            ))}
          </View>
        )}
      </Sheet>
    </Screen>
  );
}
