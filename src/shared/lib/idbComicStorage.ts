/**
 * IndexedDB-backed persistence for the comic store.
 *
 * Why: the comic project state embeds full-resolution images as base64 data URLs
 * (page backgrounds, imported panel art). localStorage caps at ~5MB, so a SINGLE
 * large image could blow the quota and kill autosave. IndexedDB offers hundreds of
 * MB / GB, all local, no backend — a much better fit.
 *
 * Behavior:
 *  - Reads/writes go to IndexedDB when available.
 *  - On first read, any existing localStorage value is migrated into IndexedDB and
 *    then removed from localStorage (freeing that ~5MB), so no saved work is lost.
 *  - Where IndexedDB is unavailable (e.g. the jsdom test runner), it transparently
 *    falls back to localStorage — same behavior as before.
 */

import type { StateStorage } from 'zustand/middleware';

const DB_NAME = 'arcs-comic-db';
const STORE = 'kv';
const LEGACY_KEYS = ['nano-banana-comic'];

const idbAvailable = (): boolean => {
    try {
        return typeof indexedDB !== 'undefined' && indexedDB !== null;
    } catch {
        return false;
    }
};

let dbPromise: Promise<IDBDatabase> | null = null;
function openDB(): Promise<IDBDatabase> {
    if (!dbPromise) {
        dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
            const req = indexedDB.open(DB_NAME, 1);
            req.onupgradeneeded = () => {
                if (!req.result.objectStoreNames.contains(STORE)) {
                    req.result.createObjectStore(STORE);
                }
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

function safeLocalGet(key: string): string | null {
    try { return localStorage.getItem(key); } catch { return null; }
}
function safeLocalRemove(key: string): void {
    try { localStorage.removeItem(key); } catch { /* ignore */ }
}

function emitQuotaWarning(name: string, bytes: number): void {
    console.warn(
        '[arcs-comic] Autosave to browser storage failed — storage is full. ' +
        'Recent changes are NOT saved locally. Export your project to a file to avoid losing work.',
        { name, bytes },
    );
    try {
        window.dispatchEvent(new CustomEvent('arcs:storage-quota-exceeded', { detail: { name, approxBytes: bytes } }));
    } catch { /* non-browser env */ }
}

export const comicIdbStorage: StateStorage = {
    getItem: async (name: string): Promise<string | null> => {
        if (!idbAvailable()) {
            // Fallback path: localStorage only (with legacy-key migration).
            const current = safeLocalGet(name);
            if (current) return current;
            for (const legacy of LEGACY_KEYS) {
                const v = safeLocalGet(legacy);
                if (v) { try { localStorage.setItem(name, v); } catch { /* ignore */ } return v; }
            }
            return null;
        }
        try {
            const fromIdb = await idbGet(name);
            if (fromIdb) return fromIdb;
        } catch { /* fall through to migration */ }
        // One-time migration of any existing localStorage data into IndexedDB.
        const candidates = [name, ...LEGACY_KEYS];
        for (const key of candidates) {
            const v = safeLocalGet(key);
            if (v) {
                try { await idbSet(name, v); } catch { /* ignore, still return the value */ }
                // Free the old localStorage copies now that IndexedDB holds them.
                safeLocalRemove(name);
                for (const legacy of LEGACY_KEYS) safeLocalRemove(legacy);
                return v;
            }
        }
        return null;
    },

    setItem: async (name: string, value: string): Promise<void> => {
        if (!idbAvailable()) {
            try { localStorage.setItem(name, value); } catch (err) { emitQuotaWarning(name, value.length); void err; }
            return;
        }
        try {
            await idbSet(name, value);
        } catch (err) {
            // IndexedDB has a much larger budget, but a genuinely full disk can still fail.
            emitQuotaWarning(name, value.length);
            void err;
        }
    },

    removeItem: async (name: string): Promise<void> => {
        if (!idbAvailable()) { safeLocalRemove(name); return; }
        try { await idbDel(name); } catch { /* ignore */ }
    },
};
