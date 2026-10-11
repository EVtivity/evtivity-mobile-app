// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

import React from 'react';
import { View, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import * as WebBrowser from 'expo-web-browser';
import { ChevronDown, ChevronRight, ExternalLink } from '@/components/icons';
import { Text, Card, Button } from '@/components/ui';
import { hsl } from '@/lib/theme';
import type { DriverAiConsentDecision } from '@/features/support';

const NOTICE_POINTS = ['automated', 'provider', 'person', 'choice'] as const;
const READS = ['case', 'sessions', 'tokens', 'payments', 'stations', 'reservations'] as const;

interface AiConsentStepProps {
  // The notice version whose text is shown (and sent with the choice).
  noticeVersion: number;
  // Operator privacy policy URL; the link is hidden when empty.
  privacyUrl: string;
  onChoose: (decision: DriverAiConsentDecision) => void;
}

// First step of a new case while the driver AI analysis is on: the versioned
// notice, the data the AI reads, the AI data note, and two equal choices.
// Nothing is preselected and nothing is remembered; the screen sends
// aiConsent only after a press.
export function AiConsentStep({
  noticeVersion,
  privacyUrl,
  onChoose,
}: AiConsentStepProps): React.JSX.Element {
  const { t } = useTranslation();
  const [readsOpen, setReadsOpen] = React.useState(false);
  const notice = `support.ai.notice.v${String(noticeVersion)}`;

  return (
    <View testID="support-ai-consent" className="gap-4">
      <Text variant="h3" accessibilityRole="header">
        {t('support.ai.choiceTitle')}
      </Text>

      <Card className="gap-3">
        <Text weight="semibold">{t(`${notice}.title`)}</Text>
        <View className="gap-2">
          {NOTICE_POINTS.map((point) => (
            <View key={point} className="flex-row gap-2">
              <Text className="text-sm text-muted-foreground">{'•'}</Text>
              <Text className="flex-1 text-sm text-muted-foreground">
                {t(`${notice}.${point}`)}
              </Text>
            </View>
          ))}
        </View>

        <View className="rounded-lg border border-border">
          <Pressable
            testID="support-ai-reads-toggle"
            accessibilityRole="button"
            accessibilityState={{ expanded: readsOpen }}
            onPress={() => setReadsOpen((open) => !open)}
            className="flex-row items-center justify-between px-3 py-3"
          >
            <Text weight="semibold" className="flex-1 text-sm">
              {t(`${notice}.readsTitle`)}
            </Text>
            {readsOpen ? (
              <ChevronDown size={18} color={hsl('mutedForeground')} />
            ) : (
              <ChevronRight size={18} color={hsl('mutedForeground')} />
            )}
          </Pressable>
          {readsOpen ? (
            <View testID="support-ai-reads" className="gap-2 px-3 pb-3">
              {READS.map((item) => (
                <View key={item} className="flex-row gap-2">
                  <Text className="text-sm text-muted-foreground">{'•'}</Text>
                  <Text className="flex-1 text-sm text-muted-foreground">
                    {t(`${notice}.reads.${item}`)}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}
        </View>

        <View className="gap-1">
          <Text weight="semibold" className="text-sm">
            {t('support.ai.dataNotice.title')}
          </Text>
          <Text className="text-sm text-muted-foreground">{t('support.ai.dataNotice.body')}</Text>
        </View>

        {privacyUrl !== '' ? (
          <Pressable
            testID="support-ai-privacy"
            accessibilityRole="link"
            onPress={() => void WebBrowser.openBrowserAsync(privacyUrl)}
            className="flex-row items-center gap-1.5 self-start py-1"
          >
            <Text weight="semibold" className="text-sm text-primary">
              {t(`${notice}.privacy`)}
            </Text>
            <ExternalLink size={14} color={hsl('primary')} />
          </Pressable>
        ) : null}
      </Card>

      <View className="gap-3">
        <Button
          testID="support-ai-choice-ai"
          variant="outline"
          title={t('support.ai.choiceAi')}
          onPress={() => onChoose('granted')}
          className="h-auto min-h-[52px] py-3"
        />
        <Button
          testID="support-ai-choice-team"
          variant="outline"
          title={t('support.ai.choiceTeam')}
          onPress={() => onChoose('declined')}
          className="h-auto min-h-[52px] py-3"
        />
      </View>
    </View>
  );
}
