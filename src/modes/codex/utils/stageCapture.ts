interface StageIdentity {
  id(): string;
}

interface StageWaitOptions {
  signal?: AbortSignal;
  maxFrames?: number;
}

/**
 * Wait for React/Konva to commit a requested plate before rasterising it.
 * This checks render identity instead of guessing with a fixed timeout.
 */
export function waitForStagePlate(
  getStage: () => StageIdentity | null,
  plateId: string,
  { signal, maxFrames = 30 }: StageWaitOptions = {},
): Promise<boolean> {
  return new Promise((resolve) => {
    let frameId: number | null = null;
    let frames = 0;
    let settled = false;

    const finish = (ready: boolean) => {
      if (settled) return;
      settled = true;
      if (frameId !== null) cancelAnimationFrame(frameId);
      signal?.removeEventListener('abort', onAbort);
      resolve(ready);
    };
    const onAbort = () => finish(false);
    const check = () => {
      if (signal?.aborted) return finish(false);
      if (getStage()?.id() === `codex-stage-${plateId}`) return finish(true);
      frames += 1;
      if (frames >= maxFrames) return finish(false);
      frameId = requestAnimationFrame(check);
    };

    signal?.addEventListener('abort', onAbort, { once: true });
    check();
  });
}
