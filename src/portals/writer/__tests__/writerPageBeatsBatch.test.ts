import { describe, expect, it } from 'vitest';
import {
  buildWriterPageBeatsSinglePageQueue,
  formatWriterPageBeatsBatchErrors,
  getWriterPageBeatsBatchRetryDelayMs,
  isRetryableWriterPageBeatsBatchFailure,
  runWriterPageBeatsBatchRequestWithRetries,
  shouldContinueWriterPageBeatsBatch,
} from '../writerPageBeatsBatch';

describe('Writer Page Beats batch recovery', () => {
  it('queues every eligible page as its own Edge Function invocation', () => {
    expect(
      buildWriterPageBeatsSinglePageQueue({
        pages: [
          { id: 'page-1', hasBeats: false },
          { id: 'page-2', hasBeats: false },
          { id: 'page-3', hasBeats: false },
        ],
        allowedPageIds: ['page-1', 'page-2', 'page-3'],
        skipExisting: false,
      }),
    ).toEqual([['page-1'], ['page-2'], ['page-3']]);
  });

  it('preserves page order while excluding locked, duplicate, and completed pages', () => {
    expect(
      buildWriterPageBeatsSinglePageQueue({
        pages: [
          { id: 'page-1', hasBeats: false },
          { id: 'page-2', hasBeats: true },
          { id: 'page-3', hasBeats: false },
          { id: 'page-4', hasBeats: false },
        ],
        allowedPageIds: ['page-3', 'page-1', 'page-3'],
        skipExisting: true,
      }),
    ).toEqual([['page-1'], ['page-3']]);
  });

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

  it.each([
    ['Failed to fetch', undefined],
    ['Edge Function returned a non-2xx status code', 'HTTP 546'],
    ['Gemini request failed', 'Gemini HTTP 429: quota exceeded'],
    ['Gateway timeout', 'HTTP 504'],
  ])('retries transient hosted failures: %s', (error, details) => {
    expect(isRetryableWriterPageBeatsBatchFailure({ error, details })).toBe(true);
  });

  it.each([
    ['Not signed in', 'HTTP 401'],
    ['Invalid response from writer-tools', undefined],
    ['Outline validation failed', 'HTTP 422'],
  ])('does not retry permanent failures: %s', (error, details) => {
    expect(isRetryableWriterPageBeatsBatchFailure({ error, details })).toBe(false);
  });

  it('uses a longer pause for rate limits than ordinary network interruptions', () => {
    expect(
      getWriterPageBeatsBatchRetryDelayMs({
        error: 'Gemini request failed',
        details: 'Gemini HTTP 429: quota exceeded',
      }),
    ).toBeGreaterThan(
      getWriterPageBeatsBatchRetryDelayMs({
        error: 'Failed to fetch',
      }),
    );
  });

  it('retries a transient round twice and returns the eventual success', async () => {
    let attempts = 0;
    const retries: number[] = [];
    const result = await runWriterPageBeatsBatchRequestWithRetries({
      skipExisting: true,
      invoke: async () => {
        attempts += 1;
        return attempts < 3
          ? { success: false as const, error: 'Failed to fetch' }
          : { success: true as const, data: { processed: [11, 12, 13, 14, 15] } };
      },
      wait: async () => undefined,
      onRetry: ({ attempt }) => retries.push(attempt),
    });

    expect(result).toEqual({
      success: true,
      data: { processed: [11, 12, 13, 14, 15] },
    });
    expect(attempts).toBe(3);
    expect(retries).toEqual([1, 2]);
  });

  it('does not retry when regeneration could overwrite existing page beats', async () => {
    let attempts = 0;
    const result = await runWriterPageBeatsBatchRequestWithRetries({
      skipExisting: false,
      invoke: async () => {
        attempts += 1;
        return { success: false as const, error: 'Failed to fetch' };
      },
      wait: async () => undefined,
    });

    expect(result.success).toBe(false);
    expect(attempts).toBe(1);
  });
});
