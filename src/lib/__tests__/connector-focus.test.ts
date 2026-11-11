// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

import { scannedEvseId, visibleEvses } from '@/lib/connector-focus';

const evses = [{ evseId: 1 }, { evseId: 2 }, { evseId: 3 }];

describe('scannedEvseId', () => {
  it('reads a numeric param', () => {
    expect(scannedEvseId('2')).toBe(2);
  });

  it('reads no param, an empty one or a non-number as none', () => {
    expect(scannedEvseId(undefined)).toBeNull();
    expect(scannedEvseId('')).toBeNull();
    expect(scannedEvseId('abc')).toBeNull();
    expect(scannedEvseId('1.5')).toBeNull();
  });
});

describe('visibleEvses', () => {
  it('lists only the scanned EVSE', () => {
    expect(visibleEvses(evses, 2)).toEqual([{ evseId: 2 }]);
  });

  it('lists every EVSE without a focus', () => {
    expect(visibleEvses(evses, null)).toBe(evses);
  });

  it('lists every EVSE when the station has no such EVSE', () => {
    expect(visibleEvses(evses, 9)).toBe(evses);
  });
});
