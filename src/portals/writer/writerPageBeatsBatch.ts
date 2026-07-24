export type WriterPageBeatsBatchError = {
  page_number: number;
  message: string;
};

export type WriterPageBeatsBatchFailure = {
  error: string;
  details?: string;
};

export function buildWriterPageBeatsSinglePageQueue(args: {
  pages: Array<{ id: string; hasBeats: boolean }>;
  allowedPageIds: string[];
  skipExisting: boolean;
}): string[][] {
  const allowed = new Set(args.allowedPageIds);
  return args.pages
    .filter(
      (page) =>
        allowed.has(page.id) &&
        (!args.skipExisting || !page.hasBeats),
    )
    .map((page) => [page.id]);
}

export function getWriterPageBeatsCheckpointProgress(args: {
  queueIndex: number;
  queueLength: number;
  checkpointSize: number;
}): {
  checkpointNumber: number;
  checkpointCount: number;
  positionInCheckpoint: number;
  pagesInCheckpoint: number;
  shouldRefresh: boolean;
} {
  const checkpointSize = Math.max(1, Math.floor(args.checkpointSize));
  const queueLength = Math.max(1, Math.floor(args.queueLength));
  const queueIndex = Math.min(
    queueLength - 1,
    Math.max(0, Math.floor(args.queueIndex)),
  );
  const checkpointNumber = Math.floor(queueIndex / checkpointSize) + 1;
  const checkpointCount = Math.ceil(queueLength / checkpointSize);
  const checkpointStart = (checkpointNumber - 1) * checkpointSize;
  const pagesInCheckpoint = Math.min(
    checkpointSize,
    queueLength - checkpointStart,
  );
  const positionInCheckpoint = queueIndex - checkpointStart + 1;

  return {
    checkpointNumber,
    checkpointCount,
    positionInCheckpoint,
    pagesInCheckpoint,
    shouldRefresh: positionInCheckpoint === pagesInCheckpoint,
  };
}

export function isRetryableWriterPageBeatsBatchFailure(
  failure: WriterPageBeatsBatchFailure,
): boolean {
  const message = `${failure.error} ${failure.details ?? ''}`.toLowerCase();
  if (
    /http (400|401|402|403|404|409|422)\b/.test(message) ||
    /not signed in|invalid response|validation failed/.test(message)
  ) {
    return false;
  }
  return (
    /failed to fetch|network|timeout|timed out|quota|rate limit/.test(message) ||
    /http (429|500|502|503|504|520|522|524|546)\b/.test(message) ||
    /edge function returned a non-2xx status code/.test(message)
  );
}

export function getWriterPageBeatsBatchRetryDelayMs(
  failure: WriterPageBeatsBatchFailure,
): number {
  const message = `${failure.error} ${failure.details ?? ''}`.toLowerCase();
  return /http 429|quota|rate limit/.test(message) ? 15_000 : 2_500;
}

export async function runWriterPageBeatsBatchRequestWithRetries<
  T extends
    | ({ success: false } & WriterPageBeatsBatchFailure)
    | ({ success: true } & Record<string, unknown>),
>(args: {
  skipExisting: boolean;
  invoke: () => Promise<T>;
  wait: (delayMs: number) => Promise<void>;
  onRetry?: (retry: {
    attempt: number;
    maxAttempts: number;
    delayMs: number;
    failure: WriterPageBeatsBatchFailure;
  }) => void;
  shouldAbort?: () => boolean;
}): Promise<T> {
  const maxRetries = 2;
  for (let attempt = 0; ; attempt += 1) {
    const result = await args.invoke();
    if (result.success) return result;
    if (
      !args.skipExisting ||
      attempt >= maxRetries ||
      args.shouldAbort?.() ||
      !isRetryableWriterPageBeatsBatchFailure(result)
    ) {
      return result;
    }
    const delayMs = getWriterPageBeatsBatchRetryDelayMs(result);
    args.onRetry?.({
      attempt: attempt + 1,
      maxAttempts: maxRetries,
      delayMs,
      failure: result,
    });
    await args.wait(delayMs);
  }
}

export function formatWriterPageBeatsBatchErrors(
  errors: WriterPageBeatsBatchError[],
): string {
  if (errors.length === 0) return '';
  const details = errors
    .map(({ page_number, message }) => `Page ${page_number}: ${message}`)
    .join('\n');
  return `Page Beats stopped because ${errors.length} page${errors.length === 1 ? '' : 's'} could not be generated.\n${details}\nThe completed pages were saved. Retry the failed pages after reviewing the message above.`;
}

export function shouldContinueWriterPageBeatsBatch(args: {
  errors: WriterPageBeatsBatchError[];
  hasMore: boolean;
}): boolean {
  return args.errors.length === 0 && args.hasMore;
}
