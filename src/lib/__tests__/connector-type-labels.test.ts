// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

import { connectorTypeLabel } from '@/lib/connector-type-labels.generated';

const words = { other: 'Other', pantograph: 'Pantograph' };
const label = (t: string | null | undefined): string => connectorTypeLabel(t, words);

describe('connectorTypeLabel (the generated copy of the CSMS names)', () => {
  it.each([
    ['Type1', 'J1772'],
    ['cType1', 'J1772'],
    ['sType1', 'J1772'],
    ['J1772', 'J1772'],
    ['Type2', 'Type 2'],
    ['cType2', 'Type 2'],
    ['CCS1', 'CCS1'],
    ['cCCS2', 'CCS2'],
    ['CHAdeMO', 'CHAdeMO'],
    ['NACS', 'NACS'],
    ['cMCS', 'MCS'],
    ['OppCharge', 'Pantograph'],
    ['Pan', 'Pantograph'],
    ['Unknown', 'Other'],
  ])('shows %s as %s', (type, expected) => {
    expect(label(type)).toBe(expected);
  });

  it('shows none as Other and an unlisted value with a space before its digits', () => {
    expect(label(null)).toBe('Other');
    expect(label('')).toBe('Other');
    expect(label('Vendor9')).toBe('Vendor 9');
    expect(label('constructor')).toBe('constructor');
  });
});
