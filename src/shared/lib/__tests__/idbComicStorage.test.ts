import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const STORAGE_KEY = 'comic-project';

function installFailingIndexedDb(): void {
  vi.stubGlobal('indexedDB', {
    open: vi.fn(() => {
      throw new Error('IndexedDB is blocked');
    }),
  });
}

async function loadStorage() {
  vi.resetModules();
  const { createComicPersistStorage } = await import('../idbComicStorage');
  return createComicPersistStorage<{ title: string }>();
}

describe('createComicPersistStorage IndexedDB failover', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
    installFailingIndexedDb();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('persists to localStorage when IndexedDB is present but unavailable', async () => {
    const storage = await loadStorage();
    const value = { state: { title: 'Fallback draft' }, version: 1 };

    storage.setItem(STORAGE_KEY, value);
    await vi.advanceTimersByTimeAsync(500);

    expect(localStorage.getItem(STORAGE_KEY)).toBe(JSON.stringify(value));
    await expect(storage.getItem(STORAGE_KEY)).resolves.toEqual(value);
  });

  it('retains the local fallback when migration to IndexedDB fails', async () => {
    const value = { state: { title: 'Only durable copy' }, version: 1 };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
    const storage = await loadStorage();

    await expect(storage.getItem(STORAGE_KEY)).resolves.toEqual(value);

    expect(localStorage.getItem(STORAGE_KEY)).toBe(JSON.stringify(value));
  });

  it('removes fallback data even when IndexedDB deletion fails', async () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ state: { title: 'Deleted draft' }, version: 1 }),
    );
    const storage = await loadStorage();

    await storage.removeItem(STORAGE_KEY);

    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });
});
