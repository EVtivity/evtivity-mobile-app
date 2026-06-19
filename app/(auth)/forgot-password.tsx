// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

import React from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Screen, Field, Button, FormSuccess } from '@/components/ui';
import { AuthHeader } from '@/components/AuthHeader';
import { AuthFooter } from '@/components/AuthFooter';
import { api } from '@/lib/api';
import { validateEmail } from '@/lib/validation';

export default function ForgotPasswordScreen(): React.JSX.Element {
  const { t } = useTranslation();
  const router = useRouter();
  const [email, setEmail] = React.useState('');
  const [emailError, setEmailError] = React.useState<string | undefined>(undefined);
  const [sent, setSent] = React.useState(false);
  const [loading, setLoading] = React.useState(false);

  const onSubmit = async (): Promise<void> => {
    const trimmedEmail = email.trim();
    const emailError = validateEmail(email, t);
    if (emailError != null) {
      setEmailError(emailError);
      return;
    }
    setEmailError(undefined);
    setLoading(true);
    try {
      await api.post(
        '/v1/portal/auth/forgot-password',
        { email: trimmedEmail },
        { auth: false, attest: true },
      );
    } catch {
      // The endpoint is intentionally non-revealing; show the same message
      // regardless so account existence is not leaked.
    } finally {
      setLoading(false);
      setSent(true);
    }
  };

  return (
    <Screen scroll>
      <AuthHeader
        title={t('auth.forgotPasswordTitle')}
        subtitle={t('auth.forgotPasswordSubtitle')}
      />
      <View className="gap-4">
        {sent ? (
          <FormSuccess message={t('auth.resetLinkSent')} />
        ) : (
          <>
            <Field labelClassName="text-base"
              testID="forgot-email"
              label={t('auth.email')}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              error={emailError}
            />
            <Button testID="forgot-submit" title={t('auth.sendResetLink')} loading={loading} onPress={() => void onSubmit()} />
          </>
        )}
        <Button title={t('auth.backToLogin')} variant="ghost" onPress={() => router.back()} />
      </View>
      <AuthFooter />
    </Screen>
  );
}
