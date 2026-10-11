// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Check, LifeBuoy } from '@/components/icons';
import { Text, Card, Button } from '@/components/ui';
import { hsl } from '@/lib/theme';
import { isAiAnalyzing, useAiFeedback, type SupportCaseAi } from '@/features/support';

interface AiCaseStatusProps {
  caseId: string;
  ai: SupportCaseAi;
}

// The AI step of a case, under the messages: the analysis status (a polite
// live region), the one feedback question, or the end state. The answer
// itself is the assistant message in the thread. No error code, provider or
// model name is shown.
export function AiCaseStatus({ caseId, ai }: AiCaseStatusProps): React.JSX.Element | null {
  const { t } = useTranslation();
  const feedback = useAiFeedback(caseId);

  if (ai.consent !== 'granted' || ai.state == null) return null;

  const analyzing = isAiAnalyzing(ai);
  const awaiting = ai.state === 'awaiting_feedback';

  let status: React.ReactNode = null;
  if (analyzing) {
    status = (
      <>
        <ActivityIndicator size="small" color={hsl('primary')} />
        <Text className="flex-1 text-sm">{t('support.ai.analyzing')}</Text>
      </>
    );
  } else if (ai.state === 'resolved_by_ai') {
    status = (
      <>
        <Check size={18} color={hsl('success')} />
        <Text className="flex-1 text-sm">{t('support.ai.resolved')}</Text>
      </>
    );
  } else if (!awaiting) {
    // escalated, failed, skipped: the case is with the support team.
    status = (
      <>
        <LifeBuoy size={18} color={hsl('mutedForeground')} />
        <Text className="flex-1 text-sm">
          {t(ai.state === 'escalated' ? 'support.ai.escalated' : 'support.ai.sentToTeam')}
        </Text>
      </>
    );
  }

  return (
    <Card flat testID="support-ai-status" className="gap-3">
      {/* One persistent live region, so the change from analyzing to the
          answer or the end state is announced. */}
      <View
        testID="support-ai-live"
        accessibilityLiveRegion="polite"
        accessibilityRole={analyzing ? 'progressbar' : 'text'}
        accessibilityState={{ busy: analyzing }}
        className={status == null ? 'hidden' : 'flex-row items-center gap-2'}
      >
        {status}
      </View>
      {awaiting ? (
        <View testID="support-ai-feedback" className="gap-2">
          <Text weight="semibold">{t('support.ai.feedbackQuestion')}</Text>
          <View className="flex-row gap-2">
            <Button
              testID="support-ai-feedback-yes"
              variant="outline"
              title={t('support.ai.feedbackYes')}
              disabled={feedback.isPending}
              onPress={() => feedback.mutate(true)}
              className="flex-1"
            />
            <Button
              testID="support-ai-feedback-no"
              variant="outline"
              title={t('support.ai.feedbackNo')}
              disabled={feedback.isPending}
              onPress={() => feedback.mutate(false)}
              className="flex-1"
            />
          </View>
          <Text className="text-xs text-muted-foreground">{t('support.ai.feedbackNoHint')}</Text>
          {feedback.isError ? (
            <Text accessibilityLiveRegion="polite" className="text-sm text-destructive">
              {t('support.ai.feedbackFailed')}
            </Text>
          ) : null}
        </View>
      ) : null}
    </Card>
  );
}
