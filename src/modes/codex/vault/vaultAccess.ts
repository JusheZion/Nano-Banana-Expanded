/**
 * Persistent read access to the Obsidian vault.
 *
 * Canon lives in Obsidian, and a browser cannot watch a folder. The existing
 * importer (`portals/writer/obsidianLoreImport.ts`) parses uploaded `File`
 * objects, which is a snapshot: pick the folder, parse, and it goes stale
 * silently. The File System Access API gives a *handle* that survives reloads,
 * so the vault can be re-read on demand without asking the user to find it
 * again.
 *
 * Access is read-only by design: Obsidian stays the only thing that writes to
 * the vault.
 *
 * Chromium only. `isVaultAccessSupported` gates the feature rather than letting
 * it fail at the picker.
 */

/** Minimal shape of the handles we use, so the walk can be tested with a fake. */
export interface VaultFileHandle {
  kind: 'file';
  name: string;
  getFile: () => Promise<File>;
}

export interface VaultDirectoryHandle {
  kind: 'directory';
  name: string;
  values: () => AsyncIterable<VaultFileHandle | VaultDirectoryHandle>;
  queryPermission?: (opts: { mode: 'read' | 'readwrite' }) => Promise<PermissionState>;
  requestPermission?: (opts: { mode: 'read' | 'readwrite' }) => Promise<PermissionState>;
}

const DB_NAME = 'codex-vault';
const STORE = 'handles';
const HANDLE_KEY = 'vault-root';

/**
 * Folders that are never canon.
 *
 * `.obsidian`/`.trash`/`.git` are machinery. The rest are this vault's own
 * layers, per its Wiki Architecture note: `RAW` is the immutable source layer
 * (clipped articles, drafts, transcripts) awaiting ingest, and `_System` and
 * `Queries` are operational — ingest queues, lint, the source registry. Binding
 * a plate to any of them would bind it to unprocessed or non-lore material.
 *
 * Hidden by default rather than excluded outright: `includeDrafts` brings them
 * back for the occasional case where a raw source really is what you want.
 */
const SKIP_SEGMENTS = new Set(['.obsidian', '.trash', '.git', 'node_modules', '.smart-env']);

/**
 * Vault layers that are real notes, but not canon to compose from.
 *
 * `Templates` is included so the walker agrees with the importer, which already
 * discards template files at parse time — otherwise they list in the note
 * picker and then resolve to nothing.
 */
const DRAFT_SEGMENTS = new Set(['RAW', '_System', 'Queries', 'Templates']);

/**
 * Individual files that are not lore, matched by name anywhere in the vault.
 * `AGENTS.md` is instructions for the vault's own agents; the Lore Builder Card
 * is a scratch worksheet. Both would otherwise sit in the note picker looking
 * bindable. Compared lower-case so a rename's capitalisation cannot leak them
 * back in.
 */
const DRAFT_FILES = new Set(['agents.md', 'lore builder card.md']);

/** Extensions worth reading; everything else is skipped before it is opened. */
const READ_EXTENSIONS = new Set(['md', 'png', 'jpg', 'jpeg', 'webp', 'gif']);

export function isVaultAccessSupported(): boolean {
  return typeof window !== 'undefined' && 'showDirectoryPicker' in window;
}

/**
 * True for paths inside a folder the vault uses for its own bookkeeping.
 * Matched per segment so a note legitimately called "git notes.md" is kept.
 */
export function shouldSkipVaultPath(path: string, includeDrafts = false): boolean {
  const segments = path.split('/');
  const name = segments[segments.length - 1]?.toLowerCase() ?? '';
  if (!includeDrafts && DRAFT_FILES.has(name)) return true;
  return segments.some((segment) => {
    if (SKIP_SEGMENTS.has(segment)) return true;
    if (segment.startsWith('.') && segment.length > 1) return true;
    return !includeDrafts && DRAFT_SEGMENTS.has(segment);
  });
}

export function isReadableVaultFile(name: string): boolean {
  const dot = name.lastIndexOf('.');
  if (dot < 0) return false;
  return READ_EXTENSIONS.has(name.slice(dot + 1).toLowerCase());
}

