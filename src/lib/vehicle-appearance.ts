// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

// A vehicle's color and body type: the app's copy of the CSMS lists
// (@evtivity/lib/vehicle-appearance). The API refuses any other value, so a
// change of either list lands in both places.

export const VEHICLE_COLORS = [
  'white',
  'black',
  'silver',
  'grey',
  'blue',
  'red',
  'green',
  'brown_beige',
  'yellow_orange',
  'other',
] as const;

export type VehicleColor = (typeof VEHICLE_COLORS)[number];

export const VEHICLE_BODY_TYPES = ['sedan', 'hatchback', 'suv', 'pickup_truck', 'van'] as const;

export type VehicleBodyType = (typeof VEHICLE_BODY_TYPES)[number];

export function isVehicleColor(value: unknown): value is VehicleColor {
  return typeof value === 'string' && (VEHICLE_COLORS as readonly string[]).includes(value);
}

export function isVehicleBodyType(value: unknown): value is VehicleBodyType {
  return typeof value === 'string' && (VEHICLE_BODY_TYPES as readonly string[]).includes(value);
}
