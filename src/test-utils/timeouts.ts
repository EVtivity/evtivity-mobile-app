// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

/**
 * Time allowed for a test that renders a screen for the first time in its file. That first
 * render loads the screen's React Native and Expo modules (about 3 s on an idle machine), which
 * passed Jest's 5 s default when the release script ran the suite on a loaded machine. Later
 * renders of the same screen take well under a second and keep the default.
 */
export const FIRST_RENDER_TIMEOUT_MS = 30_000;
