import { existsSync } from 'node:fs';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseObsidianLoreImport } from '../obsidianLoreImport';

const REFERENCE_VAULT_DIR = path.resolve(
  process.cwd(),
  'reference/Twovestellium Universe Obsidian Vault',
);

async function collectVaultFiles(dir: string, root = dir): Promise<File[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files: File[] = [];

  for (const entry of entries) {
    const entryPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectVaultFiles(entryPath, root)));
      continue;
    }
    const ext = path.extname(entry.name).toLowerCase();
    if (!['.md', '.png', '.jpg', '.jpeg', '.webp', '.gif'].includes(ext)) continue;
    const data = await readFile(entryPath);
    const type = ext === '.md' ? 'text/markdown' : ext === '.png' ? 'image/png' : 'image/jpeg';
    const file = new File([data], entry.name, { type });
    Object.defineProperty(file, 'webkitRelativePath', {
      value: path.relative(root, entryPath).replaceAll(path.sep, '/'),
    });
    files.push(file);
  }

  return files;
}

describe('Twovestellium reference Obsidian vault import', () => {
  it.skipIf(!existsSync(REFERENCE_VAULT_DIR))(
    'parses the local reference vault while excluding templates',
    async () => {
      const files = await collectVaultFiles(REFERENCE_VAULT_DIR);
      const result = await parseObsidianLoreImport(files, {
        importDate: '2026-06-01T12:00:00.000Z',
      });

      expect(result.entries.map((entry) => entry.title).sort()).toEqual([
        'Finn',
        'Glimm',
        'Institute of Divination & Occultivation',
        'Kron',
        'Magister Valencius Santoro',
      ]);
      expect(result.entries.find((entry) => entry.title === 'Kron')).toMatchObject({
        category: 'character',
        properties: {
          Species: 'Lumarian',
          Faction: 'IDO',
          'First Appearance': [],
        },
      });
      expect(result.entries.find((entry) => entry.title === 'Finn')).toMatchObject({
        category: 'character',
      });
      expect(result.entries.find((entry) => entry.title === 'Magister Valencius Santoro')).toMatchObject({
        category: 'character',
      });
      expect(result.entries.find((entry) => entry.title === 'Glimm')).toMatchObject({
        category: 'species',
        properties: {
          'Threat Level': '7',
        },
      });
      expect(result.entries.find((entry) => entry.title === 'Institute of Divination & Occultivation')).toMatchObject({
        category: 'academic',
        properties: {
          'Symbols/Logos': 'Coat of Arms',
        },
      });

      const kronLinks = result.entries.find((entry) => entry.title === 'Kron')?.links.map((link) => link.target);
      expect(kronLinks).toEqual([
        'Rhia Simms',
        'Best Friend',
        'Dr. Avita',
        'Professor',
        'Magister Valencius Rico Santoro',
        'Mentor',
      ]);
      expect(result.entries.find((entry) => entry.title === 'Kron')?.images).toEqual([
        expect.objectContaining({
          fileName: 'Kron, Lumilquill, Dorm Room.png',
          sourcePath: 'Assets/Images/Kron, Lumilquill, Dorm Room.png',
          section: 'Story Arc',
          status: 'resolved',
        }),
        expect.objectContaining({
          fileName: "Kron's Presentation Outfit.png",
          sourcePath: "Assets/Images/Kron's Presentation Outfit.png",
          section: 'Story Arc',
          status: 'resolved',
        }),
        expect.objectContaining({
          fileName: 'Kron IDO Favorite Fit.png',
          sourcePath: 'Assets/Images/Kron IDO Favorite Fit.png',
          section: 'Story Arc',
          status: 'resolved',
        }),
      ]);
      expect(result.entries.find((entry) => entry.title === 'Finn')?.images).toEqual([
        expect.objectContaining({
          fileName: 'Monocerocephalic Form No More Telepathy.png',
          sourcePath: 'Assets/Images/Monocerocephalic Form No More Telepathy.png',
          section: 'Notes',
          status: 'resolved',
        }),
        expect.objectContaining({
          fileName: 'Monocerokorus Helm Version.png',
          sourcePath: 'Assets/Images/Monocerokorus Helm Version.png',
          section: 'Notes',
          status: 'resolved',
        }),
      ]);
      expect(result.entries.find((entry) => entry.title === 'Magister Valencius Santoro')?.images).toEqual([
        expect.objectContaining({
          fileName: 'Valerius Santoro, Magistus Santoro.png',
          sourcePath: 'Assets/Images/Valerius Santoro, Magistus Santoro.png',
          section: 'Appearance',
          status: 'resolved',
        }),
      ]);
      expect(result.warnings).toEqual([]);
    },
  );
});
