/**
 * IndexedDB-backed, DEBOUNCED persistence for the comic store.
 *
 * Why IndexedDB: the project state embeds full-resolution images as base64 data URLs
 * (page backgrounds, imported panel art). localStorage caps at ~5MB, so a single large
 * image could blow the quota and kill autosave. IndexedDB offers hundreds of MB / GB.
 *
 * Why debounced: persist fires a write on EVERY state change, including every mouse-move
 * during a drag. Serializing + structured-cloning a multi-MB project dozens of times per
 * second hangs the UI. Instead we stash the latest value and flush (JSON.stringify + write)
 * once the user goes idle (~SETTLE_MS), plus a hard flush on tab hide so nothing is lost.
 *
 * Uses zustand's object-based PersistStorage so the expensive JSON.stringify happens only
 * at flush time, not on every change. Falls back to localStorage where IndexedDB is
 * unavailable (e.g. the jsdom test runner).
 */

import type { PersistStorage, StorageValue } from 'zustand/middleware';

const DB_NAME = 'arcs-comic-db';
const STORE = 'kv';
const LEGACY_KEYS = ['nano-banana-comic'];
const SETTLE_MS = 500;

const idbAvailable = (): boolean => {
    try { return typeof indexedDB !== 'undefined' && indexedDB !== null; } catch { return false; }
};

let dbPromise: Promise<IDBDatabase> | null = null;
function openDB(): Promise<IDBDatabase> {
    if (!dbPromise) {
        dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
            const req = indexedDB.open(DB_NAME, 1);
            req.onupgradeneeded = () => {
                if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE);
            };
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });
    }
    return dbPromise;
}
function idbGet(key: string): Promise<string | null> {
    return openDB().then(db => new Promise<string | null>((resolve, reject) => {
        const tx = db.transaction(STORE, 'readonly');
        const req = tx.objectStore(STORE).get(key);
        req.onsuccess = () => resolve((req.result as string) ?? null);
        req.onerror = () => reject(req.error);
    }));
}
function idbSet(key: string, value: string): Promise<void> {
    return openDB().then(db => new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE, 'readwrite');
        tx.objectStore(STORE).put(value, key);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error);
    }));
}
function idbDel(key: string): Promise<void> {
    return openDB().then(db => new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE, 'readwrite');
        tx.objectStore(STORE).delete(key);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    }));
}

function safeLocalGet(key: string): string | null { try { return localStorage.getItem(key); } catch { return null; } }
function safeLocalRemove(key: string): void { try { localStorage.removeItem(key); } catch { /* ignore */ } }

function emitQuotaWarning(name: string, bytes: number): void {
    console.warn(
        '[arcs-comic] Autosave to browser storage failed — storage is full. ' +
        'Recent changes are NOT saved locally. Export your project to a file to avoid losing work.',
        { name, bytes },
    );
    try { window.dispatchEvent(new CustomEvent('arcs:storage-quota-exceeded', { detail: { name, approxBytes: bytes } })); } catch { /* non-browser */ }
}

/** Read the raw JSON string for a key: IndexedDB first, else migrate any localStorage copy in. */
async function readRaw(name: string): Promise<string | null> {
    if (!idbAvailable()) {
        const current = safeLocalGet(name);
        if (current) return current;
        for (const legacy of LEGACY_KEYS) { const v = safeLocalGet(legacy); if (v) return v; }
        return null;
    }
    try { const fromIdb = await idbGet(name); if (fromIdb) return fromIdb; } catch { /* fall through */ }
    for (const key of [name, ...LEGACY_KEYS]) {
        const v = safeLocalGet(key);
        if (v) {
            try { await idbSet(name, v); } catch { /* still return the value */ }
            safeLocalRemove(name);
            for (const legacy of LEGACY_KEYS) safeLocalRemove(legacy);
            return v;
        }
    }
    return null;
}

/** Write the raw JSON string for a key (IndexedDB, else localStorage), surfacing quota failures. */
async function writeRaw(name: string, json: string): Promise<void> {
    if (!idbAvailable()) {
        try { localStorage.setItem(name, json); } catch { emitQuotaWarning(name, json.length); }
        return;
    }
    try { await idbSet(name, json); } catch { emitQuotaWarning(name, json.length); }
}

// --- Debounced flush state (module-level; one comic store) ---
let pendingName: string | null = null;
let pendingValue: unknown = null;
let flushTimer: ReturnType<typeof setTimeout> | null = null;

async function flushNow(): Promise<void> {
    if (flushTimer) { clearTimeout(flushTimer); flushTimer = null; }
    if (pendingName == null || pendingValue == null) return;
    const name = pendingName;
    const value = pendingValue;
    pendingName = null;
    pendingValue = null;
    let json: string;
    try { json = JSON.stringify(value); } catch { return; }
    await writeRaw(name, json);
}

function scheduleFlush(): void {
    if (flushTimer) clearTimeout(flushTimer);
    flushTimer = setTimeout(() => { void flushNow(); }, SETTLE_MS);
}

// Never lose the last change: flush immediately when the tab is hidden/closed.
if (typeof window !== 'undefined') {
    const flushSync = () => { void flushNow(); };
    window.addEventListener('pagehide', flushSync);
    window.addEventListener('beforeunload', flushSync);
    if (typeof document !== 'undefined') {
        document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flushSync(); });
    }
}

/**
 * Debounced, IndexedDB-backed PersistStorage. Serialization is deferred to flush time so a
 * drag (many rapid setItem calls) costs almost nothing until the user pauses.
 */
export function createComicPersistStorage<S>(): PersistStorage<S> {
    return {
        getItem: async (name: string): Promise<StorageValue<S> | null> => {
            const raw = await readRaw(name);
            if (!raw) return null;
            try { return JSON.parse(raw) as StorageValue<S>; } catch { return null; }
        },
        setItem: (name: string, value: StorageValue<S>): void => {
            // Cheap: stash the latest snapshot reference and (re)arm the idle timer. No
            // stringify/write here — that happens once, at flush.
            pendingName = name;
            pendingValue = value;
            scheduleFlush();
        },
        removeItem: async (name: string): Promise<void> => {
            if (pendingName === name) { pendingValue = null; }
            if (!idbAvailable()) { safeLocalRemove(name); return; }
            try { await idbDel(name); } catch { /* ignore */ }
        },
    };
}
