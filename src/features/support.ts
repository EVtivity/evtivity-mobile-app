// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { SupportCase, SupportMessage, Paginated } from '@/lib/types';

// Category enum accepted by POST /v1/portal/support-cases.
export const SUPPORT_CATEGORIES = [
  'billing_dispute',
  'charging_failure',
  'connector_damage',
  'account_issue',
  'payment_problem',
  'reservation_issue',
  'general_inquiry',
] as const;

export type SupportCategory = (typeof SUPPORT_CATEGORIES)[number];

export interface SupportCaseDetail extends SupportCase {
  description: string;
  stationId: string | null;
  stationName: string | null;
  messages: SupportMessage[];
}

export interface CreateCaseInput {
  subject: string;
  description: string;
  category: SupportCategory;
  sessionId?: string;
  stationId?: string;
}

const CASES_KEY = ['support-cases'] as const;

export function useSupportCases() {
  return useQuery({
    queryKey: CASES_KEY,
    queryFn: () =>
      api
        .get<Paginated<SupportCase>>('/v1/portal/support-cases?page=1&limit=50')
        .then((r) => r.data),
  });
}

export function useSupportCase(id: string) {
  return useQuery({
    queryKey: ['support-case', id],
    queryFn: () => api.get<SupportCaseDetail>(`/v1/portal/support-cases/${id}`),
    enabled: id.length > 0,
  });
}

export function useCreateCase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateCaseInput) =>
      api.post<SupportCase>('/v1/portal/support-cases', input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: CASES_KEY });
    },
  });
}

export function useReplyCase(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: string) =>
      api.post<SupportMessage>(`/v1/portal/support-cases/${id}/messages`, { body }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['support-case', id] });
      void qc.invalidateQueries({ queryKey: CASES_KEY });
    },
  });
}
