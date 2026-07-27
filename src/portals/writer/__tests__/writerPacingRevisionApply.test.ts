import { describe, expect, it, vi } from 'vitest';
import type { PacingRevisionChange, PacingRevisionSet } from '@/shared/writer/pacingRevisionSchemas';
import {
  applyPacingRevisionSet,
  pacingRevisionFingerprintKey,
  type PacingRevisionApplySnapshot,
  undoPacingRevisionApply,
} from '../writerPacingRevisionApply';
import { buildPacingRevisionOutlineFromApprovedChanges } from '../writerPacingRevisionOutline';

function fixture() {
  const itemId = crypto.randomUUID();
  const outline: PacingRevisionChange = {
    id: crypto.randomUUID(), item_id: itemId, layer: 'outline', target_key: 'outline:op',
    current_value: 'old outline', ai_proposal: 'new outline', edited_candidate: null,
    decision: 'approved', dependency_ids: [], reason: 'pacing', source_fingerprint: 'outline-fp',
    generation_status: 'ready',
  };
  const beats: PacingRevisionChange = {
    id: crypto.randomUUID(), item_id: itemId, layer: 'beats', target_key: 'page:1',
    page_id: crypto.randomUUID(), page_number: 1, current_value: { panels: [{ action: 'old' }] },
    ai_proposal: { panels: [{ action: 'new' }] }, edited_candidate: null, decision: 'approved',
    dependency_ids: [outline.id], reason: 'pacing', source_fingerprint: 'beats-fp',
    generation_status: 'ready',
  };
  const dialogue: PacingRevisionChange = {
    id: crypto.randomUUID(), item_id: itemId, layer: 'dialogue', target_key: 'page:1-dialogue',
    page_id: beats.page_id, page_number: 1, current_value: 'OLD', ai_proposal: 'NEW',
    edited_candidate: null, decision: 'approved', dependency_ids: [beats.id], reason: 'pacing',
    source_fingerprint: 'dialogue-fp', generation_status: 'ready',
  };
  const set: PacingRevisionSet = {
    id: crypto.randomUUID(), issue_id: crypto.randomUUID(), status: 'ready',
    pacing_review_json: {}, source_outline_json: 'old outline', proposed_outline_json: 'new outline',
    source_fingerprint: 'outline-fp',
    progress_json: { total_pages: 1, completed_pages: [1], current_page: null, stopped: false },
    failure_ledger: [],
    items: [{
      id: itemId, revision_set_id: crypto.randomUUID(), position: 0, title: 'Opening',
      rationale: 'pacing', affected_page_numbers: [1], generation_status: 'ready',
      changes: [outline, beats, dialogue],
    }],
  };
  return { set, outline, beats, dialogue };
}

function virtualFixture(pageNumbers = [2, 3]) {
  const { set, outline } = fixture();
  set.source_outline_json = { page_beats: [{ page_target: 1, summary: 'Opening' }] };
  const changes: PacingRevisionChange[] = [outline];
  for (const pageNumber of pageNumbers) {
    const beats: PacingRevisionChange = {
      id: crypto.randomUUID(),
      item_id: outline.item_id,
      layer: 'beats',
      target_key: `virtual-page:${pageNumber}`,
      page_id: null,
      page_number: pageNumber,
      current_value: null,
      ai_proposal: { panels: [{ action: `Action ${pageNumber}` }] },
      edited_candidate: null,
      decision: 'approved',
      dependency_ids: [outline.id],
      reason: 'Expand.',
      source_fingerprint: `beats-${pageNumber}-fp`,
      generation_status: 'ready',
    };
    changes.push(beats, {
      id: crypto.randomUUID(),
      item_id: outline.item_id,
      layer: 'dialogue',
      target_key: `virtual-page:${pageNumber}:dialogue`,
      page_id: null,
      page_number: pageNumber,
      current_value: null,
      ai_proposal: `DIALOGUE ${pageNumber}`,
      edited_candidate: null,
      decision: 'approved',
      dependency_ids: [beats.id],
      reason: 'Expand.',
      source_fingerprint: `dialogue-${pageNumber}-fp`,
      generation_status: 'ready',
    });
  }
  set.items[0]!.affected_page_numbers = pageNumbers;
  set.items[0]!.changes = changes;
  return { set, outline, changes };
}

