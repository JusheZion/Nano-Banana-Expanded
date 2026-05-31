import { describe, expect, it } from 'vitest';
import {
  importHierarchyFromJson,
  importHierarchyFromText,
  mergeHierarchyIntoNotes,
  readHierarchyFromNotes,
} from '../writerHierarchy';

describe('writerHierarchy', () => {
  it('imports markdown/text into deterministic page and beat nodes without rewriting content', () => {
    const tree = importHierarchyFromText(`
# Arc: First Light
## Issue 1: Doorway
Page 1: The door opens.
- The hero sees the letter.
- The room goes quiet.
Page 2
The alarm starts outside.
`);

    expect(tree).toEqual([
      {
        id: 'arc-1',
        kind: 'arc',
        title: 'Arc: First Light',
        sourceText: '# Arc: First Light',
        children: [
          {
            id: 'issue-1',
            kind: 'issue',
            title: 'Issue 1: Doorway',
            sourceText: '## Issue 1: Doorway',
            children: [
              {
                id: 'page-1',
                kind: 'page',
                title: 'Page 1: The door opens.',
                sourceText: 'Page 1: The door opens.',
                children: [
                  {
                    id: 'beat-1',
                    kind: 'beat',
                    title: 'The hero sees the letter.',
                    sourceText: '- The hero sees the letter.',
                    children: [],
                  },
                  {
                    id: 'beat-2',
                    kind: 'beat',
                    title: 'The room goes quiet.',
                    sourceText: '- The room goes quiet.',
                    children: [],
                  },
                ],
              },
              {
                id: 'page-2',
                kind: 'page',
                title: 'Page 2',
                sourceText: 'Page 2',
                children: [
                  {
                    id: 'beat-3',
                    kind: 'beat',
                    title: 'The alarm starts outside.',
                    sourceText: 'The alarm starts outside.',
                    children: [],
                  },
                ],
              },
            ],
          },
        ],
      },
    ]);
  });

  it('normalizes unknown JSON hierarchy nodes and drops invalid children deterministically', () => {
    const tree = importHierarchyFromJson({
      kind: 'book',
      title: 'Book One',
      id: 'external-id',
      children: [
        {
          type: 'chapter',
          text: 'Chapter 1: Arrival',
          children: [
            { node_type: 'scene', label: 'Station platform' },
            { kind: 'unknown-kind', title: 'Should be skipped' },
          ],
        },
      ],
    });

    expect(tree).toEqual([
      {
        id: 'book-1',
        kind: 'book',
        title: 'Book One',
        sourceText: 'Book One',
        children: [
          {
            id: 'chapter-1',
            kind: 'chapter',
            title: 'Chapter 1: Arrival',
            sourceText: 'Chapter 1: Arrival',
            children: [
              {
                id: 'scene-1',
                kind: 'scene',
                title: 'Station platform',
                sourceText: 'Station platform',
                children: [],
              },
            ],
          },
        ],
      },
    ]);
  });

  it('round-trips hierarchy through existing issue notes metadata', () => {
    const tree = importHierarchyFromText('Page 1: Opening image\nA quiet street.');
    const notes = mergeHierarchyIntoNotes({ writer_tool_cache: { x: 1 } }, tree, {
      source: 'paste',
      updatedAt: '2026-05-31T00:00:00.000Z',
    });

    expect(notes.writer_tool_cache).toEqual({ x: 1 });
    expect(notes.hierarchy_tree).toEqual({
      version: 1,
      source: 'paste',
      updated_at: '2026-05-31T00:00:00.000Z',
      nodes: tree,
    });
    expect(readHierarchyFromNotes(notes)).toEqual(tree);
  });
});
