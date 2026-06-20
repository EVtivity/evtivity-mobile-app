// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

import React from 'react';
import { View, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import DraggableFlatList, {
  ScaleDecorator,
  type RenderItemParams,
} from 'react-native-draggable-flatlist';
import { GripVertical, Minus, Plus } from '@/components/icons';
import { Text, Card, BackButton, ScreenBackground } from '@/components/ui';
import { hsl } from '@/lib/theme';
import { useHomeCards } from '@/lib/home-cards-store';
import {
  HOME_CARDS,
  ALL_HOME_CARD_IDS,
  MIN_HOME_CARDS,
  MAX_HOME_CARDS,
  type HomeCardId,
} from '@/lib/home-cards';

export default function HomeCardsScreen(): React.JSX.Element {
  const { t } = useTranslation();
  const cards = useHomeCards((s) => s.cards);
  const setCards = useHomeCards((s) => s.setCards);
  const load = useHomeCards((s) => s.load);

  React.useEffect(() => {
    void load();
  }, [load]);

  const available = ALL_HOME_CARD_IDS.filter((id) => !cards.includes(id));
  const canRemove = cards.length > MIN_HOME_CARDS;
  const canAdd = cards.length < MAX_HOME_CARDS;

  const remove = (id: HomeCardId): void => {
    if (canRemove) setCards(cards.filter((c) => c !== id));
  };
  const add = (id: HomeCardId): void => {
    if (canAdd) setCards([...cards, id]);
  };

  const renderItem = ({ item, drag, isActive }: RenderItemParams<HomeCardId>): React.JSX.Element => {
    const def = HOME_CARDS[item];
    const Icon = def.icon;
    return (
      <ScaleDecorator>
        <Card flat className={`mb-2 flex-row items-center gap-3 ${isActive ? 'opacity-90' : ''}`}>
          <Pressable
            testID={`home-cards-drag-${item}`}
            onLongPress={drag}
            delayLongPress={120}
            disabled={isActive}
            hitSlop={10}
          >
            <GripVertical size={22} color={hsl('mutedForeground')} />
          </Pressable>
          <Icon size={22} color={hsl('primary')} weight="duotone" />
          <Text variant="title" className="flex-1" numberOfLines={1}>
            {t(def.labelKey)}
          </Text>
          <Pressable
            testID={`home-cards-remove-${item}`}
            onPress={() => remove(item)}
            disabled={!canRemove}
            hitSlop={10}
            className={canRemove ? 'active:opacity-70' : 'opacity-30'}
          >
            <Minus size={22} color={hsl('destructive')} />
          </Pressable>
        </Card>
      </ScaleDecorator>
    );
  };

  const header = (
    <View className="gap-4 pb-2">
      <BackButton />
      <Text variant="h1">{t('homeCards.title')}</Text>
      <Text variant="muted">{t('homeCards.hint')}</Text>
      <Text variant="label" className="text-white">
        {t('homeCards.onHome')}
      </Text>
    </View>
  );

  const footer = (
    <View className="mt-4 gap-2">
      <Text variant="label" className="mb-1 text-white">
        {t('homeCards.available')}
      </Text>
      {available.length === 0 ? (
        <Text variant="muted">{t('homeCards.allAdded')}</Text>
      ) : (
        available.map((id) => {
          const def = HOME_CARDS[id];
          const Icon = def.icon;
          return (
            <Card key={id} flat className="flex-row items-center gap-3">
              <Icon size={22} color={hsl('mutedForeground')} weight="duotone" />
              <Text variant="title" className="flex-1" numberOfLines={1}>
                {t(def.labelKey)}
              </Text>
              <Pressable
                testID={`home-cards-add-${id}`}
                onPress={() => add(id)}
                disabled={!canAdd}
                hitSlop={10}
                className={canAdd ? 'active:opacity-70' : 'opacity-30'}
              >
                <Plus size={22} color={hsl('primary')} />
              </Pressable>
            </Card>
          );
        })
      )}
    </View>
  );

  return (
    <ScreenBackground>
      <View className="flex-1">
        <DraggableFlatList
          data={cards}
          keyExtractor={(id) => id}
          onDragEnd={({ data }) => setCards(data)}
          renderItem={renderItem}
          ListHeaderComponent={header}
          ListFooterComponent={footer}
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 24 }}
          showsVerticalScrollIndicator={false}
        />
      </View>
    </ScreenBackground>
  );
}
