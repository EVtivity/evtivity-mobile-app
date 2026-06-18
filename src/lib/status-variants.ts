// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

export type BadgeVariant = 'success' | 'secondary' | 'warning' | 'destructive' | 'info';

// Reservation status -> Badge variant. Shared by the reservation list and detail.
export function reservationStatusVariant(status: string): BadgeVariant {
  switch (status) {
    case 'active':
      return 'success';
    case 'scheduled':
      return 'info';
    case 'used':
      return 'secondary';
    case 'cancelled':
    case 'system_cancelled':
      return 'destructive';
    case 'expired':
      return 'warning';
    default:
      return 'secondary';
  }
}

// Support case status -> Badge variant. Shared by the support list and detail.
// Amber is reserved for the one state that needs the driver's action
// (waiting_on_driver); in_progress is neutral, resolved is positive.
export function supportCaseStatusVariant(status: string): BadgeVariant {
  switch (status) {
    case 'open':
      return 'info';
    case 'in_progress':
      return 'info';
    case 'waiting_on_driver':
      return 'warning';
    case 'resolved':
      return 'success';
    case 'closed':
      return 'secondary';
    default:
      return 'secondary';
  }
}
