// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

import {
  CONNECTOR_FACE_DRAWINGS,
  CONNECTOR_KIND_ALIASES,
  type ConnectorKind,
  type FaceDrawing,
} from './connector-faces.generated';

// A Map, so a prototype name (constructor, toString) names no kind.
const KIND_BY_ALIAS = new Map<string, ConnectorKind>(Object.entries(CONNECTOR_KIND_ALIASES));

/** The connector kind a station connector type names (OCPP 1.6, 2.x and CSMS spellings); null when it names none. */
export function plugInConnectorKind(type: string | null | undefined): ConnectorKind | null {
  const t = (type ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
  return KIND_BY_ALIAS.get(t) ?? null;
}

/** The measured inlet face of a connector kind, or null for the neutral round inlet. */
export function plugInFace(kind: ConnectorKind | null): FaceDrawing | null {
  return kind == null ? null : CONNECTOR_FACE_DRAWINGS[kind];
}

/**
 * The loop of the plug-in animation as fractions of its 4 s: the handle moves
 * in from 12 to 40 percent, stays in until 84, and moves out by 100; the port
 * light shows from 42 to 50 percent and is off again from 82 to 90. The same
 * timing as the portal.
 */
export const PLUG_IN_LOOP_MS = 4000;
export const PLUG_IN_HANDLE_STEPS = { input: [0, 0.12, 0.4, 0.84, 1], output: [0, 0, 1, 1, 0] };
export const PLUG_IN_LIGHT_STEPS = {
  input: [0, 0.42, 0.5, 0.82, 0.9, 1],
  output: [0, 0, 1, 1, 0, 0],
};
/** How far the handle is drawn from the port before it plugs in, in view units. */
export const PLUG_IN_OFFSET = { x: -44, y: 8 };
