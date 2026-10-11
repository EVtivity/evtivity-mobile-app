// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { SUPPORTED_LANGUAGES, type LanguageCode } from '@/lib/config';
import type { SupportCase, SupportMessage } from '@/lib/types';
import { useFeatures, type Features } from './app-info';

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

// Driver AI support (GET /v1/portal/features driverAiSupport). The app ships
// the consent notice text of these versions (support.ai.notice.v<n>). A server
// on another version gets no consent step: the case goes to the support team.
export const DRIVER_AI_NOTICE_VERSIONS: readonly number[] = [1];

export type DriverAiConsentDecision = 'granted' | 'declined';

export type DriverAiState =
  | 'queued'
  | 'analyzing'
  | 'awaiting_feedback'
  | 'resolved_by_ai'
  | 'escalated'
  | 'failed'
  | 'skipped';

// Driver action codes the automatic answer can suggest (support.ai.driverAction.<code>).
export const DRIVER_ACTION_CODES = [
  'try_other_connector',
  'check_payment_method',
  'retry_start',
  'check_vehicle_settings',
  'contact_operator',
  'wait_and_retry',
  'check_token_active',
] as const;

export type DriverActionCode = (typeof DRIVER_ACTION_CODES)[number];

export interface SupportCaseAi {
  consent: DriverAiConsentDecision | null;
  state: DriverAiState | null;
  reason: string | null;
  answeredAt: string | null;
  feedbackAt: string | null;
  resolutionSource: 'operator' | 'ai' | null;
  driverActions: string[];
  // True when the automatic answer says the support team is needed; null
  // before an answer (and absent on older servers).
  needsOperator?: boolean | null;
}

export interface SupportCaseDetail extends SupportCase {
  description: string;
  stationId: string | null;
  stationName: string | null;
  messages: SupportMessage[];
  // Absent on servers without the driver AI support.
  ai?: SupportCaseAi;
}

export interface AiConsentInput {
  decision: DriverAiConsentDecision;
  noticeVersion: number;
  language: LanguageCode;
}

export interface CreateCaseInput {
  subject: string;
  description: string;
  category: SupportCategory;
  sessionId?: string;
  stationId?: string;
  aiConsent?: AiConsentInput;
}

// The notice version to show, or null when the AI analysis is off or the
// server's notice version has no text in this build.
export function driverAiNoticeVersion(features: Features | undefined): number | null {
  const version = features?.driverAiNoticeVersion;
  if (features?.driverAiSupport !== true || typeof version !== 'number') return null;
  return DRIVER_AI_NOTICE_VERSIONS.includes(version) ? version : null;
}

export function useDriverAiNoticeVersion(): {
  noticeVersion: number | null;
  isLoading: boolean;
  refetch: () => void;
} {
  const features = useFeatures();
  return {
    noticeVersion: driverAiNoticeVersion(features.data),
    isLoading: features.isLoading,
    refetch: () => void features.refetch(),
  };
}

// The UI language the notice was shown in, as the consent input takes it.
export function consentLanguage(language: string | undefined): LanguageCode {
  return SUPPORTED_LANGUAGES.find((l) => l === language) ?? 'en';
}

// True while the automatic answer is still being prepared.
export function isAiAnalyzing(ai: SupportCaseAi | null | undefined): boolean {
  return ai?.state === 'queued' || ai?.state === 'analyzing';
}

// Known driver action codes only, so an unknown code never shows a raw key.
export function knownDriverActions(codes: readonly string[] | undefined): DriverActionCode[] {
  return (codes ?? []).filter((c): c is DriverActionCode =>
    (DRIVER_ACTION_CODES as readonly string[]).includes(c),
  );
}

const CASES_KEY = ['support-cases'] as const;

export function useSupportCases() {
  return useQuery({
    queryKey: CASES_KEY,
    queryFn: () => api.getData<SupportCase>('/v1/portal/support-cases?page=1&limit=50'),
  });
}

export function useSupportCase(id: string) {
  return useQuery({
    queryKey: ['support-case', id],
    queryFn: () => api.get<SupportCaseDetail>(`/v1/portal/support-cases/${encodeURIComponent(id)}`),
    enabled: id.length > 0,
    // Poll while the chat is open so operator replies appear near-instantly.
    // React Native has no SSE; this mirrors the app's live-session polling. The
    // interval only runs while the screen is mounted and pauses in the
    // background (refetchIntervalInBackground defaults to false).
    refetchInterval: 4000,
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
      api.post<SupportMessage>(`/v1/portal/support-cases/${encodeURIComponent(id)}/messages`, {
        body,
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['support-case', id] });
      void qc.invalidateQueries({ queryKey: CASES_KEY });
    },
  });
}

export interface AiFeedbackResult {
  id: string;
  status: string;
  ai: SupportCaseAi;
}

// Answer to "Did this solve your issue?": true resolves the case, false sends
// it to the support team. Reloads the case either way, since a 409 means the
// case already moved on.
export function useAiFeedback(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (satisfied: boolean) =>
      api.post<AiFeedbackResult>(`/v1/portal/support-cases/${encodeURIComponent(id)}/ai-feedback`, {
        satisfied,
      }),
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: ['support-case', id] });
      void qc.invalidateQueries({ queryKey: CASES_KEY });
    },
  });
}
