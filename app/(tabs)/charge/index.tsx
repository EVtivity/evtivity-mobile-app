// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

import React from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import * as Location from 'expo-location';
import { QrCode, Globe } from '@/components/icons';
import { Screen, Text, Input, Button, Spinner, EmptyState, Segmented, Card, Badge, useToast } from '@/components/ui';
import { AppHeader } from '@/components/AppHeader';
import { StationCard } from '@/components/StationCard';
import { hsl } from '@/lib/theme';
import { useNearbyChargers, useSearchChargers, useSearchRoaming, type RoamingStation } from '@/features/charge';
import { useFeatures } from '@/features/app-info';

type Mode = 'local' | 'roaming';

export default function ChargeScreen(): React.JSX.Element {
  const { t } = useTranslation();
  const router = useRouter();
  const toast = useToast();

  const [mode, setMode] = React.useState<Mode>('local');
  const [query, setQuery] = React.useState('');
  const [roamingQuery, setRoamingQuery] = React.useState('');
  const [coords, setCoords] = React.useState<{ lat: number; lng: number } | null>(null);

  React.useEffect(() => {
    let active = true;
    void (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const pos = await Location.getCurrentPositionAsync({});
      if (active) setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
    })();
    return () => {
      active = false;
    };
  }, []);

  const features = useFeatures();
  // Roaming is an opt-in OCPI feature; hide the tab until the operator's
  // roaming.enabled flag confirms it on (default off, no flash for the majority).
  const roamingEnabled = features.data?.roamingEnabled ?? false;

  const search = useSearchChargers(query);
  const nearby = useNearbyChargers(coords);
  const roaming = useSearchRoaming(roamingQuery);
  const isSearching = query.trim().length > 0;
  const isRoamingSearching = roamingQuery.trim().length > 0;

  return (
    <Screen scroll>
      <AppHeader />
      <Text variant="h1">{t('charge.title')}</Text>

      {roamingEnabled ? (
        <Segmented<Mode>
          segments={[
            { value: 'local', label: t('charge.tabLocal') },
            { value: 'roaming', label: t('charge.tabRoaming') },
          ]}
          value={mode}
          onChange={setMode}
        />
      ) : null}

      {!roamingEnabled || mode === 'local' ? (
        <>
          <Input
            testID="charge-search"
            value={query}
            onChangeText={setQuery}
            placeholder={t('charge.searchPlaceholder')}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
          />

          <Button
            testID="charge-scan"
            title={t('charge.scanQr')}
            variant="outline"
            leftIcon={<QrCode size={18} color={hsl('foreground')} />}
            onPress={() => router.push('/charge/scan')}
          />

          {isSearching ? (
            <View className="gap-3">
              <Text variant="h3">{t('common.search')}</Text>
              {search.isLoading ? (
                <Spinner />
              ) : (search.data?.length ?? 0) === 0 ? (
                <EmptyState title={t('charge.noResults')} />
              ) : (
                search.data?.map((s) => (
                  <StationCard
                    key={s.stationId}
                    name={s.stationId}
                    address={s.siteName}
                    isOnline={s.isOnline}
                    availableCount={s.availableCount}
                    evseCount={s.evseCount}
                    onPress={() =>
                      router.push({
                        pathname: '/charge/[stationId]',
                        params: { stationId: s.stationId },
                      })
                    }
                  />
                ))
              )}
            </View>
          ) : (
            <View className="gap-3">
              <Text variant="h3">{t('charge.nearby')}</Text>
              {coords == null ? (
                <EmptyState title={t('charge.nearby')} description={t('charge.searchPlaceholder')} />
              ) : nearby.isLoading ? (
                <Spinner />
              ) : (nearby.data?.length ?? 0) === 0 ? (
                <EmptyState title={t('charge.noResults')} />
              ) : (
                nearby.data?.map((s) => (
                  <StationCard
                    key={s.stationId}
                    name={s.siteName ?? s.stationId}
                    address={s.siteAddress}
                    isOnline={s.isOnline}
                    availableCount={s.availableCount}
                    evseCount={s.evseCount}
                    distanceKm={s.distanceKm}
                    onPress={() =>
                      router.push({
                        pathname: '/charge/[stationId]',
                        params: { stationId: s.stationId },
                      })
                    }
                  />
                ))
              )}
            </View>
          )}
        </>
      ) : (
        <>
          <Input
            testID="charge-roaming-search"
            value={roamingQuery}
            onChangeText={setRoamingQuery}
            placeholder={t('charge.roamingSearchPlaceholder')}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
          />

          <View className="gap-3">
            {!isRoamingSearching ? (
              <EmptyState
                icon={<Globe size={40} color={hsl('mutedForeground')} />}
                title={t('charge.roamingPrompt')}
              />
            ) : roaming.isLoading ? (
              <Spinner />
            ) : (roaming.data?.length ?? 0) === 0 ? (
              <EmptyState title={t('charge.noResults')} />
            ) : (
              roaming.data?.map((s) => (
                <RoamingCard
                  key={s.id}
                  station={s}
                  onPress={() => toast.show(t('charge.roamingComingSoon'))}
                />
              ))
            )}
          </View>
        </>
      )}
    </Screen>
  );
}

function RoamingCard({
  station,
  onPress,
}: {
  station: RoamingStation;
  onPress: () => void;
}): React.JSX.Element {
  const { t } = useTranslation();
  const locationLine = [station.city, station.address].filter((p) => p != null && p.length > 0).join(', ');
  return (
    <Card onPress={onPress} className="gap-3">
      <View className="flex-row items-start justify-between gap-3">
        <View className="flex-1 gap-1">
          <Text variant="title" numberOfLines={1}>
            {station.name ?? station.locationId}
          </Text>
          {locationLine.length > 0 ? (
            <View className="flex-row items-center gap-1.5">
              <Globe size={13} color={hsl('mutedForeground')} />
              <Text variant="muted" className="flex-1" numberOfLines={1}>
                {locationLine}
              </Text>
            </View>
          ) : null}
        </View>
        <Badge variant="info" label={t('charge.roamingNetwork')} />
      </View>
      <Text variant="caption" className="text-muted-foreground">
        {t('charge.roamingEvseCount', { count: station.evseCount })}
      </Text>
    </Card>
  );
}
