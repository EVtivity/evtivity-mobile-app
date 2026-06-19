// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

// Shapes returned by the /v1/portal/* API. Kept permissive (optional fields)
// because the API uses .passthrough() and individual endpoints return supersets.

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
  challengeId?: string;
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
  currency?: string;
  idleStartedAt?: string | null;
  co2AvoidedKg?: number | null;
}

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
  senderType: 'driver' | 'operator' | 'system';
  body: string;
  createdAt: string;
}

export interface Vehicle {
  id: string;
  make: string | null;
  model: string | null;
  year: string | null;
}

export interface RfidToken {
  id: string;
  idToken: string;
  tokenType: string;
  isActive: boolean;
}

export interface Paginated<T> {
  data: T[];
  total: number;
}
