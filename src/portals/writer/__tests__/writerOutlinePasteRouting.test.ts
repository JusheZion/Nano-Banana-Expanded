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
