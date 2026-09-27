// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

import { act, renderHook } from '@testing-library/react-native';
import { useDebouncedValue } from '@/lib/use-debounced-value';

describe('useDebouncedValue', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('returns the initial value immediately', async () => {
    const { result } = await renderHook(() => useDebouncedValue('a', 300));
    expect(result.current).toBe('a');
  });

  it('applies the default delay when none is given', async () => {
    const { result, rerender } = await renderHook(({ v }: { v: string }) => useDebouncedValue(v), {
      initialProps: { v: 'a' },
    });
    await rerender({ v: 'b' });
    await act(() => jest.advanceTimersByTime(299));
    expect(result.current).toBe('a');
    await act(() => jest.advanceTimersByTime(1));
    expect(result.current).toBe('b');
  });

  it('updates only after the delay elapses', async () => {
    const { result, rerender } = await renderHook(
      ({ v }: { v: string }) => useDebouncedValue(v, 300),
      {
        initialProps: { v: 'a' },
      },
    );
    await rerender({ v: 'b' });
    expect(result.current).toBe('a');
    await act(() => jest.advanceTimersByTime(299));
    expect(result.current).toBe('a');
    await act(() => jest.advanceTimersByTime(1));
    expect(result.current).toBe('b');
  });

  it('resets the timer on rapid changes', async () => {
    const { result, rerender } = await renderHook(
      ({ v }: { v: string }) => useDebouncedValue(v, 300),
      {
        initialProps: { v: 'a' },
      },
    );
    await rerender({ v: 'b' });
    await act(() => jest.advanceTimersByTime(200));
    await rerender({ v: 'c' });
    await act(() => jest.advanceTimersByTime(200));
    expect(result.current).toBe('a');
    await act(() => jest.advanceTimersByTime(100));
    expect(result.current).toBe('c');
  });
});
