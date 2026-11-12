// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

// Station units: the physical charger boxes of one OCPP station (a master and
// its extenders). Drivers see each unit as its own charger, with its name, its
// EVSEs and its availability; the EVSEs without a unit form one more charger
// named by the station. Starting, check-status, QR codes and sessions stay at
// the station plus the EVSE number. A station without units has no unit data,
// and every helper here then returns the station path the app had before.

/** A unit as the station detail reply lists it. */
export interface StationUnit {
  id: string;
  name: string;
  evseIds: number[];
  availableCount: number;
}

/**
 * The `unit` route param that opens the EVSEs without a unit on a station with
 * units. Unit ids carry a prefix (`unt`), so this value never names a unit.
 */
export const NO_UNIT_PARAM = 'none';

/** Which part of a station the station screen shows. */
export type ChargerView =
  { kind: 'station' } | { kind: 'unit'; unit: StationUnit } | { kind: 'withoutUnit' };

/**
 * The view a `unit` route param asks for. A station without units, a missing
 * param, or a unit the station no longer has show the whole station.
 */
export function chargerView(
  units: readonly StationUnit[] | undefined,
  unitParam: string | undefined,
): ChargerView {
  if (units == null || units.length === 0 || unitParam == null || unitParam === '') {
    return { kind: 'station' };
  }
  if (unitParam === NO_UNIT_PARAM) return { kind: 'withoutUnit' };
  const unit = units.find((u) => u.id === unitParam);
  return unit != null ? { kind: 'unit', unit } : { kind: 'station' };
}

interface UnitEvse {
  evseId: number;
  unitId?: string | null;
}

/** The EVSEs the view lists: all of them for the whole station. */
export function chargerEvses<T extends UnitEvse>(evses: readonly T[], view: ChargerView): T[] {
  if (view.kind === 'station') return [...evses];
  const unitId = view.kind === 'unit' ? view.unit.id : null;
  return evses.filter((e) => (e.unitId ?? null) === unitId);
}

/** The unit of one EVSE, or null when the station has no units or the EVSE none. */
export function unitOfEvse<T extends UnitEvse>(
  units: readonly StationUnit[] | undefined,
  evses: readonly T[],
  evseId: number | null,
): StationUnit | null {
  if (units == null || units.length === 0 || evseId == null) return null;
  const unitId = evses.find((e) => e.evseId === evseId)?.unitId ?? null;
  return units.find((u) => u.id === unitId) ?? null;
}

/** One charger of a station with units: a unit, or the EVSEs without one. */
export interface ChargerGroup<T> {
  key: string;
  unitId: string | null;
  /** The unit name, or null for the EVSEs without a unit (named by the station). */
  name: string | null;
  evses: T[];
}

/**
 * The whole station split into its chargers, in the unit order of the reply,
 * then the EVSEs without a unit. Null for a station without units, so the
 * screen keeps its single list.
 */
export function chargerGroups<T extends UnitEvse>(
  units: readonly StationUnit[] | undefined,
  evses: readonly T[],
): ChargerGroup<T>[] | null {
  if (units == null || units.length === 0) return null;
  const known = new Set(units.map((u) => u.id));
  const groups: ChargerGroup<T>[] = [];
  for (const unit of units) {
    const members = evses.filter((e) => e.unitId === unit.id);
    if (members.length > 0) {
      groups.push({ key: unit.id, unitId: unit.id, name: unit.name, evses: members });
    }
  }
  const loose = evses.filter((e) => e.unitId == null || !known.has(e.unitId));
  if (loose.length > 0) {
    groups.push({ key: NO_UNIT_PARAM, unitId: null, name: null, evses: loose });
  }
  return groups;
}

/** A list key for a charger row: several rows can share one station. */
export function chargerKey(stationId: string, unitId: string | null | undefined): string {
  return unitId != null ? `${stationId}/${unitId}` : stationId;
}

interface ChargerRow {
  stationId: string;
  unitId?: string | null;
}

/**
 * The station screen params of a search, nearby or location row. A unit
 * row opens that unit; the row of the EVSEs without a unit opens only those when
 * the same list holds a unit row of its station; any other row opens the whole
 * station, as before.
 */
export function chargerRouteParams(
  row: ChargerRow,
  rows: readonly ChargerRow[],
): { stationId: string; unit?: string } {
  if (row.unitId != null) return { stationId: row.stationId, unit: row.unitId };
  const hasUnits = rows.some((r) => r.stationId === row.stationId && r.unitId != null);
  return hasUnits
    ? { stationId: row.stationId, unit: NO_UNIT_PARAM }
    : { stationId: row.stationId };
}

/**
 * The station screen params of a favorite or a watch: its unit, else the whole
 * station (a favorite or watch without a unit covers the whole station).
 */
export function savedChargerParams(row: ChargerRow): { stationId: string; unit?: string } {
  return row.unitId != null
    ? { stationId: row.stationId, unit: row.unitId }
    : { stationId: row.stationId };
}

/** One connector row of the location reply. */
export interface LocationChargerRow {
  stationId: string;
  stationName: string;
  evseId: number;
  unitId?: string | null;
  unitName?: string | null;
  available: boolean;
}

/** One charger of a location: a station, a unit, or a station's EVSEs without a unit. */
export interface LocationCharger {
  key: string;
  stationId: string;
  stationName: string;
  unitId: string | null;
  unitName: string | null;
  evseCount: number;
  availableCount: number;
}

/**
 * The location's connector rows grouped into chargers, in the order of the
 * reply. Empty when no station of the site has units, so the location screen
 * keeps its station layout.
 */
export function locationChargers(rows: readonly LocationChargerRow[]): LocationCharger[] {
  if (!rows.some((r) => r.unitId != null)) return [];
  const byKey = new Map<string, { charger: LocationCharger; evses: Map<number, boolean> }>();
  for (const row of rows) {
    const unitId = row.unitId ?? null;
    const key = chargerKey(row.stationId, unitId);
    let entry = byKey.get(key);
    if (entry == null) {
      entry = {
        charger: {
          key,
          stationId: row.stationId,
          stationName: row.stationName,
          unitId,
          unitName: row.unitName ?? null,
          evseCount: 0,
          availableCount: 0,
        },
        evses: new Map(),
      };
      byKey.set(key, entry);
    }
    // An EVSE with several connectors is free when any of them is.
    entry.evses.set(row.evseId, (entry.evses.get(row.evseId) ?? false) || row.available);
  }
  return [...byKey.values()].map(({ charger, evses }) => ({
    ...charger,
    evseCount: evses.size,
    availableCount: [...evses.values()].filter(Boolean).length,
  }));
}
