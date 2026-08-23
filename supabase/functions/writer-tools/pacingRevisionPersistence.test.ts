import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  buildPacingRevisionPageChangeRow,
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
        update: vi.fn(() => ({
          eq: vi.fn(async () => ({ error: null })),
        })),
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

  it('invalidates dependent Dialogue whenever the effective Beats candidate changes', () => {
    const migration = readFileSync(
      join(process.cwd(), 'supabase/migrations/20260726000000_writer_pacing_revision_beats_invalidation.sql'),
      'utf8',
    );
    expect(migration).toContain("new.layer = 'beats'");
    expect(migration).toMatch(/new\.ai_proposal is distinct from old\.ai_proposal/i);
    expect(migration).toMatch(/new\.edited_candidate is distinct from old\.edited_candidate/i);
    expect(migration).toContain("generation_status = 'stale'");
    expect(migration).toContain("decision = 'pending'");
    expect(migration).toMatch(/new\.id = any\(dependency_ids\)/i);
  });

  it('persists a virtual candidate with stable identity and null current value', () => {
    expect(buildPacingRevisionPageChangeRow({
      id: 'change-id',
      itemId: 'item-id',
      layer: 'beats',
      target: {
        kind: 'virtual',
        pageId: null,
        pageNumber: 72,
        targetKey: 'virtual-page:72',
      },
      currentValue: { panels: [{ action: 'Must not persist' }] },
      aiProposal: { panels: [{ action: 'New virtual action' }] },
      dependencyIds: ['outline-change-id'],
      reason: 'Add connective action.',
      sourceFingerprint: 'null-fingerprint',
      now: '2026-07-27T00:00:00.000Z',
    })).toEqual({
      id: 'change-id',
      item_id: 'item-id',
      layer: 'beats',
      target_key: 'virtual-page:72',
      page_id: null,
      page_number: 72,
      current_value: null,
      ai_proposal: { panels: [{ action: 'New virtual action' }] },
      edited_candidate: null,
      decision: 'pending',
      dependency_ids: ['outline-change-id'],
      reason: 'Add connective action.',
      source_fingerprint: 'null-fingerprint',
      generation_status: 'ready',
      applied_at: null,
      created_at: '2026-07-27T00:00:00.000Z',
      updated_at: '2026-07-27T00:00:00.000Z',
    });
  });
});
