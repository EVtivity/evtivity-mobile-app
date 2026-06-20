// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

import React from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import * as WebBrowser from 'expo-web-browser';
import { FileText, ShieldCheck, ExternalLink } from '@/components/icons';
import { Screen, Text, Card, ListRow, BackButton } from '@/components/ui';
import { hsl } from '@/lib/theme';
import { APP_NAME, APP_VERSION, resolveLegalUrls } from '@/lib/config';
import { useBranding, useCsmsVersion } from '@/features/app-info';

export default function AboutScreen(): React.JSX.Element {
  const { t } = useTranslation();
  const { data: branding } = useBranding();
  const { data: csms } = useCsmsVersion();

  const companyName = branding?.name != null && branding.name !== '' ? branding.name : APP_NAME;
  const { terms, privacy } = resolveLegalUrls(branding?.portalUrl);
  const year = new Date().getFullYear();

  const addressParts = [
    branding?.street,
    branding?.city,
    branding?.state,
    branding?.zip,
    branding?.country,
  ].filter((p) => p != null && p !== '');

  const open = (url: string): void => {
    if (url === '') return;
    void WebBrowser.openBrowserAsync(url);
  };

  return (
    <Screen scroll>
      <BackButton />
      <Text variant="h1" className="mb-4">
        {t('account.about')}
      </Text>

      <Card className="gap-3">
        <Text variant="h3">{companyName}</Text>
        <View className="flex-row justify-between">
          <Text variant="muted">{t('account.appVersion')}</Text>
          <Text variant="label">{APP_VERSION !== '' ? `v${APP_VERSION}` : t('common.na')}</Text>
        </View>
        <View className="flex-row justify-between">
          <Text variant="muted">{t('account.csmsVersion')}</Text>
          <Text variant="label">{csms?.version != null ? `v${csms.version}` : t('common.na')}</Text>
        </View>
      </Card>

      {terms !== '' || privacy !== '' ? (
        <Card className="p-0 px-4">
          {terms !== '' ? (
            <ListRow
              title={t('account.termsOfService')}
              left={<FileText size={20} color={hsl('mutedForeground')} />}
              right={<ExternalLink size={18} color={hsl('mutedForeground')} />}
              onPress={() => open(terms)}
            />
          ) : null}
          {privacy !== '' ? (
            <ListRow
              title={t('account.privacyPolicy')}
              left={<ShieldCheck size={20} color={hsl('mutedForeground')} />}
              right={<ExternalLink size={18} color={hsl('mutedForeground')} />}
              onPress={() => open(privacy)}
            />
          ) : null}
        </Card>
      ) : null}

      <View className="mt-2 items-center gap-1">
        {addressParts.length > 0 ? (
          <Text variant="muted" className="text-center">
            {addressParts.join(', ')}
          </Text>
        ) : null}
        {branding?.contactEmail != null && branding.contactEmail !== '' ? (
          <Text variant="muted">{branding.contactEmail}</Text>
        ) : null}
        {branding?.supportPhone != null && branding.supportPhone !== '' ? (
          <Text variant="muted">{branding.supportPhone}</Text>
        ) : null}
        <Text variant="muted" className="mt-1 text-xs">
          {t('account.allRightsReserved', { year, company: companyName })}
        </Text>
      </View>
    </Screen>
  );
}
