import { describe, expect, it, vi } from 'vitest';
import type { PacingRevisionChange, PacingRevisionSet } from '@/shared/writer/pacingRevisionSchemas';
import {
  applyPacingRevisionSet,
  buildPacingRevisionCompletionExpectation,
  loadPacingRevisionApplyAuthority,
  pacingRevisionApplySnapshotFromUnknown,
  pacingRevisionFingerprintKey,
  resolvePacingRevisionCompletionFailure,
  resolvePacingRevisionReopenFailure,
  validatePacingRevisionUndoAuthority,
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

function lifecycle() {
  return {
    beginApply: vi.fn(),
    persistSnapshot: vi.fn(),
  };
}

describe('applyPacingRevisionSet', () => {
  it('parses persisted cleanup plans and rejects incomplete crash snapshots', () => {
    const valid = {
      outline: {},
      plannedOutlineId: crypto.randomUUID(),
      beats: [],
      dialogue: [],
      createdPages: [{ pageId: crypto.randomUUID(), pageNumber: 2 }],
      sourcePageCount: 1,
      targetPageCount: 2,
      appliedIds: [crypto.randomUUID()],
    };
    expect(pacingRevisionApplySnapshotFromUnknown(valid)).toEqual(valid);
    expect(pacingRevisionApplySnapshotFromUnknown({
      ...valid,
      createdPages: [{ pageNumber: 2 }],
    })).toBeNull();
  });

  it.each([
    ['non-UUID planned outline', (value: Record<string, unknown>) => ({ ...value, plannedOutlineId: 'outline-2' })],
    ['non-UUID planned page', (value: Record<string, unknown>) => ({
      ...value,
      createdPages: [{ pageId: 'page-2', pageNumber: 2 }],
    })],
    ['duplicate planned page IDs', (value: Record<string, unknown>) => {
      const duplicateId = crypto.randomUUID();
      return {
        ...value,
        targetPageCount: 3,
        createdPages: [
          { pageId: duplicateId, pageNumber: 2 },
          { pageId: duplicateId, pageNumber: 3 },
        ],
      };
    }],
    ['duplicate planned page numbers', (value: Record<string, unknown>) => ({
      ...value,
      targetPageCount: 3,
      createdPages: [
        { pageId: crypto.randomUUID(), pageNumber: 2 },
        { pageId: crypto.randomUUID(), pageNumber: 2 },
      ],
    })],
    ['out-of-range target', (value: Record<string, unknown>) => ({ ...value, targetPageCount: 201 })],
    ['target below source', (value: Record<string, unknown>) => ({ ...value, targetPageCount: 0 })],
    ['noncontiguous planned range', (value: Record<string, unknown>) => ({
      ...value,
      createdPages: [{ pageId: crypto.randomUUID(), pageNumber: 3 }],
    })],
    ['missing planned outline for expansion', (value: Record<string, unknown>) => ({
      ...value,
      plannedOutlineId: null,
    })],
    ['inconsistent applied outline identity', (value: Record<string, unknown>) => ({
      ...value,
      outlineApplied: true,
      appliedOutlineId: crypto.randomUUID(),
    })],
    ['duplicate applied IDs', (value: Record<string, unknown>) => {
      const duplicateId = crypto.randomUUID();
      return { ...value, appliedIds: [duplicateId, duplicateId] };
    }],
    ['non-UUID prior-content page', (value: Record<string, unknown>) => ({
      ...value,
      beats: [{ pageId: 'page-1', value: null }],
    })],
  ])('fails closed for a corrupt snapshot with %s', (_label, tamper) => {
    const valid = {
      outline: {},
      plannedOutlineId: crypto.randomUUID(),
      beats: [],
      dialogue: [],
      createdPages: [{ pageId: crypto.randomUUID(), pageNumber: 2 }],
      sourcePageCount: 1,
      targetPageCount: 2,
      appliedIds: [crypto.randomUUID()],
    };
    expect(pacingRevisionApplySnapshotFromUnknown(tamper(valid))).toBeNull();
  });

  it('treats a lost completion response as committed only after fresh verification', async () => {
    const compensate = vi.fn();
    const verifyCommitted = vi.fn().mockResolvedValue({ ok: true });

    await expect(resolvePacingRevisionCompletionFailure({
      completionError: 'network response lost',
      loadPersistedStatus: async () => 'applied',
      verifyCommitted,
      compensate,
    })).resolves.toBe('committed');

    expect(verifyCommitted).toHaveBeenCalledOnce();
    expect(compensate).not.toHaveBeenCalled();
  });

  it('does not compensate when completion state cannot be read', async () => {
    const compensate = vi.fn();
    await expect(resolvePacingRevisionCompletionFailure({
      completionError: 'network response lost',
      loadPersistedStatus: async () => { throw new Error('read unavailable'); },
      verifyCommitted: vi.fn(),
      compensate,
    })).rejects.toThrow(/unreadable.*recovery required/i);
    expect(compensate).not.toHaveBeenCalled();
  });

  it('compensates only when completion is confirmed still applying', async () => {
    const compensate = vi.fn().mockResolvedValue(undefined);
    await expect(resolvePacingRevisionCompletionFailure({
      completionError: 'completion failed',
      loadPersistedStatus: async () => 'applying',
      verifyCommitted: vi.fn(),
      compensate,
    })).rejects.toThrow('completion failed');
    expect(compensate).toHaveBeenCalledOnce();
  });

  it('does not compensate an unknown completion state or an unverified commit', async () => {
    const unknownCompensate = vi.fn();
    await expect(resolvePacingRevisionCompletionFailure({
      completionError: 'completion failed',
      loadPersistedStatus: async () => 'ready',
      verifyCommitted: vi.fn(),
      compensate: unknownCompensate,
    })).rejects.toThrow(/recovery required.*no cleanup/i);
    expect(unknownCompensate).not.toHaveBeenCalled();

    const committedCompensate = vi.fn();
    await expect(resolvePacingRevisionCompletionFailure({
      completionError: 'completion failed',
      loadPersistedStatus: async () => 'applied',
      verifyCommitted: async () => ({ ok: false, error: 'content mismatch' }),
      compensate: committedCompensate,
    })).rejects.toThrow(/committed.*verification failed.*recovery required/i);
    expect(committedCompensate).not.toHaveBeenCalled();
  });

  it('binds Undo to the fresh applied set, issue, pages, changes, and latest outline', () => {
    const { set } = fixture();
    const outlineId = crypto.randomUUID();
    const existingPageId = set.items[0]!.changes.find((change) => change.layer === 'beats')!.page_id!;
    set.status = 'applied';
    for (const change of set.items[0]!.changes) change.generation_status = 'applied';
    set.apply_snapshot = {
      outline: set.source_outline_json,
      plannedOutlineId: outlineId,
      outlineApplied: true,
      appliedOutlineId: outlineId,
      beats: [{ pageId: existingPageId, value: { panels: [] } }],
      dialogue: [{ pageId: existingPageId, value: 'OLD' }],
      createdPages: [],
      sourcePageCount: 1,
      targetPageCount: 1,
      appliedIds: set.items[0]!.changes.map((change) => change.id),
    };

    expect(validatePacingRevisionUndoAuthority({
      set,
      issueId: set.issue_id,
      freshPages: [{
        id: existingPageId,
        page_number: 1,
        beats_json: { panels: [{ action: 'new' }] },
        script_text: 'NEW',
      }],
      freshOutlines: [{ id: outlineId }],
    })).toEqual({ ok: true, snapshot: set.apply_snapshot });

    expect(validatePacingRevisionUndoAuthority({
      set: { ...set, apply_snapshot: { ...set.apply_snapshot as object, appliedIds: ['tampered'] } },
      issueId: set.issue_id,
      freshPages: [{
        id: existingPageId,
        page_number: 1,
        beats_json: { panels: [{ action: 'new' }] },
        script_text: 'NEW',
      }],
      freshOutlines: [{ id: outlineId }],
    })).toEqual({ ok: false, error: expect.stringMatching(/snapshot is invalid/i) });
  });

  it('blocks Undo before writes when physical or created applied content was edited', () => {
    const { set, changes } = virtualFixture([2]);
    const outlineId = crypto.randomUUID();
    const createdPageId = crypto.randomUUID();
    set.status = 'applied';
    for (const change of changes) change.generation_status = 'applied';
    set.apply_snapshot = {
      outline: set.source_outline_json,
      plannedOutlineId: outlineId,
      outlineApplied: true,
      appliedOutlineId: outlineId,
      beats: [],
      dialogue: [],
      createdPages: [{ pageId: createdPageId, pageNumber: 2 }],
      sourcePageCount: 1,
      targetPageCount: 2,
      appliedIds: changes.map((change) => change.id),
    };
    const basePages = [
      { id: crypto.randomUUID(), page_number: 1, beats_json: null, script_text: null },
      {
        id: createdPageId,
        page_number: 2,
        beats_json: { panels: [{ action: 'Action 2' }] },
        script_text: 'DIALOGUE 2',
      },
    ];
    expect(validatePacingRevisionUndoAuthority({
      set,
      issueId: set.issue_id,
      freshPages: [{ ...basePages[0]! }, { ...basePages[1]!, script_text: 'POST-APPLY EDIT' }],
      freshOutlines: [{ id: outlineId }],
    })).toEqual({ ok: false, error: expect.stringMatching(/changed after Apply/i) });

    const physical = fixture();
    const physicalOutlineId = crypto.randomUUID();
    const physicalPageId = physical.beats.page_id!;
    physical.set.status = 'applied';
    for (const change of physical.set.items[0]!.changes) change.generation_status = 'applied';
    physical.set.apply_snapshot = {
      outline: physical.set.source_outline_json,
      plannedOutlineId: physicalOutlineId,
      outlineApplied: true,
      appliedOutlineId: physicalOutlineId,
      beats: [{ pageId: physicalPageId, value: physical.beats.current_value }],
      dialogue: [{ pageId: physicalPageId, value: physical.dialogue.current_value as string }],
      createdPages: [],
      sourcePageCount: 1,
      targetPageCount: 1,
      appliedIds: physical.set.items[0]!.changes.map((change) => change.id),
    };
    expect(validatePacingRevisionUndoAuthority({
      set: physical.set,
      issueId: physical.set.issue_id,
      freshPages: [{
        id: physicalPageId,
        page_number: 1,
        beats_json: { panels: [{ action: 'POST-APPLY EDIT' }] },
        script_text: 'NEW',
      }],
      freshOutlines: [{ id: physicalOutlineId }],
    })).toEqual({ ok: false, error: expect.stringMatching(/changed after Apply/i) });
  });

  it('resolves reopen ambiguity without additional destructive writes', async () => {
    const markRecoveryRequired = vi.fn().mockResolvedValue({ ok: true });
    await expect(resolvePacingRevisionReopenFailure({
      reopenError: 'response lost',
      loadPersistedStatus: async () => 'ready',
      markRecoveryRequired,
    })).resolves.toBe('committed');
    expect(markRecoveryRequired).not.toHaveBeenCalled();

    await expect(resolvePacingRevisionReopenFailure({
      reopenError: 'reopen rejected',
      loadPersistedStatus: async () => 'applied',
      markRecoveryRequired,
    })).rejects.toThrow(/remains applied.*recovery required/i);
    expect(markRecoveryRequired).toHaveBeenCalledOnce();

    markRecoveryRequired.mockClear();
    await expect(resolvePacingRevisionReopenFailure({
      reopenError: 'read failed',
      loadPersistedStatus: async () => { throw new Error('offline'); },
      markRecoveryRequired,
    })).rejects.toThrow(/unreadable.*no further mutation/i);
    expect(markRecoveryRequired).not.toHaveBeenCalled();
  });

  it('loads authoritative outline and pages instead of accepting cached state', async () => {
    const freshSet = { id: 'fresh-set' };
    const freshIssue = { id: 'fresh-issue', notes: { writer_locks: {} } };
    const freshOutline = { id: 'fresh-outline', outline_json: { page_beats: [] } };
    const freshPages = [{ id: 'fresh-page', page_number: 1 }];
    const loadSet = vi.fn().mockResolvedValue(freshSet);
    const loadIssue = vi.fn().mockResolvedValue(freshIssue);
    const loadOutlines = vi.fn().mockResolvedValue([freshOutline]);
    const loadPages = vi.fn().mockResolvedValue(freshPages);

    await expect(loadPacingRevisionApplyAuthority({
      loadSet,
      loadIssue,
      loadOutlines,
      loadPages,
    })).resolves.toEqual({
      set: freshSet,
      issue: freshIssue,
      latestOutline: freshOutline,
      pages: freshPages,
    });
    expect(loadSet).toHaveBeenCalledOnce();
    expect(loadIssue).toHaveBeenCalledOnce();
    expect(loadOutlines).toHaveBeenCalledOnce();
    expect(loadPages).toHaveBeenCalledOnce();
  });

  it('creates virtual pages in order, maps returned IDs, and snapshots exact created rows', async () => {
    const { set, changes } = virtualFixture();
    const calls: string[] = [];
    let plannedSnapshot: PacingRevisionApplySnapshot | null = null;
    const result = await applyPacingRevisionSet({
      set,
      existingPages: [{ pageId: 'physical-1', pageNumber: 1 }],
      currentFingerprints: fingerprints(changes),
      lockedTargetKeys: new Set(),
      writers: {
        beginApply: async (snapshot) => {
          plannedSnapshot = snapshot;
          calls.push('begin');
          expect(snapshot.plannedOutlineId).toMatch(/^[0-9a-f-]{36}$/);
          expect(snapshot.createdPages.map((page) => page.pageNumber)).toEqual([2, 3]);
        },
        persistSnapshot: async (snapshot) => {
          calls.push(`snapshot:${snapshot.createdPages.map((page) => page.pageNumber).join(',')}`);
        },
        buildOutline: async () => builtOutline(3),
        writeOutline: async (_outline, outlineId) => {
          calls.push('outline');
          expect(outlineId).toBe(plannedSnapshot?.plannedOutlineId);
        },
        createPage: async (pageNumber, pageId) => {
          calls.push(`create:${pageNumber}`);
          expect(pageId).toBe(plannedSnapshot?.createdPages
            .find((page) => page.pageNumber === pageNumber)?.pageId);
          return { pageId, pageNumber };
        },
        deletePages: async () => { calls.push('delete'); },
        writeBeats: async (pageId) => { calls.push(`beats:${pageId}`); },
        writeDialogue: async (pageId) => { calls.push(`dialogue:${pageId}`); },
      },
    });
    const createdIds = result.snapshot.createdPages.map((page) => page.pageId);
    expect(calls).toEqual([
      'begin',
      'outline',
      'snapshot:2,3',
      'create:2',
      'create:3',
      `beats:${createdIds[0]}`,
      `beats:${createdIds[1]}`,
      `dialogue:${createdIds[0]}`,
      `dialogue:${createdIds[1]}`,
    ]);
    expect(result.snapshot).toMatchObject({
      sourcePageCount: 1,
      targetPageCount: 3,
      createdPages: [
        { pageId: expect.stringMatching(/^[0-9a-f-]{36}$/), pageNumber: 2 },
        { pageId: expect.stringMatching(/^[0-9a-f-]{36}$/), pageNumber: 3 },
      ],
      beats: [],
      dialogue: [],
    });
  });

  it('builds exact database completion expectations from approved candidates', () => {
    const { changes } = virtualFixture([2]);
    const pageId = crypto.randomUUID();
    expect(buildPacingRevisionCompletionExpectation({
      issueId: crypto.randomUUID(),
      outlineId: crypto.randomUUID(),
      outlineJson: builtOutline(2),
      targetPageCount: 2,
      createdPages: [{ pageId, pageNumber: 2 }],
      approvedChanges: changes,
    }).pages).toEqual([{
      id: pageId,
      page_number: 2,
      beats_json: { panels: [{ action: 'Action 2' }] },
      script_text: 'DIALOGUE 2',
    }]);
  });

  it('rejects gaps in existing physical pages before beginning Apply', async () => {
    const { set, changes } = virtualFixture([4]);
    const beginApply = vi.fn();
    const writeOutline = vi.fn();
    await expect(applyPacingRevisionSet({
      set,
      existingPages: [
        { pageId: 'physical-1', pageNumber: 1 },
        { pageId: 'physical-3', pageNumber: 3 },
      ],
      currentFingerprints: fingerprints(changes),
      lockedTargetKeys: new Set(),
      writers: {
        beginApply,
        persistSnapshot: vi.fn(),
        buildOutline: async () => builtOutline(4),
        writeOutline,
        createPage: vi.fn(),
        deletePages: vi.fn(),
        writeBeats: vi.fn(),
        writeDialogue: vi.fn(),
      },
    })).rejects.toThrow(/contiguous.*1.*3/i);
    expect(beginApply).not.toHaveBeenCalled();
    expect(writeOutline).not.toHaveBeenCalled();
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
        ...lifecycle(),
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
    let plannedIds: string[] = [];
    await expect(applyPacingRevisionSet({
      set,
      existingPages: [{ pageId: 'physical-1', pageNumber: 1 }],
      currentFingerprints: fingerprints(changes),
      lockedTargetKeys: new Set(),
      writers: {
        ...lifecycle(),
        beginApply: async (snapshot) => { plannedIds = snapshot.createdPages.map((page) => page.pageId); },
        buildOutline: async () => builtOutline(3),
        writeOutline: async (value) => { calls.push(value === set.source_outline_json ? 'restore-outline' : 'outline'); },
        createPage: async (pageNumber, pageId) => ({ pageId, pageNumber }),
        deletePages: async (pageIds) => { calls.push(`delete:${pageIds.join(',')}`); },
        writeBeats: async (_pageId, value) => {
          if (JSON.stringify(value).includes('Action 3')) throw new Error('Beats write failed');
        },
        writeDialogue: vi.fn(),
      },
    })).rejects.toThrow('Beats write failed');
    expect(calls).toEqual([
      'outline',
      `delete:${plannedIds.join(',')}`,
      'restore-outline',
    ]);
  });

  it('deletes a partially created prefix when page creation fails', async () => {
    const { set, changes } = virtualFixture();
    const deletePages = vi.fn();
    let plannedIds: string[] = [];
    await expect(applyPacingRevisionSet({
      set,
      existingPages: [{ pageId: 'physical-1', pageNumber: 1 }],
      currentFingerprints: fingerprints(changes),
      lockedTargetKeys: new Set(),
      writers: {
        ...lifecycle(),
        beginApply: async (snapshot) => { plannedIds = snapshot.createdPages.map((page) => page.pageId); },
        buildOutline: async () => builtOutline(3),
        writeOutline: vi.fn(),
        createPage: async (pageNumber, pageId) => {
          if (pageNumber === 3) throw new Error('Create failed');
          return { pageId, pageNumber };
        },
        deletePages,
        writeBeats: vi.fn(),
        writeDialogue: vi.fn(),
      },
    })).rejects.toThrow('Create failed');
    expect(deletePages).toHaveBeenCalledWith(plannedIds);
  });

  it('persists every cleanup identity before the first insert can fail', async () => {
    const { set, changes } = virtualFixture();
    let durableSnapshot: PacingRevisionApplySnapshot | null = null;
    const deletePages = vi.fn();
    await expect(applyPacingRevisionSet({
      set,
      existingPages: [{ pageId: 'physical-1', pageNumber: 1 }],
      currentFingerprints: fingerprints(changes),
      lockedTargetKeys: new Set(),
      writers: {
        ...lifecycle(),
        beginApply: async (snapshot) => { durableSnapshot = snapshot; },
        buildOutline: async () => builtOutline(3),
        writeOutline: vi.fn(),
        createPage: async () => { throw new Error('Connection ended before insert response'); },
        deletePages,
        writeBeats: vi.fn(),
        writeDialogue: vi.fn(),
      },
    })).rejects.toThrow(/connection ended/i);

    expect(durableSnapshot).not.toBeNull();
    expect(deletePages).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.stringMatching(/^[0-9a-f-]{36}$/),
        expect.stringMatching(/^[0-9a-f-]{36}$/),
      ]),
    );
    expect(durableSnapshot).toMatchObject({
      plannedOutlineId: expect.stringMatching(/^[0-9a-f-]{36}$/),
      createdPages: [
        { pageNumber: 2, pageId: expect.any(String) },
        { pageNumber: 3, pageId: expect.any(String) },
      ],
    });
  });

  it('surfaces compensation failure without losing the original apply error', async () => {
    const { set, changes } = virtualFixture([2]);
    await expect(applyPacingRevisionSet({
      set,
      existingPages: [{ pageId: 'physical-1', pageNumber: 1 }],
      currentFingerprints: fingerprints(changes),
      lockedTargetKeys: new Set(),
      writers: {
        ...lifecycle(),
        buildOutline: async () => builtOutline(2),
        writeOutline: vi.fn(),
        createPage: async (_pageNumber, pageId) => ({ pageId, pageNumber: 2 }),
        deletePages: async () => { throw new Error('Delete cleanup failed'); },
        writeBeats: async () => { throw new Error('Beats write failed'); },
        writeDialogue: vi.fn(),
      },
    })).rejects.toThrow(/Beats write failed.*Recovery also failed.*Delete cleanup failed/i);
  });

  it('attempts exact created-page deletion when an earlier existing restore fails', async () => {
    const { set, changes } = virtualFixture([2]);
    const existingBeats = fixture().beats;
    existingBeats.item_id = changes[0]!.item_id;
    existingBeats.dependency_ids = [changes[0]!.id];
    set.items[0]!.changes = [changes[0]!, existingBeats, ...changes.slice(1)];
    const deletePages = vi.fn();
    let plannedIds: string[] = [];
    await expect(applyPacingRevisionSet({
      set,
      existingPages: [{ pageId: existingBeats.page_id!, pageNumber: 1 }],
      currentFingerprints: fingerprints([...changes, existingBeats]),
      lockedTargetKeys: new Set(),
      writers: {
        ...lifecycle(),
        beginApply: async (snapshot) => { plannedIds = snapshot.createdPages.map((page) => page.pageId); },
        buildOutline: async () => builtOutline(2),
        writeOutline: vi.fn(),
        createPage: async (_pageNumber, pageId) => ({ pageId, pageNumber: 2 }),
        deletePages,
        writeBeats: async (pageId, value) => {
          if (pageId === existingBeats.page_id && value === existingBeats.current_value) {
            throw new Error('Existing Beats restore failed');
          }
          if (pageId !== existingBeats.page_id) throw new Error('Created Beats write failed');
        },
        writeDialogue: vi.fn(),
      },
    })).rejects.toThrow(/Created Beats write failed.*Existing Beats restore failed/i);
    expect(deletePages).toHaveBeenCalledWith(plannedIds);
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
        ...lifecycle(),
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
        ...lifecycle(),
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
      plannedOutlineId: null,
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
    expect(writeOutline).toHaveBeenCalledWith('old', null);
    expect(writeBeats).toHaveBeenCalledWith('page', { panels: [] });
    expect(writeDialogue).toHaveBeenCalledWith('page', 'OLD');
  });

  it('does not hide an undo delete failure', async () => {
    await expect(undoPacingRevisionApply({
      outline: 'old',
      plannedOutlineId: null,
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

  it('attempts every Undo recovery step after an earlier restore failure', async () => {
    const calls: string[] = [];
    await expect(undoPacingRevisionApply({
      outline: 'old',
      plannedOutlineId: null,
      beats: [{ pageId: 'existing', value: { panels: [] } }],
      dialogue: [{ pageId: 'existing', value: 'OLD' }],
      createdPages: [{ pageId: 'created', pageNumber: 2 }],
      sourcePageCount: 1,
      targetPageCount: 2,
      appliedIds: [],
    }, {
      writeDialogue: async () => {
        calls.push('dialogue');
        throw new Error('Dialogue restore failed');
      },
      writeBeats: async () => { calls.push('beats'); },
      deletePages: async () => { calls.push('delete'); },
      writeOutline: async () => { calls.push('outline'); },
    })).rejects.toThrow(/Dialogue restore failed/i);
    expect(calls).toEqual(['dialogue', 'beats', 'delete', 'outline']);
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
