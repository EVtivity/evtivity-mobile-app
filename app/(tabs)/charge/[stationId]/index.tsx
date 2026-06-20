// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

import React from 'react';
import { View, Pressable } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import {
  MapPin,
  AlertTriangle,
  CreditCard,
  Star,
  Check,
  User,
  Mail,
  Phone,
} from '@/components/icons';
import {
  Screen,
  Text,
  Button,
  Card,
  Spinner,
  EmptyState,
  Sheet,
  BackButton,
  useToast,
  useConfirm,
} from '@/components/ui';
import { ConnectorTile } from '@/components/ConnectorTile';
import { openEmail, openPhone } from '@/lib/safe-link';
import { hsl } from '@/lib/theme';
import { cn } from '@/lib/cn';
import { isStartable, isCableDetected, isEvseSelectable } from '@/lib/status';
import { useAuth } from '@/lib/auth';
import { PricingCard } from '@/components/PricingCard';
import {
  useStation,
  useStartCharging,
  usePricing,
  checkConnectorStatus,
  type StationEvse,
  type StationConnector,
} from '@/features/charge';
import { useIsFavorite, useToggleFavorite } from '@/features/favorites';
import { useIsWatching, useToggleWatch } from '@/features/station-watch';
import { usePaymentMethods, type PaymentCard } from '@/features/payments';
import { useActiveSessions } from '@/features/sessions';
import { apiErrorMessage } from '@/lib/api';

interface SelectedConnector {
  evseId: number;
  connector: StationConnector;
}

function firstStartableConnector(evse: StationEvse): StationConnector | undefined {
  return evse.connectors.find((c) => isStartable(c.status));
}

