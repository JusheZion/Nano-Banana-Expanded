import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useTransientStatus } from '../useTransientStatus';

describe('useTransientStatus', () => {
  afterEach(() => vi.useRealTimers());

  it('lets a newer message own the dismissal timer', () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useTransientStatus(2600));

    act(() => result.current.flash('First'));
    act(() => vi.advanceTimersByTime(2000));
    act(() => result.current.flash('Second'));
    act(() => vi.advanceTimersByTime(700));
    expect(result.current.status).toBe('Second');

    act(() => vi.advanceTimersByTime(1900));
    expect(result.current.status).toBeNull();
  });

  it('clears its pending timeout when the screen unmounts', () => {
    vi.useFakeTimers();
    const { result, unmount } = renderHook(() => useTransientStatus(2600));
    act(() => result.current.flash('Saving'));
    expect(vi.getTimerCount()).toBe(1);
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});
