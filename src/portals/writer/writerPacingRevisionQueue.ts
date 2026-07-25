export type PacingRevisionPageResult =
  | { ok: true; page: number }
  | { ok: false; page: number; reason: string };

export type PacingRevisionQueueResult = {
  completedPages: number[];
  failures: Array<{ page: number; reason: string }>;
  stopped: boolean;
};

export async function runPacingRevisionQueue(args: {
  pages: number[];
  runPage: (page: number) => Promise<PacingRevisionPageResult>;
  checkpointSize?: number;
  shouldStop?: () => boolean;
  onCheckpoint?: (result: PacingRevisionQueueResult) => Promise<void> | void;
}): Promise<PacingRevisionQueueResult> {
  const checkpointSize = Math.max(1, Math.min(5, args.checkpointSize ?? 5));
  const result: PacingRevisionQueueResult = {
    completedPages: [],
    failures: [],
    stopped: false,
  };
  let attemptsSinceCheckpoint = 0;

  for (const page of [...new Set(args.pages)].sort((a, b) => a - b)) {
    if (args.shouldStop?.()) {
      result.stopped = true;
      break;
    }
    const pageResult = await args.runPage(page);
    if (pageResult.ok) result.completedPages.push(pageResult.page);
    else result.failures.push({ page: pageResult.page, reason: pageResult.reason });
    attemptsSinceCheckpoint += 1;
    if (attemptsSinceCheckpoint === checkpointSize) {
      await args.onCheckpoint?.({ ...result });
      attemptsSinceCheckpoint = 0;
    }
  }
  if (attemptsSinceCheckpoint > 0) await args.onCheckpoint?.({ ...result });
  return result;
}

export function failedPagesOnly(result: PacingRevisionQueueResult): number[] {
  return result.failures.map((failure) => failure.page);
}
