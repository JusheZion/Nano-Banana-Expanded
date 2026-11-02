import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useOwnedTimeout } from '@/shared/hooks/useOwnedTimeout';

describe('useOwnedTimeout', () => {
  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it('gives the newest scheduled callback sole ownership', () => {
    vi.useFakeTimers();
    const first = vi.fn();
    const second = vi.fn();
    const { result } = renderHook(() => useOwnedTimeout());

    act(() => result.current.schedule(first, 100));
    act(() => result.current.schedule(second, 100));
    expect(vi.getTimerCount()).toBe(1);

    act(() => vi.advanceTimersByTime(100));
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('cancels its callback when the owner unmounts', () => {
    vi.useFakeTimers();
    const callback = vi.fn();
    const { result, unmount } = renderHook(() => useOwnedTimeout());

    act(() => result.current.schedule(callback, 100));
    unmount();
    act(() => vi.advanceTimersByTime(100));

    expect(callback).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });
});
