import { describe, expect, it } from 'vitest';
import {
  buildLoreBodyFromObsidianEntry,
  parseObsidianLoreImport,
  readLoreImportMetadataFromBody,
  resolveObsidianLoreDuplicate,
  stripLoreImportMetadataFromBody,
  type ObsidianLoreExistingEntry,
} from '../obsidianLoreImport';

function fileWithPath(name: string, body: string, path: string, type = 'text/markdown'): File {
  const f = new File([body], name, { type });
  Object.defineProperty(f, 'webkitRelativePath', { value: path });
  return f;
}

describe('parseObsidianLoreImport', () => {
  it('parses YAML frontmatter, preserves markdown sections, tags, and Obsidian links', async () => {
    const kron: ObsidianLoreExistingEntry = {
      id: 'lore-kron',
      title: 'Kron',
      category: 'character',
      body: 'Existing Kron card',
      include_in_prompt: true,
      sort_order: 10,
    };

    const note = fileWithPath(
      'Stellar Academy.md',
      [
        '---',
        'name: Stellar Academy',
        'type: organization',
        'summary: A school for occult disciplines.',
        'tags: [academy, magic]',
        'discipline: Black Magic',
        '---',
        '# Overview',
        'The academy trained [[Kron]] before the schism.',
        '',
        '## Relationships',
        'Rivals with [[The Silver Compact]].',
        '',
        '## Visual References',
        '![[Assets/academy-gate.png]]',
      ].join('\n'),
      'Vault/Organizations/Stellar Academy.md',
    );
    const image = fileWithPath(
      'academy-gate.png',
      'image-bytes',
      'Vault/Organizations/Assets/academy-gate.png',
      'image/png',
    );

    const result = await parseObsidianLoreImport([note, image], {
      existingEntries: [kron],
      importDate: '2026-06-01T12:00:00.000Z',
    });

    expect(result.entries).toHaveLength(1);
    const entry = result.entries[0];
    expect(entry.title).toBe('Stellar Academy');
    expect(entry.category).toBe('organization');
    expect(entry.summary).toBe('A school for occult disciplines.');
    expect(entry.tags).toEqual(['academy', 'magic']);
    expect(entry.properties).toMatchObject({ discipline: 'Black Magic' });
    expect(entry.markdownBody).toContain('## Relationships');
    expect(entry.links.map((link) => link.target)).toEqual(['Kron', 'The Silver Compact']);
    expect(entry.linkedLoreReferences).toEqual([{ id: 'lore-kron', title: 'Kron', category: 'character' }]);
    expect(entry.images).toHaveLength(1);
    expect(entry.images[0]).toMatchObject({
      fileName: 'academy-gate.png',
      sourcePath: 'Vault/Organizations/Assets/academy-gate.png',
      reference: 'Assets/academy-gate.png',
      section: 'Visual References',
      status: 'resolved',
    });
    expect(entry.sourcePath).toBe('Vault/Organizations/Stellar Academy.md');
    expect(entry.importDate).toBe('2026-06-01T12:00:00.000Z');
    expect(entry.updatedAt).toBe('2026-06-01T12:00:00.000Z');
    expect(entry.warnings).toEqual([]);
  });

  it('uses filenames as titles and filters folder imports by Obsidian type property', async () => {
    const character = fileWithPath(
      'Elaphokorus.md',
      ['---', 'type: species', '---', '## Overview', 'Antlered messenger culture.'].join('\n'),
      'Vault/Lore/Species/Elaphokorus.md',
    );
    const location = fileWithPath(
      'Moon Gate.md',
      ['---', 'type: location', '---', '## Overview', 'Transit ruins.'].join('\n'),
      'Vault/Lore/Locations/Moon Gate.md',
    );

    const result = await parseObsidianLoreImport([character, location], {
      typeFilter: 'species',
      importDate: '2026-06-01T12:00:00.000Z',
    });

    expect(result.entries).toHaveLength(1);
    expect(result.entries[0]).toMatchObject({
      title: 'Elaphokorus',
      category: 'species',
      sourcePath: 'Vault/Lore/Species/Elaphokorus.md',
    });
  });

  it('reads capitalized Obsidian property names from real vault-style notes', async () => {
    const glimm = fileWithPath(
      'Glimm.md',
      ['---', 'Type: Species', 'Threat Level: "7"', '---', '#About', 'Reanimated humans.'].join('\n'),
      'Vault/Species/Glimm.md',
    );

    const result = await parseObsidianLoreImport([glimm], {
      typeFilter: 'species',
      importDate: '2026-06-01T12:00:00.000Z',
    });

    expect(result.entries).toHaveLength(1);
    expect(result.entries[0]).toMatchObject({
      title: 'Glimm',
      category: 'species',
      properties: { 'Threat Level': '7' },
    });
  });

  it('skips Obsidian template notes during folder imports', async () => {
    const template = fileWithPath(
      'Character Template.md',
      ['---', 'Species:', 'Faction:', '---', '# Overview'].join('\n'),
      'Vault/Templates/Character Template.md',
    );
    const kron = fileWithPath(
      'Kron.md',
      ['---', 'Species: Lumarian', 'Faction: IDO', '---', '# Overview', 'Student at IDO.'].join('\n'),
      'Vault/Characters/Kron.md',
    );

    const result = await parseObsidianLoreImport([template, kron], {
      importDate: '2026-06-01T12:00:00.000Z',
    });

    expect(result.entries.map((entry) => entry.title)).toEqual(['Kron']);
    expect(result.entries[0].category).toBe('character');
  });

  it('keeps unresolved image references as warnings without rejecting the note', async () => {
    const note = fileWithPath(
      'Kron.md',
      ['---', 'type: character', '---', '## Visual References', '![[missing-kron.png]]'].join('\n'),
      'Vault/Characters/Kron.md',
    );

    const result = await parseObsidianLoreImport([note], {
      importDate: '2026-06-01T12:00:00.000Z',
    });

    expect(result.entries).toHaveLength(1);
    expect(result.entries[0].images).toEqual([
      expect.objectContaining({
        fileName: 'missing-kron.png',
        status: 'unresolved',
      }),
    ]);
    expect(result.entries[0].warnings).toEqual([
      'Could not resolve embedded image "missing-kron.png". Select the image file or its containing folder and import again.',
    ]);
    expect(result.warnings).toEqual(result.entries[0].warnings);
  });

  it('resolves adjacent embeds and cleans section context from tight Obsidian headings', async () => {
    const note = fileWithPath(
      'Finn.md',
      [
        '---',
        'Species: Lumarian',
        '---',
        '#Notes',
        '![[first.png]]![[second.png]]',
        '',
        '# Story Arc![[third.png]]',
      ].join('\n'),
      'Vault/Characters/Finn.md',
    );
    const first = fileWithPath('first.png', 'first-image', 'Vault/Assets/first.png', 'image/png');
    const second = fileWithPath('second.png', 'second-image', 'Vault/Assets/second.png', 'image/png');
    const third = fileWithPath('third.png', 'third-image', 'Vault/Assets/third.png', 'image/png');

    const result = await parseObsidianLoreImport([note, first, second, third], {
      importDate: '2026-06-01T12:00:00.000Z',
    });

    expect(result.entries[0].images).toEqual([
      expect.objectContaining({ fileName: 'first.png', section: 'Notes', status: 'resolved' }),
      expect.objectContaining({ fileName: 'second.png', section: 'Notes', status: 'resolved' }),
      expect.objectContaining({ fileName: 'third.png', section: 'Story Arc', status: 'resolved' }),
    ]);
    expect(result.warnings).toEqual([]);
  });

  it('builds a lore body that preserves markdown plus structured import metadata', async () => {
    const [entry] = (
      await parseObsidianLoreImport(
        [
          fileWithPath(
            'Kron.md',
            ['---', 'type: character', 'tags: [protagonist]', '---', '## Overview', 'Knows [[Stellar Academy]].'].join('\n'),
            'Vault/Characters/Kron.md',
          ),
        ],
        { importDate: '2026-06-01T12:00:00.000Z' },
      )
    ).entries;

    const body = buildLoreBodyFromObsidianEntry(entry, [
      {
        reference: 'kron-reference.png',
        fileName: 'kron-reference.png',
        sourcePath: 'Vault/Characters/kron-reference.png',
        caption: 'Primary reference',
        section: 'Visual References',
        storageUrl: 'https://example.test/storage/kron-reference.png',
        status: 'stored',
      },
    ]);

    expect(body).toContain('## Overview');
    expect(body).toContain('Knows [[Stellar Academy]].');
    expect(body).toContain('<!-- ARCS_LORE_IMPORT_METADATA');
    expect(body).toContain('"sourcePath": "Vault/Characters/Kron.md"');
    expect(body).toContain('"storageUrl": "https://example.test/storage/kron-reference.png"');
    expect(stripLoreImportMetadataFromBody(body)).toContain('Knows [[Stellar Academy]].');
    expect(stripLoreImportMetadataFromBody(body)).not.toContain('storageUrl');
    const metadata = readLoreImportMetadataFromBody(body);
    expect(metadata?.images?.[0]?.storageUrl).toBe('https://example.test/storage/kron-reference.png');
  });
});

