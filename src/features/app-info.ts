// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

// Operator branding from the public /v1/portal/branding endpoint (company.*
// settings with the prefix stripped). All fields are operator-editable, so any
// may be empty.
export interface Branding {
  name?: string;
  logo?: string;
  contactEmail?: string;
  supportEmail?: string;
  supportPhone?: string;
  street?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
  portalUrl?: string;
  // Company price display ('gross' or 'net'), normalized by the API.
  priceDisplay?: string;
}

export function useBranding() {
  return useQuery({
    queryKey: ['branding'],
    queryFn: () => api.get<Branding>('/v1/portal/branding'),
    staleTime: 5 * 60 * 1000,
  });
}

export interface Features {
  reservationEnabled: boolean;
  // Driver support cases (support.enabled). Absent counts as on; false hides
  // Report Issue and the Support row, and the support screens go home, since
  // the API refuses every support request with 403 SUPPORT_DISABLED.
  supportEnabled?: boolean;
  roamingEnabled: boolean;
  // Drivers have a partner network to search: roaming on and a partner
  // location shown (absent on older servers, read as no partner network).
  roamingSearchAvailable?: boolean;
  reservationMaxHours?: number;
  reservationCancellationFeeCents?: number;
  reservationCancellationWindowMinutes?: number;
  // Company currency (ISO 4217) of every amount in this response.
  currency: string;
  // New support cases offer the AI analysis with consent (absent on older
  // servers), and the consent notice version to send back with the choice.
  driverAiSupport?: boolean;
  driverAiNoticeVersion?: number;
  // Autocharge (charge by plugging in) is offered: the setting or any site on
  // (absent on older servers).
  autochargeEnabled?: boolean;
  // File storage is configured, so drivers can upload an avatar image (absent
  // on older servers). The avatar generator works either way.
  avatarUploadEnabled?: boolean;
  // Drivers manage their own RFID cards (absent on older servers, read as
  // on). False: the operator manages them and the API refuses every driver
  // change with 403 RFID_SELF_SERVICE_DISABLED.
  rfidSelfServiceEnabled?: boolean;
  // Drivers create their own account (portal.registrationEnabled; absent on
  // servers older than v0.1.51, read as on). False: the API refuses registration with 403
  // PORTAL_REGISTRATION_DISABLED and the operator invites drivers.
  registrationEnabled?: boolean;
}

// Operator feature toggles from the CSMS. Gates the Reserve tab and other
// optional surfaces. Defaults to enabled until loaded so nothing flickers off.
export function useFeatures() {
  return useQuery({
    queryKey: ['features'],
    queryFn: () => api.get<Features>('/v1/portal/features'),
    staleTime: 5 * 60 * 1000,
  });
}

// Whether the app offers sign-up. Unlike the other toggles (on until loaded),
// sign-up shows only once the features are read:
// - open: the features say true, or carry no value (a server older than
//   v0.1.51, which always allowed registration, as rfidSelfServiceEnabled).
// - closed: the features say false; the register screen goes back to sign-in.
// - loading: the features are still loading.
// - error: the features could not be read.
// The sign-in link and the register form show only while open, as in the portal.
export type RegistrationState = 'open' | 'closed' | 'loading' | 'error';

export function useRegistrationStatus(): { state: RegistrationState; retry: () => void } {
  const { data, isPending, refetch } = useFeatures();
  const retry = (): void => {
    void refetch();
  };
  if (data !== undefined) {
    return { state: data.registrationEnabled === false ? 'closed' : 'open', retry };
  }
  if (isPending) return { state: 'loading', retry };
  return { state: 'error', retry };
}

// Whether driver support is on. Only an explicit false turns it off, so the
// entry points stay while the features load, fail to load, or come from a
// server without the field (the API still refuses when support is off).
export function isSupportEnabled(features: Pick<Features, 'supportEnabled'> | undefined): boolean {
  return features?.supportEnabled !== false;
}

export function useSupportEnabled(): boolean {
  const { data } = useFeatures();
  return isSupportEnabled(data);
}

export function useCsmsVersion() {
  return useQuery({
    queryKey: ['csms-version'],
    queryFn: () => api.get<{ version: string }>('/v1/version'),
    staleTime: 5 * 60 * 1000,
  });
}
