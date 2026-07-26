import { describe, expect, it, vi } from 'vitest';
import {
  failedPagesOnly,
  runPacingRevisionQueue,
} from '../writerPacingRevisionQueue';

describe('runPacingRevisionQueue', () => {
  it('continues after isolated failures and checkpoints every five attempts', async () => {
    const checkpoint = vi.fn();
    const result = await runPacingRevisionQueue({
      pages: [1, 2, 3, 4, 5, 6],
      runPage: async (page) => page === 3
        ? { ok: false as const, page, reason: 'Malformed model output' }
        : { ok: true as const, page },
      checkpointSize: 5,
      onCheckpoint: checkpoint,
    });

    expect(result.completedPages).toEqual([1, 2, 4, 5, 6]);
    expect(result.failures).toEqual([{ page: 3, reason: 'Malformed model output' }]);
    expect(checkpoint).toHaveBeenCalledTimes(2);
    expect(failedPagesOnly(result)).toEqual([3]);
  });

  it('stops after the current page when requested', async () => {
    let stop = false;
    const result = await runPacingRevisionQueue({
      pages: [1, 2, 3],
      runPage: async (page) => {
        stop = true;
        return { ok: true as const, page };
      },
      shouldStop: () => stop,
    });

    expect(result.completedPages).toEqual([1]);
    expect(result.stopped).toBe(true);
  });
});
