// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

// The ui barrel pulls in reanimated (no native worklets under jest). Load only
// the primitives this component renders.
jest.mock('@/components/ui', () => ({
  Card: jest.requireActual('@/components/ui/Card').Card,
  Text: jest.requireActual('@/components/ui/Text').Text,
}));

import React from 'react';
import { render } from '@testing-library/react-native';
import { initTestI18n } from '@/test-utils/i18n';
import { PricingCard } from '@/components/PricingCard';
import type { PricingInfo } from '@/features/charge';

const PRICING: PricingInfo = {
  currency: 'EUR',
  pricePerKwh: '0.2152',
  pricePerMinute: null,
  pricePerSession: '1.00',
  idleFeePricePerMinute: '0',
  taxRate: '0.19',
  isFreeVend: false,
};

beforeAll(async () => {
  await initTestI18n();
});

describe('PricingCard', () => {
  it('shows net prices and says tax is added on top', async () => {
    const { getByText } = await render(<PricingCard pricing={PRICING} priceDisplay="net" />);
    expect(getByText('€0.2152/kWh · €1.00 session')).toBeTruthy();
    expect(getByText('Prices exclude 19% tax, which is added to the amount charged')).toBeTruthy();
  });

  it('shows gross prices with the tax rate added', async () => {
    const { getByText } = await render(<PricingCard pricing={PRICING} priceDisplay="gross" />);
    expect(getByText('€0.2561/kWh · €1.19 session')).toBeTruthy();
    expect(getByText('Prices include 19% tax')).toBeTruthy();
  });

  it('shows no tax note without a tax rate', async () => {
    const { getByText, queryByTestId } = await render(
      <PricingCard pricing={{ ...PRICING, taxRate: null }} priceDisplay="gross" />,
    );
    expect(getByText('€0.2152/kWh · €1.00 session')).toBeTruthy();
    expect(queryByTestId('pricing-tax-note')).toBeNull();
  });

  it('formats a fractional tax rate without trailing zeros', async () => {
    const { getByText } = await render(
      <PricingCard pricing={{ ...PRICING, taxRate: '0.075' }} priceDisplay="gross" />,
    );
    expect(getByText('Prices include 7.5% tax')).toBeTruthy();
  });

  it('shows free charging for free vend', async () => {
    const { getByText, queryByTestId } = await render(
      <PricingCard pricing={{ ...PRICING, isFreeVend: true }} priceDisplay="net" />,
    );
    expect(getByText('Free')).toBeTruthy();
    expect(queryByTestId('pricing-tax-note')).toBeNull();
  });

  it('shows free charging for a tariff without prices', async () => {
    const { getByText, queryByTestId } = await render(
      <PricingCard
        pricing={{
          ...PRICING,
          pricePerKwh: null,
          pricePerSession: '0.00',
          idleFeePricePerMinute: null,
        }}
        priceDisplay="net"
      />,
    );
    expect(getByText('Free')).toBeTruthy();
    expect(queryByTestId('pricing-tax-note')).toBeNull();
  });
});
