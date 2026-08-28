import { describe, expect, it } from 'vitest';
import type { ObsidianLoreEntry } from '@/portals/writer/obsidianLoreImport';
import type { CodexChartObject, CodexObject, CodexTextObject } from '../../types/codexObjects';
import {
  bindableFields,
  formatFieldValue,
  indexEntries,
  numericFieldValue,
  resolveBindings,
  resolveField,
} from '../vaultBinding';

function entry(partial: Partial<ObsidianLoreEntry> = {}): ObsidianLoreEntry {
  return {
    id: 'e1',
    title: 'Kaleid',
    category: 'character',
    summary: 'Omnifundus.',
    markdownBody: '',
    properties: { epithet: 'Omnifundus', compression: 82, wave: '64', zodiac: null },
    tags: ['twovestellium', 'mediator'],
    links: [],
    linkedLoreReferences: [],
    images: [],
    sourcePath: 'Vault/Characters/Kaleid.md',
    importDate: '2026-08-25T00:00:00.000Z',
    ...partial,
  } as ObsidianLoreEntry;
}

const base = {
  x: 0, y: 0, width: 100, height: 20, rotation: 0, opacity: 1, locked: false, visible: true,
};

function text(binding?: CodexTextObject['binding'], value = 'placeholder'): CodexTextObject {
  return {
    ...base, id: 't1', kind: 'text', text: value, fontFamily: 'Cinzel', fontSize: 12,
    fontStyle: 'normal', fill: '#fff', align: 'left', lineHeight: 1.4, letterSpacing: 0, binding,
  } as CodexTextObject;
}

function chart(axes: CodexChartObject['axes'], binding?: CodexChartObject['binding']): CodexChartObject {
  return {
    ...base, id: 'c1', kind: 'chart', chartKind: 'radial', axes, max: 100, stroke: '#fff',
    fill: '#fff', track: '#333', labelColor: '#888', fontFamily: 'Cinzel', fontSize: 11,
    showLabels: true, showValues: true, binding,
  } as CodexChartObject;
}

describe('bindableFields', () => {
  it('offers the core fields plus whatever frontmatter the note carries', () => {
    expect(bindableFields(entry())).toEqual([
      'title', 'category', 'summary', 'tags',
      'properties.compression', 'properties.epithet', 'properties.wave', 'properties.zodiac',
    ]);
  });

  it('works on a note with no frontmatter at all', () => {
    expect(bindableFields(entry({ properties: {} }))).toEqual(['title', 'category', 'summary', 'tags']);
  });
});

describe('resolveField', () => {
  it('reads core fields and frontmatter', () => {
    expect(resolveField(entry(), 'title')).toBe('Kaleid');
    expect(resolveField(entry(), 'properties.epithet')).toBe('Omnifundus');
  });

  it('returns undefined for an unknown field rather than throwing', () => {
    expect(resolveField(entry(), 'properties.nope')).toBeUndefined();
    expect(resolveField(entry(), 'nonsense')).toBeUndefined();
    expect(resolveField(entry(), '')).toBeUndefined();
  });
});

describe('formatFieldValue', () => {
  it('joins lists and renders scalars', () => {
    expect(formatFieldValue(['a', 'b'])).toBe('a, b');
    expect(formatFieldValue(42)).toBe('42');
    expect(formatFieldValue(true)).toBe('Yes');
  });

  it('renders absent values as empty rather than "undefined"', () => {
    expect(formatFieldValue(undefined)).toBe('');
    expect(formatFieldValue(null)).toBe('');
  });
});

describe('numericFieldValue', () => {
  it('accepts numbers and numeric strings, since YAML quotes are easy to leave in', () => {
    expect(numericFieldValue(82)).toBe(82);
    expect(numericFieldValue('64')).toBe(64);
  });

  it('returns null for a missing or non-numeric stat, not 0', () => {
    // Plotting an absent stat as zero would assert something false about canon.
    expect(numericFieldValue(undefined)).toBeNull();
    expect(numericFieldValue(null)).toBeNull();
    expect(numericFieldValue('unknown')).toBeNull();
    expect(numericFieldValue('')).toBeNull();
  });
});

