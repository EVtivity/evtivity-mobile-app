// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

// The ui barrel pulls in reanimated (no native worklets under jest). Load only
// the primitives this component renders.
jest.mock('@/components/ui', () => ({
  Text: jest.requireActual('@/components/ui/Text').Text,
  StatusBadge: jest.requireActual('@/components/ui/StatusBadge').StatusBadge,
}));

import React from 'react';
import { render } from '@testing-library/react-native';
import { initTestI18n } from '@/test-utils/i18n';
import { SessionRow } from '@/components/SessionRow';
import type { ChargingSession } from '@/lib/types';

const SESSION: ChargingSession = {
  id: 'ses_1',
  stationId: 'CS-1',
  stationName: 'CS-1',
  status: 'completed',
  startedAt: '2026-01-02T10:00:00Z',
  endedAt: '2026-01-02T11:00:00Z',
  energyDeliveredWh: 10_000,
  finalCostCents: 1234,
  currency: 'EUR',
  tariffTaxRate: '0.19',
};

beforeAll(async () => {
  await initTestI18n();
});

describe('SessionRow', () => {
  it('says the cost includes tax when the tariff had tax', async () => {
    const { getByTestId } = await render(<SessionRow session={SESSION} />);
    expect(getByTestId('session-row-cost-ses_1')).toHaveTextContent('€12.34 incl. tax');
  });

  it('shows the plain amount without tax', async () => {
    const { getByTestId } = await render(
      <SessionRow session={{ ...SESSION, tariffTaxRate: null }} />,
    );
    expect(getByTestId('session-row-cost-ses_1')).toHaveTextContent('€12.34', { exact: true });
  });

  it('shows the plain amount for a zero cost', async () => {
    const { getByTestId } = await render(
      <SessionRow session={{ ...SESSION, finalCostCents: 0 }} />,
    );
    expect(getByTestId('session-row-cost-ses_1')).toHaveTextContent('€0.00', { exact: true });
  });

  it('formats the cost in the session currency', async () => {
    const { getByTestId } = await render(
      <SessionRow session={{ ...SESSION, currency: 'GBP', tariffTaxRate: null }} />,
    );
    expect(getByTestId('session-row-cost-ses_1')).toHaveTextContent('£12.34', { exact: true });
  });
});
