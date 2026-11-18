// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

import { isFleetEnabled } from '../app-info';

// Only an explicit false turns the fleet screens off: an older server sends no
// fleetEnabled, and a features read still loading leaves them as they were.
describe('isFleetEnabled', () => {
  it('is off only for an explicit false', () => {
    expect(isFleetEnabled({ fleetEnabled: false })).toBe(false);
    expect(isFleetEnabled({ fleetEnabled: true })).toBe(true);
    expect(isFleetEnabled({})).toBe(true);
    expect(isFleetEnabled(undefined)).toBe(true);
  });
});
