// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

import React from 'react';
import { View, Switch, Image } from 'react-native';
import { useTranslation } from 'react-i18next';
import { usePreventScreenCapture } from 'expo-screen-capture';
import * as Clipboard from 'expo-clipboard';
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
  useConfirm,
  usePortalNotice,
} from '@/components/ui';
import { PasswordRules } from '@/components/PasswordRules';
import { hsl } from '@/lib/theme';
import { useAuth } from '@/lib/auth';
import { ApiError, apiErrorMessage, getApiErrorFieldDetails, portalPageUrl } from '@/lib/api';
import { driverHoldsFactor, PORTAL_SECURITY_PATH } from '@/lib/mfa';
import { useBranding } from '@/features/app-info';
import { validatePassword } from '@/lib/validation';
import { usePasswordPolicy, useWeakPasswordReply } from '@/features/password-policy';
import type { PasswordRule } from '@/lib/password-policy';
import {
  useChangePassword,
  useMfaStatus,
  useMfaSetup,
  useMfaConfirm,
  type MfaMethod,
} from '@/features/account';

const MFA_METHODS: MfaMethod[] = ['totp', 'email', 'sms'];

function isMfaMethod(value: string): value is MfaMethod {
  return (MFA_METHODS as string[]).includes(value);
}

export default function SecurityScreen(): React.JSX.Element {
  const { t, i18n } = useTranslation();
  const toast = useToast();
  const showApiError = useApiErrorToast();
  const portalNotice = usePortalNotice();
  const confirm = useConfirm();

  // Password and MFA setup (including TOTP secrets) stay off screenshots.
  usePreventScreenCapture();

  const biometricEnabled = useAuth((s) => s.biometricEnabled);
  const setBiometricEnabled = useAuth((s) => s.setBiometricEnabled);

  const mfa = useMfaStatus();
  const changePassword = useChangePassword();
  const mfaSetup = useMfaSetup();
  const mfaConfirm = useMfaConfirm();
  const branding = useBranding();
  // The portal page for the MFA changes this app cannot make (they need a
  // fresh proof of a factor the driver holds).
  const portalSecurityUrl = portalPageUrl(branding.data?.portalUrl, PORTAL_SECURITY_PATH);

  const [currentPassword, setCurrentPassword] = React.useState('');
  const [newPassword, setNewPassword] = React.useState('');
  const policy = usePasswordPolicy();
  const weakPasswordReply = useWeakPasswordReply();
  // The rules a WEAK_PASSWORD reply named, cleared when the password changes.
  const [serverMissing, setServerMissing] = React.useState<PasswordRule[] | null>(null);
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});

  const onChangePassword = async (): Promise<void> => {
    const passwordError = validatePassword(newPassword, t, policy, serverMissing);
    if (passwordError != null) {
      setFieldErrors({ newPassword: passwordError });
      return;
    }
    setFieldErrors({});
    try {
      await changePassword.mutateAsync({ currentPassword, newPassword });
      setCurrentPassword('');
      setNewPassword('');
      toast.show(t('account.passwordChanged'), 'success');
    } catch (err) {
      const weakMissing = weakPasswordReply(err);
      if (weakMissing != null) {
        setServerMissing(weakMissing);
        setFieldErrors({
          newPassword:
            validatePassword(newPassword, t, policy, weakMissing) ?? t('auth.passwordWeak'),
        });
      } else if (err instanceof ApiError) {
        setFieldErrors(getApiErrorFieldDetails(err, t, i18n.language));
        toast.show(apiErrorMessage(err, t, i18n.language), 'error');
      } else {
        toast.show(t('common.offline'), 'error');
      }
    }
  };

  const mfaEnabled = mfa.data?.mfaEnabled ?? false;
  // A driver with a factor (an MFA method or a passkey) adds or removes one in
  // the portal, which asks for that factor.
  const holdsFactor = driverHoldsFactor(mfa.data);
  const availableMethods = (mfa.data?.availableMethods ?? []).filter(isMfaMethod);

  // Setup flow state.
  const [setupVisible, setSetupVisible] = React.useState(false);
  const [selectedMethod, setSelectedMethod] = React.useState<MfaMethod>('totp');
  const [qrDataUri, setQrDataUri] = React.useState<string | undefined>(undefined);
  const [secret, setSecret] = React.useState<string | undefined>(undefined);
  const [challengeId, setChallengeId] = React.useState<number | undefined>(undefined);
  const [code, setCode] = React.useState('');

  // Recovery codes from the MFA confirm, shown this once.
  const [recoveryCodes, setRecoveryCodes] = React.useState<string[] | null>(null);

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
    if (holdsFactor) {
      await portalNotice(t('account.mfaPortalSetup'), portalSecurityUrl);
      return;
    }
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
      showApiError(err, {
        portalPath: PORTAL_SECURITY_PATH,
        portalMessage: t('account.mfaPortalSetup'),
      });
    }
  };

  const onConfirmSetup = async (): Promise<void> => {
    try {
      const reply = await mfaConfirm.mutateAsync({
        method: effectiveMethod,
        code: code.trim(),
        challengeId,
      });
      setSetupVisible(false);
      setCode('');
      if (reply.recoveryCodes != null && reply.recoveryCodes.length > 0) {
        setRecoveryCodes(reply.recoveryCodes);
      }
      await mfa.refetch();
      toast.show(t('account.mfaSetupSuccess'), 'success');
    } catch (err) {
      showApiError(err, {
        portalPath: PORTAL_SECURITY_PATH,
        portalMessage: t('account.mfaPortalSetup'),
      });
    }
  };

  // Turning MFA off needs a fresh proof of a factor, which the portal asks for.
  const onDisable = (): void => {
    void portalNotice(t('account.mfaPortalDisable'), portalSecurityUrl);
  };

  const onCopyRecoveryCodes = async (): Promise<void> => {
    if (recoveryCodes == null) return;
    await Clipboard.setStringAsync(recoveryCodes.join('\n'));
    toast.show(t('account.recoveryCodesCopied'), 'success');
  };

  // The codes are shown once: closing without "I Saved Them" asks first.
  const onCloseRecoveryCodes = async (): Promise<void> => {
    const ok = await confirm({
      title: t('account.recoveryCodesCloseTitle'),
      message: t('account.recoveryCodesCloseMessage'),
      confirmText: t('common.close'),
      destructive: true,
    });
    if (ok) setRecoveryCodes(null);
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
          onChangeText={(value) => {
            setNewPassword(value);
            setServerMissing(null);
          }}
          secureTextEntry
          autoComplete="new-password"
          error={fieldErrors.newPassword}
        />
        <PasswordRules
          password={newPassword}
          policy={policy}
          serverMissing={serverMissing}
          testID="security-password-rules"
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
              testID="security-mfa-disable"
              title={t('account.mfaDisable')}
              variant="destructive"
              onPress={onDisable}
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
              testID="security-mfa-setup"
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
          testID="security-mfa-code"
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
        visible={recoveryCodes != null}
        onClose={() => void onCloseRecoveryCodes()}
        title={t('account.recoveryCodesTitle')}
      >
        <Text variant="muted">{t('account.recoveryCodesPrompt')}</Text>
        <View testID="security-recovery-codes" className="flex-row flex-wrap gap-2">
          {(recoveryCodes ?? []).map((c) => (
            <Text key={c} selectable variant="label" className="w-[47%]">
              {c}
            </Text>
          ))}
        </View>
        <Button
          testID="security-recovery-codes-copy"
          title={t('account.recoveryCodesCopy')}
          variant="outline"
          onPress={() => void onCopyRecoveryCodes()}
        />
        <Button
          testID="security-recovery-codes-saved"
          title={t('account.recoveryCodesSaved')}
          onPress={() => setRecoveryCodes(null)}
        />
      </Sheet>
    </Screen>
  );
}
