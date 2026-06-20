// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

module.exports = function (api) {
  api.cache(true);
  // babel-preset-expo auto-adds the react-native-reanimated plugin when the
  // package is installed, so it must not be listed manually.
  return {
    presets: [['babel-preset-expo', { jsxImportSource: 'nativewind' }], 'nativewind/babel'],
  };
};
