// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

const { withEntitlementsPlist } = require('@expo/config-plugins');

// Adds the Apple App Attest entitlement so DCAppAttestService can produce
// attestations on device. The environment must match the App Attest servers the
// build targets: "development" for dev/TestFlight internal builds, "production"
// for App Store / TestFlight external. Android Play Integrity needs no
// entitlement; its dependency ships with the local module's build.gradle.
const withAppAttest = (config, props = {}) => {
  const environment = props.environment === 'production' ? 'production' : 'development';
  return withEntitlementsPlist(config, (cfg) => {
    cfg.modResults['com.apple.developer.devicecheck.appattest-environment'] = environment;
    return cfg;
  });
};

module.exports = withAppAttest;
