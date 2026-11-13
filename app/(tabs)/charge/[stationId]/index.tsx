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
  Building,
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
import { PricingCard } from '@/components/PricingCard';
import { EvPlugAnimation } from '@/components/EvPlugAnimation';
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
import { usePriceDisplay } from '@/features/price-display';
import { useDriverBilling } from '@/features/account';
import { accountBillingAt } from '@/lib/fleet-billing';
import { connectorTileTestId } from '@/lib/test-ids';
import { scannedEvseId, visibleEvses } from '@/lib/connector-focus';
import { chargerEvses, chargerGroups, chargerView, unitOfEvse } from '@/lib/station-units';
import { useSupportEnabled } from '@/features/app-info';
import { ApiError, apiErrorMessage } from '@/lib/api';

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
  // `unit` opens one unit (charger box) of a station with units, or its EVSEs
  // without a unit (NO_UNIT_PARAM). A station without units ignores it.
  const { stationId, evseId, unit } = useLocalSearchParams<{
    stationId: string;
    evseId?: string;
    unit?: string;
  }>();
  const sid = stationId ?? '';
  const station = useStation(sid);
  const pricing = usePricing(sid);
  const priceDisplay = usePriceDisplay();
  const toggleFavorite = useToggleFavorite();
  const toggleWatch = useToggleWatch();
  const paymentMethods = usePaymentMethods();
  const refetchCards = paymentMethods.refetch;
  const start = useStartCharging();
  const activeSessions = useActiveSessions();
  const driverBilling = useDriverBilling();
  // Charge on account: the fleet pays, so no card is shown or sent.
  const accountBilling = accountBillingAt(pricing.data, driverBilling);
  const fleetName = accountBilling?.fleetName ?? null;
  const memberBilled = accountBilling?.invoicedTo === 'member';

  const supportEnabled = useSupportEnabled();

  // The driver's explicit connector tap; null until they choose one.
  const [manualSelected, setSelected] = React.useState<SelectedConnector | null>(null);
  // A scanned QR code names one connector: list only that one until the driver
  // asks for all of them (Show All Connectors), as the driver portal does. The
  // choice holds for the scan it was made on, so a new scan focuses again.
  const [showAllFor, setShowAllFor] = React.useState<string | null>(null);
  const focusedEvseId = showAllFor === (evseId ?? '') ? null : scannedEvseId(evseId);
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

  // On a station with units the screen shows one charger (a unit, or the EVSEs
  // without a unit) when the route names it; else the whole station. A station
  // without units always shows the whole station, as before.
  const units = station.data?.units;
  const view = React.useMemo(() => chargerView(units, unit), [units, unit]);
  const chargerEvseList = React.useMemo(
    (): readonly StationEvse[] => chargerEvses(station.data?.evses ?? [], view),
    [station.data, view],
  );

  // Default selection, derived from station data and used until the driver taps
  // a connector: the one from a scanned QR code (the `evseId` param), else the
  // only startable connector at the station so the driver can start without a
  // tap. Only a connector that can actually start and is not reserved by another
  // driver qualifies; otherwise nothing is highlighted. While the list shows only
  // the scanned connector, only that one can be picked: never a hidden one.
  const shownEvses = React.useMemo(
    (): readonly StationEvse[] => visibleEvses(chargerEvseList, focusedEvseId),
    [chargerEvseList, focusedEvseId],
  );
  const autoSelected = React.useMemo((): SelectedConnector | null => {
    const data = station.data;
    if (data == null) return null;
    const opts = {
      isOnline: data.isOnline,
      maintenanceActive: data.maintenance?.active === true,
    };
    const startableOn = (evse: StationEvse): SelectedConnector | null => {
      if (!isEvseSelectable(evse, opts)) return null;
      const connector = firstStartableConnector(evse);
      return connector != null ? { evseId: evse.evseId, connector } : null;
    };
    if (evseId != null) {
      const evse = shownEvses.find((e) => e.evseId === Number(evseId));
      const fromQr = evse != null ? startableOn(evse) : null;
      if (fromQr != null) return fromQr;
    }
    const startable = shownEvses.map(startableOn).filter((c): c is SelectedConnector => c != null);
    const [only] = startable;
    return startable.length === 1 && only != null ? only : null;
  }, [evseId, station.data, shownEvses]);
  // A manual tap always wins over the derived default, unless its connector is
  // no longer listed.
  const manualShown =
    manualSelected != null && shownEvses.some((e) => e.evseId === manualSelected.evseId)
      ? manualSelected
      : null;
  const selected = manualShown ?? autoSelected;
  const focused = shownEvses.length < chargerEvseList.length;
  // The unit the driver sees: the one the route opened, or the unit of the
  // scanned connector while the list shows only it. Its name is the title, and
  // Favorites and Notify Me When Free work on it. Null keeps the station.
  const shownUnit =
    view.kind === 'unit'
      ? view.unit
      : focused
        ? unitOfEvse(units, station.data?.evses ?? [], focusedEvseId)
        : null;
  const shownUnitId = shownUnit?.id ?? null;
  const favorite = useIsFavorite(sid, shownUnitId);
  const watch = useIsWatching(sid, shownUnitId);

  const onToggleFavorite = React.useCallback(() => {
    toggleFavorite.mutate({
      stationId: sid,
      unitId: shownUnitId,
      favoriteId: favorite.data?.favoriteId ?? null,
      isFavorited: favorite.data?.isFavorite ?? false,
    });
  }, [toggleFavorite, sid, shownUnitId, favorite.data]);

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
        unitId: shownUnitId,
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
  }, [toggleWatch, sid, shownUnitId, watch.data, toast, t, confirm]);

  const runStart = React.useCallback(
    (sel: SelectedConnector) => {
      start.mutate(
        {
          stationId: sid,
          evseId: sel.evseId,
          paymentMethodId: fleetName == null ? selectedCard?.id : undefined,
        },
        {
          onSuccess: ({ sessionId }) => {
            router.replace({ pathname: '/session/[id]', params: { id: sessionId } });
          },
          onError: (err) => {
            // 400 PAYMENT_METHOD_REQUIRED: no card was sent, or the provider of
            // the saved card is gone. Reload the cards and offer to add one.
            if (err instanceof ApiError && err.code === 'PAYMENT_METHOD_REQUIRED') {
              void refetchCards();
              void confirm({
                title: t('charge.paymentMethodRequiredTitle'),
                message: apiErrorMessage(err, t),
                confirmText: t('payments.addCard'),
              }).then((ok) => {
                if (ok) router.push('/account/payment-methods');
              });
              return;
            }
            const msg = apiErrorMessage(err, t);
            toast.show(msg, 'error');
          },
        },
      );
    },
    [router, start, sid, selectedCard, fleetName, t, toast, confirm, refetchCards],
  );

  const onStart = React.useCallback(async () => {
    if (selected == null) return;
    setChecking(true);
    try {
      const result = await checkConnectorStatus(sid, selected.evseId);
      // No cable detected: prompt the driver to plug in, then retry. There is
      // no "start anyway" override (mirrors the portal).
      if (!isCableDetected(result.connectorStatus)) {
        setWarnVisible(true);
        return;
      }
      runStart(selected);
    } catch (err: unknown) {
      toast.show(
        err instanceof ApiError ? apiErrorMessage(err, t) : t('charge.statusCheckFailed'),
        'error',
      );
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

  // The whole view of a station with units lists its chargers one under the
  // other, each titled by its unit name (the EVSEs without a unit by the
  // station). Null keeps the single list of a station without units, a unit
  // view and a scanned connector.
  const groups = view.kind === 'station' && !focused ? chargerGroups(units, shownEvses) : null;
  // Notify Me When Free watches the shown unit, else the whole station, so it
  // is offered while none of those EVSEs is free.
  const watchedEvses =
    shownUnit != null ? data.evses.filter((e) => e.unitId === shownUnit.id) : data.evses;

  const renderTile = (evse: StationEvse): React.JSX.Element | null => {
    const connector = firstStartableConnector(evse) ?? evse.connectors[0];
    if (connector == null) return null;
    const selectable = isEvseSelectable(evse, {
      isOnline: data.isOnline,
      maintenanceActive,
    });
    const isSelected =
      selected?.evseId === evse.evseId && selected.connector.connectorId === connector.connectorId;
    return (
      <ConnectorTile
        key={evse.evseId}
        testID={connectorTileTestId(evse.evseId)}
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
  };

  return (
    <Screen scroll edges={['top']}>
      <BackButton />

      <View className="flex-row items-start justify-between gap-2">
        <View className="flex-1 gap-1">
          <View className="flex-row items-center gap-2">
            <Text variant="h1" testID={shownUnit != null ? 'station-unit-name' : undefined}>
              {shownUnit?.name ?? data.stationId}
            </Text>
            {isFavorited ? <Star size={20} weight="fill" color={hsl('warning')} /> : null}
          </View>
          {shownUnit != null ? (
            <Text className="text-base text-foreground">{data.stationId}</Text>
          ) : null}
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

      {/* Not rendered until the price display is known, so prices are not
          shown one way and then switched. */}
      {pricing.data != null && priceDisplay != null ? (
        <PricingCard pricing={pricing.data} priceDisplay={priceDisplay} />
      ) : null}

      {fleetName != null && pricing.data?.isFreeVend !== true && !hasActiveSession ? (
        <Card testID="fleet-billing" className="flex-row items-center gap-3">
          <Building size={20} color={hsl('primary')} />
          <View className="flex-1 gap-0.5">
            <Text weight="semibold" className="text-sm text-foreground">
              {t(memberBilled ? 'fleetBilling.billedToYouVia' : 'fleetBilling.billedTo', {
                fleet: fleetName,
              })}
            </Text>
            <Text className="text-xs text-muted-foreground">
              {t(memberBilled ? 'fleetBilling.memberStartHint' : 'fleetBilling.startHint')}
            </Text>
          </View>
        </Card>
      ) : null}

      {data.paymentEnabled && fleetName == null && selectedCard != null && !hasActiveSession ? (
        <Card testID="station-payment-card" className="flex-row items-center gap-3">
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
          {!focused || selected == null ? (
            <Text className="text-sm text-muted-foreground">{t('charge.selectConnector')}</Text>
          ) : null}
          {groups == null ? (
            <View className="flex-row flex-wrap gap-3">{shownEvses.map(renderTile)}</View>
          ) : (
            groups.map((group) => (
              <View key={group.key} testID={`station-unit-group-${group.key}`} className="gap-2">
                <Text weight="semibold" className="text-base text-foreground">
                  {group.name ?? data.stationId}
                </Text>
                <View className="flex-row flex-wrap gap-3">{group.evses.map(renderTile)}</View>
              </View>
            ))
          )}

          {focused ? (
            <Button
              testID="station-show-all-connectors"
              title={t('charge.showAllConnectors', { total: chargerEvseList.length })}
              variant="ghost"
              onPress={() => setShowAllFor(evseId ?? '')}
            />
          ) : null}

          <Button
            testID="station-start"
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

      {!watchedEvses.some((e) => e.connectors.some((c) => c.status === 'available')) ? (
        <Button
          title={watch.data?.isWatching === true ? t('watch.watching') : t('watch.notifyWhenFree')}
          variant="outline"
          loading={toggleWatch.isPending}
          onPress={() => void onToggleWatch()}
        />
      ) : null}

      {supportEnabled ? (
        <Button
          testID="station-report-issue"
          title={t('charge.reportIssue')}
          variant="outline"
          onPress={() =>
            router.push({ pathname: '/support/new', params: { stationId: data.stationId } })
          }
        />
      ) : null}

      <Sheet
        visible={warnVisible}
        onClose={() => setWarnVisible(false)}
        title={t('charge.evNotDetectedTitle')}
      >
        <EvPlugAnimation connectorType={selected?.connector.connectorType} />
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
