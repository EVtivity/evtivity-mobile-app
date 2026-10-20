// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

import React from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Text } from '@/components/ui';
import { Check, X } from '@/components/icons';
import { hsl } from '@/lib/theme';
import { passwordChecklist, type PasswordPolicy, type PasswordRule } from '@/lib/password-policy';
import { passwordRuleLabel } from '@/lib/validation';

// Checklist of the password rules under a field that sets a password, ticked
// off as the driver types. The rules come from the live policy
// (usePasswordPolicy); the maximum length shows only once the password exceeds
// it, and rules a WEAK_PASSWORD reply named stay unmet until the password changes.
export function PasswordRules({
  password,
  policy,
  serverMissing,
  testID = 'password-rules',
}: {
  password: string;
  policy: PasswordPolicy;
  serverMissing?: readonly PasswordRule[] | null;
  testID?: string;
}): React.JSX.Element {
  const { t } = useTranslation();
  return (
    <View className="gap-1" testID={testID}>
      <Text className="text-[13px] text-muted-foreground">{t('auth.passwordNeeds')}</Text>
      {passwordChecklist(password, policy, serverMissing).map(({ rule, met }) => {
        const label = passwordRuleLabel(rule, policy, t);
        const state = met ? t('auth.passwordRuleMet') : t('auth.passwordRuleNotMet');
        return (
          <View
            key={rule}
            className="flex-row items-center gap-2"
            testID={`${testID}-${rule}`}
            accessible
            accessibilityLabel={`${label}, ${state}`}
          >
            {met ? (
              <Check size={14} color={hsl('success')} />
            ) : (
              <X size={14} color={hsl('mutedForeground')} />
            )}
            <Text
              className={met ? 'text-[13px] text-success' : 'text-[13px] text-muted-foreground'}
            >
              {label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}
