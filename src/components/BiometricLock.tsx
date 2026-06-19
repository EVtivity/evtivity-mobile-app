// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

import React from 'react';
import { View } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import { usePreventScreenCapture } from 'expo-screen-capture';
import { useTranslation } from 'react-i18next';
import { Button, ScreenBackground } from '@/components/ui';
import { AuthHeader } from '@/components/AuthHeader';
import { useAuth } from '@/lib/auth';
import { APP_NAME } from '@/lib/config';

// Full-screen gate shown when biometric lock is on and the app resumes with a
// live session. Prompts Face ID / Touch ID / fingerprint, falling back to the
// device passcode; on success unlocks.
export function BiometricLock(): React.JSX.Element {
  const { t } = useTranslation();
  const unlock = useAuth((s) => s.unlock);
  const logout = useAuth((s) => s.logout);

  // Hide session content from the app switcher snapshot while locked.
  usePreventScreenCapture();

  const prompt = React.useCallback(async () => {
    const level = await LocalAuthentication.getEnrolledLevelAsync();
    if (level === LocalAuthentication.SecurityLevel.NONE) {
      // The device has no biometrics and no passcode: there is nothing to
      // authenticate against, so do not strand the user behind a lock they
      // cannot satisfy.
      unlock();
      return;
    }
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: t('auth.unlockPrompt', { app: APP_NAME }),
      // Allow the device passcode when biometrics fail, but never silently skip
      // the prompt.
      disableDeviceFallback: false,
    });
    if (result.success) unlock();
  }, [t, unlock]);

  React.useEffect(() => {
    void prompt();
  }, [prompt]);

  return (
    <ScreenBackground>
      <View className="flex-1 justify-center px-8">
        <AuthHeader subtitle={t('auth.unlockSubtitle')} />
        <View className="w-full gap-3">
          <Button title={t('auth.unlock')} onPress={() => void prompt()} />
          <Button title={t('auth.signOut')} variant="ghost" onPress={() => void logout()} />
        </View>
      </View>
    </ScreenBackground>
  );
}
