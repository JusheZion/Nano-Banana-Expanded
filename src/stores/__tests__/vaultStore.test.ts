import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { VaultDirectoryHandle } from '@/modes/codex/vault/vaultAccess';

const vault = vi.hoisted(() => ({
  ensureVaultPermission: vi.fn(),
  readVault: vi.fn(),
}));

vi.mock('@/modes/codex/vault/vaultAccess', () => ({
  ensureVaultPermission: vault.ensureVaultPermission,
  forgetVaultHandle: vi.fn(),
  isVaultAccessSupported: () => true,
  loadVaultHandle: vi.fn(),
  pickVaultDirectory: vi.fn(),
  readVault: vault.readVault,
  saveVaultHandle: vi.fn(),
}));

vi.mock('@/portals/writer/obsidianLoreImport', () => ({
  parseObsidianLoreImport: vi.fn(async () => ({ entries: [], warnings: [] })),
}));

import { useVaultStore } from '../vaultStore';

const handle: VaultDirectoryHandle = {
  kind: 'directory',
  name: 'Canon',
  async *values() {},
};

describe('vault refresh result', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useVaultStore.setState({
      status: 'ready',
      handle,
      vaultName: handle.name,
      entries: [],
      notePaths: [],
      warnings: [],
      error: null,
      lastReadAt: null,
      includeDrafts: false,
    });
    vault.ensureVaultPermission.mockResolvedValue(true);
    vault.readVault.mockResolvedValue({ files: [], notePaths: [] });
  });

  it('returns true only after a fresh read succeeds', async () => {
    await expect(useVaultStore.getState().refresh()).resolves.toBe(true);
    expect(useVaultStore.getState().status).toBe('ready');
  });

  it('returns false and exposes the error when reading fails', async () => {
    vault.readVault.mockRejectedValue(new Error('Folder disappeared'));

    await expect(useVaultStore.getState().refresh()).resolves.toBe(false);
    expect(useVaultStore.getState()).toMatchObject({
      status: 'error',
      error: 'Folder disappeared',
    });
  });

  it('returns false when permission is no longer available', async () => {
    vault.ensureVaultPermission.mockResolvedValue(false);

    await expect(useVaultStore.getState().refresh()).resolves.toBe(false);
    expect(useVaultStore.getState().status).toBe('needs-permission');
    expect(vault.readVault).not.toHaveBeenCalled();
  });

  it('turns a permission API failure into store error state', async () => {
    vault.ensureVaultPermission.mockRejectedValue(new Error('Permission check failed'));

    await expect(useVaultStore.getState().refresh()).resolves.toBe(false);
    expect(useVaultStore.getState()).toMatchObject({
      status: 'error',
      error: 'Permission check failed',
    });
    expect(vault.readVault).not.toHaveBeenCalled();
  });
});
