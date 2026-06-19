// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@brands/(.*)$': '<rootDir>/brands/$1',
  },
  // Coverage is gated to the framework-agnostic logic layer; screens and
  // components are exercised on-device, not in unit tests.
  collectCoverageFrom: ['src/lib/**/*.{ts,tsx}'],
  coverageThreshold: {
    global: { branches: 100, functions: 100, lines: 100, statements: 100 },
  },
};
