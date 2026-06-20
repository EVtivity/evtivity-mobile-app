// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

import React from 'react';
import { View, Pressable } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Zap, ChevronRight, Pause, type LucideIcon } from '@/components/icons';
import {
  Screen,
  Text,
  Card,
  Button,
  Skeleton,
  EmptyState,
  useToast,
  useConfirm,
} from '@/components/ui';
import { AppHeader } from '@/components/AppHeader';
import { SessionRow } from '@/components/SessionRow';
import { hsl } from '@/lib/theme';
import { useAuth } from '@/lib/auth';
import { useHomeCards } from '@/lib/home-cards-store';
import { HOME_CARDS, type HomeCardId } from '@/lib/home-cards';
import { usePullToRefresh } from '@/lib/use-pull-to-refresh';
import { formatEnergyWh } from '@/lib/format';
import { notifyError } from '@/lib/haptics';
import { useActiveSessions, useRecentSessions, useStopSession } from '@/features/sessions';
import { apiErrorMessage } from '@/lib/api';

function QuickAction({
  icon: Icon,
  label,
  to,
}: {
  icon: LucideIcon;
  label: string;
  to: Href;
}): React.JSX.Element {
  const router = useRouter();
  return (
    <Card className="flex-1 items-center gap-3 py-6" onPress={() => router.push(to)}>
      <View className="h-[72px] w-[72px] items-center justify-center rounded-2xl bg-primary/12">
        <Icon size={42} color={hsl('primary')} weight="duotone" />
      </View>
      <Text variant="label" className="text-center" numberOfLines={1}>
        {label}
      </Text>
    </Card>
  );
}

// Greyed-out empty slot that fills the 4th grid position when exactly three
// cards are chosen, so the 2x2 layout keeps its shape.
function HomeCardPlaceholder(): React.JSX.Element {
  return (
    <View
      testID="home-card-placeholder"
      className="flex-1 items-center justify-center gap-3 rounded-2xl border border-dashed border-white/15 bg-card/[0.2] py-6"
    >
      <View className="h-[72px] w-[72px] rounded-2xl bg-white/[0.06]" />
      <View className="h-4 w-16 rounded bg-white/[0.06]" />
    </View>
  );
}

export default function HomeScreen(): React.JSX.Element {
  const { t } = useTranslation();
  const router = useRouter();
  const firstName = useAuth((s) => s.driver?.firstName ?? '');

  const toast = useToast();
  const confirm = useConfirm();
  const active = useActiveSessions();
  const recent = useRecentSessions(3);
  const stop = useStopSession();

  const homeCards = useHomeCards((s) => s.cards);
  const loadHomeCards = useHomeCards((s) => s.load);
  React.useEffect(() => {
    void loadHomeCards();
  }, [loadHomeCards]);

  // Pad three cards with a placeholder so the grid keeps its 2x2 shape; two
  // cards render as a single row and Recent Sessions moves up beneath them.
  const cardSlots: (HomeCardId | null)[] =
    homeCards.length === 3 ? [...homeCards, null] : homeCards;
  const cardRows: (HomeCardId | null)[][] = [];
  for (let i = 0; i < cardSlots.length; i += 2) cardRows.push(cardSlots.slice(i, i + 2));
  const { refreshing, onRefresh } = usePullToRefresh(() =>
    Promise.all([active.refetch(), recent.refetch()]),
  );
  const activeSession = active.data?.[0];
  const [stopping, setStopping] = React.useState(false);

  const onStop = React.useCallback(async () => {
    if (activeSession == null) return;
    const ok = await confirm({
      title: t('home.stopTitle'),
      message: t('home.stopMessage'),
      destructive: true,
    });
    if (!ok) return;
    setStopping(true);
    stop.mutate(activeSession.id, {
      onSuccess: () => toast.show(t('home.stopped'), 'success'),
      onError: (err) => {
        setStopping(false);
        notifyError();
        const msg = apiErrorMessage(err, t);
        toast.show(msg, 'error');
      },
    });
  }, [activeSession, confirm, stop, t, toast]);

  // The stop completes after the OCPP roundtrip; keep the button in its
  // stopping state until the session leaves the active list (or a timeout).
  React.useEffect(() => {
    if (stopping && activeSession == null) setStopping(false);
  }, [stopping, activeSession]);
  React.useEffect(() => {
    if (!stopping) return;
    const h = setTimeout(() => setStopping(false), 30_000);
    return () => clearTimeout(h);
  }, [stopping]);

  return (
    <Screen scroll refreshing={refreshing} onRefresh={onRefresh}>
      <AppHeader />

      <View className="mb-1 mt-1 gap-0.5">
        <Text variant="display" className="text-white">
          {t('home.greeting', { name: firstName })}
        </Text>
        <Text variant="muted" className="text-white/70">
          {t('home.readyToCharge')}
        </Text>
      </View>

      {activeSession != null ? (
        <Card className="gap-3 border border-success/30">
          <Pressable
            className="flex-row items-center gap-3 active:opacity-70"
            onPress={() =>
              router.push({ pathname: '/session/[id]', params: { id: activeSession.id } })
            }
          >
            <View className="h-11 w-11 items-center justify-center rounded-2xl bg-success/14">
              <Zap size={22} color={hsl('success')} />
            </View>
            <View className="flex-1">
              <Text weight="semibold" className="text-sm text-success">
                {t('home.activeSession')}
              </Text>
              <Text variant="muted" numberOfLines={1}>
                {activeSession.stationName ?? activeSession.stationId ?? ''}
              </Text>
            </View>
            <Text variant="label" tabular>
              {formatEnergyWh(activeSession.energyDeliveredWh)}
            </Text>
            <ChevronRight size={20} color={hsl('mutedForeground')} />
          </Pressable>
          <Button
            title={stopping || stop.isPending ? t('charge.stopping') : t('charge.stop')}
            variant="destructive"
            size="sm"
            loading={stopping || stop.isPending}
            leftIcon={<Pause size={16} />}
            onPress={() => void onStop()}
          />
        </Card>
      ) : null}

      <View className="gap-3">
        {cardRows.map((row, ri) => (
          <View key={`card-row-${String(ri)}`} className="flex-row gap-3">
            {row.map((id, ci) =>
              id == null ? (
                <HomeCardPlaceholder key={`card-ph-${String(ri)}-${String(ci)}`} />
              ) : (
                <QuickAction
                  key={id}
                  icon={HOME_CARDS[id].icon}
                  label={t(HOME_CARDS[id].labelKey)}
                  to={HOME_CARDS[id].to}
                />
              ),
            )}
          </View>
        ))}
      </View>

      <View className="flex-row items-center justify-between">
        <Text variant="h3" className="text-white">
          {t('home.recentSessions')}
        </Text>
        {(recent.data?.length ?? 0) > 0 ? (
          <Button
            title={t('home.viewAll')}
            variant="secondary"
            size="sm"
            onPress={() => router.push('/(tabs)/activity')}
          />
        ) : null}
      </View>

      {recent.isLoading ? (
        <View className="gap-3">
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
        </View>
      ) : (recent.data?.length ?? 0) === 0 ? (
        <EmptyState
          icon={<Zap size={26} color={hsl('mutedForeground')} />}
          title={t('activity.noSessions')}
        />
      ) : (
        <Card className="py-0">
          {recent.data?.map((s, i) => (
            <View key={s.id} className={i > 0 ? 'border-t border-muted-foreground/30' : undefined}>
              <SessionRow
                session={s}
                onPress={() => router.push({ pathname: '/session/[id]', params: { id: s.id } })}
              />
            </View>
          ))}
        </Card>
      )}
    </Screen>
  );
}
