import { describe, expect, it } from 'vitest';
import { mergeOutlineAlternateIntoNotes, readOutlineAlternates } from '../writerOutlineAlternates';

describe('writerOutlineAlternates', () => {
  it('preserves unrelated notes and caps newest proposals at ten', () => {
    let notes: Record<string, unknown> = { unrelated: { keep: true } };
    for (let index = 0; index < 12; index += 1) {
      notes = mergeOutlineAlternateIntoNotes(notes, {
        at: `2026-07-22T00:00:${String(index).padStart(2, '0')}Z`,
        treatmentMode: 'structure',
        proposal: { title: `Proposal ${index}` },
      });
    }
    expect(readOutlineAlternates(notes)).toHaveLength(10);
    expect(readOutlineAlternates(notes)[0].proposal).toMatchObject({ title: 'Proposal 2' });
    expect(notes.unrelated).toEqual({ keep: true });
  });
});
