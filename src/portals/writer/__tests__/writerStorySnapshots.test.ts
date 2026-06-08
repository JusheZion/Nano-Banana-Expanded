import { describe, expect, it } from 'vitest';
import {
  latestWriterStorySnapshot,
  mergeWriterStorySnapshotIntoNotes,
  readWriterStorySnapshotsFromNotes,
} from '../writerStorySnapshots';

describe('writerStorySnapshots', () => {
  it('stores snapshots in newest-first order and caps history', () => {
    let notes: Record<string, unknown> = {};
    notes = mergeWriterStorySnapshotIntoNotes(notes, {
      key: 'outline.latest',
      label: 'Outline before regeneration',
      value: { pages: 22 },
      createdAt: '2026-06-08T00:00:00.000Z',
    });
    notes = mergeWriterStorySnapshotIntoNotes(
      notes,
      {
        key: 'outline.latest',
        label: 'Outline before coverage boost',
        value: { pages: 24 },
        createdAt: '2026-06-08T00:01:00.000Z',
      },
      1,
    );

    const snapshots = readWriterStorySnapshotsFromNotes(notes);
    expect(snapshots).toHaveLength(1);
    expect(snapshots[0]?.label).toBe('Outline before coverage boost');
    expect(latestWriterStorySnapshot(notes, 'outline.latest')?.value).toEqual({ pages: 24 });
  });
});
