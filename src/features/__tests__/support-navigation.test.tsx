// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

// The Support list is opened from home, the Account screen and push taps, and
// its back returns to where it was opened from. A case goes back to the list.
// These tests run the app's own tab and support layouts in expo-router's test
// renderer, with stand-in screens that carry the real back button.

jest.mock('@/features/app-info', () => ({ useSupportEnabled: () => true }));
// The custom tab bar is presentation only; the tests navigate with the router.
jest.mock('@/components/TabBar', () => ({ TabBar: () => null }));
jest.mock('@/components/icons', () => new Proxy({}, { get: () => () => null }));

import React from 'react';
import { Text } from 'react-native';
import { Stack, router, usePathname } from 'expo-router';
import { renderRouter } from 'expo-router/testing-library';
import { act, fireEvent, screen } from '@testing-library/react-native';
import { BackButton } from '@/components/ui/BackButton';
import { openRoute } from '@/lib/push-route';
import TabsLayout from '../../../app/(tabs)/_layout';
import SupportLayout, * as supportLayout from '../../../app/(tabs)/support/_layout';
import * as accountLayout from '../../../app/(tabs)/account/_layout';

function Page({ name, fallbackHref }: { name: string; fallbackHref?: '/(tabs)' }) {
  // Only the focused screen renders its back button, as only it is visible.
  const pathname = usePathname();
  return (
    <>
      <Text>{name}</Text>
      {pathname === PATHS[name] || (name === 'case' && pathname.startsWith('/support/')) ? (
        <BackButton fallbackHref={fallbackHref} />
      ) : null}
    </>
  );
}

const PATHS: Record<string, string> = { home: '/', account: '/account', list: '/support' };

const routes = {
  _layout: () => <Stack screenOptions={{ headerShown: false }} />,
  '(tabs)/_layout': TabsLayout,
  '(tabs)/index': () => <Page name="home" />,
  '(tabs)/charge/index': () => <Page name="charge" />,
  '(tabs)/activity': () => <Page name="activity" />,
  '(tabs)/reservations/index': () => <Page name="reservations" />,
  '(tabs)/account/_layout': accountLayout,
  '(tabs)/account/index': () => <Page name="account" />,
  '(tabs)/session/[id]': () => <Page name="session" />,
  '(tabs)/favorites': () => <Page name="favorites" />,
  '(tabs)/watching': () => <Page name="watching" />,
  '(tabs)/statement': () => <Page name="statement" />,
  '(tabs)/support/_layout': { ...supportLayout, default: SupportLayout },
  '(tabs)/support/index': () => <Page name="list" fallbackHref="/(tabs)" />,
  '(tabs)/support/[id]': () => <Page name="case" />,
};

// React Native Testing Library 14 renders asynchronously: renderRouter returns
// the render promise with the router helpers attached, so keep the helpers
// apart from the awaited render result.
async function start(initialUrl = '/'): Promise<{ getPathname: () => string }> {
  const rendered = renderRouter(routes, { initialUrl });
  await rendered;
  return { getPathname: () => rendered.getPathname() };
}

async function go(action: () => void): Promise<void> {
  await act(async () => {
    action();
  });
}

// The on-screen back arrow; Android hardware back sends the same GO_BACK.
async function pressBack(): Promise<void> {
  await go(() => fireEvent.press(screen.getByTestId('back-button')));
}

async function hardwareBack(): Promise<void> {
  await go(() => router.back());
}

describe('Support navigation', () => {
  it('goes home, Support, a case, back, back to home', async () => {
    const app = await start();
    await go(() => router.push('/support'));
    await go(() => router.push({ pathname: '/support/[id]', params: { id: 'c1' } }));
    expect(app.getPathname()).toBe('/support/c1');
    await pressBack();
    expect(app.getPathname()).toBe('/support');
    await pressBack();
    expect(app.getPathname()).toBe('/');
  });

  it('goes Account, Support, a case, back, back to Account', async () => {
    const app = await start();
    await go(() => router.navigate('/(tabs)/account'));
    await go(() => router.push('/support'));
    await go(() => router.push({ pathname: '/support/[id]', params: { id: 'c1' } }));
    await pressBack();
    expect(app.getPathname()).toBe('/support');
    await pressBack();
    expect(app.getPathname()).toBe('/account');
  });

  it('returns the list to home after several cases', async () => {
    const app = await start();
    await go(() => router.push('/support'));
    for (const id of ['c1', 'c2', 'c3']) {
      await go(() => router.push({ pathname: '/support/[id]', params: { id } }));
      await pressBack();
      expect(app.getPathname()).toBe('/support');
    }
    await pressBack();
    expect(app.getPathname()).toBe('/');
  });

  it('opens the list fresh after the driver left a case through the tab bar', async () => {
    const app = await start();
    await go(() => router.push('/support'));
    await go(() => router.push({ pathname: '/support/[id]', params: { id: 'c1' } }));
    // The tab bar stays visible on the case: the driver taps Account.
    await go(() => router.navigate('/(tabs)/account'));
    await go(() => router.push('/support'));
    await pressBack();
    expect(app.getPathname()).toBe('/account');
  });

  it('keeps Android hardware back on the same path', async () => {
    const app = await start();
    await go(() => router.push('/support'));
    await go(() => router.push({ pathname: '/support/[id]', params: { id: 'c1' } }));
    await hardwareBack();
    expect(app.getPathname()).toBe('/support');
    await hardwareBack();
    expect(app.getPathname()).toBe('/');
  });

  it('opens a case from a deep link and goes back to the list, then home', async () => {
    const app = await start('/support/c9');
    await pressBack();
    expect(app.getPathname()).toBe('/support');
    // Nothing is below the list: its back goes home instead of doing nothing.
    await pressBack();
    expect(app.getPathname()).toBe('/');
  });

  it('opens a case pushed from home with the list below it', async () => {
    const app = await start();
    await go(() => openRoute(router, '/support/c9', '/'));
    await pressBack();
    expect(app.getPathname()).toBe('/support');
    await pressBack();
    expect(app.getPathname()).toBe('/');
  });

  it('goes back to the open list when a support push is tapped on a case', async () => {
    const app = await start();
    await go(() => router.push('/support'));
    await go(() => router.push({ pathname: '/support/[id]', params: { id: 'c1' } }));
    await go(() => openRoute(router, '/support', app.getPathname()));
    expect(app.getPathname()).toBe('/support');
    await pressBack();
    expect(app.getPathname()).toBe('/');
  });
});
