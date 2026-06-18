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
  supportEnabled: boolean;
  roamingEnabled: boolean;
  reservationMaxHours?: number;
  reservationCancellationFeeCents?: number;
  reservationCancellationWindowMinutes?: number;
  currency?: string;
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

export function useCsmsVersion() {
  return useQuery({
    queryKey: ['csms-version'],
    queryFn: () => api.get<{ version: string }>('/v1/version'),
    staleTime: 5 * 60 * 1000,
  });
}
