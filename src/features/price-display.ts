// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

import { useBranding } from '@/features/app-info';
import { useAuth } from '@/lib/auth';
import { resolvePriceDisplay, type PriceDisplay } from '@/lib/price-display';

// The company setting company.priceDisplay, from the public branding settings.
// Null until the settings have loaded (an error resolves to the default).
export function useCompanyPriceDisplay(): PriceDisplay | null {
  const { data: branding, isError } = useBranding();
  if (branding == null && !isError) return null;
  return resolvePriceDisplay(null, branding?.priceDisplay);
}

// Whether prices are shown including or excluding tax: the signed-in driver's
// choice, else the company setting. Null while the company setting is loading
// and the driver has not chosen, so prices are not shown one way and then
// switched. Mirrors usePriceDisplay in the driver portal.
export function usePriceDisplay(): PriceDisplay | null {
  const authenticated = useAuth((s) => s.status === 'authenticated');
  const driverPriceDisplay = useAuth((s) => s.driver?.priceDisplay ?? null);
  const companyPriceDisplay = useCompanyPriceDisplay();
  if (authenticated && driverPriceDisplay != null) return driverPriceDisplay;
  return companyPriceDisplay;
}
