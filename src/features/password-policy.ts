// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

import React from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from '@/lib/api';
import {
  DEFAULT_PASSWORD_POLICY,
  knownPasswordRules,
  policyFromSecurityPublic,
  type PasswordPolicy,
  type PasswordRule,
} from '@/lib/password-policy';

export const SECURITY_PUBLIC_QUERY_KEY = ['security-public'] as const;

/**
 * The password policy the operator set in the CSMS, from the public security
 * endpoint. The default policy while it loads, when the request fails, and for
 * an older server that sends no policy; the API checks the live one.
 */
export function usePasswordPolicy(): PasswordPolicy {
  const { data } = useQuery({
    queryKey: SECURITY_PUBLIC_QUERY_KEY,
    queryFn: () => api.get<unknown>('/v1/security/public'),
    staleTime: 60_000,
    select: policyFromSecurityPublic,
  });
  return data ?? DEFAULT_PASSWORD_POLICY;
}

/** The rules a WEAK_PASSWORD reply names, or null for any other error. */
export function weakPasswordMissing(err: unknown): PasswordRule[] | null {
  if (!(err instanceof ApiError) || err.code !== 'WEAK_PASSWORD') return null;
  const body = err.body as { missing?: unknown };
  return knownPasswordRules(body.missing);
}

/**
 * Reads an error from a request that set a password: the rules a WEAK_PASSWORD
 * reply names, or null for any other error. Such a reply can come from a policy
 * newer than the app's, so it also reloads the policy.
 */
export function useWeakPasswordReply(): (err: unknown) => PasswordRule[] | null {
  const queryClient = useQueryClient();
  return React.useCallback(
    (err: unknown) => {
      const missing = weakPasswordMissing(err);
      if (missing != null) {
        void queryClient.invalidateQueries({ queryKey: SECURITY_PUBLIC_QUERY_KEY });
      }
      return missing;
    },
    [queryClient],
  );
}
