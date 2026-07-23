import { describe, expect, it } from 'vitest';
import { writerToolsRequestSchema } from '@/shared/writer/schemas';
import { analyzeOutlinePaste } from '../writerOutlinePasteDiagnostic';
import {
  mergeOutlineClassificationSuggestions,
  parseOutlineClassificationSuggestions,
} from '../writerOutlineAiClassification';

describe('writerOutlineAiClassification', () => {
  it('accepts a bounded preview-only request and rejects duplicate passage ids', () => {
    const valid = writerToolsRequestSchema.safeParse({
      mode: 'outline_classification_preview',
      passages: [{ id: 'p1', text: 'Loose reflection' }],
    });
    expect(valid.success).toBe(true);

    const duplicate = writerToolsRequestSchema.safeParse({
      mode: 'outline_classification_preview',
      passages: [
        { id: 'p1', text: 'First' },
        { id: 'p1', text: 'Second' },
      ],
    });
    expect(duplicate.success).toBe(false);
  });

  it('merges only valid known suggestions without changing source text or ranges', () => {
    const diagnostic = analyzeOutlinePaste('Loose reflection\nAnother thought');
    const first = diagnostic.passages[0];
    const parsed = parseOutlineClassificationSuggestions({
      suggestions: [
        { id: first.id, assignment: 'notes', reason: 'Reflective note' },
        { id: 'unknown', assignment: 'act', reason: 'Unknown id' },
      ],
    }, new Set(diagnostic.passages.map((passage) => passage.id)));

    const merged = mergeOutlineClassificationSuggestions(diagnostic, parsed);
    expect(merged.passages[0]).toMatchObject({
      id: first.id,
      text: first.text,
      startLine: first.startLine,
      endLine: first.endLine,
      assignment: 'notes',
      provenance: 'ai',
    });
    expect(merged.passages[1].assignment).toBe('unassigned');
  });

  it('rejects duplicate response ids and reasons longer than 240 characters', () => {
    const ids = new Set(['p1']);
    expect(() => parseOutlineClassificationSuggestions({
      suggestions: [
        { id: 'p1', assignment: 'notes', reason: 'A' },
        { id: 'p1', assignment: 'act', reason: 'B' },
      ],
    }, ids)).toThrow(/duplicate/i);
    expect(() => parseOutlineClassificationSuggestions({
      suggestions: [{ id: 'p1', assignment: 'notes', reason: 'x'.repeat(241) }],
    }, ids)).toThrow();
  });
});
