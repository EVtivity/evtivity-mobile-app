// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

import { CONNECTOR_FACE_DRAWINGS } from '@/lib/connector-faces.generated';
import {
  PLUG_IN_HANDLE_STEPS,
  PLUG_IN_LIGHT_STEPS,
  plugInConnectorKind,
  plugInFace,
} from '@/lib/plug-in';

describe('plug-in animation', () => {
  it.each([
    ['Type2', 'type2'],
    ['cType1', 'type1'],
    ['J1772', 'type1'],
    ['CCS1', 'ccs1'],
    ['cCCS2', 'ccs2'],
    ['CHAdeMO', 'chademo'],
    ['NACS', 'nacs'],
    ['cMCS', 'mcs'],
  ])('draws the inlet face of a %s connector', (type, kind) => {
    expect(plugInConnectorKind(type)).toBe(kind);
    expect(plugInFace(plugInConnectorKind(type))).toBe(
      CONNECTOR_FACE_DRAWINGS[kind as keyof typeof CONNECTOR_FACE_DRAWINGS],
    );
  });

  it.each([[null], [undefined], ['Other1PhMax16A'], ['constructor']])(
    'shows the neutral round inlet for %s',
    (type) => {
      expect(plugInConnectorKind(type)).toBeNull();
      expect(plugInFace(null)).toBeNull();
    },
  );

  it('plugs in before the light turns on and unplugs after it turns off', () => {
    const inAt = PLUG_IN_HANDLE_STEPS.input[2] ?? 1;
    const outAt = PLUG_IN_HANDLE_STEPS.input[3] ?? 0;
    expect(PLUG_IN_LIGHT_STEPS.input[1]).toBeGreaterThanOrEqual(inAt);
    expect(PLUG_IN_LIGHT_STEPS.input[4]).toBeGreaterThan(outAt);
    for (const face of Object.values(CONNECTOR_FACE_DRAWINGS)) {
      expect(face.outline.startsWith('M')).toBe(true);
      expect(face.contacts.length).toBeGreaterThan(0);
    }
  });
});
