import { describe, expect, it } from 'vitest';
import { parseObsidianLoreImport } from '../obsidianLoreImport';

/**
 * Obsidian resolves `Assets/Images/x.png` from the root of whichever vault the
 * note belongs to — and vaults nest. The Twovestellium wiki is an inner vault
 * inside an outer one, so root-relative references did not match paths that
 * were indexed from the outer folder, and real artwork reported as missing.
 */
function file(path: string, contents = 'x'): File {
  const name = path.split('/').pop()!;
  const f = new File([contents], name);
  Object.defineProperty(f, 'webkitRelativePath', { value: path, configurable: true });
  return f;
}

describe('image references under a nested vault root', () => {
  it('resolves a root-relative reference from an inner vault', async () => {
    const result = await parseObsidianLoreImport([
      file('Outer/Inner/Lore/Kaleid.md', '---\ntitle: Kaleid\n---\n\n![[Assets/Images/Kaleid.png]]'),
      file('Outer/Inner/Assets/Images/Kaleid.png'),
    ]);
    expect(result.entries[0].images[0].status).toBe('resolved');
    expect(result.warnings).toEqual([]);
  });

  it('still resolves a note-relative reference', async () => {
    const result = await parseObsidianLoreImport([
      file('Outer/Lore/Kaleid.md', '---\ntitle: K\n---\n\n![[art/Kaleid.png]]'),
      file('Outer/Lore/art/Kaleid.png'),
    ]);
    expect(result.entries[0].images[0].status).toBe('resolved');
  });

  it('refuses to guess when the suffix matches more than one file', async () => {
    // Picking one silently would put the wrong artwork on a plate.
    const result = await parseObsidianLoreImport([
      file('Outer/Inner/Lore/K.md', '---\ntitle: K\n---\n\n![[Assets/Images/Shadow.png]]'),
      file('Outer/Inner/Assets/Images/Shadow.png'),
      file('Outer/Other/Assets/Images/Shadow.png'),
    ]);
    expect(result.entries[0].images[0].status).toBe('unresolved');
  });

  it('reports a genuinely missing image', async () => {
    const result = await parseObsidianLoreImport([
      file('Outer/Inner/Lore/K.md', '---\ntitle: K\n---\n\n![[Assets/Images/Nope.png]]'),
    ]);
    expect(result.entries[0].images[0].status).toBe('unresolved');
    expect(result.warnings[0]).toContain('Nope.png');
  });
});
