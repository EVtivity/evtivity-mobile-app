// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

// Charge on account: a driver whose fleet bills on account charges without a
// card, and the fleet pays their sessions on a monthly invoice. The API
// decides; the app only shows it.

/** How the driver pays a session they start (GET /v1/portal/auth/me, charger pricing). */
export interface DriverBilling {
  mode: 'card' | 'account';
  fleetName: string | null;
}

/** The billing state of a session billed to a fleet (session list and detail). */
export interface SessionAccountBilling {
  state: 'unbilled' | 'invoiced' | 'paid';
  fleetName: string;
}

/**
 * The fleet a session started at this charger is billed to, or null when the
 * driver pays by card. The charger pricing answers for the station (null at a
 * free vend site); until it loads, or when the station has no pricing, the
 * driver profile answers. An API without these fields means card.
 */
export function billedToFleet(
  pricing: { billing?: DriverBilling | null } | undefined,
  driverBilling: DriverBilling | undefined,
): string | null {
  const billing = pricing != null ? (pricing.billing ?? null) : (driverBilling ?? null);
  return billing?.mode === 'account' ? billing.fleetName : null;
}

/** i18n key of a session's fleet billing state. */
export function accountBillingStateKey(state: SessionAccountBilling['state']): string {
  return `fleetBilling.state.${state}`;
}
