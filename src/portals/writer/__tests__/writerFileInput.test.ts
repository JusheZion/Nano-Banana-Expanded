import { describe, expect, it } from 'vitest';
import { consumeWriterFileInputSelection } from '../writerFileInput';

describe('consumeWriterFileInputSelection', () => {
  it('snapshots the files and clears the input so the same selection can be retried', () => {
    const note = new File(['# Lore'], 'lore.md', { type: 'text/markdown' });
    const input = {
      files: [note] as unknown as FileList,
      value: '/fake/path/lore.md',
    };

    expect(consumeWriterFileInputSelection(input)).toEqual([note]);
    expect(input.value).toBe('');
  });

  it('clears an empty selection as well', () => {
    const input = { files: null, value: '/fake/path/stale.md' };

    expect(consumeWriterFileInputSelection(input)).toEqual([]);
    expect(input.value).toBe('');
  });
});
