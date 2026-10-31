// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

import { VEHICLE_BODY_TYPES, VEHICLE_COLORS, isVehicleBodyType } from '../vehicle-appearance';
import en from '../i18n/en.json';
import de from '../i18n/de.json';
import es from '../i18n/es.json';
import ko from '../i18n/ko.json';
import zh from '../i18n/zh.json';
import zhTW from '../i18n/zh-TW.json';

const LOCALES = { en, de, es, ko, zh, 'zh-TW': zhTW } as const;

describe('vehicle body types', () => {
  it('lists the CSMS body types in the CSMS order', () => {
    expect(VEHICLE_BODY_TYPES).toEqual([
      'sedan',
      'hatchback',
      'suv',
      'pickup_truck',
      'van',
      'box_truck',
      'bus',
      'semi_truck',
    ]);
  });

  it('accepts the box truck, bus and semi truck and refuses unknown values', () => {
    expect(isVehicleBodyType('box_truck')).toBe(true);
    expect(isVehicleBodyType('bus')).toBe(true);
    expect(isVehicleBodyType('semi_truck')).toBe(true);
    expect(isVehicleBodyType('tractor')).toBe(false);
    expect(isVehicleBodyType(null)).toBe(false);
  });

  it('labels the new body types in English', () => {
    expect(en.vehicles.bodyTypes.box_truck).toBe('Box Truck');
    expect(en.vehicles.bodyTypes.bus).toBe('Bus');
    expect(en.vehicles.bodyTypes.semi_truck).toBe('Semi Truck');
  });

  it.each(Object.entries(LOCALES))('%s labels every body type and color', (_lang, locale) => {
    const bodyTypes = locale.vehicles.bodyTypes as Record<string, string>;
    expect(Object.keys(bodyTypes)).toEqual([...VEHICLE_BODY_TYPES]);
    for (const type of VEHICLE_BODY_TYPES) expect(bodyTypes[type]?.trim()).toBeTruthy();
    const colors = locale.vehicles.colors as Record<string, string>;
    for (const color of VEHICLE_COLORS) expect(colors[color]?.trim()).toBeTruthy();
  });
});
