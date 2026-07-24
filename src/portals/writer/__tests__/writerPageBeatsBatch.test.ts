import { describe, expect, it } from 'vitest';
import {
  formatWriterPageBeatsBatchErrors,
  shouldContinueWriterPageBeatsBatch,
} from '../writerPageBeatsBatch';

describe('Writer Page Beats batch recovery', () => {
  it('stops after a partial-success round so failed pages are not retried forever', () => {
    expect(
      shouldContinueWriterPageBeatsBatch({
        errors: [{ page_number: 4, message: 'panels.0.action is required' }],
        hasMore: true,
      }),
    ).toBe(false);
  });

  it('continues only when the round has no errors and more pages remain', () => {
    expect(shouldContinueWriterPageBeatsBatch({ errors: [], hasMore: true })).toBe(true);
    expect(shouldContinueWriterPageBeatsBatch({ errors: [], hasMore: false })).toBe(false);
  });

  it('keeps page numbers and reasons in a readable recovery message', () => {
    const message = formatWriterPageBeatsBatchErrors([
      { page_number: 4, message: 'panels.0.action is required' },
      { page_number: 5, message: 'Could not save the generated beats' },
    ]);

    expect(message).toContain('Page 4: panels.0.action is required');
    expect(message).toContain('Page 5: Could not save the generated beats');
    expect(message).toContain('completed pages were saved');
    expect(message).toContain('Retry the failed pages');
  });
});
