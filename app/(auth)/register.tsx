// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

import React from 'react';
import { View, KeyboardAvoidingView, Platform } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Screen, Field, Button, Text } from '@/components/ui';
import { AuthHeader } from '@/components/AuthHeader';
import { AuthFooter } from '@/components/AuthFooter';
import { useAuth } from '@/lib/auth';
import { isMfaRequired } from '@/lib/types';
import { ApiError, getApiErrorFieldDetails } from '@/lib/api';

const MIN_PASSWORD_LENGTH = 12;

export default function RegisterScreen(): React.JSX.Element {
  const { t } = useTranslation();
  const router = useRouter();
  const register = useAuth((s) => s.register);

  const [firstName, setFirstName] = React.useState('');
  const [lastName, setLastName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});
  const [loading, setLoading] = React.useState(false);

  const onSubmit = async (): Promise<void> => {
    const trimmedEmail = email.trim();
    const errs: Record<string, string> = {};
    if (firstName.trim().length === 0) errs.firstName = t('auth.firstNameRequired');
    if (lastName.trim().length === 0) errs.lastName = t('auth.lastNameRequired');
    if (trimmedEmail.length === 0) errs.email = t('auth.emailRequired');
    else if (!/^\S+@\S+\.\S+$/.test(trimmedEmail)) errs.email = t('auth.emailInvalid');
    if (password.length === 0) errs.password = t('auth.passwordRequired');
    else if (password.length < MIN_PASSWORD_LENGTH)
      errs.password = t('auth.passwordTooShort', { min: MIN_PASSWORD_LENGTH });
    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs);
      return;
    }
    setFieldErrors({});
    setLoading(true);
    try {
      const result = await register({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: trimmedEmail,
        password,
      });
      if (isMfaRequired(result)) {
        router.push({
          pathname: '/(auth)/mfa',
          params: { mfaToken: result.mfaToken, method: result.mfaMethod },
        });
      }
    } catch (err) {
      if (err instanceof ApiError) {
        const details = getApiErrorFieldDetails(err);
        if (Object.keys(details).length > 0) {
          setFieldErrors(details);
        } else {
          setFieldErrors({ email: err.serverMessage ?? t('common.somethingWrong') });
        }
      } else {
        setFieldErrors({ email: t('common.offline') });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen scroll>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <AuthHeader title={t('auth.createAccount')} />
        <View className="gap-4">
          <Field labelClassName="text-base"
            testID="register-firstName"
            label={t('auth.firstName')}
            value={firstName}
            onChangeText={setFirstName}
            autoCapitalize="words"
            error={fieldErrors.firstName}
          />
          <Field labelClassName="text-base"
            testID="register-lastName"
            label={t('auth.lastName')}
            value={lastName}
            onChangeText={setLastName}
            autoCapitalize="words"
            error={fieldErrors.lastName}
          />
          <Field labelClassName="text-base"
            testID="register-email"
            label={t('auth.email')}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            error={fieldErrors.email}
          />
          <Field labelClassName="text-base"
            testID="register-password"
            label={t('auth.password')}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="new-password"
            error={fieldErrors.password}
          />
          <Button testID="register-submit" title={t('auth.createAccount')} loading={loading} onPress={() => void onSubmit()} />
        </View>
        <View className="mt-8 flex-row justify-center gap-1">
          <Text className="text-base text-muted-foreground">{t('auth.haveAccount')}</Text>
          <Link href="/(auth)/login">
            <Text weight="semibold" className="text-base text-primary">{t('auth.signIn')}</Text>
          </Link>
        </View>
        <AuthFooter />
      </KeyboardAvoidingView>
    </Screen>
  );
}
