import { describe, expect, it } from 'vitest';
import {
  mergeWriterDraftIntoNotes,
  mergeWriterDraftsIntoNotes,
  readWriterDraftsFromNotes,
} from '../writerDraftPersistence';

describe('writerDraftPersistence', () => {
  it('persists fragile drafts under issue notes', () => {
    const notes = mergeWriterDraftIntoNotes(
      { existing: true },
      'outline_instructions',
      'Keep the midpoint reveal on page 12.',
      '2026-06-08T00:00:00.000Z',
    );

    expect(notes.existing).toBe(true);
    expect(readWriterDraftsFromNotes(notes).outline_instructions?.value).toBe(
      'Keep the midpoint reveal on page 12.',
    );
  });

  it('merges multiple draft fields without clobbering older fields', () => {
    const notes = mergeWriterDraftsIntoNotes(
      mergeWriterDraftIntoNotes({}, 'beats_director_notes', 'Fewer panels.', '2026-06-08T00:00:00.000Z'),
      {
        outline_instructions: 'Stay close to the author outline.',
        visual_creative_brief: 'Noir lighting.',
      },
      '2026-06-08T00:01:00.000Z',
    );

    const drafts = readWriterDraftsFromNotes(notes);
    expect(drafts.beats_director_notes?.value).toBe('Fewer panels.');
    expect(drafts.outline_instructions?.value).toBe('Stay close to the author outline.');
    expect(drafts.visual_creative_brief?.value).toBe('Noir lighting.');
  });
});
