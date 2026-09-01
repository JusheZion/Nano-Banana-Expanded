import { create } from 'zustand';
import type { ObsidianLoreEntry } from '@/portals/writer/obsidianLoreImport';
import { parseObsidianLoreImport } from '@/portals/writer/obsidianLoreImport';
import {
  ensureVaultPermission,
  forgetVaultHandle,
  isVaultAccessSupported,
  loadVaultHandle,
  pickVaultDirectory,
  readVault,
  saveVaultHandle,
  type VaultDirectoryHandle,
} from '@/modes/codex/vault/vaultAccess';

/**
 * Vault connection state.
 *
 * Deliberately separate from `codexStore`: the vault is not part of the
 * document. Putting it there would push connecting and refreshing onto the undo
 * stack and into saved files, neither of which makes sense.
 */
export type VaultStatus =
  /** The browser has no File System Access API — Safari, Firefox. */
  | 'unsupported'
  | 'disconnected'
  /** A handle is stored but the browser has dropped the grant; needs a click. */
  | 'needs-permission'
  | 'reading'
  | 'ready'
  | 'error';

interface VaultState {
  status: VaultStatus;
  handle: VaultDirectoryHandle | null;
  vaultName: string | null;
  entries: ObsidianLoreEntry[];
  notePaths: string[];
  /** Non-fatal problems from the last parse, e.g. unresolved image embeds. */
  warnings: string[];
  error: string | null;
  lastReadAt: string | null;
  /** Show RAW, _System, Queries, Templates and the operational files. */
  includeDrafts: boolean;

  /** Checks for a stored handle on mount. Never prompts. */
  restore: () => Promise<void>;
  /** Opens the folder picker. Must be called from a user gesture. */
  connect: () => Promise<void>;
  /** Re-requests permission on the stored handle. Needs a user gesture. */
  reconnect: () => Promise<void>;
  refresh: () => Promise<void>;
  disconnect: () => Promise<void>;
  setIncludeDrafts: (value: boolean) => Promise<void>;
}

const DRAFTS_KEY = 'codex.vaultDrafts.v1';

function readStoredDrafts(): boolean {
  try {
    return localStorage.getItem(DRAFTS_KEY) === 'true';
  } catch {
    return false;
  }
}

function describe(error: unknown): string {
  if (error instanceof Error) return error.message;
  return 'The vault could not be read.';
}

export const useVaultStore = create<VaultState>((set, get) => {
  /**
   * Walks the vault and parses it. Shared by connect, reconnect and refresh so
   * all three land in exactly the same state.
   */
  const readInto = async (handle: VaultDirectoryHandle) => {
    set({ status: 'reading', error: null });
    try {
      const { files, notePaths } = await readVault(handle, {
        includeDrafts: get().includeDrafts,
      });
      const result = await parseObsidianLoreImport(files);
      set({
        status: 'ready',
        handle,
        vaultName: handle.name,
        entries: result.entries,
        notePaths,
        warnings: result.warnings ?? [],
        error: null,
        lastReadAt: new Date().toISOString(),
      });
    } catch (error) {
      set({ status: 'error', error: describe(error) });
    }
  };

  return {
    status: isVaultAccessSupported() ? 'disconnected' : 'unsupported',
    handle: null,
    vaultName: null,
    entries: [],
    notePaths: [],
    warnings: [],
    error: null,
    lastReadAt: null,
    includeDrafts: readStoredDrafts(),

    restore: async () => {
      if (!isVaultAccessSupported()) return;
      try {
        const handle = await loadVaultHandle();
        if (!handle) return;
        // Checking without requesting: a prompt on page load, with no user
        // gesture behind it, is both bad manners and blocked by the browser.
        const granted = await ensureVaultPermission(handle, { request: false });
        if (!granted) {
          set({ status: 'needs-permission', handle, vaultName: handle.name });
          return;
        }
        await readInto(handle);
      } catch (error) {
        set({ status: 'error', error: describe(error) });
      }
    },

    connect: async () => {
      if (!isVaultAccessSupported()) return;
      const handle = await pickVaultDirectory();
      // Null means the user dismissed the picker; that is not an error state.
      if (!handle) return;
      try {
        await saveVaultHandle(handle);
      } catch {
        // A vault that cannot be remembered is still usable this session.
      }
      await readInto(handle);
    },

    reconnect: async () => {
      const handle = get().handle;
      if (!handle) return;
      const granted = await ensureVaultPermission(handle, { request: true });
      if (!granted) {
        set({ status: 'needs-permission' });
        return;
      }
      await readInto(handle);
    },

    refresh: async () => {
      const handle = get().handle;
      if (!handle) return;
      const granted = await ensureVaultPermission(handle, { request: false });
      if (!granted) {
        set({ status: 'needs-permission' });
        return;
      }
      await readInto(handle);
    },

    disconnect: async () => {
      await forgetVaultHandle().catch(() => {});
      set({
        status: isVaultAccessSupported() ? 'disconnected' : 'unsupported',
        handle: null,
        vaultName: null,
        entries: [],
        notePaths: [],
        warnings: [],
        error: null,
        lastReadAt: null,
      });
    },

    setIncludeDrafts: async (value) => {
      set({ includeDrafts: value });
      try {
        localStorage.setItem(DRAFTS_KEY, String(value));
      } catch {
        // Preference not persisted; the session still honours it.
      }
      const handle = get().handle;
      if (handle && get().status === 'ready') await readInto(handle);
    },
  };
});
