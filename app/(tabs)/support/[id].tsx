// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

import React from 'react';
import {
  View,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, Send } from '@/components/icons';
import {
  Text,
  Badge,
  Card,
  Input,
  Spinner,
  EmptyState,
  ScreenBackground,
  useApiErrorToast,
} from '@/components/ui';
import { hsl, SURFACE_TEXT_VARS } from '@/lib/theme';
import { cn } from '@/lib/cn';
import { formatDate, formatDateTime } from '@/lib/format';
import { useSupportCase, useReplyCase } from '@/features/support';
import { supportCaseStatusVariant } from '@/lib/status-variants';
import type { SupportMessage } from '@/lib/types';

function MessageBubble({ message }: { message: SupportMessage }): React.JSX.Element {
  if (message.senderType === 'system') {
    return (
      <View className="items-center py-1">
        <View style={SURFACE_TEXT_VARS} className="rounded-full bg-muted px-3 py-1.5">
          <Text className="text-xs text-muted-foreground">{message.body}</Text>
        </View>
      </View>
    );
  }
  const isDriver = message.senderType === 'driver';
  return (
    <View className={cn('w-full', isDriver ? 'items-end' : 'items-start')}>
      <View
        style={isDriver ? undefined : SURFACE_TEXT_VARS}
        className={cn(
          'max-w-[80%] rounded-2xl px-4 py-2.5',
          isDriver ? 'bg-primary' : 'bg-muted',
        )}
      >
        <Text className={cn('text-base leading-relaxed', isDriver ? 'text-primary-foreground' : 'text-foreground')}>
          {message.body}
        </Text>
      </View>
      <Text className="mt-1 px-1 text-xs text-muted-foreground">
        {formatDateTime(message.createdAt)}
      </Text>
    </View>
  );
}

export default function SupportCaseDetailScreen(): React.JSX.Element {
  const { t } = useTranslation();
  const router = useRouter();
  const showApiError = useApiErrorToast();
  const { id } = useLocalSearchParams<{ id: string }>();
  const caseId = id ?? '';

  const detail = useSupportCase(caseId);
  const reply = useReplyCase(caseId);

  const [text, setText] = React.useState('');
  const scrollRef = React.useRef<ScrollView>(null);

  const messages = detail.data?.messages ?? [];

  React.useEffect(() => {
    if (messages.length > 0) {
      requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
    }
  }, [messages.length]);

  const onSend = async (): Promise<void> => {
    const body = text.trim();
    if (body.length === 0) return;
    try {
      await reply.mutateAsync(body);
      setText('');
      // useReplyCase invalidates this case on success, which refetches it.
    } catch (err) {
      showApiError(err);
    }
  };

  return (
    <ScreenBackground edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <View className="flex-row items-center gap-2 px-4 pb-2 pt-4">
          <Pressable testID="back-button" onPress={() => router.back()} hitSlop={12} className="-ml-1">
            <ChevronLeft size={28} color="#ffffff" />
          </Pressable>
          <View className="flex-1">
            <Text variant="h3" numberOfLines={1}>
              {detail.data?.subject ?? t('support.title')}
            </Text>
            {detail.data != null ? (
              <Text className="text-xs text-muted-foreground">{detail.data.caseNumber}</Text>
            ) : null}
          </View>
          {detail.data != null ? (
            <Badge
              label={t(`support.status.${detail.data.status}`, { defaultValue: detail.data.status })}
              variant={supportCaseStatusVariant(detail.data.status)}
            />
          ) : null}
        </View>

        {detail.data != null ? (
          <View className="px-4 pb-2">
            <Card flat className="gap-1">
              <View className="flex-row items-center justify-between">
                <Text className="text-xs text-muted-foreground">
                  {t(`support.categories.${detail.data.category}`, {
                    defaultValue: detail.data.category,
                  })}
                </Text>
                <Text className="text-xs text-muted-foreground">
                  {formatDate(detail.data.createdAt)}
                </Text>
              </View>
              {detail.data.stationName != null ? (
                <Text className="text-xs text-muted-foreground">
                  {t('support.station')}: {detail.data.stationName}
                </Text>
              ) : null}
            </Card>
          </View>
        ) : null}

        {detail.isLoading ? (
          <Spinner />
        ) : detail.data == null ? (
          <EmptyState title={t('common.somethingWrong')} />
        ) : (
          <ScrollView
            ref={scrollRef}
            contentContainerClassName="px-4 py-4 gap-3"
            keyboardShouldPersistTaps="handled"
          >
            {messages.map((m) => (
              <MessageBubble key={m.id} message={m} />
            ))}
          </ScrollView>
        )}

        {detail.data != null &&
        detail.data.status !== 'closed' &&
        detail.data.status !== 'resolved' ? (
          <View
            style={SURFACE_TEXT_VARS}
            className="border-t border-white/15 bg-card/[0.7]"
          >
            <View className="flex-row items-end gap-2 px-4 py-2">
              <Input
                value={text}
                onChangeText={setText}
                placeholder={t('support.message')}
                multiline
                className="max-h-28 flex-1"
              />
              <Pressable
                onPress={() => void onSend()}
                disabled={text.trim().length === 0 || reply.isPending}
                className={cn(
                  'h-[52px] w-[52px] items-center justify-center rounded-xl bg-primary',
                  (text.trim().length === 0 || reply.isPending) && 'opacity-50',
                )}
              >
                <Send size={20} color={hsl('primaryForeground')} />
              </Pressable>
            </View>
          </View>
        ) : null}
      </KeyboardAvoidingView>
    </ScreenBackground>
  );
}
