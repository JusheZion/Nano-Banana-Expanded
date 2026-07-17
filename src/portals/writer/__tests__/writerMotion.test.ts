import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  markWriterMotionVisited,
  readWriterMotionMode,
  useWriterMotionVisit,
  writerMotionStorageKey,
} from '@/portals/writer/writerMotion';

describe('Writer motion visit policy', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  it('uses cinematic motion once per session key and editorial motion afterward', () => {
    expect(readWriterMotionMode('portal')).toBe('cinematic');
    markWriterMotionVisited('portal');
    expect(window.sessionStorage.getItem(writerMotionStorageKey('portal'))).toBe('1');
    expect(readWriterMotionMode('portal')).toBe('editorial');
  });

  it('keeps major workspaces isolated and treats revisits as editorial', () => {
    const { result, rerender } = renderHook(
      ({ visitKey }) => useWriterMotionVisit(visitKey),
      { initialProps: { visitKey: 'workspace:simple:outline' } },
    );

    expect(result.current.mode).toBe('cinematic');
    const firstInstance = result.current.instance;

    rerender({ visitKey: 'workspace:simple:beats' });
    expect(result.current.mode).toBe('cinematic');
    expect(result.current.instance).toBe(firstInstance + 1);

    rerender({ visitKey: 'workspace:simple:outline' });
    expect(result.current.mode).toBe('editorial');
    expect(result.current.instance).toBe(firstInstance + 2);
  });

  it('falls back to editorial motion when storage is unavailable', () => {
    const unavailableStorage = {
      getItem: () => {
        throw new Error('storage unavailable');
      },
      setItem: () => {
        throw new Error('storage unavailable');
      },
    };

    expect(readWriterMotionMode('portal', unavailableStorage)).toBe('editorial');
    expect(() => markWriterMotionVisited('portal', unavailableStorage)).not.toThrow();
  });
});
