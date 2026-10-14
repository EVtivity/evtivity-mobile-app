// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

import type { RfidToken } from './types';

/**
 * What a driver card row shows. `blocked`: the operator deactivated the card,
 * so only the operator can reactivate it (no switch). `expired`: an active
 * card past the expiry the operator set. Mirrors the driver portal.
 */
export type RfidTokenStatus = 'active' | 'inactive' | 'blocked' | 'expired';

export function rfidTokenStatus(
  token: Pick<RfidToken, 'isActive' | 'expiresAt' | 'blockedByOperator'>,
  now: number = Date.now(),
): RfidTokenStatus {
  if (token.blockedByOperator === true) return 'blocked';
  if (!token.isActive) return 'inactive';
  if (token.expiresAt != null && new Date(token.expiresAt).getTime() <= now) return 'expired';
  return 'active';
}
