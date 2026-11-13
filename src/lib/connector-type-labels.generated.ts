// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

// GENERATED from @evtivity/lib/connector-type-label (the CSMS repo): the
// connector type names the CSMS and the portal show. Display only: stored
// values and API payloads keep the station's spelling. Do not edit by hand;
// regenerate it from the CSMS repo.

/** The translated words the label uses. */
export interface ConnectorTypeWords {
  other: string;
  pantograph: string;
}

/** A standard name, or a word the app translates. */
export type ConnectorTypeLabelEntry = string | { word: keyof ConnectorTypeWords };

/** Labels by the type compared lowercase with everything but letters and digits removed. */
export const CONNECTOR_TYPE_LABELS: Readonly<Record<string, ConnectorTypeLabelEntry>> = {
  type1: 'J1772',
  ctype1: 'J1772',
  stype1: 'J1772',
  j1772: 'J1772',
  type2: 'Type 2',
  ctype2: 'Type 2',
  stype2: 'Type 2',
  stype3: 'Type 3',
  ccs1: 'CCS1',
  cccs1: 'CCS1',
  combo1: 'CCS1',
  ccs2: 'CCS2',
  cccs2: 'CCS2',
  combo2: 'CCS2',
  chademo: 'CHAdeMO',
  cg105: 'CHAdeMO',
  cchaoji: 'ChaoJi',
  cultrachaoji: 'Ultra-ChaoJi',
  nacs: 'NACS',
  cnacs: 'NACS',
  j3400: 'NACS',
  cnacsccs1: 'NACS-CCS1',
  cccs1nacs: 'CCS1-NACS',
  tesla: 'Tesla',
  ctesla: 'Tesla',
  mcs: 'MCS',
  cmcs: 'MCS',
  gbt: 'GB/T',
  cgbtdc: 'GB/T',
  cleccs: 'LECCS',
  s3091p16a: 'IEC 60309 1P 16A',
  s3091p32a: 'IEC 60309 1P 32A',
  s3093p16a: 'IEC 60309 3P 16A',
  s3093p32a: 'IEC 60309 3P 32A',
  sbs1361: 'BS 1361',
  scee77: 'CEE 7/7',
  oppcharge: {
    word: 'pantograph',
  },
  pan: {
    word: 'pantograph',
  },
  pantograph: {
    word: 'pantograph',
  },
  winductive: {
    word: 'other',
  },
  wresonant: {
    word: 'other',
  },
  bbatteryslot: {
    word: 'other',
  },
  other1phmax16a: {
    word: 'other',
  },
  other1phover16a: {
    word: 'other',
  },
  other3ph: {
    word: 'other',
  },
  undetermined: {
    word: 'other',
  },
  unknown: {
    word: 'other',
  },
};

/** The display name of a connector type; "Other" for none or Unknown, an unlisted value with a space before trailing digits. */
export function connectorTypeLabel(
  type: string | null | undefined,
  words: ConnectorTypeWords,
): string {
  const raw = (type ?? '').trim();
  if (raw === '') return words.other;
  const key = raw.toLowerCase().replace(/[^a-z0-9]/g, '');
  const label = Object.prototype.hasOwnProperty.call(CONNECTOR_TYPE_LABELS, key)
    ? CONNECTOR_TYPE_LABELS[key]
    : undefined;
  if (label == null) return raw.replace(/^(.*?[A-Za-z])(\d+)$/, '$1 $2');
  return typeof label === 'string' ? label : words[label.word];
}
