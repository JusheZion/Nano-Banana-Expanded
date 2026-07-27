import { describe, expect, it } from 'vitest';
import {
  buildPacingRevisionPromptPage,
  proposedOutlinePageNumbers,
  resolvePacingRevisionPageTarget,
} from './pacingRevisionPageTarget.ts';

const page70Id = '00000000-0000-4000-8000-000000000070';
const page71Id = '00000000-0000-4000-8000-000000000071';
const physicalPages = [
  { id: page70Id, page_number: 70 },
  { id: page71Id, page_number: 71 },
];

describe('resolvePacingRevisionPageTarget', () => {
  it('resolves a physical page only when its ID and number match exactly', () => {
    expect(resolvePacingRevisionPageTarget({
      requestedPageId: page71Id,
      requestedPageNumber: 71,
      physicalPages,
      proposedPageNumbers: new Set([71, 72]),
    })).toEqual({
      kind: 'physical',
      pageId: page71Id,
      pageNumber: 71,
      targetKey: `page:${page71Id}`,
    });
  });

  it('rejects a physical page ID and number mismatch', () => {
    expect(() => resolvePacingRevisionPageTarget({
      requestedPageId: page71Id,
      requestedPageNumber: 70,
      physicalPages,
      proposedPageNumbers: new Set([70, 71]),
    })).toThrow('does not match page number');
  });

  it('rejects an unknown physical page ID', () => {
    expect(() => resolvePacingRevisionPageTarget({
      requestedPageId: '00000000-0000-4000-8000-000000000099',
      requestedPageNumber: 71,
      physicalPages,
      proposedPageNumbers: new Set([71]),
    })).toThrow('does not belong to this issue');
  });

  it('resolves the next unoccupied proposed page as a virtual target', () => {
    expect(resolvePacingRevisionPageTarget({
      requestedPageId: null,
      requestedPageNumber: 72,
      physicalPages,
      proposedPageNumbers: new Set([72]),
    })).toEqual({
      kind: 'virtual',
      pageId: null,
      pageNumber: 72,
      targetKey: 'virtual-page:72',
    });
  });

  it('resolves a later virtual page when every prior future page is proposed', () => {
    expect(resolvePacingRevisionPageTarget({
      requestedPageId: null,
      requestedPageNumber: 85,
      physicalPages,
      proposedPageNumbers: new Set(
        Array.from({ length: 14 }, (_, index) => index + 72),
      ),
    })).toEqual({
      kind: 'virtual',
      pageId: null,
      pageNumber: 85,
      targetKey: 'virtual-page:85',
    });
  });

  it.each([
    { pageNumber: 0, reason: 'between 1 and 200' },
    { pageNumber: 201, reason: 'between 1 and 200' },
    { pageNumber: 71, reason: 'already occupied' },
    { pageNumber: 70, reason: 'already occupied' },
    { pageNumber: 69, reason: 'beyond the physical maximum' },
    { pageNumber: 73, reason: 'contiguous proposed pages' },
  ])('rejects virtual page $pageNumber: $reason', ({ pageNumber, reason }) => {
    expect(() => resolvePacingRevisionPageTarget({
      requestedPageId: null,
      requestedPageNumber: pageNumber,
      physicalPages,
      proposedPageNumbers: new Set([pageNumber]),
    })).toThrow(reason);
  });

  it('rejects a virtual target absent from the proposed outline', () => {
    expect(() => resolvePacingRevisionPageTarget({
      requestedPageId: null,
      requestedPageNumber: 72,
      physicalPages,
      proposedPageNumbers: new Set([71, 73]),
    })).toThrow('not present in the proposed outline');
  });
});

describe('proposedOutlinePageNumbers', () => {
  it('derives only bounded integer page targets from the saved proposal', () => {
    expect([...proposedOutlinePageNumbers({
      page_beats: [
        { page_target: 71 },
        { page_target: 72 },
        { page_target: 72 },
        { page_target: 201 },
        { page_target: '73' },
      ],
    })]).toEqual([71, 72]);
  });
});

describe('buildPacingRevisionPromptPage', () => {
  it('synthesizes an unsaved virtual prompt page with empty live values', () => {
    expect(buildPacingRevisionPromptPage({
      kind: 'virtual',
      pageId: null,
      pageNumber: 72,
      targetKey: 'virtual-page:72',
    }, physicalPages.map((page) => ({
      ...page,
      issue_id: 'issue-id',
      beats_json: { panels: [] },
      script_text: 'Existing script',
    })), '00000000-0000-4000-8000-000000000172')).toEqual({
      id: '00000000-0000-4000-8000-000000000172',
      issue_id: null,
      page_number: 72,
      beats_json: null,
      script_text: null,
    });
  });

  it('returns the exact physical page for a physical target', () => {
    const pages = physicalPages.map((page) => ({
      ...page,
      issue_id: 'issue-id',
      beats_json: { panels: [] },
      script_text: 'Existing script',
    }));

    expect(buildPacingRevisionPromptPage({
      kind: 'physical',
      pageId: page71Id,
      pageNumber: 71,
      targetKey: `page:${page71Id}`,
    }, pages, 'unused-virtual-id')).toBe(pages[1]);
  });
});
