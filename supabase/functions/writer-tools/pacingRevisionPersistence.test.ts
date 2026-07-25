import { describe, expect, it, vi } from 'vitest';
import { persistPacingRevisionOutlinePreview } from './pacingRevisionPersistence.ts';

describe('persistPacingRevisionOutlinePreview', () => {
  it('writes only preview tables and never inserts an official outline', async () => {
    const tables: string[] = [];
    const from = vi.fn((table: string) => {
      tables.push(table);
      return {
        insert: vi.fn(async () => ({ error: null })),
      };
    });

    const result = await persistPacingRevisionOutlinePreview(
      { from },
      { id: 'set-id' },
      [{ id: 'item-id' }],
      [{ id: 'change-id' }],
    );

    expect(result).toEqual({ ok: true });
    expect(tables).toEqual([
      'writer_pacing_revision_sets',
      'writer_pacing_revision_items',
      'writer_pacing_revision_changes',
    ]);
    expect(tables).not.toContain('writer_issue_outlines');
  });
});
