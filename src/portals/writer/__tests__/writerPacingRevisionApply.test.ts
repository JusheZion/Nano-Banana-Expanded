import { describe, expect, it, vi } from 'vitest';
import type { PacingRevisionChange, PacingRevisionSet } from '@/shared/writer/pacingRevisionSchemas';
import {
  applyPacingRevisionSet,
  pacingRevisionFingerprintKey,
  undoPacingRevisionApply,
} from '../writerPacingRevisionApply';

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

describe('applyPacingRevisionSet', () => {
  it('applies outline, beats, then dialogue and returns an undo snapshot', async () => {
    const { set, outline, beats, dialogue } = fixture();
    const calls: string[] = [];
    const result = await applyPacingRevisionSet({
      set,
      currentFingerprints: new Map([
        [pacingRevisionFingerprintKey(outline), outline.source_fingerprint],
        [pacingRevisionFingerprintKey(beats), beats.source_fingerprint],
        [pacingRevisionFingerprintKey(dialogue), dialogue.source_fingerprint],
      ]),
      lockedTargetKeys: new Set(),
      writers: {
        buildOutline: async () => 'built outline',
        writeOutline: async () => { calls.push('outline'); },
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
      currentFingerprints: new Map([
        [pacingRevisionFingerprintKey(outline), outline.source_fingerprint],
        [pacingRevisionFingerprintKey(beats), beats.source_fingerprint],
        [pacingRevisionFingerprintKey(dialogue), dialogue.source_fingerprint],
      ]),
      lockedTargetKeys: new Set(),
      writers: {
        buildOutline: async () => 'built',
        writeOutline: async (value) => { calls.push(`outline:${value}`); },
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
      currentFingerprints: new Map([
        [pacingRevisionFingerprintKey(outline), 'changed'],
        [pacingRevisionFingerprintKey(beats), beats.source_fingerprint],
        [pacingRevisionFingerprintKey(dialogue), dialogue.source_fingerprint],
      ]),
      lockedTargetKeys: new Set(),
      writers: {
        buildOutline: async () => 'built',
        writeOutline,
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
    }, { writeOutline, writeBeats, writeDialogue });
    expect(writeOutline).toHaveBeenCalledWith('old');
    expect(writeBeats).toHaveBeenCalledWith('page', { panels: [] });
    expect(writeDialogue).toHaveBeenCalledWith('page', 'OLD');
  });
});
