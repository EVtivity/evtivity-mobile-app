// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

import React from 'react';
import { View } from 'react-native';
import { Link, useRouter, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Screen, Field, Button, Text, useToast } from '@/components/ui';
import { AuthHeader } from '@/components/AuthHeader';
import { AuthFooter } from '@/components/AuthFooter';
import { PasswordRules } from '@/components/PasswordRules';
import { ApiError, getApiErrorFieldDetails, apiErrorMessage } from '@/lib/api';
import { resetPassword } from '@/lib/auth';
import { validatePassword } from '@/lib/validation';

export default function ResetPasswordScreen(): React.JSX.Element {
  const { t } = useTranslation();
  const router = useRouter();
  const toast = useToast();
  const { token } = useLocalSearchParams<{ token?: string }>();

  const [password, setPassword] = React.useState('');
  const [confirm, setConfirm] = React.useState('');
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});
  const [loading, setLoading] = React.useState(false);

  const onSubmit = async (): Promise<void> => {
    const errs: Record<string, string> = {};
    const passwordError = validatePassword(password, t);
    if (passwordError != null) errs.password = passwordError;
    if (password !== confirm) errs.confirmPassword = t('auth.passwordsMustMatch');
    if (token == null || token.length === 0) errs.password = t('auth.invalidResetLink');
    if (Object.keys(errs).length > 0 || token == null) {
      setFieldErrors(errs);
      return;
    }
    setFieldErrors({});
    setLoading(true);
    try {
      await resetPassword(token, password);
      toast.show(t('auth.passwordResetSuccess'), 'success');
      router.replace('/(auth)/login');
    } catch (err) {
      const details = err instanceof ApiError ? getApiErrorFieldDetails(err) : {};
      if (err instanceof ApiError && err.code === 'WEAK_PASSWORD') {
        setFieldErrors({ password: t('auth.passwordWeak') });
      } else if (Object.keys(details).length > 0) {
        setFieldErrors(details);
      } else {
        // Map non-field errors through apiErrorMessage so a network failure shows
        // the friendly offline copy, not the raw "Network request failed".
        setFieldErrors({ password: apiErrorMessage(err, t) });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen scroll>
      <AuthHeader title={t('auth.resetPasswordTitle')} subtitle={t('auth.resetPasswordSubtitle')} />
      <View className="gap-4">
        <Field
          labelClassName="text-base"
          label={t('auth.newPassword')}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoCapitalize="none"
          autoComplete="new-password"
          error={fieldErrors.password}
        />
        <PasswordRules password={password} />
        <Field
          labelClassName="text-base"
          label={t('auth.confirmPassword')}
          value={confirm}
          onChangeText={setConfirm}
          secureTextEntry
          autoCapitalize="none"
          autoComplete="new-password"
          error={fieldErrors.confirmPassword}
        />
        <Button title={t('auth.resetPassword')} loading={loading} onPress={() => void onSubmit()} />
        <Link href="/(auth)/login" className="self-center">
          <Text className="text-base text-primary">{t('auth.backToLogin')}</Text>
        </Link>
      </View>
      <AuthFooter />
    </Screen>
  );
}
