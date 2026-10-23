// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

/** The fields of GET /v1/portal/driver/mfa that say whether the driver holds a factor. */
export interface MfaFactorState {
  mfaEnabled: boolean;
  /**
   * The proofs adding a factor accepts: the factor kinds the driver holds
   * (totp, email, sms, passkey), else password. Absent on older servers.
   */
  factorProofKinds?: string[];
}

/** The portal page where a driver manages two-factor authentication. */
export const PORTAL_SECURITY_PATH = '/account/security';

/** The portal page where a driver edits the phone number. */
export const PORTAL_PERSONAL_PATH = '/account/personal';

const NOT_FACTORS = new Set(['password', 'sso']);

/**
 * True when the driver already holds a factor (an MFA method or a passkey).
 * Adding a factor, changing the phone number and turning MFA off then need a
 * fresh proof of that factor, which this app does not give: the driver makes
 * those changes in the driver portal. Falls back to mfaEnabled on a server
 * that does not list the proof kinds.
 */
export function driverHoldsFactor(state: MfaFactorState | null | undefined): boolean {
  if (state == null) return false;
  if (state.factorProofKinds == null) return state.mfaEnabled;
  return state.mfaEnabled || state.factorProofKinds.some((k) => !NOT_FACTORS.has(k));
}
