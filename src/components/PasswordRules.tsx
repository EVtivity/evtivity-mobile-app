// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

import React from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Text } from '@/components/ui';
import { Check, X } from '@/components/icons';
import { hsl } from '@/lib/theme';
import { PASSWORD_MIN_LENGTH, passwordRuleResults } from '@/lib/password-policy';

// Checklist of the password rules under a field that sets a password, ticked
// off as the driver types.
export function PasswordRules({
  password,
  testID = 'password-rules',
}: {
  password: string;
  testID?: string;
}): React.JSX.Element {
  const { t } = useTranslation();
  return (
    <View className="gap-1" testID={testID}>
      <Text className="text-[13px] text-muted-foreground">{t('auth.passwordNeeds')}</Text>
      {passwordRuleResults(password).map(({ rule, met }) => {
        const label = t(`auth.passwordRule.${rule}`, { min: PASSWORD_MIN_LENGTH });
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
