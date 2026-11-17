// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { chargingPointPath, type ChargingPointPathInput } from './charging-point-path';
import { useConnectorTypeLabel } from './connector-label';

/** A session's charging point as one line: Site / Station / Unit / EVSE / Connector type. */
export function useChargingPointPath(): (input: ChargingPointPathInput) => string {
  const { t } = useTranslation();
  const connectorTypeLabel = useConnectorTypeLabel();
  return useCallback(
    (input: ChargingPointPathInput) =>
      chargingPointPath(input, {
        evse: (id) => t('activity.evseNumber', { id }),
        connector: (id) => t('activity.connectorNumber', { id }),
        connectorType: connectorTypeLabel,
      }),
    [t, connectorTypeLabel],
  );
}
