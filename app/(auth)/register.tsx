// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

import React from 'react';
import { View } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Screen, Field, Button, Text } from '@/components/ui';
import { AuthHeader } from '@/components/AuthHeader';
import { AuthFooter } from '@/components/AuthFooter';
import { PasswordRules } from '@/components/PasswordRules';
import { useAuth } from '@/lib/auth';
import { ApiError, getApiErrorFieldDetails, apiErrorMessage } from '@/lib/api';
import { validateEmail, validatePassword } from '@/lib/validation';
import { usePasswordPolicy, useWeakPasswordReply } from '@/features/password-policy';
import type { PasswordRule } from '@/lib/password-policy';

export default function RegisterScreen(): React.JSX.Element {
  const { t } = useTranslation();
  const router = useRouter();
  const register = useAuth((s) => s.register);

  const [firstName, setFirstName] = React.useState('');
  const [lastName, setLastName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const policy = usePasswordPolicy();
  const weakPasswordReply = useWeakPasswordReply();
  const [password, setPassword] = React.useState('');
  // The rules a WEAK_PASSWORD reply named, cleared when the password changes.
  const [serverMissing, setServerMissing] = React.useState<PasswordRule[] | null>(null);
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});
  const [loading, setLoading] = React.useState(false);
  // Set once the API accepted the request: the screen then asks to check the inbox.
  const [submittedEmail, setSubmittedEmail] = React.useState<string | null>(null);

  const onSubmit = async (): Promise<void> => {
    const trimmedEmail = email.trim();
    const errs: Record<string, string> = {};
    if (firstName.trim().length === 0) errs.firstName = t('auth.firstNameRequired');
    if (lastName.trim().length === 0) errs.lastName = t('auth.lastNameRequired');
    const emailError = validateEmail(email, t);
    if (emailError != null) errs.email = emailError;
    const passwordError = validatePassword(password, t, policy, serverMissing);
    if (passwordError != null) errs.password = passwordError;
    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs);
      return;
    }
    setFieldErrors({});
    setLoading(true);
    try {
      // Same answer for a new and a known email, and no sign-in: the driver
      // opens the emailed link, then signs in.
      await register({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: trimmedEmail,
        password,
      });
      setSubmittedEmail(trimmedEmail);
    } catch (err) {
      const details = err instanceof ApiError ? getApiErrorFieldDetails(err) : {};
      const weakMissing = weakPasswordReply(err);
      if (weakMissing != null) {
        setServerMissing(weakMissing);
        setFieldErrors({
          password: validatePassword(password, t, policy, weakMissing) ?? apiErrorMessage(err, t),
        });
      } else if (Object.keys(details).length > 0) {
        setFieldErrors(details);
      } else {
        // Non-field errors map through apiErrorMessage so a network failure shows
        // the friendly offline copy, not the raw "Network request failed".
        setFieldErrors({ email: apiErrorMessage(err, t) });
      }
    } finally {
      setLoading(false);
    }
  };

  if (submittedEmail != null) {
    return (
      <Screen scroll>
        <AuthHeader title={t('auth.registerCheckEmailTitle')} />
        <View className="gap-4">
          <Text testID="register-check-email" className="text-base text-muted-foreground">
            {t('auth.registerCheckEmail', { email: submittedEmail })}
          </Text>
          <Button
            testID="register-back-to-login"
            title={t('auth.backToLogin')}
            onPress={() => router.replace('/(auth)/login')}
          />
        </View>
        <AuthFooter />
      </Screen>
    );
  }

  return (
    <Screen scroll>
      <AuthHeader title={t('auth.createAccount')} />
      <View className="gap-4">
        <Field
          labelClassName="text-base"
          testID="register-firstName"
          label={t('auth.firstName')}
          value={firstName}
          onChangeText={setFirstName}
          autoCapitalize="words"
          error={fieldErrors.firstName}
        />
        <Field
          labelClassName="text-base"
          testID="register-lastName"
          label={t('auth.lastName')}
          value={lastName}
          onChangeText={setLastName}
          autoCapitalize="words"
          error={fieldErrors.lastName}
        />
        <Field
          labelClassName="text-base"
          testID="register-email"
          label={t('auth.email')}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
          error={fieldErrors.email}
        />
        <Field
          labelClassName="text-base"
          testID="register-password"
          label={t('auth.password')}
          value={password}
          onChangeText={(value) => {
            setPassword(value);
            setServerMissing(null);
          }}
          secureTextEntry
          autoComplete="new-password"
          error={fieldErrors.password}
        />
        <PasswordRules password={password} policy={policy} serverMissing={serverMissing} />
        <Button
          testID="register-submit"
          title={t('auth.createAccount')}
          loading={loading}
          onPress={() => void onSubmit()}
        />
      </View>
      <View className="mt-8 flex-row justify-center gap-1">
        <Text className="text-base text-muted-foreground">{t('auth.haveAccount')}</Text>
        <Link href="/(auth)/login">
          <Text weight="semibold" className="text-base text-primary">
            {t('auth.signIn')}
          </Text>
        </Link>
      </View>
      <AuthFooter />
    </Screen>
  );
}
