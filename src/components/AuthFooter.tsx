// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

import React from 'react';
import { View, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import * as WebBrowser from 'expo-web-browser';
import { Text } from '@/components/ui';
import { useBranding } from '@/features/app-info';
import { APP_NAME, resolveLegalUrls } from '@/lib/config';

// Auth-screen footer: legal links and the operator copyright line. The legal
// links come from the white-label brand config (termsUrl/privacyUrl) when set,
// otherwise from the operator's CSMS portal URL.
export function AuthFooter(): React.JSX.Element {
  const { t } = useTranslation();
  const { data: branding } = useBranding();

  const companyName = branding?.name != null && branding.name !== '' ? branding.name : APP_NAME;
  const year = new Date().getFullYear();
  const { terms, privacy } = resolveLegalUrls(branding?.portalUrl);

  const open = (url: string): void => {
    if (url === '') return;
    void WebBrowser.openBrowserAsync(url);
  };

  return (
    <View className="mt-8 items-center gap-2">
      {terms !== '' || privacy !== '' ? (
        <View className="flex-row items-center gap-3">
          {privacy !== '' ? (
            <Pressable onPress={() => open(privacy)} hitSlop={8}>
              <Text className="text-sm text-primary">{t('account.privacyPolicy')}</Text>
            </Pressable>
          ) : null}
          {terms !== '' && privacy !== '' ? (
            <Text className="text-sm text-muted-foreground">·</Text>
          ) : null}
          {terms !== '' ? (
            <Pressable onPress={() => open(terms)} hitSlop={8}>
              <Text className="text-sm text-primary">{t('account.termsOfService')}</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
      <Text variant="muted" className="text-center text-sm">
        {t('account.allRightsReserved', { year, company: companyName })}
      </Text>
    </View>
  );
}
