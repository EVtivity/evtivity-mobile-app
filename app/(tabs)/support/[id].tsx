// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

import React from 'react';
import { View, Pressable, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Send } from '@/components/icons';
import { AiCaseStatus } from '@/components/support/AiCaseStatus';
import { AssistantMessage } from '@/components/support/AssistantMessage';
import { MessageBubble } from '@/components/support/MessageBubble';
import {
  Text,
  Badge,
  Card,
  Input,
  Spinner,
  EmptyState,
  ScreenBackground,
  BackButton,
  useApiErrorToast,
} from '@/components/ui';
import { hsl, useSurfaceTextVars } from '@/lib/theme';
import { cn } from '@/lib/cn';
import { formatDate } from '@/lib/format';
import { useSupportCase, useReplyCase } from '@/features/support';
import { supportCaseStatusVariant } from '@/lib/status-variants';

export default function SupportCaseDetailScreen(): React.JSX.Element {
  const surfaceVars = useSurfaceTextVars();
  const { t } = useTranslation();
  const showApiError = useApiErrorToast();
  const { id } = useLocalSearchParams<{ id: string }>();
  const caseId = id ?? '';

  const detail = useSupportCase(caseId);
  const reply = useReplyCase(caseId);

  const [text, setText] = React.useState('');
  const scrollRef = React.useRef<ScrollView>(null);

  const messages = detail.data?.messages ?? [];
  const ai = detail.data?.ai;
  // The suggested driver actions belong to the latest automatic answer.
  const lastAssistantId = messages.reduce<number | undefined>(
    (last, m) => (m.senderType === 'assistant' ? m.id : last),
    undefined,
  );

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
        <View className="px-4 pb-2 pt-4">
          <BackButton />
          <View className="mt-1 flex-row items-center gap-2">
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
                label={t(`support.status.${detail.data.status}`, {
                  defaultValue: detail.data.status,
                })}
                variant={supportCaseStatusVariant(detail.data.status)}
              />
            ) : null}
          </View>
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
            {messages.map((m) =>
              m.senderType === 'assistant' ? (
                <AssistantMessage
                  key={m.id}
                  message={m}
                  {...(m.id === lastAssistantId && ai != null
                    ? { driverActions: ai.driverActions }
                    : {})}
                />
              ) : (
                <MessageBubble key={m.id} message={m} />
              ),
            )}
            {ai != null ? <AiCaseStatus caseId={caseId} ai={ai} /> : null}
          </ScrollView>
        )}

        {/* A case the automatic answer resolved can be reopened by writing to us. */}
        {detail.data != null &&
        detail.data.status !== 'closed' &&
        (detail.data.status !== 'resolved' || ai?.resolutionSource === 'ai') ? (
          <View style={surfaceVars} className="border-t border-white/15 bg-card/[0.7]">
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