export default function StationDetailScreen(): React.JSX.Element {
  const { t } = useTranslation();
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const { stationId, evseId } = useLocalSearchParams<{ stationId: string; evseId?: string }>();
  const sid = stationId ?? '';
  const station = useStation(sid);
  const pricing = usePricing(sid);
  const favorite = useIsFavorite(sid);
  const toggleFavorite = useToggleFavorite();
  const watch = useIsWatching(sid);
  const toggleWatch = useToggleWatch();
  const paymentMethods = usePaymentMethods();
  const start = useStartCharging();
  const activeSessions = useActiveSessions();
  const currentDriverId = useAuth((s) => s.driver?.id ?? null);

  const [selected, setSelected] = React.useState<SelectedConnector | null>(null);
  const [warnVisible, setWarnVisible] = React.useState(false);
  const [checking, setChecking] = React.useState(false);
  const [cardSheetVisible, setCardSheetVisible] = React.useState(false);
  const [selectedCardId, setSelectedCardId] = React.useState<number | null>(null);

  const cards = paymentMethods.data ?? [];
  const selectedCard =
    cards.find((c) => c.id === selectedCardId) ??
    cards.find((c) => c.isDefault) ??
    cards[0] ??
    null;

  const cardLabel = (card: PaymentCard): string =>
    [
      `${card.cardBrand ?? t('charge.card')} ····${card.cardLast4 ?? '----'}`,
      card.isDefault ? t('charge.cardDefault') : null,
    ]
      .filter(Boolean)
      .join(' · ');

  // Preselect the connector from a scanned QR code (the `evseId` param) once the
  // station loads. Guarded so it runs once and never overrides a later manual tap.
  const preselectedRef = React.useRef(false);
  React.useEffect(() => {
    if (preselectedRef.current || evseId == null) return;
    const data = station.data;
    if (data == null) return;
    preselectedRef.current = true;
    const evse = data.evses.find((e) => e.evseId === Number(evseId));
    if (evse == null) return;
    // Only preselect a connector that can actually start and is not reserved by
    // another driver. An unavailable, reserved-by-other, or incompatible
    // connector is left unselected (not highlighted).
    const opts = {
      isOnline: data.isOnline,
      maintenanceActive: data.maintenance?.active === true,
      currentDriverId,
    };
    if (!isEvseSelectable(evse, opts)) return;
    const connector = firstStartableConnector(evse);
    if (connector != null) setSelected({ evseId: evse.evseId, connector });
  }, [evseId, station.data, currentDriverId]);

  // When exactly one connector at the station can start, select it automatically
  // so the driver can start without a tap. Runs only while nothing is selected,
  // so it never fights a manual choice or the QR preselection above.
  React.useEffect(() => {
    if (selected != null) return;
    const data = station.data;
    if (data == null) return;
    const opts = {
      isOnline: data.isOnline,
      maintenanceActive: data.maintenance?.active === true,
      currentDriverId,
    };
    const startable = data.evses
      .map((evse): SelectedConnector | null => {
        if (!isEvseSelectable(evse, opts)) return null;
        const connector = firstStartableConnector(evse);
        return connector != null ? { evseId: evse.evseId, connector } : null;
      })
      .filter((c): c is SelectedConnector => c != null);
    const [only] = startable;
    if (startable.length === 1 && only != null) setSelected(only);
  }, [selected, station.data, currentDriverId]);

  const onToggleFavorite = React.useCallback(() => {
    toggleFavorite.mutate({
      stationId: sid,
      favoriteId: favorite.data?.favoriteId ?? null,
      isFavorited: favorite.data?.isFavorite ?? false,
    });
  }, [toggleFavorite, sid, favorite.data]);

  const onToggleWatch = React.useCallback(async () => {
    const isWatching = watch.data?.isWatching === true;
    // Removing a watch is destructive (you stop being notified), so confirm it.
    // Arming a watch is not, so it stays a single tap.
    if (isWatching) {
      const ok = await confirm({
        title: t('watch.removeTitle'),
        message: t('watch.removeMessage'),
        confirmText: t('common.remove'),
        destructive: true,
      });
      if (!ok) return;
    }
    toggleWatch.mutate(
      {
        stationId: sid,
        watchId: watch.data?.watchId ?? null,
        isWatching: watch.data?.isWatching ?? false,
      },
      {
        onSuccess: () => {
          toast.show(isWatching ? t('watch.removed') : t('watch.added'), 'success');
        },
        onError: () => toast.show(t('watch.addFailed'), 'error'),
      },
    );
  }, [toggleWatch, sid, watch.data, toast, t, confirm]);

  const runStart = React.useCallback(
    (sel: SelectedConnector) => {
      start.mutate(
        {
          stationId: sid,
          evseId: sel.evseId,
          paymentMethodId: selectedCard?.id,
        },
        {
          onSuccess: ({ sessionId }) => {
            router.replace({ pathname: '/session/[id]', params: { id: sessionId } });
          },
          onError: (err) => {
            const msg = apiErrorMessage(err, t);
            toast.show(msg, 'error');
          },
        },
      );
    },
    [router, start, sid, selectedCard, t, toast],
  );

  const onStart = React.useCallback(async () => {
    if (selected == null) return;
    setChecking(true);
    try {
      const result = await checkConnectorStatus(sid, selected.evseId);
      if (result.error != null) {
        toast.show(result.error, 'error');
        return;
      }
      // No cable detected: prompt the driver to plug in, then retry. There is
      // no "start anyway" override (mirrors the portal).
      if (!isCableDetected(result.connectorStatus)) {
        setWarnVisible(true);
        return;
      }
      runStart(selected);
    } catch {
      toast.show(t('charge.statusCheckFailed'), 'error');
    } finally {
      setChecking(false);
    }
  }, [selected, sid, runStart, toast, t]);

  if (station.isLoading) {
    return (
      <Screen>
        <Spinner />
      </Screen>
    );
  }

  if (station.isError || station.data == null) {
    return (
      <Screen>
        <EmptyState
          title={t('common.somethingWrong')}
          action={<Button title={t('common.retry')} onPress={() => void station.refetch()} />}
        />
      </Screen>
    );
  }

  const data = station.data;
  const maintenanceActive = data.maintenance?.active === true;
  const starting = start.isPending || checking;
  const isFavorited = favorite.data?.isFavorite ?? false;
  const address = [data.siteAddress, data.siteCity, data.siteState].filter(Boolean).join(', ');
  const hasContact =
    data.siteContactName != null || data.siteContactEmail != null || data.siteContactPhone != null;

  // A driver may only run one session at a time. When one is already active on
  // another station, block starting here and point them to it instead of
  // letting the start request fail with SESSION_ALREADY_ACTIVE.
  const sessions = activeSessions.data ?? [];
  const otherActiveSession = sessions.find((s) => s.stationId !== sid);
  const hasActiveSession = sessions.length > 0 && sessions.every((s) => s.stationId !== sid);

  return (
    <Screen scroll edges={['top']}>
      <BackButton />

      <View className="flex-row items-start justify-between gap-2">
        <View className="flex-1 gap-1">
          <View className="flex-row items-center gap-2">
            <Text variant="h1">{data.stationId}</Text>
            {isFavorited ? <Star size={20} weight="fill" color={hsl('warning')} /> : null}
          </View>
          {data.siteName != null ? (
            <Text className="text-base text-muted-foreground">{data.siteName}</Text>
          ) : null}
        </View>
        <View className="flex-row items-center gap-1.5 pt-2">
          <View
            className={cn('h-2 w-2 rounded-full', data.isOnline ? 'bg-success' : 'bg-destructive')}
          />
          <Text weight="medium" className="text-sm text-foreground">
            {data.isOnline ? t('charge.online') : t('charge.offline')}
          </Text>
        </View>
      </View>

      {address !== '' ? (
        data.siteId != null ? (
          <Pressable
            testID="station-location"
            className="flex-row items-start gap-2 active:opacity-70"
            onPress={() =>
              router.push({ pathname: '/charge/location', params: { siteId: data.siteId ?? '' } })
            }
          >
            <MapPin size={16} color={hsl('primary')} />
            <Text className="flex-1 text-sm text-primary">{address}</Text>
          </Pressable>
        ) : (
          <View className="flex-row items-start gap-2">
            <MapPin size={16} color={hsl('mutedForeground')} />
            <Text className="flex-1 text-sm text-muted-foreground">{address}</Text>
          </View>
        )
      ) : null}

      {maintenanceActive ? (
        <Card className="flex-row items-center gap-3 border-warning">
          <AlertTriangle size={20} color={hsl('warning')} />
          <Text className="flex-1 text-sm text-foreground">
            {data.maintenance?.message ?? t('charge.maintenance')}
          </Text>
        </Card>
      ) : null}

      {hasContact ? (
        <Card className="gap-2">
          <Text weight="semibold" className="text-sm text-muted-foreground">
            {t('charge.siteContact')}
          </Text>
          {data.siteContactName != null ? (
            <View className="flex-row items-center gap-2">
              <User size={16} color={hsl('mutedForeground')} />
              <Text className="text-sm text-foreground">{data.siteContactName}</Text>
            </View>
          ) : null}
          {data.siteContactEmail != null ? (
            <Pressable
              className="flex-row items-center gap-2 active:opacity-70"
              onPress={() => openEmail(data.siteContactEmail)}
            >
              <Mail size={16} color={hsl('mutedForeground')} />
              <Text className="text-sm text-primary">{data.siteContactEmail}</Text>
            </Pressable>
          ) : null}
          {data.siteContactPhone != null ? (
            <Pressable
              className="flex-row items-center gap-2 active:opacity-70"
              onPress={() => openPhone(data.siteContactPhone)}
            >
              <Phone size={16} color={hsl('mutedForeground')} />
              <Text className="text-sm text-primary">{data.siteContactPhone}</Text>
            </Pressable>
          ) : null}
        </Card>
      ) : null}

      {pricing.data != null ? <PricingCard pricing={pricing.data} /> : null}

      {data.paymentEnabled && selectedCard != null && !hasActiveSession ? (
        <Card className="flex-row items-center gap-3">
          <CreditCard size={20} color={hsl('primary')} />
          <Text className="flex-1 text-sm text-foreground">{cardLabel(selectedCard)}</Text>
          <Pressable
            onPress={() => setCardSheetVisible(true)}
            hitSlop={10}
            className="active:opacity-70"
          >
            <Text weight="semibold" className="text-sm text-primary">
              {t('charge.changeCard')}
            </Text>
          </Pressable>
        </Card>
      ) : null}

      {hasActiveSession ? (
        <Card className="items-center gap-3 border-warning">
          <AlertTriangle size={28} color={hsl('warning')} />
          <Text className="text-center text-sm text-foreground">
            {t('charge.activeSessionWarning')}
          </Text>
          {otherActiveSession != null ? (
            <Button
              title={t('charge.viewActiveSession')}
              variant="outline"
              onPress={() =>
                router.push({
                  pathname: '/session/[id]',
                  params: { id: otherActiveSession.id },
                })
              }
            />
          ) : null}
        </Card>
      ) : (
        <>
          <Text className="text-sm text-muted-foreground">{t('charge.selectConnector')}</Text>
          <View className="flex-row flex-wrap gap-3">
            {data.evses.map((evse) => {
              const connector = firstStartableConnector(evse) ?? evse.connectors[0];
              if (connector == null) return null;
              const selectable = isEvseSelectable(evse, {
                isOnline: data.isOnline,
                maintenanceActive,
                currentDriverId,
              });
              const isSelected =
                selected?.evseId === evse.evseId &&
                selected.connector.connectorId === connector.connectorId;
              return (
                <ConnectorTile
                  key={evse.evseId}
                  connectorType={connector.connectorType}
                  maxPowerKw={connector.maxPowerKw}
                  maxCurrentAmps={connector.maxCurrentAmps}
                  status={connector.status}
                  port={evse.evseId}
                  selected={isSelected}
                  disabled={!selectable}
                  onPress={() => setSelected({ evseId: evse.evseId, connector })}
                />
              );
            })}
          </View>

          <Button
            title={starting ? t('charge.starting') : t('charge.start')}
            loading={starting}
            disabled={selected == null || maintenanceActive || !data.isOnline}
            onPress={() => void onStart()}
          />
        </>
      )}

      <Button
        title={isFavorited ? t('charge.removeFavorite') : t('charge.addFavorite')}
        variant="outline"
        loading={toggleFavorite.isPending}
        onPress={onToggleFavorite}
      />

      {!data.evses.some((e) => e.connectors.some((c) => c.status === 'available')) ? (
        <Button
          title={watch.data?.isWatching === true ? t('watch.watching') : t('watch.notifyWhenFree')}
          variant="outline"
          loading={toggleWatch.isPending}
          onPress={() => void onToggleWatch()}
        />
      ) : null}

      <Button
        title={t('charge.reportIssue')}
        variant="outline"
        onPress={() =>
          router.push({ pathname: '/support/new', params: { stationId: data.stationId } })
        }
      />

      <Sheet
        visible={warnVisible}
        onClose={() => setWarnVisible(false)}
        title={t('charge.evNotDetectedTitle')}
      >
        <Text className="text-sm text-muted-foreground">
          {t('charge.evNotDetectedDescription')}
        </Text>
        {data.isSimulator ? (
          <Card flat className="flex-row items-start gap-2">
            <AlertTriangle size={18} color={hsl('info')} />
            <Text className="flex-1 text-sm text-muted-foreground">
              {t('charge.simulatorPlugInHint')}
            </Text>
          </Card>
        ) : null}
        <Button title={t('common.ok')} onPress={() => setWarnVisible(false)} />
      </Sheet>

      <Sheet
        visible={cardSheetVisible}
        onClose={() => setCardSheetVisible(false)}
        title={t('charge.selectCard')}
      >
        <View className="gap-2">
          {cards.map((card: PaymentCard) => {
            const isActive = selectedCard?.id === card.id;
            return (
              <Card
                key={card.id}
                flat
                className="flex-row items-center gap-3"
                onPress={() => {
                  setSelectedCardId(card.id);
                  setCardSheetVisible(false);
                }}
              >
                <CreditCard size={20} color={hsl('primary')} />
                <Text className="flex-1 text-sm text-foreground">{cardLabel(card)}</Text>
                {isActive ? <Check size={18} color={hsl('primary')} /> : null}
              </Card>
            );
          })}
        </View>
      </Sheet>
    </Screen>
  );
}
