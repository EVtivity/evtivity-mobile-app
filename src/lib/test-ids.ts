// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

// testIDs that carry a state or an id. The Maestro flows find elements by these
// ids instead of by translated text, so they pass in every language. Keep the
// names in step with .maestro/subflows/charging-journey.yaml.

/** Station search and nearby results: one card per station. */
export function stationCardTestId(stationId: string): string {
  return `station-card-${stationId}`;
}

/** Connector tile on the station screen, keyed by EVSE. */
export function connectorTileTestId(evseId: number): string {
  return `station-connector-${String(evseId)}`;
}

/**
 * Session status pill: `charging`, `idle`, or the session status once it ended
 * (`completed`, `faulted`, `failed`).
 */
export function sessionStateTestId(status: string, isIdling: boolean): string {
  const state = isIdling ? 'idle' : status === 'active' ? 'charging' : status;
  return `session-state-${state}`;
}

/** Payment status badge on the session screen, such as `captured`. */
export function paymentStatusTestId(status: string): string {
  return `session-payment-status-${status}`;
}

/** Fleet billing state row of a session billed on account, such as `unbilled`. */
export function fleetBillingStateTestId(state: string): string {
  return `session-fleet-billing-state-${state}`;
}
