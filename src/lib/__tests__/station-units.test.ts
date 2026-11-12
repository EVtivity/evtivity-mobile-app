// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

import {
  NO_UNIT_PARAM,
  chargerEvses,
  chargerGroups,
  chargerKey,
  chargerRouteParams,
  chargerView,
  locationChargers,
  savedChargerParams,
  unitOfEvse,
  type StationUnit,
} from '@/lib/station-units';

// Discussion 59: an ABL master box with extenders, two EVSEs a box.
const UNITS: StationUnit[] = [
  { id: 'unt_1', name: 'Box 1', evseIds: [1, 2], availableCount: 1 },
  { id: 'unt_2', name: 'Box 2', evseIds: [3, 4], availableCount: 0 },
];
const EVSES = [
  { evseId: 1, unitId: 'unt_1' },
  { evseId: 2, unitId: 'unt_1' },
  { evseId: 3, unitId: 'unt_2' },
  { evseId: 4, unitId: 'unt_2' },
  { evseId: 5, unitId: null },
];
// A station without units: the reply has no unit on any EVSE.
const PLAIN = [{ evseId: 1 }, { evseId: 2, unitId: null }];

describe('chargerView', () => {
  it('shows the whole station without units, whatever the param', () => {
    expect(chargerView(undefined, 'unt_1')).toEqual({ kind: 'station' });
    expect(chargerView([], 'unt_1')).toEqual({ kind: 'station' });
    expect(chargerView([], NO_UNIT_PARAM)).toEqual({ kind: 'station' });
  });

  it('shows the whole station without a param or for an unknown unit', () => {
    expect(chargerView(UNITS, undefined)).toEqual({ kind: 'station' });
    expect(chargerView(UNITS, '')).toEqual({ kind: 'station' });
    expect(chargerView(UNITS, 'unt_gone')).toEqual({ kind: 'station' });
  });

  it('opens one unit, or the EVSEs without a unit', () => {
    expect(chargerView(UNITS, 'unt_2')).toEqual({ kind: 'unit', unit: UNITS[1] });
    expect(chargerView(UNITS, NO_UNIT_PARAM)).toEqual({ kind: 'withoutUnit' });
  });
});

describe('chargerEvses', () => {
  it('lists every EVSE for the whole station', () => {
    expect(chargerEvses(PLAIN, { kind: 'station' })).toEqual(PLAIN);
    expect(chargerEvses(EVSES, { kind: 'station' })).toEqual(EVSES);
  });

  it('lists only the unit EVSEs, or the EVSEs without a unit', () => {
    expect(chargerEvses(EVSES, chargerView(UNITS, 'unt_1')).map((e) => e.evseId)).toEqual([1, 2]);
    expect(chargerEvses(EVSES, { kind: 'withoutUnit' }).map((e) => e.evseId)).toEqual([5]);
    expect(chargerEvses(PLAIN, { kind: 'withoutUnit' }).map((e) => e.evseId)).toEqual([1, 2]);
  });
});

describe('unitOfEvse', () => {
  it('names the unit of a scanned EVSE on a station with units', () => {
    expect(unitOfEvse(UNITS, EVSES, 3)).toBe(UNITS[1]);
  });

  it('has none without units, without a scan, or for an EVSE without a unit', () => {
    expect(unitOfEvse(undefined, PLAIN, 1)).toBeNull();
    expect(unitOfEvse([], PLAIN, 1)).toBeNull();
    expect(unitOfEvse(UNITS, EVSES, null)).toBeNull();
    expect(unitOfEvse(UNITS, EVSES, 5)).toBeNull();
    expect(unitOfEvse(UNITS, EVSES, 99)).toBeNull();
  });
});

describe('chargerGroups', () => {
  it('keeps the single list of a station without units', () => {
    expect(chargerGroups(undefined, PLAIN)).toBeNull();
    expect(chargerGroups([], PLAIN)).toBeNull();
  });

  it('splits a station into its units, then the EVSEs without a unit', () => {
    const groups = chargerGroups(UNITS, EVSES);
    expect(groups?.map((g) => [g.key, g.name, g.evses.map((e) => e.evseId)])).toEqual([
      ['unt_1', 'Box 1', [1, 2]],
      ['unt_2', 'Box 2', [3, 4]],
      [NO_UNIT_PARAM, null, [5]],
    ]);
  });

  it('leaves out a unit with no listed EVSE and counts an unknown unit as none', () => {
    const groups = chargerGroups(UNITS, [
      { evseId: 1, unitId: 'unt_1' },
      { evseId: 9, unitId: 'unt_unknown' },
    ]);
    expect(groups?.map((g) => [g.key, g.evses.map((e) => e.evseId)])).toEqual([
      ['unt_1', [1]],
      [NO_UNIT_PARAM, [9]],
    ]);
    expect(chargerGroups(UNITS, [{ evseId: 1, unitId: 'unt_1' }])?.map((g) => g.key)).toEqual([
      'unt_1',
    ]);
  });
});

