import { describe, expect, it, vi } from 'vitest';
import {
  getLatestImageshopBatchAttempts,
  runImageshopGenerationBatch,
  type ImageshopBatchGenerationItem,
  type ImageshopBatchGenerationAttempt,
} from '@/portals/storyline/imageshopBatchGeneration';
import { classifyGeminiImageFailure } from '@/shared/api/geminiImageApi';

const items: ImageshopBatchGenerationItem[] = [
  {
    queueItemId: 'panel-1',
    pageNumber: 1,
    panelNumber: 1,
    prompt: 'Flux enters the observatory through a brass iris door.',
    model: 'pro',
    references: [{ id: 'flux', imageUrl: 'https://example.test/flux.png', status: 'ready' }],
  },
  {
    queueItemId: 'panel-2',
    pageNumber: 1,
    panelNumber: 2,
    prompt: 'Flux raises a glowing compass beneath the star map.',
    model: 'pro',
    references: [{ id: 'compass', imageUrl: 'https://example.test/compass.png', status: 'failed' }],
  },
  {
    queueItemId: 'panel-3',
    pageNumber: 2,
    panelNumber: 1,
    prompt: 'The observatory rotates above the city at dawn.',
    model: 'pro',
    references: [],
  },
];

describe('runImageshopGenerationBatch', () => {
  it('preserves attempt history while selecting only the latest state for each panel', () => {
    const attempts: ImageshopBatchGenerationAttempt[] = [
      {
        id: 'panel-1-failed',
        queueItemId: 'panel-1',
        pageNumber: 1,
        panelNumber: 1,
        status: 'failed',
        model: 'pro',
        promptHash: 'fnv1a-failed',
        referenceCount: 0,
        elapsedMs: 10,
        seed: null,
        retryCount: 0,
        strategy: 'normal',
      },
      {
        id: 'panel-2-generated',
        queueItemId: 'panel-2',
        pageNumber: 1,
        panelNumber: 2,
        status: 'generated',
        model: 'pro',
        promptHash: 'fnv1a-panel-2',
        referenceCount: 0,
        elapsedMs: 20,
        seed: 4,
        retryCount: 0,
        strategy: 'normal',
      },
      {
        id: 'panel-1-generated',
        queueItemId: 'panel-1',
        pageNumber: 1,
        panelNumber: 1,
        status: 'generated',
        model: 'flash',
        promptHash: 'fnv1a-retry',
        referenceCount: 0,
        elapsedMs: 30,
        seed: 8,
        retryCount: 1,
        strategy: 'fallback-model',
      },
    ];

    expect(getLatestImageshopBatchAttempts(attempts).map((attempt) => attempt.id)).toEqual([
      'panel-2-generated',
      'panel-1-generated',
    ]);
    expect(attempts).toHaveLength(3);
  });

  it('preserves partial successes and pauses after a failed panel', async () => {
    const execute = vi.fn(async ({ item }: { item: ImageshopBatchGenerationItem }) =>
      item.queueItemId === 'panel-2'
        ? {
            ok: false as const,
            diagnostic: classifyGeminiImageFailure('Image request timed out. Try again.'),
          }
        : {
            ok: true as const,
            imageUrl: `data:image/png;base64,${item.queueItemId}`,
            seed: 42,
          },
    );

    const result = await runImageshopGenerationBatch({
      items,
      execute,
      pauseOnFailure: true,
    });

    expect(result.status).toBe('paused');
    expect(result.nextIndex).toBe(2);
    expect(result.attempts).toHaveLength(2);
    expect(result.attempts[0]).toMatchObject({
      queueItemId: 'panel-1',
      status: 'generated',
      model: 'pro',
      referenceCount: 1,
      seed: 42,
      retryCount: 0,
    });
    expect(result.attempts[0].promptHash).toMatch(/^fnv1a-/);
    expect(result.attempts[1]).toMatchObject({
      queueItemId: 'panel-2',
      status: 'failed',
      errorClass: 'timeout',
      retryCount: 0,
    });
    expect(execute).toHaveBeenCalledTimes(2);
  });

  it('resumes after the failed item without losing prior attempts', async () => {
    const first = await runImageshopGenerationBatch({
      items,
      pauseOnFailure: true,
      execute: async ({ item }) =>
        item.queueItemId === 'panel-2'
          ? {
              ok: false,
              diagnostic: classifyGeminiImageFailure('Image request timed out. Try again.'),
            }
          : {
              ok: true,
              imageUrl: `data:image/png;base64,${item.queueItemId}`,
              seed: 7,
            },
    });

    const resumed = await runImageshopGenerationBatch({
      items,
      startIndex: first.nextIndex,
      previousAttempts: first.attempts,
      execute: async ({ item }) => ({
        ok: true,
        imageUrl: `data:image/png;base64,${item.queueItemId}`,
        seed: 9,
      }),
    });

    expect(resumed.status).toBe('completed');
    expect(resumed.attempts.map((attempt) => attempt.queueItemId)).toEqual([
      'panel-1',
      'panel-2',
      'panel-3',
    ]);
    expect(resumed.completedCount).toBe(2);
    expect(resumed.failedCount).toBe(1);
  });

  it('supports failed-reference, smaller-reference, and fallback-model retry strategies', async () => {
    const referenceHeavyItem: ImageshopBatchGenerationItem = {
      ...items[1],
      references: Array.from({ length: 9 }, (_, index) => ({
        id: `ref-${index + 1}`,
        imageUrl: `https://example.test/ref-${index + 1}.png`,
        status: index === 0 ? 'failed' : 'ready',
      })),
    };
    const calls: Array<{ model: string; referenceUrls: string[]; strategy: string }> = [];
    const execute = vi.fn(async ({ model, referenceUrls, strategy }) => {
      calls.push({ model, referenceUrls, strategy });
      return { ok: true as const, imageUrl: 'data:image/png;base64,retry', seed: 11 };
    });

    await runImageshopGenerationBatch({
      items: [referenceHeavyItem],
      strategy: 'without-failed-refs',
      execute,
    });
    await runImageshopGenerationBatch({
      items: [referenceHeavyItem],
      strategy: 'smaller-refs',
      execute,
    });
    await runImageshopGenerationBatch({
      items: [referenceHeavyItem],
      strategy: 'fallback-model',
      execute,
    });

    expect(calls[0].referenceUrls).toHaveLength(8);
    expect(calls[1].referenceUrls).toHaveLength(6);
    expect(calls[2].model).toBe('flash');
  });

  it('records failed reference ids and removes them from the next retry request', async () => {
    const retryItem: ImageshopBatchGenerationItem = {
      ...items[0],
      references: [
        { id: 'flux', imageUrl: 'https://example.test/flux.png', status: 'ready' },
        { id: 'coat', imageUrl: 'https://example.test/coat.png', status: 'ready' },
      ],
    };
    const first = await runImageshopGenerationBatch({
      items: [retryItem],
      execute: async () => ({
        ok: false,
        diagnostic: classifyGeminiImageFailure('Failed to fetch reference image (404)'),
        failedReferenceIds: ['coat'],
      }),
    });
    const retryInputs: Array<{ referenceIds: string[] }> = [];

    const retried = await runImageshopGenerationBatch({
      items: [retryItem],
      strategy: 'without-failed-refs',
      previousAttempts: first.attempts,
      execute: async ({ references }) => {
        retryInputs.push({ referenceIds: references.map((reference) => reference.id) });
        return { ok: true, imageUrl: 'data:image/png;base64,retry', seed: 14 };
      },
    });

    expect(first.attempts[0].failedReferenceIds).toEqual(['coat']);
    expect(retryInputs).toEqual([{ referenceIds: ['flux'] }]);
    expect(retried.attempts[1]).toMatchObject({
      strategy: 'without-failed-refs',
      referenceIds: ['flux'],
      referenceCount: 1,
    });
    expect(retried).toMatchObject({
      completedCount: 1,
      failedCount: 0,
      skippedCount: 0,
    });
  });
});
