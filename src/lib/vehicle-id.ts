// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

// Autocharge (charge by plugging in) rules shared by the Vehicles screen and
// the session detail, the same as the driver portal.

/** The vehicle id a charger sent for a session (GET /v1/portal/sessions/:id). */
export interface VehicleCapture {
  value: string;
  /** VIN, EVCCID or MacAddress. */
  type: string;
  /** id_token, additional_info or id_tag. */
  source: string;
}

/** The Autocharge fields of a driver vehicle. */
export interface VehicleIds {
  vin?: string | null;
  evccid?: string | null;
  autochargeEnabled?: boolean;
  /** The operator blocked Autocharge: only the operator can unblock it. */
  autochargeBlocked?: boolean;
}

/**
 * A MAC address (12 hex digits, as the CSMS stores it) shows as
 * AA:BB:CC:DD:EE:FF. Anything else shows as stored.
 */
export function formatVehicleId(value: string): string {
  return /^[0-9A-F]{12}$/.test(value) ? value.replace(/(.{2})(?!$)/g, '$1:') : value;
}

export function vehicleHasId(v: VehicleIds): boolean {
  return (v.vin ?? null) != null || (v.evccid ?? null) != null;
}

/**
 * What the Vehicles screen shows for Autocharge:
 * - `none`: the vehicle has no VIN or EVCCID, or Autocharge is not offered
 *   and is off on the vehicle.
 * - `locked`: the operator blocked it; the driver sees why, without a switch.
 * - `switch`: Autocharge is offered, or on (so the driver can always turn it off).
 */
export function autochargeControl(v: VehicleIds, offered: boolean): 'none' | 'locked' | 'switch' {
  if (!vehicleHasId(v)) return 'none';
  if (v.autochargeBlocked === true) return 'locked';
  if (offered || v.autochargeEnabled === true) return 'switch';
  return 'none';
}

/**
 * "Use This Vehicle for Plug-In Charging" shows where the session's site
 * offers Autocharge, unless the session's vehicle already charges by plugging
 * in with the captured id.
 */
export function canUseForPlugIn(
  capture: VehicleCapture,
  vehicle: VehicleIds | null | undefined,
  autochargeAvailable: boolean,
): boolean {
  if (!autochargeAvailable) return false;
  if (vehicle == null) return true;
  const holdsId = vehicle.vin === capture.value || vehicle.evccid === capture.value;
  return !(holdsId && vehicle.autochargeEnabled === true);
}
