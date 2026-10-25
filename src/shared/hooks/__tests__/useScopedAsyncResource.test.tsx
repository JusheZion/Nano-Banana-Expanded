import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useScopedAsyncResource } from '@/shared/hooks/useScopedAsyncResource';

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

function useHarness(scope: string | null, load: (scope: string) => Promise<string[]>) {
  return useScopedAsyncResource({
    scope,
    initialValue: [] as string[],
    load,
    fallbackError: 'Could not load resource.',
  });
}

describe('useScopedAsyncResource', () => {
  it('keeps prior valid content visible during a same-scope refresh', async () => {
    const refreshResult = deferred<string[]>();
    const load = vi.fn()
      .mockResolvedValueOnce(['existing'])
      .mockReturnValueOnce(refreshResult.promise);
    const { result } = renderHook(() => useHarness('series-a', load));
    await waitFor(() => expect(result.current.value).toEqual(['existing']));

    act(() => { void result.current.refresh(); });

    expect(result.current.loading).toBe(true);
    expect(result.current.value).toEqual(['existing']);
    refreshResult.resolve(['updated']);
    await waitFor(() => expect(result.current.value).toEqual(['updated']));
  });

  it('allows only the newest overlapping request to publish', async () => {
    const older = deferred<string[]>();
    const newer = deferred<string[]>();
    const load = vi.fn()
      .mockResolvedValueOnce(['initial'])
      .mockReturnValueOnce(older.promise)
      .mockReturnValueOnce(newer.promise);
    const { result } = renderHook(() => useHarness('series-a', load));
    await waitFor(() => expect(result.current.loading).toBe(false));

    let olderRefresh!: Promise<unknown>;
    let newerRefresh!: Promise<unknown>;
    act(() => {
      olderRefresh = result.current.refresh();
      newerRefresh = result.current.refresh();
    });
    newer.resolve(['newer']);
    await act(async () => { await newerRefresh; });
    older.resolve(['older']);
    await act(async () => { await olderRefresh; });

    expect(result.current.value).toEqual(['newer']);
    expect(result.current.loading).toBe(false);
  });

  it('clears cross-scope content immediately and ignores the prior scope response', async () => {
    const seriesA = deferred<string[]>();
    const seriesB = deferred<string[]>();
    const load = vi.fn()
      .mockReturnValueOnce(seriesA.promise)
      .mockReturnValueOnce(seriesB.promise);
    const { result, rerender } = renderHook(
      ({ scope }) => useHarness(scope, load),
      { initialProps: { scope: 'series-a' as string | null } },
    );
    await waitFor(() => expect(load).toHaveBeenCalledWith('series-a'));

    rerender({ scope: 'series-b' });
    expect(result.current.value).toEqual([]);
    expect(result.current.loading).toBe(true);
    seriesA.resolve(['wrong-series']);
    await act(async () => { await seriesA.promise; });
    expect(result.current.value).toEqual([]);

    seriesB.resolve(['current-series']);
    await waitFor(() => expect(result.current.value).toEqual(['current-series']));
  });

  it('preserves prior content and exposes the latest request failure', async () => {
    const load = vi.fn()
      .mockResolvedValueOnce(['existing'])
      .mockRejectedValueOnce(new Error('read denied'));
    const { result } = renderHook(() => useHarness('series-a', load));
    await waitFor(() => expect(result.current.value).toEqual(['existing']));

    await act(async () => { await result.current.refresh(); });

    expect(result.current.value).toEqual(['existing']);
    expect(result.current.error).toBe('read denied');
    expect(result.current.loading).toBe(false);
  });

  it('invalidates an unresolved request when the consumer unmounts', async () => {
    const late = deferred<string[]>();
    const load = vi.fn()
      .mockResolvedValueOnce([])
      .mockReturnValueOnce(late.promise);
    const { result, unmount } = renderHook(() => useHarness('series-a', load));
    await waitFor(() => expect(result.current.loading).toBe(false));
    const refresh = result.current.refresh();
    unmount();
    late.resolve(['late']);

    await expect(refresh).resolves.toBeNull();
  });
});
