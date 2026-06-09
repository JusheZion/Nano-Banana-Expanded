import { describe, expect, it } from 'vitest';
import {
  buildWriterVisualReferenceDigest,
  mergeVisualReferencesIntoSynopsisParts,
  mergeWriterVisualReferenceIntoNotes,
  readWriterVisualReferencesFromNotes,
  removeWriterVisualReferenceFromNotes,
} from '@/portals/writer/writerVisualReferences';
import { EMPTY_SYNOPSIS_HELPER_PARTS } from '@/portals/writer/writerSynopsisHelper';

describe('writerVisualReferences', () => {
  it('stores and reads issue-linked vault references from notes', () => {
    const notes = mergeWriterVisualReferenceIntoNotes(
      { writer_tool_cache: { canon_check: { at: 'now' } } },
      {
        source: 'character_vault',
        sourceId: 'char-1',
        sourceLabel: 'Mara',
        label: 'Mara',
        kind: 'character',
        imageUrl: 'https://example.com/mara.png',
        note: 'Use the cloak silhouette.',
      },
    );

    expect(notes.writer_tool_cache).toEqual({ canon_check: { at: 'now' } });
    const refs = readWriterVisualReferencesFromNotes(notes);
    expect(refs).toHaveLength(1);
    expect(refs[0]).toMatchObject({
      id: 'character_vault:char-1',
      source: 'character_vault',
      label: 'Mara',
      kind: 'character',
      imageUrl: 'https://example.com/mara.png',
    });
  });

  it('removes a reference without dropping other notes metadata', () => {
    const notes = mergeWriterVisualReferenceIntoNotes(
      { production_defaults: { medium_type: 'comic' } },
      {
        source: 'asset_vault',
        sourceId: 'asset-1',
        sourceLabel: 'Sky Observatory',
        label: 'Sky Observatory',
        kind: 'location',
        imageUrl: 'https://example.com/observatory.png',
      },
    );

    const next = removeWriterVisualReferenceFromNotes(notes, 'asset_vault:asset-1');
    expect(next.production_defaults).toEqual({ medium_type: 'comic' });
    expect(readWriterVisualReferencesFromNotes(next)).toEqual([]);
  });

  it('builds prompt digest and synopsis helper additions', () => {
    const refs = readWriterVisualReferencesFromNotes({
      writer_visual_references: [
        {
          source: 'character_vault',
          source_id: 'char-1',
          source_label: 'Mara profile',
          label: 'Mara',
          kind: 'character',
          image_url: 'https://example.com/mara.png',
        },
        {
          source: 'asset_vault',
          source_id: 'asset-1',
          source_label: 'Relic room',
          label: 'Bronze mask',
          kind: 'prop',
          image_url: 'https://example.com/mask.png',
        },
      ],
    });

    expect(buildWriterVisualReferenceDigest(refs)).toContain('Character design: Mara');
    const parts = mergeVisualReferencesIntoSynopsisParts(EMPTY_SYNOPSIS_HELPER_PARTS, refs);
    expect(parts.castGoals).toContain('Mara');
    expect(parts.rules).toContain('Bronze mask');
  });
});
