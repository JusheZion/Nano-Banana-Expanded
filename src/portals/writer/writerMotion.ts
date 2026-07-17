import { useEffect, useRef } from 'react';

export type WriterMotionMode = 'cinematic' | 'editorial';

export type WriterMotionVisit = {
  key: string;
  mode: WriterMotionMode;
  instance: number;
};

const WRITER_MOTION_STORAGE_PREFIX = 'arcs.writer.motion.seen.v1';

type MotionStorage = Pick<Storage, 'getItem' | 'setItem'>;

function motionStorage(): MotionStorage | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

export function writerMotionStorageKey(key: string): string {
  return `${WRITER_MOTION_STORAGE_PREFIX}:${key}`;
}

export function readWriterMotionMode(key: string, storage = motionStorage()): WriterMotionMode {
  if (!storage) return 'editorial';
  try {
    return storage.getItem(writerMotionStorageKey(key)) === '1' ? 'editorial' : 'cinematic';
  } catch {
    return 'editorial';
  }
}

export function markWriterMotionVisited(key: string, storage = motionStorage()): void {
  if (!storage) return;
  try {
    storage.setItem(writerMotionStorageKey(key), '1');
  } catch {
    // Motion persistence is optional. The workspace remains fully usable without it.
  }
}

export function useWriterMotionVisit(key: string): WriterMotionVisit {
  const visitRef = useRef<WriterMotionVisit>({
    key,
    mode: readWriterMotionMode(key),
    instance: 0,
  });

  if (visitRef.current.key !== key) {
    visitRef.current = {
      key,
      mode: readWriterMotionMode(key),
      instance: visitRef.current.instance + 1,
    };
  }

  useEffect(() => {
    markWriterMotionVisited(key);
  }, [key]);

  return visitRef.current;
}
