// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

import React from 'react';
import { View, ScrollView, Modal, Pressable, Linking } from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { MapPin, Clock, Plug, Navigation, Mail, MessageSquare, User, X } from '@/components/icons';
import { Screen, Text, Button, Card, Spinner, EmptyState, Segmented, BackButton } from '@/components/ui';
import { LocationImageThumb } from '@/components/LocationImageThumb';
import { PopularTimesChart } from '@/components/PopularTimesChart';
import { openEmail, openPhone } from '@/lib/safe-link';
import { hsl } from '@/lib/theme';
import {
  useLocationDetail,
  useLocationImages,
  usePopularTimes,
  useMapConfig,
} from '@/features/location';

type Dow = '0' | '1' | '2' | '3' | '4' | '5' | '6';

function staticMapUrl(lat: number, lng: number, apiKey: string): string {
  const c = `${String(lat)},${String(lng)}`;
  return `https://maps.googleapis.com/maps/api/staticmap?center=${c}&zoom=15&size=640x320&scale=2&markers=color:0x22c55e%7C${c}&key=${encodeURIComponent(apiKey)}`;
}

export default function LocationDetailScreen(): React.JSX.Element {
  const { t } = useTranslation();
  const { siteId } = useLocalSearchParams<{ siteId: string }>();
  const id = siteId ?? '';

  const detail = useLocationDetail(id);
  const images = useLocationImages(id);
  const popular = usePopularTimes(id);
  const mapConfig = useMapConfig();

  const [viewerUrl, setViewerUrl] = React.useState<string | null>(null);
  const [dow, setDow] = React.useState<Dow>(String(new Date().getDay()) as Dow);

  if (detail.isLoading) {
    return (
      <Screen>
        <Spinner />
      </Screen>
    );
  }

  if (detail.isError || detail.data == null) {
    return (
      <Screen>
        <EmptyState
          title={t('common.somethingWrong')}
          action={<Button title={t('common.retry')} onPress={() => void detail.refetch()} />}
        />
      </Screen>
    );
  }

  const data = detail.data;
  const addressLine = [data.address, data.city, [data.state, data.postalCode].filter(Boolean).join(' ')]
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .join(', ');

  const hasCoords = data.latitude != null && data.longitude != null;
  const apiKey = mapConfig.data?.apiKey;
  const showMap = apiKey != null && apiKey.length > 0 && hasCoords;

  const imageList = images.data ?? [];
  const popularForDay = (popular.data ?? []).filter((p) => p.dow === Number(dow));
  const showPopular = (popular.data ?? []).length > 0;

  const daySegments: { value: Dow; label: string }[] = [
    { value: '1', label: t('location.days.mon') },
    { value: '2', label: t('location.days.tue') },
    { value: '3', label: t('location.days.wed') },
    { value: '4', label: t('location.days.thu') },
    { value: '5', label: t('location.days.fri') },
    { value: '6', label: t('location.days.sat') },
    { value: '0', label: t('location.days.sun') },
  ];

  return (
    <Screen scroll edges={['top']}>
      <BackButton />

      <View className="gap-2">
        <Text variant="h1">{data.name}</Text>

        {addressLine.length > 0 ? (
          <View className="flex-row items-center gap-1.5">
            <MapPin size={15} color={hsl('mutedForeground')} />
            <Text className="flex-1 text-sm text-muted-foreground">{addressLine}</Text>
          </View>
        ) : null}

        {data.hoursOfOperation != null && data.hoursOfOperation.length > 0 ? (
          <View className="flex-row items-center gap-1.5">
            <Clock size={15} color={hsl('mutedForeground')} />
            <Text className="text-sm text-muted-foreground">{data.hoursOfOperation}</Text>
          </View>
        ) : null}

        <View className="flex-row items-center gap-1.5">
          <Plug size={15} color={hsl('mutedForeground')} />
          <Text className="text-sm text-muted-foreground">
            {t('location.chargerCount', {
              chargers: data.evseCount,
              available: data.availableCount,
            })}
          </Text>
        </View>
      </View>

      {showMap ? (
        <Card className="gap-3">
          <Image
            source={{ uri: staticMapUrl(data.latitude, data.longitude, apiKey) }}
            contentFit="cover"
            cachePolicy="memory-disk"
            style={{ width: '100%', height: 180, borderRadius: 12 }}
          />
          <Button
            title={t('location.getDirections')}
            variant="outline"
            leftIcon={<Navigation size={18} />}
            onPress={() =>
              void Linking.openURL(
                `https://www.google.com/maps/dir/?api=1&destination=${String(data.latitude)},${String(data.longitude)}`,
              )
            }
          />
        </Card>
      ) : null}

      {imageList.length > 0 ? (
        <View className="gap-2">
          <Text variant="h3">{t('location.photos')}</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerClassName="gap-3 pr-1"
          >
            {imageList.map((img) => (
              <LocationImageThumb
                key={img.id}
                siteId={id}
                imageId={img.id}
                onPress={setViewerUrl}
              />
            ))}
          </ScrollView>
        </View>
      ) : null}

      {showPopular ? (
        <Card className="gap-4">
          <Text variant="h3">{t('location.popularTimes')}</Text>
          <Segmented<Dow> segments={daySegments} value={dow} onChange={setDow} />
          {popularForDay.length > 0 ? (
            <PopularTimesChart times={popularForDay} />
          ) : (
            <View className="h-[180px] items-center justify-center">
              <Text variant="muted">{t('location.noPopularForDay')}</Text>
            </View>
          )}
        </Card>
      ) : null}

      {data.contactName != null || data.contactEmail != null || data.contactPhone != null ? (
        <Card className="gap-3">
          <Text variant="h3">{t('location.contact')}</Text>
          {data.contactName != null && data.contactName.length > 0 ? (
            <View className="flex-row items-center gap-2">
              <User size={16} color={hsl('mutedForeground')} />
              <Text className="text-sm text-foreground">{data.contactName}</Text>
            </View>
          ) : null}
          {data.contactEmail != null && data.contactEmail.length > 0 ? (
            <Pressable
              accessibilityRole="link"
              onPress={() => openEmail(data.contactEmail)}
              className="flex-row items-center gap-2 active:opacity-70"
            >
              <Mail size={16} color={hsl('primary')} />
              <Text className="text-sm text-primary">{data.contactEmail}</Text>
            </Pressable>
          ) : null}
          {data.contactPhone != null && data.contactPhone.length > 0 ? (
            <Pressable
              accessibilityRole="link"
              onPress={() => openPhone(data.contactPhone)}
              className="flex-row items-center gap-2 active:opacity-70"
            >
              <MessageSquare size={16} color={hsl('primary')} />
              <Text className="text-sm text-primary">{data.contactPhone}</Text>
            </Pressable>
          ) : null}
        </Card>
      ) : null}

      <Modal
        visible={viewerUrl != null}
        transparent
        statusBarTranslucent
        animationType="fade"
        onRequestClose={() => setViewerUrl(null)}
      >
        <View className="flex-1 bg-black/95">
          <SafeAreaView edges={['top']} className="flex-1">
            <View className="flex-row justify-end px-4 py-2">
              <Pressable
                accessibilityLabel={t('common.close')}
                onPress={() => setViewerUrl(null)}
                hitSlop={16}
                className="active:opacity-70"
              >
                <X size={28} color="#ffffff" />
              </Pressable>
            </View>
            <Pressable className="flex-1" onPress={() => setViewerUrl(null)}>
              {viewerUrl != null ? (
                <Image
                  source={{ uri: viewerUrl }}
                  contentFit="contain"
                  cachePolicy="memory-disk"
                  style={{ width: '100%', height: '100%' }}
                />
              ) : null}
            </Pressable>
          </SafeAreaView>
        </View>
      </Modal>
    </Screen>
  );
}
