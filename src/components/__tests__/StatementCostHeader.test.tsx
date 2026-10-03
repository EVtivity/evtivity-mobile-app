// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

// The ui barrel pulls in reanimated (no native worklets under jest). Load only
// the primitives this component renders.
jest.mock('@/components/ui', () => ({
  Text: jest.requireActual('@/components/ui/Text').Text,
}));

import React from 'react';
import { render } from '@testing-library/react-native';
import { initTestI18n } from '@/test-utils/i18n';
import { StatementCostHeader, statementCostLabelKey } from '@/components/StatementCostHeader';

const TAXED = { finalCostCents: 1234, tariffTaxRate: '0.19' };
const UNTAXED = { finalCostCents: 1234, tariffTaxRate: null };

beforeAll(async () => {
  await initTestI18n();
});

describe('statementCostLabelKey', () => {
  it('says incl. tax when any session cost contains tax', () => {
    expect(statementCostLabelKey([UNTAXED, TAXED])).toBe('statement.costInclTax');
  });

  it('says cost when no session has tax', () => {
    expect(statementCostLabelKey([UNTAXED])).toBe('statement.cost');
  });

  it('says cost when a taxed session cost nothing', () => {
    expect(statementCostLabelKey([{ ...TAXED, finalCostCents: 0 }])).toBe('statement.cost');
    expect(statementCostLabelKey([{ ...TAXED, finalCostCents: null }])).toBe('statement.cost');
  });

  it('says cost for a zero tax rate or no sessions', () => {
    expect(statementCostLabelKey([{ ...TAXED, tariffTaxRate: '0' }])).toBe('statement.cost');
    expect(statementCostLabelKey([])).toBe('statement.cost');
  });
});

describe('StatementCostHeader', () => {
  it('reads "Cost (incl. tax)" when a row includes tax', async () => {
    const { getByTestId } = await render(<StatementCostHeader sessions={[UNTAXED, TAXED]} />);
    expect(getByTestId('statement-cost-header')).toHaveTextContent('Cost (incl. tax)');
  });

  it('reads "Cost" without tax', async () => {
    const { getByTestId } = await render(<StatementCostHeader sessions={[UNTAXED]} />);
    expect(getByTestId('statement-cost-header')).toHaveTextContent('Cost', { exact: true });
  });
});
