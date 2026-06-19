// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

import type { ConnectorStatus } from './types';

// English fallback label for a connector status. Used as the i18n default value
// so a missing translation key degrades to readable text, never the raw key.
export function connectorStatusLabel(status: ConnectorStatus): string {
  return status
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

// Statuses that allow a remote start (mirrors the API's startable set).
const STARTABLE = new Set<ConnectorStatus>([
  'available',
  'occupied',
  'preparing',
  'ev_connected',
  'finishing',
]);

export function isStartable(status: ConnectorStatus): boolean {
  return STARTABLE.has(status);
}

// Statuses that mean a cable is physically connected. The pre-start flow uses
// this to detect whether the driver has plugged in (mirrors the portal).
const CABLE_DETECTED = new Set<ConnectorStatus>([
  'preparing',
  'ev_connected',
  'occupied',
  'charging',
  'suspended_ev',
  'suspended_evse',
  'finishing',
]);

export function isCableDetected(status: ConnectorStatus | null): boolean {
  return status != null && CABLE_DETECTED.has(status);
}

export type SessionStatus = 'active' | 'completed' | 'failed' | 'pending';

export type SessionTone = 'success' | 'warning' | 'destructive' | 'primary';

// Single source of truth for session status color, mirroring the driver portal's
// SessionDetail pill: charging green, idle amber, faulted/failed red, completed
// (and anything else) the brand primary. `isIdling` only applies on the live
// detail screen; the list has no idle concept. The sessions list and the detail
// pill both derive their color from this so a status looks identical in both.
export function sessionStatusTone(status: string, isIdling = false): SessionTone {
  if (isIdling) return 'warning';
  if (status === 'active') return 'success';
  if (status === 'failed' || status === 'faulted') return 'destructive';
  return 'primary';
}

// Exact session-status colors from the driver portal (packages/portal/src/index.css),
// applied as an inline background so mobile matches the portal regardless of the
// mobile theme. The portal's brand primary is blue (completed reads blue), unlike
// the mobile brand primary (green); idle is orange, charging green, faulted red.
export const SESSION_TONE_COLOR: Record<SessionTone, string> = {
  success: 'hsl(160, 84%, 39%)', // charging - green
  warning: 'hsl(38, 92%, 50%)', // idle - orange
  destructive: 'hsl(0, 84%, 60%)', // faulted/failed - red
  primary: 'hsl(221, 83%, 53%)', // completed - blue
};

// Single source of truth for the session status label key. Keeps the sessions
// list row and the session detail pill showing the same word for a status.
export function sessionStatusLabelKey(status: string): string {
  if (status === 'active') return 'status.charging';
  if (status === 'faulted') return 'status.failed';
  return `status.${status}`;
}

// Mirrors the driver portal's connectorStatusClassName: a solid status color per
// connector state (available=green, charging/occupied=blue, preparing=cyan,
// reserved=orange, suspended/idle=yellow, finishing=violet, faulted=red).
export function connectorStatusColor(status: string): string {
  switch (status) {
    case 'available':
      return 'bg-green-500';
    case 'finishing':
      return 'bg-violet-500';
    case 'occupied':
    case 'charging':
    case 'discharging':
      return 'bg-blue-500';
    case 'preparing':
    case 'ev_connected':
      return 'bg-cyan-500';
    case 'reserved':
      return 'bg-orange-500';
    case 'suspended_ev':
    case 'suspended_evse':
    case 'idle':
      return 'bg-yellow-500';
    case 'faulted':
    case 'unavailable':
    default:
      return 'bg-red-500';
  }
}
