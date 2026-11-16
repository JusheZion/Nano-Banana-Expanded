import { describe, expect, it } from 'vitest';
import type { PacingRevisionChange } from '@/shared/writer/pacingRevisionSchemas';
import { buildPacingRevisionOutlineFromApprovedChanges } from '../writerPacingRevisionOutline';

async function sourceBeatId(index: number, summary: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(`${index + 1}\u0000${summary}`),
  );
  const hex = [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
  return `beat_${hex.slice(0, 24)}`;
}

function approvedOutlineChange(operation: Record<string, unknown>): PacingRevisionChange {
  return {
    id: crypto.randomUUID(),
    item_id: crypto.randomUUID(),
    layer: 'outline',
    target_key: `outline:${String(operation.operation_id)}`,
    current_value: null,
    ai_proposal: {
      operation,
      proposed_beat: { summary: 'Combined result.' },
    },
    edited_candidate: null,
    decision: 'approved',
    dependency_ids: [],
    reason: 'Pacing',
    source_fingerprint: 'source',
    generation_status: 'ready',
  };
}

const SOURCE_OUTLINE = {
  page_beats: [
    { summary: 'First event.' },
    { summary: 'Second event.' },
    { summary: 'Third event.' },
  ],
};

describe('buildPacingRevisionOutlineFromApprovedChanges validation', () => {
  it('rejects a combine that repeats one source instead of deleting an unrelated beat', async () => {
    const firstId = await sourceBeatId(0, 'First event.');
    const change = approvedOutlineChange({
      operation_id: 'combine-duplicate',
      operation: 'combine',
      source_beat_ids: [firstId, firstId],
      summary: 'Combined result.',
    });

    await expect(buildPacingRevisionOutlineFromApprovedChanges({
      sourceOutline: SOURCE_OUTLINE,
      approvedOutlineChanges: [change],
      revisionSetId: crypto.randomUUID(),
    })).rejects.toThrow(/duplicate source beat/i);
  });

  it('rejects a combine when any persisted source beat is unknown', async () => {
    const firstId = await sourceBeatId(0, 'First event.');
    const secondId = await sourceBeatId(1, 'Second event.');
    const change = approvedOutlineChange({
      operation_id: 'combine-missing',
      operation: 'combine',
      source_beat_ids: [firstId, secondId, 'beat_missing'],
      summary: 'Combined result.',
    });

    await expect(buildPacingRevisionOutlineFromApprovedChanges({
      sourceOutline: SOURCE_OUTLINE,
      approvedOutlineChanges: [change],
      revisionSetId: crypto.randomUUID(),
    })).rejects.toThrow(/unknown source beat/i);
  });

  it('rejects a self-anchored move instead of silently placing it first', async () => {
    const firstId = await sourceBeatId(0, 'First event.');
    const change = approvedOutlineChange({
      operation_id: 'move-self',
      operation: 'move',
      source_beat_ids: [firstId],
      anchor_source_beat_id: firstId,
      placement: 'after',
    });

    await expect(buildPacingRevisionOutlineFromApprovedChanges({
      sourceOutline: SOURCE_OUTLINE,
      approvedOutlineChanges: [change],
      revisionSetId: crypto.randomUUID(),
    })).rejects.toThrow(/own source beat/i);
  });
});
