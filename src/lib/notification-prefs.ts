// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

// Driver notification preferences: one choice per event and channel
// (GET/PUT /v1/portal/driver/notification-preferences). The operator decides
// which channels exist, which events are offered and which cells are
// mandatory; account and security messages are always sent and never listed.

export const NOTIFICATION_CHANNELS = ['email', 'sms', 'push'] as const;
export type NotificationChannel = (typeof NOTIFICATION_CHANNELS)[number];

export interface NotificationCell {
  enabled: boolean;
  mandatory: boolean;
}

export interface NotificationEventPref {
  eventType: string;
  group: string;
  email: NotificationCell;
  sms: NotificationCell;
  push: NotificationCell;
}

export interface NotificationPrefs {
  emailEnabled: boolean;
  smsEnabled: boolean;
  pushEnabled: boolean;
  channels: Record<NotificationChannel, boolean>;
  events: NotificationEventPref[];
}

export interface NotificationEventChange {
  eventType: string;
  channel: NotificationChannel;
  enabled: boolean;
}

export interface NotificationPrefsUpdate {
  emailEnabled?: boolean;
  smsEnabled?: boolean;
  pushEnabled?: boolean;
  events?: NotificationEventChange[];
}

export type ChannelState = 'on' | 'off' | 'mixed' | 'none';

const SWITCH_KEY = {
  email: 'emailEnabled',
  sms: 'smsEnabled',
  push: 'pushEnabled',
} as const satisfies Record<NotificationChannel, keyof NotificationPrefs>;

// Channels the operator has configured, in display order. Push is always
// available in the app.
export function availableChannels(prefs: NotificationPrefs): NotificationChannel[] {
  return NOTIFICATION_CHANNELS.filter((channel) => channel === 'push' || prefs.channels[channel]);
}

// Events in display order, grouped consecutively as the API lists them.
export function groupEvents(
  events: NotificationEventPref[],
): { group: string; events: NotificationEventPref[] }[] {
  const groups: { group: string; events: NotificationEventPref[] }[] = [];
  for (const event of events) {
    const last = groups[groups.length - 1];
    if (last?.group === event.group) last.events.push(event);
    else groups.push({ group: event.group, events: [event] });
  }
  return groups;
}

// State of the "All Notifications" control of a channel over its optional
// events: 'none' when the channel has no optional event.
export function channelState(prefs: NotificationPrefs, channel: NotificationChannel): ChannelState {
  const optional = prefs.events.filter((event) => !event[channel].mandatory);
  if (optional.length === 0) return 'none';
  const on = optional.filter((event) => event[channel].enabled).length;
  if (on === optional.length) return 'on';
  return on === 0 ? 'off' : 'mixed';
}

// The request body of a tap on the All control. All on turns every optional
// event off; all off or mixed turns them all on. A mixed channel already shows
// its switch on, so the server would ignore the channel switch: the off events
// are sent one by one instead.
export function allControlUpdate(
  prefs: NotificationPrefs,
  channel: NotificationChannel,
): NotificationPrefsUpdate | null {
  const state = channelState(prefs, channel);
  if (state === 'none') return null;
  if (state === 'on') return { [SWITCH_KEY[channel]]: false };
  if (state === 'off') return { [SWITCH_KEY[channel]]: true };
  return {
    events: prefs.events
      .filter((event) => !event[channel].mandatory && !event[channel].enabled)
      .map((event) => ({ eventType: event.eventType, channel, enabled: true })),
  };
}

// The request body of one cell, or null for a mandatory cell (it cannot be
// turned off) or a value that does not change anything.
export function cellUpdate(
  prefs: NotificationPrefs,
  eventType: string,
  channel: NotificationChannel,
  enabled: boolean,
): NotificationPrefsUpdate | null {
  const event = prefs.events.find((e) => e.eventType === eventType);
  if (event == null || event[channel].mandatory || event[channel].enabled === enabled) return null;
  return { events: [{ eventType, channel, enabled }] };
}

// The state the server will answer with, applied ahead of the reply so a
// switch moves on tap: the channel switch first, then the event entries.
export function applyPrefsUpdate(
  prefs: NotificationPrefs,
  update: NotificationPrefsUpdate,
): NotificationPrefs {
  let events = prefs.events;
  for (const channel of NOTIFICATION_CHANNELS) {
    const value = update[SWITCH_KEY[channel]];
    if (value == null || value === prefs[SWITCH_KEY[channel]]) continue;
    events = events.map((event) =>
      event[channel].mandatory
        ? event
        : { ...event, [channel]: { ...event[channel], enabled: value } },
    );
  }
  for (const change of update.events ?? []) {
    events = events.map((event) =>
      event.eventType !== change.eventType || event[change.channel].mandatory
        ? event
        : { ...event, [change.channel]: { ...event[change.channel], enabled: change.enabled } },
    );
  }
  const next = { ...prefs, events };
  for (const channel of NOTIFICATION_CHANNELS) {
    next[SWITCH_KEY[channel]] = events.some((e) => !e[channel].mandatory && e[channel].enabled);
  }
  return next;
}
