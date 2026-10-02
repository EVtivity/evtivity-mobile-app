// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

const mockBranding = jest.fn();
const mockAuthState = { status: 'authenticated', driver: null as unknown };

jest.mock('@/features/app-info', () => ({ useBranding: () => mockBranding() }));
jest.mock('@/lib/auth', () => ({
  useAuth: (selector: (s: typeof mockAuthState) => unknown) => selector(mockAuthState),
}));

import { renderHook } from '@testing-library/react-native';
import { useCompanyPriceDisplay, usePriceDisplay } from '@/features/price-display';

beforeEach(() => {
  mockAuthState.status = 'authenticated';
  mockAuthState.driver = null;
});

describe('useCompanyPriceDisplay', () => {
  it('is null while the branding settings load', async () => {
    mockBranding.mockReturnValue({ data: undefined, isError: false });
    const { result } = await renderHook(() => useCompanyPriceDisplay());
    expect(result.current).toBeNull();
  });

  it('returns the company setting', async () => {
    mockBranding.mockReturnValue({ data: { priceDisplay: 'gross' }, isError: false });
    const { result } = await renderHook(() => useCompanyPriceDisplay());
    expect(result.current).toBe('gross');
  });

  it('resolves to the default when the settings fail to load', async () => {
    mockBranding.mockReturnValue({ data: undefined, isError: true });
    const { result } = await renderHook(() => useCompanyPriceDisplay());
    expect(result.current).toBe('net');
  });
});

describe('usePriceDisplay', () => {
  it("prefers the signed-in driver's choice", async () => {
    mockBranding.mockReturnValue({ data: { priceDisplay: 'gross' }, isError: false });
    mockAuthState.driver = { priceDisplay: 'net' };
    const { result } = await renderHook(() => usePriceDisplay());
    expect(result.current).toBe('net');
  });

  it('follows the company setting when the driver has not chosen', async () => {
    mockBranding.mockReturnValue({ data: { priceDisplay: 'gross' }, isError: false });
    mockAuthState.driver = { priceDisplay: null };
    const { result } = await renderHook(() => usePriceDisplay());
    expect(result.current).toBe('gross');
  });

  it('follows the company setting when signed out', async () => {
    mockBranding.mockReturnValue({ data: { priceDisplay: 'gross' }, isError: false });
    mockAuthState.status = 'unauthenticated';
    mockAuthState.driver = { priceDisplay: 'net' };
    const { result } = await renderHook(() => usePriceDisplay());
    expect(result.current).toBe('gross');
  });
});
