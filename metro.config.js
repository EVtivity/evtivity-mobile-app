// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

// Use Metro's node file crawler instead of Watchman. Watchman cannot watch
// projects under macOS TCC-protected folders (~/Desktop, ~/Documents) without
// Full Disk Access and hangs on `watch-project`. The node crawler needs no
// special permission. Remove this if the project lives outside a protected
// folder and Watchman has disk access.
config.resolver.useWatchman = false;

module.exports = withNativeWind(config, { input: './global.css' });
