// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

import React from 'react';
import { View, Switch, Image } from 'react-native';
import { useTranslation } from 'react-i18next';
import { usePreventScreenCapture } from 'expo-screen-capture';
import {
  Screen,
  Text,
  Field,
  Button,
  Card,
  Badge,
  Segmented,
  Sheet,
  BackButton,
  useToast,
  useApiErrorToast,
} from '@/components/ui';
import { hsl } from '@/lib/theme';
import { useAuth } from '@/lib/auth';
import { ApiError, getApiErrorFieldDetails } from '@/lib/api';
import {
  useChangePassword,
  useMfaStatus,
  useMfaSetup,
  useMfaConfirm,
  useMfaDisable,
  type MfaMethod,
} from '@/features/account';

const MFA_METHODS: MfaMethod[] = ['totp', 'email', 'sms'];

function isMfaMethod(value: string): value is MfaMethod {
  return (MFA_METHODS as string[]).includes(value);
}

export default function SecurityScreen(): React.JSX.Element {
  const { t } = useTranslation();
  const toast = useToast();
  const showApiError = useApiErrorToast();

  // Password and MFA setup (including TOTP secrets) stay off screenshots.
  usePreventScreenCapture();

  const biometricEnabled = useAuth((s) => s.biometricEnabled);
  const setBiometricEnabled = useAuth((s) => s.setBiometricEnabled);

  const mfa = useMfaStatus();
  const changePassword = useChangePassword();
  const mfaSetup = useMfaSetup();
  const mfaConfirm = useMfaConfirm();
  const mfaDisable = useMfaDisable();

  const [currentPassword, setCurrentPassword] = React.useState('');
  const [newPassword, setNewPassword] = React.useState('');
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});

  const onChangePassword = async (): Promise<void> => {
    setFieldErrors({});
    try {
      await changePassword.mutateAsync({ currentPassword, newPassword });
      setCurrentPassword('');
      setNewPassword('');
      toast.show(t('account.passwordChanged'), 'success');
    } catch (err) {
      if (err instanceof ApiError) {
        setFieldErrors(getApiErrorFieldDetails(err));
        toast.show(err.serverMessage ?? t('common.somethingWrong'), 'error');
      } else {
        toast.show(t('common.offline'), 'error');
      }
    }
  };

  const mfaEnabled = mfa.data?.mfaEnabled ?? false;
  const availableMethods = (mfa.data?.availableMethods ?? []).filter(isMfaMethod);

  // Setup flow state.
  const [setupVisible, setSetupVisible] = React.useState(false);
  const [selectedMethod, setSelectedMethod] = React.useState<MfaMethod>('totp');
  const [qrDataUri, setQrDataUri] = React.useState<string | undefined>(undefined);
  const [secret, setSecret] = React.useState<string | undefined>(undefined);
  const [challengeId, setChallengeId] = React.useState<number | undefined>(undefined);
  const [code, setCode] = React.useState('');

  // Disable flow state.
  const [disableVisible, setDisableVisible] = React.useState(false);
  const [disablePassword, setDisablePassword] = React.useState('');

  const effectiveMethod: MfaMethod = availableMethods.includes(selectedMethod)
    ? selectedMethod
    : (availableMethods[0] ?? 'totp');

  const methodLabel = (method: string): string => {
    if (method === 'totp') return t('account.mfaTotp');
    if (method === 'email') return t('account.mfaEmail');
    if (method === 'sms') return t('account.mfaSms');
    return method;
  };

  const onStartSetup = async (): Promise<void> => {
    setCode('');
    setQrDataUri(undefined);
    setSecret(undefined);
    setChallengeId(undefined);
    try {
      const result = await mfaSetup.mutateAsync(effectiveMethod);
      setQrDataUri(result.qrDataUri);
      setSecret(result.secret);
      setChallengeId(result.challengeId);
      setSetupVisible(true);
    } catch (err) {
      showApiError(err);
    }
  };

  const onConfirmSetup = async (): Promise<void> => {
    try {
      await mfaConfirm.mutateAsync({ method: effectiveMethod, code: code.trim(), challengeId });
      setSetupVisible(false);
      setCode('');
      await mfa.refetch();
      toast.show(t('account.mfaSetupSuccess'), 'success');
    } catch (err) {
      showApiError(err);
    }
  };

  const onDisable = async (): Promise<void> => {
    try {
      await mfaDisable.mutateAsync(disablePassword);
      setDisableVisible(false);
      setDisablePassword('');
      await mfa.refetch();
      toast.show(t('account.mfaDisabledSuccess'), 'success');
    } catch (err) {
      showApiError(err);
    }
  };

  return (
    <Screen scroll>
      <BackButton />
      <Text variant="h1" className="mb-4">
        {t('account.security')}
      </Text>

      <Card className="gap-4">
        <Text variant="h3">{t('account.changePassword')}</Text>
        <Field
          testID="security-current-password"
          label={t('auth.password')}
          value={currentPassword}
          onChangeText={setCurrentPassword}
          secureTextEntry
          autoComplete="current-password"
          error={fieldErrors.currentPassword}
        />
        <Field
          testID="security-new-password"
          label={t('account.newPassword')}
          value={newPassword}
          onChangeText={setNewPassword}
          secureTextEntry
          autoComplete="new-password"
          error={fieldErrors.newPassword}
        />
        <Button
          testID="security-change-password"
          title={t('account.changePassword')}
          loading={changePassword.isPending}
          disabled={currentPassword.length === 0 || newPassword.length === 0}
          onPress={() => void onChangePassword()}
        />
      </Card>

      <Card className="gap-3">
        <View className="flex-row items-center justify-between">
          <Text variant="h3">{t('account.mfa')}</Text>
          <Badge
            label={mfaEnabled ? t('account.mfaEnabled') : t('account.mfaDisabled')}
            variant={mfaEnabled ? 'success' : 'secondary'}
          />
        </View>

        {mfaEnabled ? (
          <>
            {mfa.data?.mfaMethod != null ? (
              <View className="flex-row justify-between">
                <Text variant="muted">{t('account.mfaMethod')}</Text>
                <Text variant="label">{methodLabel(mfa.data.mfaMethod)}</Text>
              </View>
            ) : null}
            <Button
              title={t('account.mfaDisable')}
              variant="destructive"
              onPress={() => {
                setDisablePassword('');
                setDisableVisible(true);
              }}
            />
          </>
        ) : (
          <>
            <Text variant="muted">{t('account.mfaSetupPrompt')}</Text>
            {availableMethods.length > 0 ? (
              <Segmented<MfaMethod>
                segments={availableMethods.map((m) => ({ value: m, label: methodLabel(m) }))}
                value={effectiveMethod}
                onChange={setSelectedMethod}
              />
            ) : null}
            <Button
              title={t('account.mfaSetup')}
              loading={mfaSetup.isPending}
              disabled={availableMethods.length === 0}
              onPress={() => void onStartSetup()}
            />
          </>
        )}
      </Card>

      <Card className="flex-row items-center justify-between">
        <View className="flex-1 pr-3">
          <Text variant="label">{t('account.biometricLock')}</Text>
        </View>
        <Switch
          value={biometricEnabled}
          onValueChange={(v) => void setBiometricEnabled(v)}
          trackColor={{ true: hsl('primary'), false: hsl('muted') }}
        />
      </Card>

      <Sheet
        visible={setupVisible}
        onClose={() => setSetupVisible(false)}
        title={methodLabel(effectiveMethod)}
      >
        {effectiveMethod === 'totp' ? (
          <View className="items-center gap-3">
            {qrDataUri != null ? (
              <Image source={{ uri: qrDataUri }} style={{ width: 200, height: 200 }} />
            ) : null}
            {secret != null ? (
              <Text selectable variant="muted" className="text-center">
                {secret}
              </Text>
            ) : null}
          </View>
        ) : (
          <Text variant="muted">{t('account.mfaCodeSent')}</Text>
        )}
        <Field
          label={t('auth.mfaPrompt')}
          value={code}
          onChangeText={setCode}
          keyboardType="number-pad"
          maxLength={6}
        />
        <Button
          title={t('auth.mfaVerify')}
          loading={mfaConfirm.isPending}
          disabled={code.trim().length === 0}
          onPress={() => void onConfirmSetup()}
        />
      </Sheet>

      <Sheet
        visible={disableVisible}
        onClose={() => setDisableVisible(false)}
        title={t('account.mfaDisable')}
      >
        <Text variant="muted">{t('account.mfaDisablePrompt')}</Text>
        <Field
          label={t('auth.password')}
          value={disablePassword}
          onChangeText={setDisablePassword}
          secureTextEntry
          autoComplete="current-password"
        />
        <Button
          title={t('account.mfaDisable')}
          variant="destructive"
          loading={mfaDisable.isPending}
          disabled={disablePassword.length === 0}
          onPress={() => void onDisable()}
        />
      </Sheet>
    </Screen>
  );
}
