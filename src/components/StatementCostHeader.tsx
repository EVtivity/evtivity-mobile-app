// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

import React from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Text } from '@/components/ui';
import { costIncludesTax } from '@/lib/price-display';
import type { MonthlyStatement } from '@/features/sessions';

type StatementSession = Pick<
  MonthlyStatement['sessions'][number],
  'finalCostCents' | 'tariffTaxRate'
>;

// The statement cost column (and its total) reads "incl. tax" only when a
// session's cost actually contains tax. Mirrors the driver portal statement.
export function statementCostLabelKey(
  sessions: readonly StatementSession[],
): 'statement.costInclTax' | 'statement.cost' {
  return sessions.some((s) => costIncludesTax(s.finalCostCents, s.tariffTaxRate))
    ? 'statement.costInclTax'
    : 'statement.cost';
}

// Header above the itemized sessions, aligned with each row's cost.
export function StatementCostHeader({
  sessions,
}: {
  sessions: readonly StatementSession[];
}): React.JSX.Element {
  const { t } = useTranslation();
  return (
    <View className="flex-row justify-end pt-4">
      <Text testID="statement-cost-header" variant="muted">
        {t(statementCostLabelKey(sessions))}
      </Text>
    </View>
  );
}
