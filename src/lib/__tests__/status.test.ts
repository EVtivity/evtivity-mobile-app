// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

import {
  connectorStatusLabel,
  isStartable,
  isCableDetected,
  sessionStatusTone,
  SESSION_TONE_COLOR,
  sessionStatusLabelKey,
  connectorStatusColor,
} from '@/lib/status';
import type { ConnectorStatus } from '@/lib/types';

describe('connectorStatusLabel', () => {
  it('title-cases each underscore-separated word', () => {
    expect(connectorStatusLabel('ev_connected')).toBe('Ev Connected');
    expect(connectorStatusLabel('available')).toBe('Available');
  });
});

describe('isStartable', () => {
  it('allows the startable statuses', () => {
    for (const s of ['available', 'occupied', 'preparing', 'ev_connected', 'finishing'] as const) {
      expect(isStartable(s)).toBe(true);
    }
  });
  it('rejects others', () => {
    expect(isStartable('faulted')).toBe(false);
  });
});

describe('isCableDetected', () => {
  it('returns false for null', () => {
    expect(isCableDetected(null)).toBe(false);
  });
  it('detects a plugged-in cable', () => {
    expect(isCableDetected('charging')).toBe(true);
  });
  it('returns false when unplugged', () => {
    expect(isCableDetected('available')).toBe(false);
  });
});

describe('sessionStatusTone', () => {
  it('is warning while idling regardless of status', () => {
    expect(sessionStatusTone('active', true)).toBe('warning');
  });
  it('is success when active', () => {
    expect(sessionStatusTone('active')).toBe('success');
  });
  it('is destructive when failed or faulted', () => {
    expect(sessionStatusTone('failed')).toBe('destructive');
    expect(sessionStatusTone('faulted')).toBe('destructive');
  });
  it('is primary for anything else', () => {
    expect(sessionStatusTone('completed')).toBe('primary');
  });
  it('exposes a color per tone', () => {
    expect(Object.keys(SESSION_TONE_COLOR)).toEqual([
      'success',
      'warning',
      'destructive',
      'primary',
    ]);
  });
});

describe('sessionStatusLabelKey', () => {
  it('maps active to charging', () => {
    expect(sessionStatusLabelKey('active')).toBe('status.charging');
  });
  it('maps faulted to failed', () => {
    expect(sessionStatusLabelKey('faulted')).toBe('status.failed');
  });
  it('passes other statuses through', () => {
    expect(sessionStatusLabelKey('completed')).toBe('status.completed');
  });
});

describe('connectorStatusColor', () => {
  const cases: [ConnectorStatus | string, string][] = [
    ['available', 'bg-green-500'],
    ['finishing', 'bg-violet-500'],
    ['occupied', 'bg-blue-500'],
    ['charging', 'bg-blue-500'],
    ['discharging', 'bg-blue-500'],
    ['preparing', 'bg-cyan-500'],
    ['ev_connected', 'bg-cyan-500'],
    ['reserved', 'bg-orange-500'],
    ['suspended_ev', 'bg-yellow-500'],
    ['suspended_evse', 'bg-yellow-500'],
    ['idle', 'bg-yellow-500'],
    ['faulted', 'bg-red-500'],
    ['unavailable', 'bg-red-500'],
    ['anything-else', 'bg-red-500'],
  ];
  it.each(cases)('maps %s to %s', (status, expected) => {
    expect(connectorStatusColor(status)).toBe(expected);
  });
});
