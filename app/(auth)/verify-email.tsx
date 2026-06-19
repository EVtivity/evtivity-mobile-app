// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

import React from 'react';
import { View } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Check, AlertTriangle, Mail } from '@/components/icons';
import { Screen, Button, Text, Spinner } from '@/components/ui';
import { AuthHeader } from '@/components/AuthHeader';
import { AuthFooter } from '@/components/AuthFooter';
import { api, apiErrorMessage } from '@/lib/api';
import { hsl } from '@/lib/theme';

type Status = 'loading' | 'success' | 'error' | 'missing';

export default function VerifyEmailScreen(): React.JSX.Element {
  const { t } = useTranslation();
  const router = useRouter();
  const { token } = useLocalSearchParams<{ token?: string }>();

  const [status, setStatus] = React.useState<Status>(
    token == null || token.length === 0 ? 'missing' : 'loading',
  );
  const [error, setError] = React.useState<unknown>(null);

  React.useEffect(() => {
    if (token == null || token.length === 0) return;
    let active = true;
    void (async () => {
      try {
        await api.post('/v1/portal/auth/verify-email', { token }, { auth: false });
        if (active) setStatus('success');
      } catch (err) {
        if (!active) return;
        setError(err);
        setStatus('error');
      }
    })();
    return () => {
      active = false;
    };
  }, [token]);

  return (
    <Screen scroll>
      <AuthHeader title={t('auth.verifyEmailTitle')} />
      <View className="items-center gap-4 py-4">
        {status === 'loading' ? (
          <>
            <Spinner />
            <Text className="text-center text-base leading-relaxed text-foreground/70">
              {t('auth.verifyEmailChecking')}
            </Text>
          </>
        ) : status === 'success' ? (
          <>
            <Check size={48} color={hsl('success')} />
            <Text variant="h3" className="text-center">{t('auth.verifyEmailSuccess')}</Text>
            <Button title={t('auth.backToLogin')} onPress={() => router.replace('/(auth)/login')} />
          </>
        ) : status === 'missing' ? (
          <>
            <Mail size={48} color={hsl('mutedForeground')} />
            <Text className="text-center text-base leading-relaxed text-foreground/70">
              {t('auth.verifyEmailCheckInbox')}
            </Text>
            <Button title={t('auth.backToLogin')} variant="outline" onPress={() => router.replace('/(auth)/login')} />
          </>
        ) : (
          <>
            <AlertTriangle size={48} color={hsl('destructive')} />
            <Text variant="h3" className="text-center">{t('auth.verifyEmailFailed')}</Text>
            <Text className="text-center text-base leading-relaxed text-foreground/70">
              {apiErrorMessage(error, t)}
            </Text>
            <Button title={t('auth.backToLogin')} onPress={() => router.replace('/(auth)/login')} />
          </>
        )}
      </View>
      <AuthFooter />
    </Screen>
  );
}
