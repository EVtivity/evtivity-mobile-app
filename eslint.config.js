// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

const expoConfig = require('eslint-config-expo/flat');

module.exports = [
  ...expoConfig,
  {
    ignores: ['dist/*', '.expo/*', 'ios/*', 'android/*', 'node_modules/*'],
  },
  {
    // Jest test files mock modules with jest.mock() before importing them and
    // load mocked modules via require() to control evaluation order. Both are
    // standard testing patterns that conflict with these import rules.
    files: ['**/__tests__/**/*.{ts,tsx}', '**/*.test.{ts,tsx}'],
    rules: {
      'import/first': 'off',
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
];
