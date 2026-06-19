// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

import React from 'react';
import { View, Pressable } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Check, ChevronDown } from '@/components/icons';
import {
  Screen,
  Text,
  Field,
  Input,
  Button,
  Sheet,
  BackButton,
  useToast,
  useApiErrorToast,
} from '@/components/ui';
import { hsl, SURFACE_TEXT_VARS } from '@/lib/theme';
import { cn } from '@/lib/cn';
import {
  useCreateCase,
  SUPPORT_CATEGORIES,
  type SupportCategory,
  type CreateCaseInput,
} from '@/features/support';

export default function NewSupportCaseScreen(): React.JSX.Element {
  const { t } = useTranslation();
  const router = useRouter();
  const toast = useToast();
  const showApiError = useApiErrorToast();
  const params = useLocalSearchParams<{ sessionId?: string; stationId?: string }>();
  const create = useCreateCase();

  const [subject, setSubject] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [category, setCategory] = React.useState<SupportCategory>('general_inquiry');
  const [pickerOpen, setPickerOpen] = React.useState(false);

  const onSubmit = async (): Promise<void> => {
    const trimmedSubject = subject.trim();
    const trimmedDescription = description.trim();
    if (trimmedSubject.length === 0 || trimmedDescription.length === 0) return;

    const input: CreateCaseInput = {
      subject: trimmedSubject,
      description: trimmedDescription,
      category,
      ...(params.sessionId != null ? { sessionId: params.sessionId } : {}),
      ...(params.stationId != null ? { stationId: params.stationId } : {}),
    };

    try {
      const created = await create.mutateAsync(input);
      toast.show(t('support.submit'), 'success');
      router.replace({ pathname: '/support/[id]', params: { id: created.id } });
    } catch (err) {
      showApiError(err);
    }
  };

  return (
    <Screen scroll>
      <BackButton />
      <Text variant="h1" className="mb-4">
        {t('support.newCase')}
      </Text>

      <Field
        testID="support-subject"
        label={t('support.subject')}
        value={subject}
        onChangeText={setSubject}
        maxLength={255}
      />

      <View className="gap-2">
        <Text variant="label">{t('support.category')}</Text>
        <Pressable
          onPress={() => setPickerOpen(true)}
          style={SURFACE_TEXT_VARS}
          className="h-[52px] flex-row items-center justify-between rounded-xl border-2 border-border bg-muted px-4"
        >
          <Text variant="body">{t(`support.categories.${category}`)}</Text>
          <ChevronDown size={18} color={hsl('mutedForeground')} />
        </Pressable>
      </View>

      <View className="gap-2">
        <Text variant="label">{t('support.description')}</Text>
        <Input
          testID="support-description"
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={5}
          maxLength={5000}
          textAlignVertical="top"
          className="h-32 py-3"
        />
      </View>

      <Button
        testID="support-submit"
        title={t('support.submit')}
        loading={create.isPending}
        disabled={subject.trim().length === 0 || description.trim().length === 0}
        onPress={() => void onSubmit()}
        className="mt-2"
      />

      <Sheet
        visible={pickerOpen}
        onClose={() => setPickerOpen(false)}
        title={t('support.category')}
      >
        <View className="gap-1">
          {SUPPORT_CATEGORIES.map((c) => {
            const active = c === category;
            return (
              <Pressable
                key={c}
                onPress={() => {
                  setCategory(c);
                  setPickerOpen(false);
                }}
                className={cn(
                  'flex-row items-center justify-between rounded-md px-3 py-3',
                  active && 'bg-muted',
                )}
              >
                <Text variant="body">{t(`support.categories.${c}`)}</Text>
                {active ? <Check size={18} color={hsl('primary')} /> : null}
              </Pressable>
            );
          })}
        </View>
      </Sheet>
    </Screen>
  );
}