describe('resolveObsidianLoreDuplicate', () => {
  const existing: ObsidianLoreExistingEntry = {
    id: 'existing-kron',
    title: 'Kron',
    category: 'character',
    body: 'App-only notes\n\n<!-- ARCS_LORE_APP_FIELDS {"locked":true} -->',
    include_in_prompt: false,
    sort_order: 40,
  };
  const incoming = {
    title: 'Kron',
    category: 'character',
    body: 'Updated Obsidian body',
  };

  it('skips duplicate imports when requested', () => {
    expect(resolveObsidianLoreDuplicate({ existing, incoming, action: 'skip' })).toEqual({ kind: 'skip' });
  });

  it('merges duplicate imports while preserving existing app-specific fields', () => {
    expect(resolveObsidianLoreDuplicate({ existing, incoming, action: 'merge' })).toEqual({
      kind: 'update',
      id: 'existing-kron',
      patch: {
        title: 'Kron',
        category: 'character',
        body: 'Updated Obsidian body\n\n<!-- ARCS_LORE_APP_FIELDS {"locked":true} -->',
        include_in_prompt: false,
        sort_order: 40,
      },
    });
  });

  it('creates duplicates when requested', () => {
    expect(resolveObsidianLoreDuplicate({ existing, incoming, action: 'create_duplicate' })).toEqual({
      kind: 'create',
      input: incoming,
    });
  });
});
