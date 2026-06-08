import { describe, expect, it } from 'vitest';
import {
  filterUnlockedWriterPageIds,
  isWriterItemLocked,
  mergeWriterLockIntoNotes,
  readWriterLocksFromNotes,
  writerPageBeatsLockKey,
} from '../writerProtectionLocks';

describe('writerProtectionLocks', () => {
  it('stores locks inside issue notes without disturbing unrelated notes', () => {
    const notes = mergeWriterLockIntoNotes({ existing: 'keep' }, 'issue.synopsis', 'Issue synopsis', true, '2026-06-08T00:00:00.000Z');

    expect(notes.existing).toBe('keep');
    expect(isWriterItemLocked(notes, 'issue.synopsis')).toBe(true);
    expect(readWriterLocksFromNotes(notes)['issue.synopsis']?.label).toBe('Issue synopsis');
  });

  it('removes a lock while leaving other locks intact', () => {
    const pageKey = writerPageBeatsLockKey('page-1');
    const locked = mergeWriterLockIntoNotes(
      mergeWriterLockIntoNotes({}, 'outline.latest', 'Latest outline', true, '2026-06-08T00:00:00.000Z'),
      pageKey,
      'Page 1 beats',
      true,
      '2026-06-08T00:01:00.000Z',
    );
    const unlocked = mergeWriterLockIntoNotes(locked, 'outline.latest', 'Latest outline', false);

    expect(isWriterItemLocked(unlocked, 'outline.latest')).toBe(false);
    expect(isWriterItemLocked(unlocked, pageKey)).toBe(true);
  });

  it('splits locked and unlocked pages for batch regeneration guards', () => {
    const pageKey = writerPageBeatsLockKey('page-2');
    const notes = mergeWriterLockIntoNotes({}, pageKey, 'Page 2 beats', true, '2026-06-08T00:00:00.000Z');

    expect(filterUnlockedWriterPageIds(['page-1', 'page-2', 'page-3'], notes, 'beats')).toEqual({
      unlockedPageIds: ['page-1', 'page-3'],
      lockedPageIds: ['page-2'],
    });
  });
});
