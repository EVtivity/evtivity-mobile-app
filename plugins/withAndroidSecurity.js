// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

const { withAndroidManifest, AndroidConfig } = require('@expo/config-plugins');

// Permissions that bundled libraries sometimes merge in but this app never
// needs. Removing them shrinks the install footprint and keeps the store
// listing honest.
const BLOCKED_PERMISSIONS = [
  'android.permission.RECORD_AUDIO',
  'android.permission.SYSTEM_ALERT_WINDOW',
  'android.permission.WRITE_EXTERNAL_STORAGE',
  'android.permission.READ_EXTERNAL_STORAGE',
];

// Harden the generated AndroidManifest: disable app-data backup so session
// tokens cannot be pulled off the device via adb backup, and strip permissions
// the app does not use even if a dependency requests them.
const withAndroidSecurity = (config) => {
  return withAndroidManifest(config, (cfg) => {
    const manifest = cfg.modResults;

    // Ensure the tools namespace so node-removal directives are understood.
    manifest.manifest.$['xmlns:tools'] = 'http://schemas.android.com/tools';

    const application = AndroidConfig.Manifest.getMainApplicationOrThrow(manifest);
    application.$['android:allowBackup'] = 'false';
    application.$['android:fullBackupContent'] = 'false';

    manifest.manifest['uses-permission'] = (manifest.manifest['uses-permission'] ?? []).filter(
      (perm) => !BLOCKED_PERMISSIONS.includes(perm.$?.['android:name']),
    );
    for (const name of BLOCKED_PERMISSIONS) {
      manifest.manifest['uses-permission'].push({
        $: { 'android:name': name, 'tools:node': 'remove' },
      });
    }

    return cfg;
  });
};

module.exports = withAndroidSecurity;
