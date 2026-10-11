// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

import React from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Text } from '@/components/ui';
import { SURFACE_TEXT_VARS } from '@/lib/theme';
import { formatDateTime } from '@/lib/format';
import { knownDriverActions } from '@/features/support';
import type { SupportMessage } from '@/lib/types';

interface AssistantMessageProps {
  message: SupportMessage;
  // Suggested driver actions, shown on the latest automatic answer only.
  driverActions?: readonly string[];
}

// The automatic answer of the driver AI support: labeled, styled apart from
// operator messages, with the suggested driver actions as chips. No provider
// or model name.
export function AssistantMessage({
  message,
  driverActions,
}: AssistantMessageProps): React.JSX.Element {
  const { t } = useTranslation();
  const actions = knownDriverActions(driverActions);
  return (
    <View testID="support-ai-answer" className="w-full items-start">
      <View
        style={SURFACE_TEXT_VARS}
        className="max-w-[90%] gap-2 rounded-2xl border border-primary/40 bg-primary/10 px-4 py-3"
      >
        <Text weight="semibold" className="text-xs uppercase tracking-wide text-primary">
          {t('support.ai.answerTitle')}
        </Text>
        <Text className="text-base leading-relaxed text-foreground">{message.body}</Text>
        {actions.length > 0 ? (
          <View className="flex-row flex-wrap gap-2 pt-1">
            {actions.map((code) => (
              <View
                key={code}
                testID={`support-ai-action-${code}`}
                className="rounded-full border border-border bg-card px-3 py-1.5"
              >
                <Text className="text-xs text-foreground">
                  {t(`support.ai.driverAction.${code}`)}
                </Text>
              </View>
            ))}
          </View>
        ) : null}
      </View>
      <Text className="mt-1 px-1 text-xs text-muted-foreground">
        {formatDateTime(message.createdAt)}
      </Text>
    </View>
  );
}
