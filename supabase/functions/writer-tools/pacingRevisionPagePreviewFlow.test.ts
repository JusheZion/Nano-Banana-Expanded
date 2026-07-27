import { describe, expect, it } from 'vitest';
import { executePacingRevisionPagePreviewFlow } from './pacingRevisionPagePreviewFlow.ts';

const page71Id = '00000000-0000-4000-8000-000000000071';
const promptPageId = '00000000-0000-4000-8000-000000000172';
const physicalPages = [{
  id: page71Id,
  issue_id: 'issue-id',
  page_number: 71,
  beats_json: { panels: [{ action: 'Existing action' }] },
  script_text: 'Existing script',
}];
const proposedOutline = {
  page_beats: Array.from({ length: 72 }, (_, index) => ({
    page_target: index + 1,
    summary: `Beat ${index + 1}`,
  })),
};
const outlineChange = {
  id: 'outline-change-72',
  item_id: 'item-72',
  layer: 'outline',
  target_key: 'outline:add-72',
  page_number: 72,
  generation_status: 'ready',
  decision: 'pending',
  ai_proposal: { proposed_beat: { page_target: 72 } },
  edited_candidate: null,
  dependency_ids: [],
};

function baseInput() {
  return {
    requestedPageId: null,
    requestedPageNumber: 72,
    physicalPages,
    proposedOutline,
    itemRows: [{
      id: 'item-72',
      affected_page_numbers: [72],
      generation_status: 'pending',
    }],
    existingChanges: [outlineChange],
    includeBeats: true,
    includeDialogue: false,
    createPromptPageId: () => promptPageId,
    hashValue: async (value: unknown) => `hash:${JSON.stringify(value)}`,
    parseResponse: (value: unknown) => value as {
      pages: Array<{
        page_id: string;
        page_number: number;
        reason?: string;
        proposed_beats_json?: unknown;
        proposed_script_text?: string;
      }>;
    },
  };
}

describe('executePacingRevisionPagePreviewFlow', () => {
  it('preserves physical target identity and current values without requiring Outline dependencies', async () => {
    const persistedRows: Array<Record<string, unknown>> = [];
    await executePacingRevisionPagePreviewFlow({
      ...baseInput(),
      requestedPageId: page71Id,
      requestedPageNumber: 71,
      itemRows: [{
        id: 'item-71',
        affected_page_numbers: [71],
        generation_status: 'pending',
      }],
      existingChanges: [],
      generate: async (promptPage) => ({
        pages: [{
          page_id: promptPage.id,
          page_number: 71,
          proposed_beats_json: { panels: [{ action: 'Revised physical action' }] },
        }],
      }),
      persistChanges: async (rows) => {
        persistedRows.push(...rows);
        return rows;
      },
    });

    expect(persistedRows).toEqual([
      expect.objectContaining({
        target_key: `page:${page71Id}`,
        page_id: page71Id,
        page_number: 71,
        current_value: physicalPages[0]!.beats_json,
        dependency_ids: [],
      }),
    ]);
  });

  it('rejects a virtual page that is not owned by a persisted Revision Item', async () => {
    await expect(executePacingRevisionPagePreviewFlow({
      ...baseInput(),
      itemRows: [{
        id: 'item-71',
        affected_page_numbers: [71],
        generation_status: 'pending',
      }],
      existingChanges: [],
      generate: async () => {
        throw new Error('generator must not run');
      },
      persistChanges: async () => {
        throw new Error('persistence must not run');
      },
    })).rejects.toThrow('No Revision Item owns this page');
  });

  it('rejects virtual Beats when ownership has no applicable accepted Outline dependency', async () => {
    await expect(executePacingRevisionPagePreviewFlow({
      ...baseInput(),
      existingChanges: [],
      generate: async () => {
        throw new Error('generator must not run');
      },
      persistChanges: async () => {
        throw new Error('persistence must not run');
      },
    })).rejects.toThrow('Virtual Page Beats require an applicable Outline change');
  });

  it('uses an ephemeral model identity and persists only null live identity for virtual Beats', async () => {
    const originalPages = structuredClone(physicalPages);
    const persistedRows: Array<Record<string, unknown>> = [];
    const result = await executePacingRevisionPagePreviewFlow({
      ...baseInput(),
      generate: async (promptPage) => {
        expect(promptPage).toEqual({
          id: promptPageId,
          issue_id: null,
          page_number: 72,
          beats_json: null,
          script_text: null,
        });
        return {
          pages: [{
            page_id: promptPage.id,
            page_number: promptPage.page_number,
            reason: 'Add connective action.',
            proposed_beats_json: { panels: [{ action: 'New virtual action' }] },
          }],
        };
      },
      persistChanges: async (rows) => {
        persistedRows.push(...rows);
        return rows;
      },
    });

    expect(result.target).toEqual({
      kind: 'virtual',
      pageId: null,
      pageNumber: 72,
      targetKey: 'virtual-page:72',
    });
    expect(persistedRows).toEqual([
      expect.objectContaining({
        target_key: 'virtual-page:72',
        page_id: null,
        page_number: 72,
        current_value: null,
        dependency_ids: ['outline-change-72'],
      }),
    ]);
    expect(physicalPages).toEqual(originalPages);
  });

  it('builds virtual Dialogue from effective edited Beats and depends on the Beats change', async () => {
    const editedBeats = { panels: [{ action: 'Edited virtual action' }] };
    const persistedRows: Array<Record<string, unknown>> = [];
    await executePacingRevisionPagePreviewFlow({
      ...baseInput(),
      includeBeats: false,
      includeDialogue: true,
      existingChanges: [
        outlineChange,
        {
          id: 'beats-change-72',
          item_id: 'item-72',
          layer: 'beats',
          target_key: 'virtual-page:72',
          page_number: 72,
          generation_status: 'ready',
          decision: 'pending',
          ai_proposal: { panels: [{ action: 'AI virtual action' }] },
          edited_candidate: editedBeats,
          dependency_ids: ['outline-change-72'],
        },
      ],
      generate: async (promptPage) => {
        expect(promptPage.beats_json).toEqual(editedBeats);
        return {
          pages: [{
            page_id: promptPage.id,
            page_number: 72,
            reason: 'Write from effective Beats.',
            proposed_script_text: 'HERO: We move now.',
          }],
        };
      },
      persistChanges: async (rows) => {
        persistedRows.push(...rows);
        return rows;
      },
    });

    expect(persistedRows).toEqual([
      expect.objectContaining({
        layer: 'dialogue',
        page_id: null,
        current_value: null,
        dependency_ids: ['beats-change-72'],
      }),
    ]);
  });

  it('rejects virtual Dialogue when ready Beats lack the applicable Outline dependency', async () => {
    await expect(executePacingRevisionPagePreviewFlow({
      ...baseInput(),
      includeBeats: false,
      includeDialogue: true,
      existingChanges: [
        outlineChange,
        {
          id: 'beats-change-72',
          item_id: 'item-72',
          layer: 'beats',
          target_key: 'virtual-page:72',
          page_number: 72,
          generation_status: 'ready',
          decision: 'pending',
          ai_proposal: { panels: [{ action: 'Unbacked action' }] },
          edited_candidate: null,
          dependency_ids: [],
        },
      ],
      generate: async () => {
        throw new Error('generator must not run');
      },
      persistChanges: async () => {
        throw new Error('persistence must not run');
      },
    })).rejects.toThrow('Virtual Page Beats are not backed by the applicable Outline change');
  });
});
