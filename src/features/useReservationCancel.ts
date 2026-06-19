// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

import React from 'react';
import { useTranslation } from 'react-i18next';
import { useConfirm } from '@/components/ui';
import { useFeatures } from '@/features/app-info';
import { formatCurrency } from '@/lib/format';

// Shows the cancel-confirmation dialog for a reservation, surfacing the
// cancellation fee when the reservation starts inside the operator's fee window.
// Returns true when the driver confirms. Shared by the list and detail screens
// so the fee rule lives in one place.
export function useConfirmCancelReservation(): (startsAt: string | null) => Promise<boolean> {
  const { t } = useTranslation();
  const confirm = useConfirm();
  const features = useFeatures();
  return React.useCallback(
    (startsAt) => {
      const feeCents = features.data?.reservationCancellationFeeCents ?? 0;
      const windowMin = features.data?.reservationCancellationWindowMinutes ?? 0;
      const currency = features.data?.currency ?? 'USD';
      const startMs = startsAt != null ? new Date(startsAt).getTime() : Date.now();
      const minutesUntilStart = (startMs - Date.now()) / 60_000;
      const feeApplies = feeCents > 0 && minutesUntilStart < windowMin;
      const message = feeApplies
        ? t('reservations.cancelFeeWarning', { fee: formatCurrency(feeCents, currency) })
        : t('reservations.cancelMessage');
      return confirm({
        title: t('reservations.cancel'),
        message,
        confirmText: t('reservations.cancel'),
        destructive: true,
      });
    },
    [confirm, features.data, t],
  );
}
