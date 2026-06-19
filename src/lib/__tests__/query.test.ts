// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

jest.mock('@/lib/offline-alert', () => ({ notifyServerUnreachable: jest.fn() }));

import { AppState } from 'react-native';
import { focusManager, type QueryClient } from '@tanstack/react-query';
import { ApiError } from '@/lib/api';

type ChangeHandler = (status: string) => void;
let changeCb: ChangeHandler = () => undefined;
jest.spyOn(AppState, 'addEventListener').mockImplementation(((_type: string, cb: ChangeHandler) => {
  changeCb = cb;
  return { remove: jest.fn() };
}) as never);
const focusSpy = jest.spyOn(focusManager, 'setFocused').mockImplementation(() => undefined);

// Required after the spies are installed so the module's import-time wiring is
// captured.
const { queryClient } = require('@/lib/query') as { queryClient: QueryClient };
const { notifyServerUnreachable } = require('@/lib/offline-alert') as {
  notifyServerUnreachable: jest.Mock;
};

beforeEach(() => {
  focusSpy.mockClear();
  notifyServerUnreachable.mockClear();
});

describe('app focus wiring', () => {
  it('marks the query focus manager active only in the foreground', () => {
    changeCb('active');
    expect(focusSpy).toHaveBeenLastCalledWith(true);
    changeCb('background');
    expect(focusSpy).toHaveBeenLastCalledWith(false);
  });
});

describe('global error handler', () => {
  const onError = queryClient.getQueryCache().config.onError as (e: unknown) => void;

  it('shows the offline alert when the server is unreachable', () => {
    onError(new ApiError(503, null));
    expect(notifyServerUnreachable).toHaveBeenCalledTimes(1);
  });
  it('ignores client errors', () => {
    onError(new ApiError(404, null));
    expect(notifyServerUnreachable).not.toHaveBeenCalled();
  });
  it('ignores non-API errors', () => {
    onError(new Error('boom'));
    expect(notifyServerUnreachable).not.toHaveBeenCalled();
  });
});

describe('retry policy', () => {
  const retry = queryClient.getDefaultOptions().queries?.retry as (
    count: number,
    error: unknown,
  ) => boolean;

  it('never retries auth and validation failures', () => {
    expect(retry(0, new ApiError(401, null))).toBe(false);
    expect(retry(0, new ApiError(409, null))).toBe(false);
  });
  it('retries transient failures up to twice', () => {
    expect(retry(0, new ApiError(500, null))).toBe(true);
    expect(retry(1, new Error('network'))).toBe(true);
    expect(retry(2, new ApiError(500, null))).toBe(false);
  });
});
