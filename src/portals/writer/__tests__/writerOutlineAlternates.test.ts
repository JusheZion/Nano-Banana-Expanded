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

  it('retains a validated manifest while accepting legacy historical alternates', () => {
    const legacy = {
      at: '2026-07-22T00:00:00Z',
      treatmentMode: 'preserve' as const,
      proposal: { title: 'Legacy' },
    };
    const notes = mergeOutlineAlternateIntoNotes({ outline_alternates: [legacy] }, {
      at: '2026-07-23T00:00:00Z',
      treatmentMode: 'structure',
      proposal: { title: 'Current' },
      manifest: {
        treatmentMode: 'structure',
        sourcePageCount: 2,
        proposedPageCount: 2,
        entries: [],
      },
    });
    const alternates = readOutlineAlternates(notes);
    expect(alternates[0].manifest).toBeUndefined();
    expect(alternates[1].manifest).toMatchObject({ treatmentMode: 'structure' });
  });
});
