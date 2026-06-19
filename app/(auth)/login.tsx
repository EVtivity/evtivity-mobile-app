// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

import React from 'react';
import { View } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Screen, Field, Button, Text, useApiErrorToast } from '@/components/ui';
import { AuthHeader } from '@/components/AuthHeader';
import { AuthFooter } from '@/components/AuthFooter';
import { useAuth } from '@/lib/auth';
import { isMfaRequired } from '@/lib/types';
import { ApiError, getApiErrorFieldDetails } from '@/lib/api';
import { validateEmail } from '@/lib/validation';

export default function LoginScreen(): React.JSX.Element {
  const { t } = useTranslation();
  const router = useRouter();
  const showApiError = useApiErrorToast();
  const login = useAuth((s) => s.login);
  const setMfaPending = useAuth((s) => s.setMfaPending);

  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});
  const [loading, setLoading] = React.useState(false);

  const onSubmit = async (): Promise<void> => {
    const trimmedEmail = email.trim();
    const errs: Record<string, string> = {};
    const emailError = validateEmail(email, t);
    if (emailError != null) errs.email = emailError;
    if (password.length === 0) errs.password = t('auth.passwordRequired');
    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs);
      return;
    }
    setFieldErrors({});
    setLoading(true);
    try {
      const result = await login(trimmedEmail, password);
      if (isMfaRequired(result)) {
        setMfaPending({ mfaToken: result.mfaToken, method: result.mfaMethod });
        router.push('/(auth)/mfa');
      }
      // On success the root navigator redirects into the tabs.
    } catch (err) {
      const details = err instanceof ApiError ? getApiErrorFieldDetails(err) : {};
      if (Object.keys(details).length > 0) {
        setFieldErrors(details);
      } else if (err instanceof ApiError && err.status === 401) {
        // Wrong email/password: inline under the password field where the user is.
        setFieldErrors({ password: t('auth.invalidCredentials') });
      } else {
        // Network/server errors are not a field problem: show a popup with the
        // friendly offline copy instead of the raw "Network request failed".
        showApiError(err);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen scroll>
      <AuthHeader title={t('auth.signIn')} />
      <View className="gap-4">
        <Field labelClassName="text-base"
          testID="login-email"
          label={t('auth.email')}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
          error={fieldErrors.email}
        />
        <Field labelClassName="text-base"
          testID="login-password"
          label={t('auth.password')}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="current-password"
          error={fieldErrors.password}
        />
        <Button testID="login-submit" title={t('auth.signIn')} loading={loading} onPress={() => void onSubmit()} />
        <Link href="/(auth)/forgot-password" className="self-center">
          <Text className="text-base text-primary">{t('auth.forgotPassword')}</Text>
        </Link>
      </View>
      <View className="mt-8 flex-row justify-center gap-1">
        <Text className="text-base text-muted-foreground">{t('auth.noAccount')}</Text>
        <Link href="/(auth)/register">
          <Text weight="semibold" className="text-base text-primary">{t('auth.createOne')}</Text>
        </Link>
      </View>
      <AuthFooter />
    </Screen>
  );
}
