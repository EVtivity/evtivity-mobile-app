// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

// After a QR scan the station page shows only the scanned connector (the
// `evseId` route param), as the driver portal does, until the driver asks for
// all of them. A param the station does not have (or one that is not a number)
// shows the full list.

// The scanned EVSE id from the route param, or null when there is none.
export function scannedEvseId(param: string | undefined): number | null {
  if (param == null || param === '') return null;
  const id = Number(param);
  return Number.isInteger(id) ? id : null;
}

// The EVSEs to list: only the focused one while it exists, else all of them.
export function visibleEvses<T extends { evseId: number }>(
  evses: readonly T[],
  focusedEvseId: number | null,
): readonly T[] {
  if (focusedEvseId == null) return evses;
  const focused = evses.find((evse) => evse.evseId === focusedEvseId);
  return focused != null ? [focused] : evses;
}
