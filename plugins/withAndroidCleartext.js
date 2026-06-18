// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

const { withAndroidManifest, AndroidConfig } = require('@expo/config-plugins');

// Allow cleartext (HTTP) traffic for release builds. The CSMS backend may be
// served over plain HTTP, and Android blocks cleartext in release by default, so
// every API call fails with "Network request failed". Debug builds set this in
// their own manifest; this applies the same to all variants. Only wired in
// app.config.ts when the API URL is a non-local cleartext host (mirrors the iOS
// ATS exception), so HTTPS-only builds are unaffected.
const withAndroidCleartext = (config) => {
  return withAndroidManifest(config, (cfg) => {
    const application = AndroidConfig.Manifest.getMainApplicationOrThrow(cfg.modResults);
    application.$['android:usesCleartextTraffic'] = 'true';
    return cfg;
  });
};

module.exports = withAndroidCleartext;
