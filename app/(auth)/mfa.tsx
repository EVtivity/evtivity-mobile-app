// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

import React from 'react';
import { View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Screen, Field, Button, FormSuccess } from '@/components/ui';
import { AuthHeader } from '@/components/AuthHeader';
import { AuthFooter } from '@/components/AuthFooter';
import { useAuth } from '@/lib/auth';
import { api, apiErrorMessage } from '@/lib/api';

export default function MfaScreen(): React.JSX.Element {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ mfaToken: string; method: string }>();
  const verifyMfa = useAuth((s) => s.verifyMfa);

  const [code, setCode] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [resent, setResent] = React.useState(false);

  const mfaToken = params.mfaToken ?? '';
  const canResend = params.method === 'email' || params.method === 'sms';
  const methodLabel =
    params.method === 'totp'
      ? t('auth.mfaMethodTotp')
      : params.method === 'sms'
        ? t('auth.mfaMethodSms')
        : t('auth.mfaMethodEmail');

  const onVerify = async (): Promise<void> => {
    if (code.trim().length === 0) {
      setError(t('auth.codeRequired'));
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await verifyMfa(mfaToken, code.trim());
      // Root navigator redirects on success.
    } catch (err) {
      setError(apiErrorMessage(err, t));
    } finally {
      setLoading(false);
    }
  };

  const onResend = async (): Promise<void> => {
    try {
      await api.post('/v1/portal/auth/mfa/resend', { mfaToken }, { auth: false });
      setResent(true);
    } catch {
      setError(t('common.somethingWrong'));
    }
  };

  return (
    <Screen scroll>
      <AuthHeader
        title={t('auth.mfaTitle')}
        subtitle={t('auth.mfaSubtitle', { method: methodLabel })}
      />
      <View className="gap-4">
        <Field labelClassName="text-base"
          label={t('auth.mfaPrompt')}
          value={code}
          onChangeText={setCode}
          keyboardType="number-pad"
          maxLength={6}
          autoFocus
          error={error ?? undefined}
        />
        {resent ? <FormSuccess message={t('auth.mfaResend')} /> : null}
        <Button title={t('auth.mfaVerify')} loading={loading} onPress={() => void onVerify()} />
        {canResend ? (
          <Button title={t('auth.mfaResend')} variant="ghost" onPress={() => void onResend()} />
        ) : null}
      </View>
      <AuthFooter />
    </Screen>
  );
}
