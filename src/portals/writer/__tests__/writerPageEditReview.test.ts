import { describe, expect, it } from 'vitest';
import {
  buildWriterPageEditReview,
  summarizeWriterPageEditReview,
} from '../writerPageEditReview';

describe('writerPageEditReview', () => {
  it('reports affected layers and safe cascade actions for a staged beats edit', () => {
    const review = buildWriterPageEditReview({
      layer: 'beats',
      pageNumber: 4,
      stagedText: 'Panel 1: Mara opens the observatory gate. Panel 2: Sol spots a gold flare.',
      outlineText: 'Page 4: Mara opens the observatory gate.',
      beatsText: 'Panel 1: Mara waits outside.',
      dialogueText: 'MARA: The gate is still sealed.',
      previousPageText: 'Mara reaches the observatory bridge.',
      nextPageText: 'Sol follows the gold flare inside.',
      canonText: 'Mara; Sol; observatory; gold flare',
    });

    expect(review).toMatchObject({
      layer: 'beats',
      pageNumber: 4,
      status: 'clear',
      affectedLayers: ['beats', 'dialogue'],
      actions: ['save_current_layer', 'regenerate_dialogue', 'run_canon_check'],
    });
    expect(summarizeWriterPageEditReview(review)).toContain('No obvious conflicts detected.');
  });

  it('flags repetition and canon drift before allowing cascade decisions', () => {
    const review = buildWriterPageEditReview({
      layer: 'dialogue',
      pageNumber: 8,
      stagedText: 'MARA: The red engine is sealed. MARA: The red engine is sealed.',
      outlineText: 'Page 8: Mara studies the gold engine.',
      beatsText: 'The gold engine opens under moonlight.',
      dialogueText: 'MARA: The gold engine is waking.',
      previousPageText: 'Mara says the red engine is sealed.',
      nextPageText: 'Sol enters the gold engine chamber.',
      canonText: 'gold engine; moonlight; Sol',
    });

    expect(review.status).toBe('needs_review');
    expect(review.findings.map((finding) => finding.kind)).toEqual([
      'repetition',
      'canon_conflict',
      'neighbor_overlap',
      'layer_mismatch',
    ]);
    expect(review.actions).toEqual([
      'revise_manually',
      'accept_generated_revision',
      'regenerate_affected_pages',
      'run_canon_check',
    ]);
  });
});
