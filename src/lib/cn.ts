// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

import { twMerge } from 'tailwind-merge';

// className joiner with Tailwind conflict resolution: when two classes set the
// same property (e.g. a surface default text-white and an explicit
// text-muted-foreground), the last one wins. This lets components override the
// surface text color deterministically.
export function cn(...parts: (string | false | null | undefined)[]): string {
  return twMerge(parts.filter(Boolean).join(' '));
}
