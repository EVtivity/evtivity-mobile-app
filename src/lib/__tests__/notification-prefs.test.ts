// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

import {
  allControlUpdate,
  applyPrefsUpdate,
  availableChannels,
  cellUpdate,
  channelState,
  groupEvents,
  type NotificationEventPref,
  type NotificationPrefs,
} from '../notification-prefs';

const on = { enabled: true, mandatory: false };
const off = { enabled: false, mandatory: false };
const locked = { enabled: true, mandatory: true };

function event(
  eventType: string,
  group: string,
  cells: Partial<Pick<NotificationEventPref, 'email' | 'sms' | 'push'>> = {},
): NotificationEventPref {
  return { eventType, group, email: on, sms: on, push: on, ...cells };
}

function prefs(events: NotificationEventPref[], channels = { email: true, sms: true, push: true }) {
  const value: NotificationPrefs = {
    emailEnabled: true,
    smsEnabled: true,
    pushEnabled: true,
    channels,
    events,
  };
  return value;
}

describe('availableChannels', () => {
  it('lists the configured channels and always push', () => {
    expect(availableChannels(prefs([]))).toEqual(['email', 'sms', 'push']);
    expect(availableChannels(prefs([], { email: false, sms: true, push: true }))).toEqual([
      'sms',
      'push',
    ]);
    expect(availableChannels(prefs([], { email: false, sms: false, push: false }))).toEqual([
      'push',
    ]);
  });
});

describe('groupEvents', () => {
  it('groups consecutive events in display order', () => {
    const groups = groupEvents([
      event('session.Started', 'sessions'),
      event('session.Completed', 'sessions'),
      event('payment.Complete', 'payments'),
    ]);
    expect(groups.map((g) => [g.group, g.events.map((e) => e.eventType)])).toEqual([
      ['sessions', ['session.Started', 'session.Completed']],
      ['payments', ['payment.Complete']],
    ]);
  });
});

describe('channelState', () => {
  it('reads on, off, mixed and none over the optional events', () => {
    expect(
      channelState(prefs([event('a', 'g'), event('b', 'g', { email: locked })]), 'email'),
    ).toBe('on');
    expect(channelState(prefs([event('a', 'g', { sms: off })]), 'sms')).toBe('off');
    expect(channelState(prefs([event('a', 'g'), event('b', 'g', { push: off })]), 'push')).toBe(
      'mixed',
    );
    expect(channelState(prefs([event('a', 'g', { email: locked })]), 'email')).toBe('none');
  });
});

describe('allControlUpdate', () => {
  it('turns all off when all are on, and on when all are off', () => {
    expect(allControlUpdate(prefs([event('a', 'g')]), 'email')).toEqual({ emailEnabled: false });
    expect(allControlUpdate(prefs([event('a', 'g', { sms: off })]), 'sms')).toEqual({
      smsEnabled: true,
    });
  });

  it('turns the off events on one by one when mixed', () => {
    const value = prefs([event('a', 'g'), event('b', 'g', { push: off })]);
    expect(allControlUpdate(value, 'push')).toEqual({
      events: [{ eventType: 'b', channel: 'push', enabled: true }],
    });
  });

  it('sends nothing for a channel without an optional event', () => {
    expect(allControlUpdate(prefs([event('a', 'g', { email: locked })]), 'email')).toBeNull();
  });
});

describe('cellUpdate', () => {
  const value = prefs([event('a', 'g', { email: locked })]);

  it('sends the one changed cell', () => {
    expect(cellUpdate(value, 'a', 'sms', false)).toEqual({
      events: [{ eventType: 'a', channel: 'sms', enabled: false }],
    });
  });

  it('sends nothing for a mandatory cell, an unchanged value or an unknown event', () => {
    expect(cellUpdate(value, 'a', 'email', false)).toBeNull();
    expect(cellUpdate(value, 'a', 'sms', true)).toBeNull();
    expect(cellUpdate(value, 'x', 'sms', false)).toBeNull();
  });
});

describe('applyPrefsUpdate', () => {
  it('applies a channel switch to the optional events only', () => {
    const next = applyPrefsUpdate(prefs([event('a', 'g'), event('b', 'g', { email: locked })]), {
      emailEnabled: false,
    });
    expect(next.events.map((e) => e.email)).toEqual([off, locked]);
    expect(next.emailEnabled).toBe(false);
    expect(next.smsEnabled).toBe(true);
  });

  it('ignores a channel switch that equals the shown value', () => {
    const value = prefs([event('a', 'g'), event('b', 'g', { sms: off })]);
    expect(applyPrefsUpdate(value, { smsEnabled: true }).events[1]?.sms).toEqual(off);
  });

  it('applies event entries after the switch and never to a mandatory cell', () => {
    const value = prefs([event('a', 'g', { push: off }), event('b', 'g', { push: locked })]);
    const next = applyPrefsUpdate(value, {
      events: [
        { eventType: 'a', channel: 'push', enabled: true },
        { eventType: 'b', channel: 'push', enabled: false },
      ],
    });
    expect(next.events.map((e) => e.push)).toEqual([on, locked]);
    expect(next.pushEnabled).toBe(true);
  });
});
