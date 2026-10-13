// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

// Charge on account: a driver whose fleet bills on account charges without a
// card. The fleet pays their sessions on a monthly invoice, or the fleet
// invoices each member (the driver) monthly. The API decides; the app only
// shows it.

/** Who gets the monthly invoice of account sessions: the fleet, or the driver (member invoice). */
export type InvoicedTo = 'fleet' | 'member';

/** How the driver pays a session they start (GET /v1/portal/auth/me, charger pricing). */
export interface DriverBilling {
  mode: 'card' | 'account';
  fleetName: string | null;
  /** Null for card. Absent in responses of servers before v0.1.46. */
  invoicedTo?: InvoicedTo | null;
}

/** The billing state of a session billed on account (session list and detail). */
export interface SessionAccountBilling {
  state: 'unbilled' | 'invoiced' | 'paid';
  fleetName: string;
  /** Absent in responses of servers before v0.1.46 (always the fleet then). */
  invoicedTo?: InvoicedTo;
  /** On a member-billed session: the driver's invoice it is on, null until invoiced. */
  invoiceId?: string | null;
  invoiceNumber?: string | null;
}

/** The fleet a charge on account goes through, and who it is invoiced to. */
export interface AccountBillingAt {
  fleetName: string;
  invoicedTo: InvoicedTo;
}

/**
 * The account billing of a session started at this charger, or null when the
 * driver pays by card. The charger pricing answers for the station (null at a
 * free vend site); until it loads, or when the station has no pricing, the
 * driver profile answers. An API without these fields means card, and one
 * without `invoicedTo` means the fleet.
 */
export function accountBillingAt(
  pricing: { billing?: DriverBilling | null } | undefined,
  driverBilling: DriverBilling | undefined,
): AccountBillingAt | null {
  const billing = pricing != null ? (pricing.billing ?? null) : (driverBilling ?? null);
  if (billing?.mode !== 'account' || billing.fleetName == null) return null;
  return {
    fleetName: billing.fleetName,
    invoicedTo: billing.invoicedTo === 'member' ? 'member' : 'fleet',
  };
}

/** The fleet a session started at this charger is billed to, or null when the driver pays by card. */
export function billedToFleet(
  pricing: { billing?: DriverBilling | null } | undefined,
  driverBilling: DriverBilling | undefined,
): string | null {
  return accountBillingAt(pricing, driverBilling)?.fleetName ?? null;
}

/** True when the fleet invoices these sessions to the driver (a member invoice). */
export function isMemberBilled(
  billing: { invoicedTo?: InvoicedTo | null } | null | undefined,
): boolean {
  return billing?.invoicedTo === 'member';
}

/** i18n key of a session's account billing state, worded for who gets the invoice. */
export function accountBillingStateKey(
  state: SessionAccountBilling['state'],
  invoicedTo?: InvoicedTo,
): string {
  return invoicedTo === 'member'
    ? `fleetBilling.stateMember.${state}`
    : `fleetBilling.state.${state}`;
}
