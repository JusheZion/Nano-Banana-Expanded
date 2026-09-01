import { describe, expect, it } from 'vitest';
import { parseObsidianLoreImport } from '../obsidianLoreImport';

/**
 * The Twovestellium vault stores its summaries as YAML folded block scalars
 * (`summary: >-`), which is what Obsidian writes for multi-line properties.
 * Without block scalar support the parser read the marker itself as the value,
 * so every summary came back as the literal string ">-".
 */
function note(name: string, contents: string): File {
  const file = new File([contents], name, { type: 'text/markdown' });
  Object.defineProperty(file, 'webkitRelativePath', { value: `Vault/${name}`, configurable: true });
  return file;
}

async function parseOne(contents: string) {
  const result = await parseObsidianLoreImport([note('Test.md', contents)]);
  return result.entries[0];
}

describe('YAML block scalars in frontmatter', () => {
  it('folds a `>-` scalar into a single paragraph', async () => {
    const entry = await parseOne(
      '---\ntitle: Kaleid\nsummary: >-\n  Kaleid is the current canonical name\n  for the personification.\n---\n\nbody',
    );
    expect(entry.summary).toBe('Kaleid is the current canonical name for the personification.');
  });

  it('separates paragraphs on a blank line', async () => {
    const entry = await parseOne(
      '---\ntitle: T\nsummary: >-\n  First paragraph.\n\n  Second paragraph.\n---\n',
    );
    expect(entry.summary).toBe('First paragraph.\n\nSecond paragraph.');
  });

  it('keeps line breaks in a literal `|` scalar', async () => {
    const entry = await parseOne('---\ntitle: T\nsummary: |\n  Line one.\n  Line two.\n---\n');
    expect(entry.summary).toBe('Line one.\nLine two.');
  });

  it('does not leak the marker into the value', async () => {
    const entry = await parseOne('---\ntitle: T\nsummary: >-\n  Real text.\n---\n');
    expect(entry.summary).not.toContain('>');
    expect(entry.summary).not.toBe('>-');
  });

  it('resumes reading keys after the block ends', async () => {
    // The block must consume its own indented lines, or the keys that follow
    // are parsed as part of it and vanish.
    const entry = await parseOne(
      '---\ntitle: Kaleid\nsummary: >-\n  Some prose here.\nofficial_name: Kaleidoscope\ntags:\n  - twovestellium\n---\n',
    );
    expect(entry.properties.official_name).toBe('Kaleidoscope');
    expect(entry.tags).toEqual(['twovestellium']);
    expect(entry.title).toBe('Kaleid');
  });

  it('handles an empty block', async () => {
    const entry = await parseOne('---\ntitle: T\nsummary: >-\nofficial_name: X\n---\n');
    expect(entry.summary).toBe('');
    expect(entry.properties.official_name).toBe('X');
  });

  it('still reads a plain single-line scalar', async () => {
    const entry = await parseOne('---\ntitle: T\nsummary: Just a line.\n---\n');
    expect(entry.summary).toBe('Just a line.');
  });

  it('preserves wikilinks inside a folded summary', async () => {
    const entry = await parseOne(
      '---\ntitle: T\nsummary: >-\n  Personification of [[Omnifundus (Kaleid)]], the Fundus-side force.\n---\n',
    );
    expect(entry.summary).toContain('[[Omnifundus (Kaleid)]]');
  });
});
