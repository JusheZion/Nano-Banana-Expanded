import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { waitForStagePlate } from '../stageCapture';

describe('waitForStagePlate', () => {
  beforeEach(() => {
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) =>
      window.setTimeout(() => callback(performance.now()), 0));
    vi.stubGlobal('cancelAnimationFrame', (id: number) => window.clearTimeout(id));
  });

  afterEach(() => vi.unstubAllGlobals());

  it('waits until the canvas identifies the requested plate', async () => {
    let current = 'codex-stage-plate-a';
    window.setTimeout(() => { current = 'codex-stage-plate-b'; }, 0);
    const ready = await waitForStagePlate(() => ({ id: () => current }), 'plate-b');
    expect(ready).toBe(true);
  });

  it('stops waiting when export is aborted', async () => {
    const controller = new AbortController();
    const pending = waitForStagePlate(() => ({ id: () => 'codex-stage-plate-a' }), 'plate-b', {
      signal: controller.signal,
    });
    controller.abort();
    await expect(pending).resolves.toBe(false);
  });

  it('fails closed when the requested render never arrives', async () => {
    const ready = await waitForStagePlate(
      () => ({ id: () => 'codex-stage-plate-a' }),
      'plate-b',
      { maxFrames: 2 },
    );
    expect(ready).toBe(false);
  });
});
