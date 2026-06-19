// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { apiErrorMessage } from '@/lib/api';
import { useToast } from './Toast';

// Returns a callback that shows a thrown error as an error toast, mapping it to
// the friendly server/offline copy. Collapses the repeated
// `toast.show(apiErrorMessage(err, t), 'error')` idiom at every mutation site.
export function useApiErrorToast(): (err: unknown) => void {
  const { t } = useTranslation();
  const toast = useToast();
  return useCallback((err: unknown) => toast.show(apiErrorMessage(err, t), 'error'), [t, toast]);
}
