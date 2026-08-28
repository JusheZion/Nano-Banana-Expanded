import { describe, expect, it } from 'vitest';
import {
  fileWithVaultPath,
  isReadableVaultFile,
  readVault,
  shouldSkipVaultPath,
  type VaultDirectoryHandle,
  type VaultFileHandle,
} from '../vaultAccess';

/** Minimal in-memory vault, so the walk is testable without a real handle. */
function dir(name: string, children: Array<VaultFileHandle | VaultDirectoryHandle>): VaultDirectoryHandle {
  return {
    kind: 'directory',
    name,
    values: async function* () {
      for (const child of children) yield child;
    },
  };
}

function file(name: string, contents = 'x'): VaultFileHandle {
  return {
    kind: 'file',
    name,
    getFile: async () => new File([contents], name),
  };
}

describe('shouldSkipVaultPath', () => {
  it('skips Obsidian bookkeeping folders', () => {
    expect(shouldSkipVaultPath('vault/.obsidian/app.json')).toBe(true);
    expect(shouldSkipVaultPath('vault/.trash/old.md')).toBe(true);
    expect(shouldSkipVaultPath('vault/.git/config')).toBe(true);
  });

  it('keeps a note whose name merely contains a skipped word', () => {
    expect(shouldSkipVaultPath('vault/Lore/git notes.md')).toBe(false);
    expect(shouldSkipVaultPath('vault/Characters/Kaleid.md')).toBe(false);
  });

  it('skips any dotfile segment', () => {
    expect(shouldSkipVaultPath('vault/.DS_Store')).toBe(true);
  });
});

describe('isReadableVaultFile', () => {
  it('accepts markdown and images', () => {
    expect(isReadableVaultFile('Kaleid.md')).toBe(true);
    expect(isReadableVaultFile('portrait.PNG')).toBe(true);
  });

  it('rejects everything else, so a big vault is not read wholesale', () => {
    expect(isReadableVaultFile('canon.pdf')).toBe(false);
    expect(isReadableVaultFile('notes')).toBe(false);
  });
});

describe('fileWithVaultPath', () => {
  it('attaches the vault path the importer reads', () => {
    const f = fileWithVaultPath(new File(['x'], 'Kaleid.md'), 'Vault/Characters/Kaleid.md');
    expect((f as File & { webkitRelativePath: string }).webkitRelativePath).toBe(
      'Vault/Characters/Kaleid.md',
    );
  });
});

describe('readVault', () => {
  const vault = dir('Vault', [
    dir('Characters', [file('Kaleid.md'), file('Solfa.md'), file('portrait.png')]),
    dir('.obsidian', [file('app.json')]),
    dir('Lore', [dir('Deep', [file('Twovestellium.md')])]),
    file('README.md'),
    file('archive.zip'),
  ]);

  it('walks nested folders and collects readable files', async () => {
    const result = await readVault(vault);
    expect(result.files.map((f) => f.name).sort()).toEqual([
      'Kaleid.md',
      'README.md',
      'Solfa.md',
      'Twovestellium.md',
      'portrait.png',
    ]);
  });

  it('records markdown paths, vault-rooted and sorted', async () => {
    const result = await readVault(vault);
    expect(result.notePaths).toEqual([
      'Vault/Characters/Kaleid.md',
      'Vault/Characters/Solfa.md',
      'Vault/Lore/Deep/Twovestellium.md',
      'Vault/README.md',
    ]);
  });

  it('never opens files inside skipped folders', async () => {
    let opened = false;
    const trapped = dir('Vault', [
      dir('.obsidian', [
        {
          kind: 'file',
          name: 'app.json',
          getFile: async () => {
            opened = true;
            return new File([''], 'app.json');
          },
        },
      ]),
    ]);
    await readVault(trapped);
    expect(opened).toBe(false);
  });

  it('counts what it skipped rather than hiding it', async () => {
    const result = await readVault(vault);
    expect(result.skipped).toBeGreaterThan(0);
  });

  it('stops at maxFiles, so the wrong folder cannot be read forever', async () => {
    const many = dir('Vault', Array.from({ length: 50 }, (_, i) => file(`n${i}.md`)));
    const result = await readVault(many, { maxFiles: 10 });
    expect(result.files.length).toBeLessThanOrEqual(10);
  });

  it('attaches vault-rooted paths so the importer can resolve embeds', async () => {
    const result = await readVault(vault);
    const paths = result.files.map((f) => (f as File & { webkitRelativePath: string }).webkitRelativePath);
    expect(paths).toContain('Vault/Characters/portrait.png');
  });
});
