// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

import {
  autochargeControl,
  canUseForPlugIn,
  formatVehicleId,
  vehicleHasId,
} from '@/lib/vehicle-id';

const MAC = { value: 'AABBCCDDEEFF', type: 'MacAddress', source: 'id_tag' };

describe('formatVehicleId', () => {
  it('shows a MAC address with colons', () => {
    expect(formatVehicleId('AABBCCDDEEFF')).toBe('AA:BB:CC:DD:EE:FF');
  });

  it('shows a VIN or a long EVCCID as stored', () => {
    expect(formatVehicleId('WVWZZZ1JZXW000001')).toBe('WVWZZZ1JZXW000001');
    expect(formatVehicleId('aabbccddeeff')).toBe('aabbccddeeff');
  });
});

describe('vehicleHasId', () => {
  it('needs a VIN or an EVCCID', () => {
    expect(vehicleHasId({})).toBe(false);
    expect(vehicleHasId({ vin: null, evccid: null })).toBe(false);
    expect(vehicleHasId({ vin: 'WVWZZZ1JZXW000001' })).toBe(true);
    expect(vehicleHasId({ evccid: 'AABBCCDDEEFF' })).toBe(true);
  });
});

describe('autochargeControl', () => {
  it('shows nothing without a vehicle id', () => {
    expect(autochargeControl({ autochargeEnabled: true }, true)).toBe('none');
  });

  it('locks a vehicle the operator blocked', () => {
    expect(autochargeControl({ evccid: 'AABBCCDDEEFF', autochargeBlocked: true }, true)).toBe(
      'locked',
    );
    expect(
      autochargeControl(
        { evccid: 'AABBCCDDEEFF', autochargeBlocked: true, autochargeEnabled: true },
        false,
      ),
    ).toBe('locked');
  });

  it('shows the switch where Autocharge is offered or on', () => {
    expect(autochargeControl({ vin: 'WVWZZZ1JZXW000001' }, true)).toBe('switch');
    expect(autochargeControl({ vin: 'WVWZZZ1JZXW000001', autochargeEnabled: true }, false)).toBe(
      'switch',
    );
  });

  it('hides the switch where Autocharge is not offered and off', () => {
    expect(autochargeControl({ vin: 'WVWZZZ1JZXW000001', autochargeEnabled: false }, false)).toBe(
      'none',
    );
  });
});

describe('canUseForPlugIn', () => {
  it('is hidden where the site does not offer Autocharge', () => {
    expect(canUseForPlugIn(MAC, null, false)).toBe(false);
  });

  it('is offered for a session without a vehicle', () => {
    expect(canUseForPlugIn(MAC, null, true)).toBe(true);
    expect(canUseForPlugIn(MAC, undefined, true)).toBe(true);
  });

  it('is offered while the vehicle does not charge by plugging in with this id', () => {
    expect(canUseForPlugIn(MAC, { evccid: 'AABBCCDDEEFF', autochargeEnabled: false }, true)).toBe(
      true,
    );
    expect(canUseForPlugIn(MAC, { evccid: '112233445566', autochargeEnabled: true }, true)).toBe(
      true,
    );
  });

  it('is hidden when the vehicle already charges by plugging in with this id', () => {
    expect(canUseForPlugIn(MAC, { evccid: 'AABBCCDDEEFF', autochargeEnabled: true }, true)).toBe(
      false,
    );
    expect(
      canUseForPlugIn(
        { value: 'WVWZZZ1JZXW000001', type: 'VIN', source: 'id_token' },
        { vin: 'WVWZZZ1JZXW000001', autochargeEnabled: true },
        true,
      ),
    ).toBe(false);
  });
});
