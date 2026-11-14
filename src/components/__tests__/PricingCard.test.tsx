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

  it('shows the AC and DC prices side by side when they differ', async () => {
    const { getByTestId } = await render(
      <PricingCard
        pricing={{
          ...PRICING,
          taxRate: null,
          byChargingKind: [
            {
              chargingKind: 'ac',
              pricePerKwh: '0.30',
              pricePerMinute: null,
              pricePerSession: null,
              idleFeePricePerMinute: null,
              taxRate: null,
            },
            {
              chargingKind: 'dc',
              pricePerKwh: '0.60',
              pricePerMinute: null,
              pricePerSession: null,
              idleFeePricePerMinute: null,
              taxRate: null,
            },
          ],
        }}
        priceDisplay="net"
      />,
    );
    expect(getByTestId('pricing-kind-ac').props.children).toContain('AC');
    expect(getByTestId('pricing-kind-dc').props.children).toContain('DC');
  });

  it('shows a gross price net by taking the tax out (tax basis gross)', async () => {
    const { getByText } = await render(
      <PricingCard
        pricing={{ ...PRICING, pricePerKwh: '0.357', pricePerSession: null, taxBasis: 'gross' }}
        priceDisplay="net"
      />,
    );
    expect(getByText('€0.30/kWh')).toBeTruthy();
  });

  it('lists each kind with its session and idle fee and its own tax when the rates differ', async () => {
    const { getByTestId, queryByTestId } = await render(
      <PricingCard
        pricing={{
          ...PRICING,
          byChargingKind: [
            {
              chargingKind: 'ac',
              pricePerKwh: '0.30',
              pricePerMinute: null,
              pricePerSession: '1.00',
              idleFeePricePerMinute: null,
              taxRate: '0.19',
            },
            {
              chargingKind: 'dc',
              pricePerKwh: '0.60',
              pricePerMinute: null,
              pricePerSession: null,
              idleFeePricePerMinute: '0.10',
              taxRate: '0.07',
            },
          ],
        }}
        priceDisplay="net"
      />,
    );
    expect(getByTestId('pricing-kind-ac').props.children).toBe('AC: €0.30/kWh · €1.00 session');
    expect(getByTestId('pricing-kind-dc').props.children).toBe('DC: €0.60/kWh · €0.10/min idle');
    expect(getByTestId('pricing-kind-tax-note-ac')).toBeTruthy();
    expect(getByTestId('pricing-kind-tax-note-dc')).toBeTruthy();
    expect(queryByTestId('pricing-tax-note')).toBeNull();
  });

  it('is not free when only the Both tariff is free and a kind charges', async () => {
    const { queryByText, getByTestId } = await render(
      <PricingCard
        pricing={{
          ...PRICING,
          pricePerKwh: '0',
          pricePerSession: null,
          byChargingKind: [
            {
              chargingKind: 'ac',
              pricePerKwh: '0',
              pricePerMinute: null,
              pricePerSession: null,
              idleFeePricePerMinute: null,
              taxRate: '0.19',
            },
            {
              chargingKind: 'dc',
              pricePerKwh: '0.60',
              pricePerMinute: null,
              pricePerSession: null,
              idleFeePricePerMinute: null,
              taxRate: '0.19',
            },
          ],
        }}
        priceDisplay="net"
      />,
    );
    expect(queryByText('Free')).toBeNull();
    expect(getByTestId('pricing-kind-dc').props.children).toBe('DC: €0.60/kWh');
  });
});
