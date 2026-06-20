// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

import React from 'react';
import { View, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Screen, Text, Field, Button, Card, Segmented, Sheet, BackButton, useToast } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { ApiError, getApiErrorFieldDetails } from '@/lib/api';
import { useUpdateProfile } from '@/features/account';
import { enabledLanguageOptions, setAppLanguage, LANGUAGE_LABELS } from '@/lib/i18n';
import type { LanguageCode } from '@/lib/config';

// Brand-configured languages, in display order.
const LANGUAGE_OPTIONS = enabledLanguageOptions();

type DistanceUnit = 'miles' | 'km';

export default function PersonalInfoScreen(): React.JSX.Element {
  const { t } = useTranslation();
  const toast = useToast();
  const driver = useAuth((s) => s.driver);
  const updateProfile = useUpdateProfile();

  const [firstName, setFirstName] = React.useState(driver?.firstName ?? '');
  const [lastName, setLastName] = React.useState(driver?.lastName ?? '');
  const [phone, setPhone] = React.useState(driver?.phone ?? '');
  const [language, setLanguage] = React.useState(driver?.language ?? 'en');
  const [timezone, setTimezone] = React.useState(driver?.timezone ?? '');
  const [distanceUnit, setDistanceUnit] = React.useState<DistanceUnit>(
    driver?.distanceUnit === 'km' ? 'km' : 'miles',
  );
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});
  const [langPickerVisible, setLangPickerVisible] = React.useState(false);

  const languageLabel = LANGUAGE_LABELS[language as LanguageCode] ?? language;

  const onSave = async (): Promise<void> => {
    setFieldErrors({});
    const input: Parameters<typeof updateProfile.mutateAsync>[0] = {};
    if (firstName.trim() !== (driver?.firstName ?? '')) input.firstName = firstName.trim();
    if (lastName.trim() !== (driver?.lastName ?? '')) input.lastName = lastName.trim();
    if (phone.trim() !== (driver?.phone ?? '')) input.phone = phone.trim();
    if (language !== (driver?.language ?? '')) input.language = language;
    if (timezone.trim() !== (driver?.timezone ?? '')) input.timezone = timezone.trim();
    if (distanceUnit !== driver?.distanceUnit) input.distanceUnit = distanceUnit;

    try {
      await updateProfile.mutateAsync(input);
      // Apply the new UI language only once the preference is saved.
      if (input.language != null) await setAppLanguage(language);
      toast.show(t('common.saved'), 'success');
    } catch (err) {
      if (err instanceof ApiError) {
        setFieldErrors(getApiErrorFieldDetails(err));
        toast.show(err.serverMessage ?? t('common.somethingWrong'), 'error');
      } else {
        toast.show(t('common.offline'), 'error');
      }
    }
  };

  return (
    <Screen scroll>
      <BackButton />
      <Text variant="h1" className="mb-4">
        {t('account.personalInfo')}
      </Text>

      <View className="gap-4">
        <Field
          testID="personal-firstName"
          label={t('auth.firstName')}
          value={firstName}
          onChangeText={setFirstName}
          autoCapitalize="words"
          error={fieldErrors.firstName}
        />
        <Field
          testID="personal-lastName"
          label={t('auth.lastName')}
          value={lastName}
          onChangeText={setLastName}
          autoCapitalize="words"
          error={fieldErrors.lastName}
        />
        <Field
          testID="personal-phone"
          label={t('account.phone')}
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          autoComplete="tel"
          error={fieldErrors.phone}
        />
        {driver?.email != null ? (
          <Field label={t('auth.email')} value={driver.email} editable={false} />
        ) : null}
      </View>

      <Card className="gap-4">
        <Text variant="h3">{t('account.preferences')}</Text>

        <View className="gap-2">
          <Text variant="label">{t('account.language')}</Text>
          <Pressable
            testID="personal-language"
            onPress={() => setLangPickerVisible(true)}
            className="rounded-xl border border-border bg-card px-4 py-3"
          >
            <Text variant="label">{languageLabel}</Text>
          </Pressable>
        </View>

        <View className="gap-2">
          <Text variant="label">{t('account.distanceUnit')}</Text>
          <Segmented
            segments={[
              { value: 'miles', label: t('account.unitMiles') },
              { value: 'km', label: t('account.unitKm') },
            ]}
            value={distanceUnit}
            onChange={setDistanceUnit}
          />
        </View>

        <Field
          testID="personal-timezone"
          label={t('account.timezone')}
          value={timezone}
          onChangeText={setTimezone}
          autoCapitalize="none"
          autoCorrect={false}
          error={fieldErrors.timezone}
        />
      </Card>

      <Button
        testID="personal-save"
        title={t('common.save')}
        loading={updateProfile.isPending}
        onPress={() => void onSave()}
      />

      <Sheet
        visible={langPickerVisible}
        onClose={() => setLangPickerVisible(false)}
        title={t('account.language')}
      >
        {LANGUAGE_OPTIONS.map((l) => (
          <Pressable
            key={l.code}
            onPress={() => {
              // Remember the choice; the UI language switches on Save.
              setLanguage(l.code);
              setLangPickerVisible(false);
            }}
            className="py-2"
          >
            <Text variant={l.code === language ? 'label' : 'muted'}>{l.label}</Text>
          </Pressable>
        ))}
      </Sheet>
    </Screen>
  );
}