/**
 * The importer reads `webkitRelativePath` to know where a file sat in the
 * vault, and files from a directory handle do not carry one. Re-attaching the
 * path lets the existing parser be reused unchanged rather than forked.
 */
export function fileWithVaultPath(file: File, path: string): File {
  try {
    Object.defineProperty(file, 'webkitRelativePath', { value: path, configurable: true });
  } catch {
    // Non-configurable in some engines; the parser falls back to the name.
  }
  return file;
}

export interface VaultReadResult {
  files: File[];
  /** Every markdown path found, for listing without loading bodies. */
  notePaths: string[];
  skipped: number;
}

/**
 * Walks the vault depth-first, returning files the importer can parse.
 * `maxFiles` is a guard: a vault pointed at the wrong folder (a home
 * directory, say) must not read forever.
 */
export async function readVault(
  root: VaultDirectoryHandle,
  { maxFiles = 5000, includeDrafts = false }: { maxFiles?: number; includeDrafts?: boolean } = {},
): Promise<VaultReadResult> {
  const files: File[] = [];
  const notePaths: string[] = [];
  let skipped = 0;

  async function walk(dir: VaultDirectoryHandle, prefix: string): Promise<void> {
    for await (const entry of dir.values()) {
      if (files.length >= maxFiles) return;
      const path = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (shouldSkipVaultPath(path, includeDrafts)) {
        skipped += 1;
        continue;
      }
      if (entry.kind === 'directory') {
        await walk(entry, path);
      } else if (isReadableVaultFile(entry.name)) {
        const file = await entry.getFile();
        files.push(fileWithVaultPath(file, path));
        if (path.toLowerCase().endsWith('.md')) notePaths.push(path);
      } else {
        skipped += 1;
      }
    }
  }

  await walk(root, root.name);
  notePaths.sort((a, b) => a.localeCompare(b));
  return { files, notePaths, skipped };
}

/* ------------------------------------------------------- handle persistence */

/**
 * Handles are structured-cloneable but not serialisable to JSON, so they go in
 * IndexedDB rather than localStorage.
 */
function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE)) {
        request.result.createObjectStore(STORE);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveVaultHandle(handle: VaultDirectoryHandle): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(handle, HANDLE_KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export async function loadVaultHandle(): Promise<VaultDirectoryHandle | null> {
  if (typeof indexedDB === 'undefined') return null;
  const db = await openDb();
  const handle = await new Promise<VaultDirectoryHandle | null>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const request = tx.objectStore(STORE).get(HANDLE_KEY);
    request.onsuccess = () => resolve((request.result as VaultDirectoryHandle) ?? null);
    request.onerror = () => reject(request.error);
  });
  db.close();
  return handle;
}

export async function forgetVaultHandle(): Promise<void> {
  if (typeof indexedDB === 'undefined') return;
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).delete(HANDLE_KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

/**
 * Permission does not survive indefinitely: a stored handle often needs
 * re-granting after a browser restart. `request` needs a user gesture, so pass
 * `false` when checking on load and `true` from a click.
 */
export async function ensureVaultPermission(
  handle: VaultDirectoryHandle,
  { request = false }: { request?: boolean } = {},
): Promise<boolean> {
  const opts = { mode: 'read' as const };
  const current = (await handle.queryPermission?.(opts)) ?? 'granted';
  if (current === 'granted') return true;
  if (!request) return false;
  const next = (await handle.requestPermission?.(opts)) ?? 'denied';
  return next === 'granted';
}

/** Opens the picker. Must be called from a user gesture. */
export async function pickVaultDirectory(): Promise<VaultDirectoryHandle | null> {
  if (!isVaultAccessSupported()) return null;
  const picker = (window as unknown as {
    showDirectoryPicker: (opts?: { mode?: 'read' | 'readwrite'; id?: string }) => Promise<VaultDirectoryHandle>;
  }).showDirectoryPicker;
  try {
    return await picker({ mode: 'read', id: 'codex-vault' });
  } catch {
    // The user dismissed the picker; not an error worth surfacing.
    return null;
  }
}
