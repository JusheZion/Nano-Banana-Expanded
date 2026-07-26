import { describe, expect, it, vi } from 'vitest';
import {
  persistPacingRevisionOutlinePreview,
  projectPacingRevisionFailureLedger,
} from './pacingRevisionPersistence.ts';

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

  it('converts a legacy page failure without dropping an unrequested missing sibling', () => {
    expect(projectPacingRevisionFailureLedger({
      ledger: [{ page_number: 2, reason: 'Legacy combined timeout' }],
      pageNumber: 2,
      requestedLayers: ['beats'],
      readyLayers: [],
      newFailures: [{ page_number: 2, layer: 'beats', reason: 'Beats timed out' }],
    })).toEqual([
      { page_number: 2, layer: 'dialogue', reason: 'Legacy combined timeout' },
      { page_number: 2, layer: 'beats', reason: 'Beats timed out' },
    ]);
  });

  it('clears only a successful requested layer and retains the legacy missing sibling', () => {
    expect(projectPacingRevisionFailureLedger({
      ledger: [{ page_number: 2, reason: 'Legacy combined timeout' }],
      pageNumber: 2,
      requestedLayers: ['beats'],
      readyLayers: ['beats'],
    })).toEqual([
      { page_number: 2, layer: 'dialogue', reason: 'Legacy combined timeout' },
    ]);
  });
});