describe('resolveBindings', () => {
  const index = indexEntries([entry()]);

  it('fills a live text binding from canon', () => {
    const report = resolveBindings(
      [text({ notePath: 'Vault/Characters/Kaleid.md', field: 'properties.epithet', mode: 'live' })],
      index,
    );
    expect(report.patches).toHaveLength(1);
    expect((report.patches[0].patch as { text: string }).text).toBe('Omnifundus');
  });

  it('leaves a once-binding alone — it is the user’s to edit after filling', () => {
    const report = resolveBindings(
      [text({ notePath: 'Vault/Characters/Kaleid.md', field: 'title', mode: 'once' }, 'hand-tuned')],
      index,
    );
    expect(report.patches).toEqual([]);
  });

  it('ignores unbound objects', () => {
    expect(resolveBindings([text()], index).patches).toEqual([]);
  });

  it('reports a renamed note instead of blanking the object', () => {
    const report = resolveBindings(
      [text({ notePath: 'Vault/Characters/Gone.md', field: 'title', mode: 'live' })],
      index,
    );
    expect(report.patches).toEqual([]);
    expect(report.missingNotes).toEqual([{ id: 't1', notePath: 'Vault/Characters/Gone.md' }]);
  });

  it('reports a field that vanished from the note', () => {
    const report = resolveBindings(
      [text({ notePath: 'Vault/Characters/Kaleid.md', field: 'properties.height', mode: 'live' })],
      index,
    );
    expect(report.patches).toEqual([]);
    expect(report.missingFields[0].field).toBe('properties.height');
  });

  it('reads each chart axis from its own frontmatter key', () => {
    const report = resolveBindings(
      [chart(
        [
          { label: 'Compression', value: 0, field: 'properties.compression' },
          { label: 'Wave', value: 0, field: 'properties.wave' },
        ],
        { notePath: 'Vault/Characters/Kaleid.md', field: '', mode: 'live' },
      )],
      index,
    );
    const axes = (report.patches[0].patch as { axes: Array<{ value: number }> }).axes;
    expect(axes.map((a) => a.value)).toEqual([82, 64]);
  });

  it('leaves an axis with no canon value untouched and reports it', () => {
    const report = resolveBindings(
      [chart(
        [
          { label: 'Compression', value: 0, field: 'properties.compression' },
          { label: 'Zodiac', value: 55, field: 'properties.zodiac' },
        ],
        { notePath: 'Vault/Characters/Kaleid.md', field: '', mode: 'live' },
      )],
      index,
    );
    const axes = (report.patches[0].patch as { axes: Array<{ value: number }> }).axes;
    expect(axes[1].value).toBe(55); // not zeroed
    expect(report.missingFields.map((m) => m.field)).toContain('properties.zodiac');
  });

  it('emits no patch when nothing actually changed', () => {
    const report = resolveBindings(
      [chart(
        [{ label: 'Compression', value: 82, field: 'properties.compression' }],
        { notePath: 'Vault/Characters/Kaleid.md', field: '', mode: 'live' },
      )],
      index,
    );
    expect(report.patches).toEqual([]);
  });

  it('stamps when a binding last resolved', () => {
    const report = resolveBindings(
      [text({ notePath: 'Vault/Characters/Kaleid.md', field: 'title', mode: 'live' })],
      index,
      '2026-08-25T12:00:00.000Z',
    );
    const patch = report.patches[0].patch as { binding: { resolvedAt: string } };
    expect(patch.binding.resolvedAt).toBe('2026-08-25T12:00:00.000Z');
  });

  it('handles an empty plate', () => {
    expect(resolveBindings([] as CodexObject[], index).patches).toEqual([]);
  });
});
