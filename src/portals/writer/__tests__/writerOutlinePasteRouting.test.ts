import { describe, expect, it, vi } from 'vitest';
import { analyzeOutlinePaste } from '../writerOutlinePasteDiagnostic';
import {
  insertOutlinePasteText,
  prepareOfficialOutlineTextSave,
  routeOfficialOutlineTextSave,
  routeOutlinePaste,
  summarizeOutlineRecognition,
} from '../writerOutlinePasteRouting';
import type { OutlinePastePreferences } from '../writerOutlinePastePreferences';

const preferences = (reviewFrequency: OutlinePastePreferences['reviewFrequency']): OutlinePastePreferences => ({
  reviewFrequency,
  aiClassification: 'off',
  showFirstUseGuidance: true,
});

describe('writer outline paste routing', () => {
  const confident = analyzeOutlinePaste('Page 1 — Opening image.');
  const advisory = analyzeOutlinePaste('1. Opening\n3. Closing');
  const blocking = analyzeOutlinePaste('Loose prose that needs a destination.');

  it('always reviews confident, advisory, and blocking paste diagnostics', () => {
    expect(routeOutlinePaste(confident, preferences('always'))).toBe('review');
    expect(routeOutlinePaste(advisory, preferences('always'))).toBe('review');
    expect(routeOutlinePaste(blocking, preferences('always'))).toBe('review');
  });

  it('reviews advisory or blocking diagnostics only when needed', () => {
    expect(routeOutlinePaste(confident, preferences('when_needed'))).toBe('structured');
    expect(routeOutlinePaste(advisory, preferences('when_needed'))).toBe('review');
    expect(routeOutlinePaste(blocking, preferences('when_needed'))).toBe('review');
  });

  it('never interrupts confident paste and preserves uncertain paste as unstructured', () => {
    expect(routeOutlinePaste(confident, preferences('never_interrupt'))).toBe('structured');
    expect(routeOutlinePaste(advisory, preferences('never_interrupt'))).toBe('unstructured');
    expect(routeOutlinePaste(blocking, preferences('never_interrupt'))).toBe('unstructured');
  });

  it('inserts confident paste at the native selection without changing surrounding text', () => {
    expect(insertOutlinePasteText('Before  after', 'middle', 7, 7)).toEqual({
      text: 'Before middle after',
      caret: 13,
    });
    expect(insertOutlinePasteText('Before old after', 'new', 7, 10)).toEqual({
      text: 'Before new after',
      caret: 10,
    });
  });

  it('summarizes recognized counts and inferred page target accessibly', () => {
    expect(summarizeOutlineRecognition(analyzeOutlinePaste([
      'TITLE: Harbor',
      'Act I — Arrival',
      'Page 7 — The crossing.',
    ].join('\n')), 'structured')).toMatchObject({
      state: 'structured',
      inferredPageCount: 7,
      counts: { title: 1, premise: 0, act: 1, pageBeat: 1, notes: 0, unassigned: 0 },
    });
  });

  it('replaces the opened-review message with an accurate cancellation status', () => {
    const summary = summarizeOutlineRecognition(blocking, 'canceled');

    expect(summary.state).toBe('canceled');
    expect(summary.message).toMatch(/paste review canceled/i);
    expect(summary.message).toMatch(/current source was not changed/i);
    expect(summary.message).not.toMatch(/paste review opened/i);
  });

  it('warns that a saved version remains when recovery is closed', () => {
    const summary = summarizeOutlineRecognition(blocking, 'recovery_closed');

    expect(summary.state).toBe('recovery_closed');
    expect(summary.message).toMatch(/official outline remains saved/i);
    expect(summary.message).toMatch(/source synchronization still needs attention/i);
  });

  it('blocks an ambiguous official plain-text save before parsing or persistence', () => {
    expect(prepareOfficialOutlineTextSave('Loose prose.', { keep: true })).toMatchObject({
      kind: 'review',
      diagnostic: { originalText: 'Loose prose.' },
    });
  });

  it('merges confident official plain text while preserving unknown fields', () => {
    expect(prepareOfficialOutlineTextSave('PAGE BEATS:\n1\tOpening: Start.', { keep: true })).toEqual({
      kind: 'save',
      outlineJson: {
        keep: true,
        page_beats: [{ page_target: 1, scene: 'Opening', summary: 'Start.' }],
      },
    });
  });

  it('replaces stale outline fields and keeps page beats separate from the final act', () => {
    const prepared = prepareOfficialOutlineTextSave([
      'ACTS:',
      'Act IV - The return',
      'Page 1 - Campfire opening.',
      'Page 2 - The warning arrives.',
    ].join('\n'), {
      keep: true,
      title: 'Deleted title',
      premise: 'Deleted premise',
      acts: [{ name: 'Old Act' }],
      page_beats: [{ page_target: 71, summary: 'Deleted old beat' }],
      notes: ['Deleted note'],
    });

    expect(prepared).toEqual({
      kind: 'save',
      outlineJson: {
        keep: true,
        acts: [{ name: 'Act IV', summary: 'The return' }],
        page_beats: [
          { page_target: 1, scene: 'Campfire opening.' },
          { page_target: 2, scene: 'The warning arrives.' },
        ],
      },
    });
  });

  it('opens review for an ambiguous official draft before calling the save API', async () => {
    const onReview = vi.fn();
    const onSave = vi.fn();

    await expect(routeOfficialOutlineTextSave({
      draft: 'Loose prose.',
      existingOutline: { keep: true },
      onReview,
      onSave,
    })).resolves.toBe('review');

    expect(onReview).toHaveBeenCalledWith(expect.objectContaining({ originalText: 'Loose prose.' }));
    expect(onSave).not.toHaveBeenCalled();
  });
});
