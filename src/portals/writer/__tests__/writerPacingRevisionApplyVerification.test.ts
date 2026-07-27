import { describe, expect, it } from 'vitest';
import type { PacingRevisionChange } from '@/shared/writer/pacingRevisionSchemas';
import { verifyPacingRevisionApply } from '../writerPacingRevisionApplyVerification';

const SOURCE_COUNT = 71;
const TARGET_COUNT = 85;

function createdPageId(pageNumber: number) {
  return `created-${pageNumber}`;
}

function approvedChanges(): PacingRevisionChange[] {
  const itemId = crypto.randomUUID();
  const outlineId = crypto.randomUUID();
  const changes: PacingRevisionChange[] = [{
    id: outlineId,
    item_id: itemId,
    layer: 'outline',
    target_key: 'outline:add-pages',
    current_value: null,
    ai_proposal: { operation: { operation_id: 'add-pages' } },
    edited_candidate: null,
    decision: 'approved',
    dependency_ids: [],
    reason: 'Expand the ending.',
    source_fingerprint: 'outline-fp',
    generation_status: 'ready',
  }];
  for (let pageNumber = SOURCE_COUNT + 1; pageNumber <= TARGET_COUNT; pageNumber += 1) {
    const beatsId = crypto.randomUUID();
    changes.push({
      id: beatsId,
      item_id: itemId,
      layer: 'beats',
      target_key: `virtual-page:${pageNumber}`,
      page_id: null,
      page_number: pageNumber,
      current_value: null,
      ai_proposal: { panels: [{ action: `Page ${pageNumber} action` }] },
      edited_candidate: null,
      decision: 'approved',
      dependency_ids: [outlineId],
      reason: 'Expand the ending.',
      source_fingerprint: `beats-${pageNumber}-fp`,
      generation_status: 'ready',
    }, {
      id: crypto.randomUUID(),
      item_id: itemId,
      layer: 'dialogue',
      target_key: `virtual-page:${pageNumber}:dialogue`,
      page_id: null,
      page_number: pageNumber,
      current_value: null,
      ai_proposal: `MARA: Page ${pageNumber}.`,
      edited_candidate: null,
      decision: 'approved',
      dependency_ids: [beatsId],
      reason: 'Expand the ending.',
      source_fingerprint: `dialogue-${pageNumber}-fp`,
      generation_status: 'ready',
    });
  }
  return changes;
}

function createdPages() {
  return Array.from({ length: TARGET_COUNT - SOURCE_COUNT }, (_, index) => {
    const pageNumber = SOURCE_COUNT + index + 1;
    return { pageId: createdPageId(pageNumber), pageNumber };
  });
}

function pages() {
  return Array.from({ length: TARGET_COUNT }, (_, index) => {
    const pageNumber = index + 1;
    return {
      id: pageNumber > SOURCE_COUNT ? createdPageId(pageNumber) : `page-${pageNumber}`,
      page_number: pageNumber,
      beats_json: pageNumber > SOURCE_COUNT
        ? { panels: [{ action: `Page ${pageNumber} action` }] }
        : null,
      script_text: pageNumber > SOURCE_COUNT ? `MARA: Page ${pageNumber}.` : null,
    };
  });
}

function verify(freshPages: ReturnType<typeof pages>) {
  return verifyPacingRevisionApply({
    sourcePageCount: SOURCE_COUNT,
    targetPageCount: TARGET_COUNT,
    freshPages,
    createdPages: createdPages(),
    approvedChanges: approvedChanges(),
  });
}

describe('verifyPacingRevisionApply', () => {
  it('accepts a complete 71→85 target with exact created IDs and persisted candidates', () => {
    expect(verify(pages())).toEqual({ ok: true });
  });

  it.each([
    ['missing page 79', pages().filter((page) => page.page_number !== 79), /complete page-number set/i],
    ['duplicate number', [...pages(), { ...pages()[71]!, id: 'duplicate-72' }], /duplicate page 72/i],
    ['wrong created ID', pages().map((page) => page.page_number === 72 ? { ...page, id: 'wrong-72' } : page), /created page 72/i],
    ['Beats mismatch', pages().map((page) => page.page_number === 72 ? { ...page, beats_json: { panels: [] } } : page), /Page Beats.*72/i],
    ['Dialogue mismatch', pages().map((page) => page.page_number === 85 ? { ...page, script_text: 'WRONG' } : page), /Dialogue.*85/i],
  ])('rejects %s', (_name, freshPages, expected) => {
    expect(verify(freshPages)).toEqual({
      ok: false,
      error: expect.stringMatching(expected),
    });
  });
});