function fingerprints(changes: PacingRevisionChange[]) {
  return new Map(changes.map((change) => [
    pacingRevisionFingerprintKey(change),
    change.source_fingerprint,
  ]));
}

function builtOutline(pageCount: number) {
  return {
    page_beats: Array.from({ length: pageCount }, (_, index) => ({
      page_target: index + 1,
    })),
  };
}

describe('applyPacingRevisionSet', () => {
  it('creates virtual pages in order, maps returned IDs, and snapshots exact created rows', async () => {
    const { set, changes } = virtualFixture();
    const calls: string[] = [];
    const result = await applyPacingRevisionSet({
      set,
      existingPages: [{ pageId: 'physical-1', pageNumber: 1 }],
      currentFingerprints: fingerprints(changes),
      lockedTargetKeys: new Set(),
      writers: {
        buildOutline: async () => builtOutline(3),
        writeOutline: async () => { calls.push('outline'); },
        createPage: async (pageNumber) => {
          calls.push(`create:${pageNumber}`);
          return { pageId: `created-${pageNumber}`, pageNumber };
        },
        deletePages: async () => { calls.push('delete'); },
        writeBeats: async (pageId) => { calls.push(`beats:${pageId}`); },
        writeDialogue: async (pageId) => { calls.push(`dialogue:${pageId}`); },
      },
    });
    expect(calls).toEqual([
      'outline',
      'create:2',
      'create:3',
      'beats:created-2',
      'beats:created-3',
      'dialogue:created-2',
      'dialogue:created-3',
    ]);
    expect(result.snapshot).toMatchObject({
      sourcePageCount: 1,
      targetPageCount: 3,
      createdPages: [
        { pageId: 'created-2', pageNumber: 2 },
        { pageId: 'created-3', pageNumber: 3 },
      ],
      beats: [],
      dialogue: [],
    });
  });

  it('rejects an incomplete virtual unit before any mutation', async () => {
    const { set, changes } = virtualFixture([2]);
    const dialogue = changes.find((change) => change.layer === 'dialogue')!;
    dialogue.decision = 'rejected';
    const writeOutline = vi.fn();
    const createPage = vi.fn();
    await expect(applyPacingRevisionSet({
      set,
      existingPages: [{ pageId: 'physical-1', pageNumber: 1 }],
      currentFingerprints: fingerprints(changes),
      lockedTargetKeys: new Set(),
      writers: {
        buildOutline: async () => builtOutline(2),
        writeOutline,
        createPage,
        deletePages: vi.fn(),
        writeBeats: vi.fn(),
        writeDialogue: vi.fn(),
      },
    })).rejects.toThrow(/page 2.*Dialogue/i);
    expect(writeOutline).not.toHaveBeenCalled();
    expect(createPage).not.toHaveBeenCalled();
  });

  it('rejects virtual page collisions before mutation', async () => {
    const { set, changes } = virtualFixture([2]);
    const writeOutline = vi.fn();
    await expect(applyPacingRevisionSet({
      set,
      existingPages: [
        { pageId: 'physical-1', pageNumber: 1 },
        { pageId: 'colliding-2', pageNumber: 2 },
      ],
      currentFingerprints: fingerprints(changes),
      lockedTargetKeys: new Set(),
      writers: {
        buildOutline: async () => builtOutline(3),
        writeOutline,
        createPage: vi.fn(),
        deletePages: vi.fn(),
        writeBeats: vi.fn(),
        writeDialogue: vi.fn(),
      },
    })).rejects.toThrow(/collid|contiguous/i);
    expect(writeOutline).not.toHaveBeenCalled();
  });

  it('fails closed on a missing Outline dependency before building or writing', async () => {
    const { set, changes } = virtualFixture([2]);
    const beats = changes.find((change) => change.layer === 'beats')!;
    beats.dependency_ids = [crypto.randomUUID()];
    const buildOutline = vi.fn();
    const writeOutline = vi.fn();
    await expect(applyPacingRevisionSet({
      set,
      existingPages: [{ pageId: 'physical-1', pageNumber: 1 }],
      currentFingerprints: fingerprints(changes),
      lockedTargetKeys: new Set(),
      writers: {
        buildOutline,
        writeOutline,
        createPage: vi.fn(),
        deletePages: vi.fn(),
        writeBeats: vi.fn(),
        writeDialogue: vi.fn(),
      },
    })).rejects.toThrow(/unresolved dependency/i);
    expect(buildOutline).not.toHaveBeenCalled();
    expect(writeOutline).not.toHaveBeenCalled();
  });

  it('rejects a physical page ID and number mismatch before mutation', async () => {
    const { set, outline, beats, dialogue } = fixture();
    beats.page_number = 2;
    const writeOutline = vi.fn();
    await expect(applyPacingRevisionSet({
      set,
      existingPages: [{ pageId: beats.page_id!, pageNumber: 1 }],
      currentFingerprints: fingerprints([outline, beats, dialogue]),
      lockedTargetKeys: new Set(),
      writers: {
        buildOutline: async () => builtOutline(1),
        writeOutline,
        createPage: vi.fn(),
        deletePages: vi.fn(),
        writeBeats: vi.fn(),
        writeDialogue: vi.fn(),
      },
    })).rejects.toThrow(/physical.*identity/i);
    expect(writeOutline).not.toHaveBeenCalled();
  });

  it('rejects a non-sequential built outline before mutation', async () => {
    const { set, changes } = virtualFixture([2]);
    const writeOutline = vi.fn();
    await expect(applyPacingRevisionSet({
      set,
      existingPages: [{ pageId: 'physical-1', pageNumber: 1 }],
      currentFingerprints: fingerprints(changes),
      lockedTargetKeys: new Set(),
      writers: {
        buildOutline: async () => ({
          page_beats: [{ page_target: 1 }, { page_target: 3 }],
        }),
        writeOutline,
        createPage: vi.fn(),
        deletePages: vi.fn(),
        writeBeats: vi.fn(),
        writeDialogue: vi.fn(),
      },
    })).rejects.toThrow(/sequential/i);
    expect(writeOutline).not.toHaveBeenCalled();
  });

  it('deletes only exact created rows and restores the outline after a content failure', async () => {
    const { set, changes } = virtualFixture();
    const calls: string[] = [];
    await expect(applyPacingRevisionSet({
      set,
      existingPages: [{ pageId: 'physical-1', pageNumber: 1 }],
      currentFingerprints: fingerprints(changes),
      lockedTargetKeys: new Set(),
      writers: {
        buildOutline: async () => builtOutline(3),
        writeOutline: async (value) => { calls.push(value === set.source_outline_json ? 'restore-outline' : 'outline'); },
        createPage: async (pageNumber) => ({ pageId: `created-${pageNumber}`, pageNumber }),
        deletePages: async (pageIds) => { calls.push(`delete:${pageIds.join(',')}`); },
        writeBeats: async (_pageId, value) => {
          if (JSON.stringify(value).includes('Action 3')) throw new Error('Beats write failed');
        },
        writeDialogue: vi.fn(),
      },
    })).rejects.toThrow('Beats write failed');
    expect(calls).toEqual([
      'outline',
      'delete:created-2,created-3',
      'restore-outline',
    ]);
  });

  it('deletes a partially created prefix when page creation fails', async () => {
    const { set, changes } = virtualFixture();
    const deletePages = vi.fn();
    await expect(applyPacingRevisionSet({
      set,
      existingPages: [{ pageId: 'physical-1', pageNumber: 1 }],
      currentFingerprints: fingerprints(changes),
      lockedTargetKeys: new Set(),
      writers: {
        buildOutline: async () => builtOutline(3),
        writeOutline: vi.fn(),
        createPage: async (pageNumber) => {
          if (pageNumber === 3) throw new Error('Create failed');
          return { pageId: 'created-2', pageNumber };
        },
        deletePages,
        writeBeats: vi.fn(),
        writeDialogue: vi.fn(),
      },
    })).rejects.toThrow('Create failed');
    expect(deletePages).toHaveBeenCalledWith(['created-2']);
  });

  it('surfaces compensation failure without losing the original apply error', async () => {
    const { set, changes } = virtualFixture([2]);
    await expect(applyPacingRevisionSet({
      set,
      existingPages: [{ pageId: 'physical-1', pageNumber: 1 }],
      currentFingerprints: fingerprints(changes),
      lockedTargetKeys: new Set(),
      writers: {
        buildOutline: async () => builtOutline(2),
        writeOutline: vi.fn(),
        createPage: async () => ({ pageId: 'created-2', pageNumber: 2 }),
        deletePages: async () => { throw new Error('Delete cleanup failed'); },
        writeBeats: async () => { throw new Error('Beats write failed'); },
        writeDialogue: vi.fn(),
      },
    })).rejects.toThrow(/Beats write failed.*Recovery also failed.*Delete cleanup failed/i);
  });

  it('applies outline, beats, then dialogue and returns an undo snapshot', async () => {
    const { set, outline, beats, dialogue } = fixture();
    const calls: string[] = [];
    const result = await applyPacingRevisionSet({
      set,
      existingPages: [{ pageId: beats.page_id!, pageNumber: 1 }],
      currentFingerprints: new Map([
        [pacingRevisionFingerprintKey(outline), outline.source_fingerprint],
        [pacingRevisionFingerprintKey(beats), beats.source_fingerprint],
        [pacingRevisionFingerprintKey(dialogue), dialogue.source_fingerprint],
      ]),
      lockedTargetKeys: new Set(),
      writers: {
        buildOutline: async () => 'built outline',
        writeOutline: async () => { calls.push('outline'); },
        createPage: vi.fn(),
        deletePages: vi.fn(),
        writeBeats: async () => { calls.push('beats'); },
        writeDialogue: async () => { calls.push('dialogue'); },
      },
    });
    expect(calls).toEqual(['outline', 'beats', 'dialogue']);
    expect(result.snapshot.dialogue[0]?.value).toBe('OLD');
  });

  it('compensates completed writes in reverse after a dialogue failure', async () => {
    const { set, outline, beats, dialogue } = fixture();
    const calls: string[] = [];
    await expect(applyPacingRevisionSet({
      set,
      existingPages: [{ pageId: beats.page_id!, pageNumber: 1 }],
      currentFingerprints: new Map([
        [pacingRevisionFingerprintKey(outline), outline.source_fingerprint],
        [pacingRevisionFingerprintKey(beats), beats.source_fingerprint],
        [pacingRevisionFingerprintKey(dialogue), dialogue.source_fingerprint],
      ]),
      lockedTargetKeys: new Set(),
      writers: {
        buildOutline: async () => 'built',
        writeOutline: async (value) => { calls.push(`outline:${value}`); },
        createPage: vi.fn(),
        deletePages: vi.fn(),
        writeBeats: async (_id, value) => { calls.push(`beats:${JSON.stringify(value)}`); },
        writeDialogue: vi.fn(async () => { throw new Error('Dialogue write failed'); }),
      },
    })).rejects.toThrow('Dialogue write failed');
    expect(calls.at(-2)).toContain('beats:');
    expect(calls.at(-1)).toBe('outline:old outline');
  });

  it('blocks stale and locked targets before the first write', async () => {
    const { set, outline, beats, dialogue } = fixture();
    const writeOutline = vi.fn();
    await expect(applyPacingRevisionSet({
      set,
      existingPages: [{ pageId: beats.page_id!, pageNumber: 1 }],
      currentFingerprints: new Map([
        [pacingRevisionFingerprintKey(outline), 'changed'],
        [pacingRevisionFingerprintKey(beats), beats.source_fingerprint],
        [pacingRevisionFingerprintKey(dialogue), dialogue.source_fingerprint],
      ]),
      lockedTargetKeys: new Set(),
      writers: {
        buildOutline: async () => 'built',
        writeOutline,
        createPage: vi.fn(),
        deletePages: vi.fn(),
        writeBeats: vi.fn(),
        writeDialogue: vi.fn(),
      },
    })).rejects.toThrow(/stale/i);
    expect(writeOutline).not.toHaveBeenCalled();
  });

  it('restores every layer from the captured snapshot', async () => {
    const writeOutline = vi.fn();
    const writeBeats = vi.fn();
    const writeDialogue = vi.fn();
    await undoPacingRevisionApply({
      outline: 'old',
      beats: [{ pageId: 'page', value: { panels: [] } }],
      dialogue: [{ pageId: 'page', value: 'OLD' }],
      createdPages: [{ pageId: 'created', pageNumber: 2 }],
      sourcePageCount: 1,
      targetPageCount: 2,
      appliedIds: [],
    }, {
      writeOutline,
      writeBeats,
      writeDialogue,
      deletePages: vi.fn(),
    });
    expect(writeOutline).toHaveBeenCalledWith('old');
    expect(writeBeats).toHaveBeenCalledWith('page', { panels: [] });
    expect(writeDialogue).toHaveBeenCalledWith('page', 'OLD');
  });

  it('does not hide an undo delete failure', async () => {
    await expect(undoPacingRevisionApply({
      outline: 'old',
      beats: [],
      dialogue: [],
      createdPages: [{ pageId: 'created', pageNumber: 2 }],
      sourcePageCount: 1,
      targetPageCount: 2,
      appliedIds: [],
    }, {
      writeOutline: vi.fn(),
      writeBeats: vi.fn(),
      writeDialogue: vi.fn(),
      deletePages: async () => { throw new Error('Delete failed'); },
    })).rejects.toThrow('Delete failed');
  });

  it('keeps existing-only legacy snapshots undoable without a delete call', async () => {
    const deletePages = vi.fn();
    await undoPacingRevisionApply({
      outline: 'old',
      beats: [],
      dialogue: [],
    } as unknown as PacingRevisionApplySnapshot, {
      writeOutline: vi.fn(),
      writeBeats: vi.fn(),
      writeDialogue: vi.fn(),
      deletePages,
    });
    expect(deletePages).not.toHaveBeenCalled();
  });

  it('builds an official outline from approved operations only and preserves metadata', async () => {
    const text = 'The door stays closed.';
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`1\u0000${text}`));
    const hex = [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
    const itemId = crypto.randomUUID();
    const approved = {
      id: crypto.randomUUID(),
      item_id: itemId,
      layer: 'outline' as const,
      target_key: 'outline:edit-opening',
      current_value: [{ summary: text }],
      ai_proposal: {
        operation: {
          operation_id: 'edit-opening',
          operation: 'edit',
          source_beat_ids: [`beat_${hex.slice(0, 24)}`],
          summary: 'The door bursts open.',
        },
        proposed_beat: { summary: 'The door bursts open.' },
      },
      edited_candidate: null,
      decision: 'approved' as const,
      dependency_ids: [],
      reason: 'Open faster.',
      source_fingerprint: 'source',
      generation_status: 'ready' as const,
    };
    const result = await buildPacingRevisionOutlineFromApprovedChanges({
      sourceOutline: {
        title: 'Issue One',
        premise: 'A sealed room.',
        acts: [{ name: 'Act I' }],
        notes: 'Keep the reveal.',
        page_beats: [{ page_target: 1, summary: text }],
      },
      approvedOutlineChanges: [approved],
      revisionSetId: '10000000-0000-4000-8000-000000000001',
    });
    expect(result).toMatchObject({
      title: 'Issue One',
      premise: 'A sealed room.',
      acts: [{ name: 'Act I' }],
      notes: 'Keep the reveal.',
      page_beats: [{ page_target: 1, summary: 'The door bursts open.' }],
    });
  });

  it('preserves unrelated legacy beats instead of blocking an approved edit', async () => {
    const editableSummary = 'The warning arrives.';
    const digest = await crypto.subtle.digest(
      'SHA-256',
      new TextEncoder().encode(`2\u0000${editableSummary}`),
    );
    const hex = [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
    const itemId = crypto.randomUUID();
    const approved = {
      id: crypto.randomUUID(),
      item_id: itemId,
      layer: 'outline' as const,
      target_key: 'outline:edit-warning',
      current_value: [{ summary: editableSummary }],
      ai_proposal: {
        operation: {
          operation_id: 'edit-warning',
          operation: 'edit',
          source_beat_ids: [`beat_${hex.slice(0, 24)}`],
          summary: 'The warning names the danger.',
        },
        proposed_beat: { summary: 'The warning names the danger.' },
      },
      edited_candidate: null,
      decision: 'approved' as const,
      dependency_ids: [],
      reason: 'Clarify the warning.',
      source_fingerprint: 'source',
      generation_status: 'ready' as const,
    };

    const result = await buildPacingRevisionOutlineFromApprovedChanges({
      sourceOutline: {
        page_beats: [
          { page: 1, text: 'Legacy beat without a summary field.' },
          { summary: editableSummary },
        ],
      },
      approvedOutlineChanges: [approved],
      revisionSetId: '10000000-0000-4000-8000-000000000001',
    });

    expect(result.page_beats).toEqual([
      { page: 1, text: 'Legacy beat without a summary field.', page_target: 1 },
      { summary: 'The warning names the danger.', page_target: 2 },
    ]);
  });
});