describe('chargerKey', () => {
  it('keys a station row by station, and a unit row by station and unit', () => {
    expect(chargerKey('CS-1', null)).toBe('CS-1');
    expect(chargerKey('CS-1', undefined)).toBe('CS-1');
    expect(chargerKey('CS-1', 'unt_1')).toBe('CS-1/unt_1');
  });
});

describe('chargerRouteParams', () => {
  const rows = [
    { stationId: 'CS-1', unitId: 'unt_1' },
    { stationId: 'CS-1', unitId: null },
    { stationId: 'CS-2', unitId: null },
    { stationId: 'CS-3' },
  ];

  it('opens a unit row on its unit', () => {
    expect(chargerRouteParams(rows[0]!, rows)).toEqual({ stationId: 'CS-1', unit: 'unt_1' });
  });

  it('opens the EVSEs without a unit when its station has unit rows', () => {
    expect(chargerRouteParams(rows[1]!, rows)).toEqual({ stationId: 'CS-1', unit: NO_UNIT_PARAM });
  });

  it('opens a station without units as before', () => {
    expect(chargerRouteParams(rows[2]!, rows)).toEqual({ stationId: 'CS-2' });
    expect(chargerRouteParams(rows[3]!, rows)).toEqual({ stationId: 'CS-3' });
  });
});

describe('savedChargerParams', () => {
  it('opens a unit favorite on its unit and a station favorite on the station', () => {
    expect(savedChargerParams({ stationId: 'CS-1', unitId: 'unt_1' })).toEqual({
      stationId: 'CS-1',
      unit: 'unt_1',
    });
    expect(savedChargerParams({ stationId: 'CS-1', unitId: null })).toEqual({ stationId: 'CS-1' });
    expect(savedChargerParams({ stationId: 'CS-1' })).toEqual({ stationId: 'CS-1' });
  });
});

describe('locationChargers', () => {
  it('lists nothing for a site without units, so the screen stays as before', () => {
    expect(locationChargers([])).toEqual([]);
    expect(
      locationChargers([
        { stationId: 'CS-2', stationName: 'CS-2', evseId: 1, available: true },
        { stationId: 'CS-2', stationName: 'CS-2', evseId: 2, unitId: null, available: false },
      ]),
    ).toEqual([]);
  });

  it('groups the connector rows of a site with units into chargers', () => {
    const chargers = locationChargers([
      {
        stationId: 'CS-1',
        stationName: 'Garage',
        evseId: 1,
        unitId: 'unt_1',
        unitName: 'Box 1',
        available: false,
      },
      // A second connector of EVSE 1 that is free makes the EVSE free.
      {
        stationId: 'CS-1',
        stationName: 'Garage',
        evseId: 1,
        unitId: 'unt_1',
        unitName: 'Box 1',
        available: true,
      },
      {
        stationId: 'CS-1',
        stationName: 'Garage',
        evseId: 2,
        unitId: 'unt_1',
        unitName: 'Box 1',
        available: false,
      },
      { stationId: 'CS-1', stationName: 'Garage', evseId: 5, unitId: null, available: true },
      { stationId: 'CS-2', stationName: 'Lobby', evseId: 1, available: false },
    ]);
    expect(chargers).toEqual([
      {
        key: 'CS-1/unt_1',
        stationId: 'CS-1',
        stationName: 'Garage',
        unitId: 'unt_1',
        unitName: 'Box 1',
        evseCount: 2,
        availableCount: 1,
      },
      {
        key: 'CS-1',
        stationId: 'CS-1',
        stationName: 'Garage',
        unitId: null,
        unitName: null,
        evseCount: 1,
        availableCount: 1,
      },
      {
        key: 'CS-2',
        stationId: 'CS-2',
        stationName: 'Lobby',
        unitId: null,
        unitName: null,
        evseCount: 1,
        availableCount: 0,
      },
    ]);
    expect(chargerRouteParams(chargers[1]!, chargers)).toEqual({
      stationId: 'CS-1',
      unit: NO_UNIT_PARAM,
    });
    expect(chargerRouteParams(chargers[2]!, chargers)).toEqual({ stationId: 'CS-2' });
  });
});
