// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

// Shapes returned by the /v1/portal/* API. Kept permissive (optional fields)
// because the API uses .passthrough() and individual endpoints return supersets.

import type { PriceDisplay } from '@/lib/price-display';
import type { SessionAccountBilling } from '@/lib/fleet-billing';

export interface Driver {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  language: string;
  timezone: string;
  themePreference: string;
  distanceUnit: string;
  // Prices including ('gross') or excluding ('net') tax. Null follows the
  // company setting (see usePriceDisplay).
  priceDisplay?: PriceDisplay | null;
  emailVerified: boolean;
  mfaEnabled?: boolean;
  createdAt?: string;
}

export interface AuthSuccess {
  driver: Driver;
  token: string;
  refreshToken: string;
  expiresIn: number;
}

export interface MfaRequired {
  mfaRequired: true;
  mfaMethod: 'email' | 'sms' | 'totp';
  mfaToken: string;
  challengeId?: number;
}

export type LoginResult = AuthSuccess | MfaRequired;

export function isMfaRequired(r: LoginResult): r is MfaRequired {
  return (r as MfaRequired).mfaRequired === true;
}

export type ConnectorStatus =
  | 'available'
  | 'occupied'
  | 'reserved'
  | 'unavailable'
  | 'faulted'
  | 'charging'
  | 'preparing'
  | 'suspended_ev'
  | 'suspended_evse'
  | 'finishing'
  | 'idle'
  | 'discharging'
  | 'ev_connected';

export interface ChargingSession {
  id: string;
  stationId: string;
  stationName?: string;
  status: 'active' | 'completed' | 'failed' | 'pending';
  startedAt: string;
  endedAt?: string | null;
  energyDeliveredWh?: number;
  currentCostCents?: number;
  finalCostCents?: number;
  // ISO 4217 currency the session was billed in. Costs are in this currency.
  currency: string;
  // Tax contained in the cost (final, else running) in cents, as the API
  // stores it with the cost. Above 0 when the cost includes tax.
  taxCents?: number | null;
  idleStartedAt?: string | null;
  co2AvoidedKg?: number | null;
  // Set when the session is billed to a fleet (charge on account).
  accountBilling?: SessionAccountBilling | null;
}

// Status of a session's payment record (GET /v1/portal/sessions/:id, payment.status),
// as the API stores it. pending and pre_authorized can still change; the others
// are terminal.
export type PaymentStatus =
  | 'pending'
  | 'pre_authorized'
  | 'captured'
  | 'partially_refunded'
  | 'refunded'
  | 'failed'
  | 'cancelled';

export interface SupportCase {
  id: string;
  caseNumber: string;
  subject: string;
  status: string;
  category: string;
  priority: string;
  createdAt: string;
  updatedAt: string;
}

export interface SupportMessage {
  id: number;
  // assistant: the automatic answer of the driver AI support.
  senderType: 'driver' | 'operator' | 'system' | 'assistant';
  body: string;
  createdAt: string;
}

export interface Vehicle {
  id: string;
  make: string | null;
  model: string | null;
  year: string | null;
  /** VIN (17 characters, uppercase). */
  vin?: string | null;
  /** EVCCID or MAC address of the EV charging controller (MAC as 12 hex digits). */
  evccid?: string | null;
  /** Autocharge (charge by plugging in) is on. */
  autochargeEnabled?: boolean;
  /** The operator blocked Autocharge: only the operator can unblock it. */
  autochargeBlocked?: boolean;
  /** The last session a charger sent this vehicle's id for. */
  lastSeen?: { stationId: string; siteName: string | null; at: string } | null;
}

export interface RfidToken {
  id: string;
  idToken: string;
  tokenType: string;
  isActive: boolean;
  /** Expiry the operator set, null when the card does not expire. */
  expiresAt?: string | null;
  /** The operator deactivated the card: only the operator can reactivate it. */
  blockedByOperator?: boolean;
}

export interface Paginated<T> {
  data: T[];
  total: number;
}
