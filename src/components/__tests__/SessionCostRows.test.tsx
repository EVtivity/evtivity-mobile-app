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
import { SessionCostRows } from '@/components/SessionCostRows';

// A 12.34 EUR session cost that contains 1.97 tax at 19%, as the API splits it.
const SPLIT = { netCents: 1037, taxCents: 197, taxRate: '0.19' };

beforeAll(async () => {
  await initTestI18n();
});

describe('SessionCostRows', () => {
  it('gross: shows the total and the tax it contains', async () => {
    const { getByText, queryByTestId } = await render(
      <SessionCostRows
        costCents={1234}
        currency="EUR"
        isActive={false}
        {...SPLIT}
        priceDisplay="gross"
      />,
    );
    expect(getByText('Total cost (incl. tax)')).toBeTruthy();
    expect(getByText('€12.34')).toBeTruthy();
    expect(getByText('Tax included (19%)')).toBeTruthy();
    expect(getByText('€1.97')).toBeTruthy();
    expect(queryByTestId('session-net-cost')).toBeNull();
  });

  it('net: shows the net amount, the tax, and the total', async () => {
    const { getByText } = await render(
      <SessionCostRows
        costCents={1234}
        currency="EUR"
        isActive={false}
        {...SPLIT}
        priceDisplay="net"
      />,
    );
    expect(getByText('Net amount (before tax)')).toBeTruthy();
    expect(getByText('€10.37')).toBeTruthy();
    expect(getByText('Tax (19%)')).toBeTruthy();
    expect(getByText('€1.97')).toBeTruthy();
    expect(getByText('Total cost (incl. tax)')).toBeTruthy();
    expect(getByText('€12.34')).toBeTruthy();
  });

  it('labels a running session cost', async () => {
    const { getByText } = await render(
      <SessionCostRows costCents={1234} currency="EUR" isActive {...SPLIT} priceDisplay="gross" />,
    );
    expect(getByText('Cost (incl. tax)')).toBeTruthy();
  });

  // Tariffs with different tax rates applied: the API returns no rate.
  const MIXED = { netCents: 1000, taxCents: 130, taxRate: null };

  it('gross: shows no percent for mixed tax rates', async () => {
    const { getByText } = await render(
      <SessionCostRows
        costCents={1130}
        currency="EUR"
        isActive={false}
        {...MIXED}
        priceDisplay="gross"
      />,
    );
    expect(getByText('Tax included')).toBeTruthy();
  });

  it('net: shows no percent for mixed tax rates', async () => {
    const { getByText } = await render(
      <SessionCostRows
        costCents={1130}
        currency="EUR"
        isActive={false}
        {...MIXED}
        priceDisplay="net"
      />,
    );
    expect(getByText('Tax')).toBeTruthy();
  });

  it('shows only the total without a tax split', async () => {
    const { getByText, queryByTestId } = await render(
      <SessionCostRows
        costCents={1234}
        currency="EUR"
        isActive={false}
        netCents={null}
        taxCents={null}
        taxRate={null}
        priceDisplay="net"
      />,
    );
    expect(getByText('Total cost')).toBeTruthy();
    expect(getByText('€12.34')).toBeTruthy();
    expect(queryByTestId('session-tax')).toBeNull();
    expect(queryByTestId('session-net-cost')).toBeNull();
  });

  it('waits with the tax rows while the price display is loading', async () => {
    const { getByText, queryByTestId } = await render(
      <SessionCostRows costCents={1234} currency="EUR" isActive {...SPLIT} priceDisplay={null} />,
    );
    expect(getByText('Cost (incl. tax)')).toBeTruthy();
    expect(queryByTestId('session-tax')).toBeNull();
  });
});
