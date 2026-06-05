import type {
  GeminiImageDiagnostic,
  OnyxModelId,
} from '@/shared/api/geminiImageApi';

export type ImageshopBatchRetryStrategy =
  | 'normal'
  | 'without-failed-refs'
  | 'smaller-refs'
  | 'fallback-model';

export type ImageshopBatchGenerationItem = {
  queueItemId: string;
  pageNumber: number;
  panelNumber: number;
  prompt: string;
  model: OnyxModelId;
  references: Array<{
    imageUrl: string;
    status?: 'unknown' | 'ready' | 'failed';
  }>;
  skip?: boolean;
};

export type ImageshopBatchGenerationAttempt = {
  id: string;
  queueItemId: string;
  pageNumber: number;
  panelNumber: number;
  status: 'generated' | 'failed' | 'skipped';
  model: OnyxModelId;
  promptHash: string;
  referenceCount: number;
  elapsedMs: number;
  seed: number | null;
  retryCount: number;
  strategy: ImageshopBatchRetryStrategy;
  imageUrl?: string;
  errorClass?: GeminiImageDiagnostic['errorClass'];
  errorMessage?: string;
  suggestedAction?: GeminiImageDiagnostic['suggestedAction'];
};

export type ImageshopBatchExecutionResult =
  | {
      ok: true;
      imageUrl: string;
      seed: number | null;
    }
  | {
      ok: false;
      diagnostic: GeminiImageDiagnostic;
    };

export type ImageshopBatchExecutionInput = {
  item: ImageshopBatchGenerationItem;
  model: OnyxModelId;
  referenceUrls: string[];
  strategy: ImageshopBatchRetryStrategy;
  retryCount: number;
};

export type ImageshopBatchGenerationResult = {
  status: 'completed' | 'paused';
  attempts: ImageshopBatchGenerationAttempt[];
  nextIndex: number;
  completedCount: number;
  failedCount: number;
  skippedCount: number;
};

function promptHash(prompt: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < prompt.length; index += 1) {
    hash ^= prompt.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return `fnv1a-${(hash >>> 0).toString(16).padStart(8, '0')}`;
}

function referencesForStrategy(
  item: ImageshopBatchGenerationItem,
  strategy: ImageshopBatchRetryStrategy,
): string[] {
  const references =
    strategy === 'without-failed-refs'
      ? item.references.filter((reference) => reference.status !== 'failed')
      : item.references;
  const urls = references.map((reference) => reference.imageUrl.trim()).filter(Boolean);
  return strategy === 'smaller-refs' ? urls.slice(0, 6) : urls;
}

function modelForStrategy(
  item: ImageshopBatchGenerationItem,
  strategy: ImageshopBatchRetryStrategy,
): OnyxModelId {
  return strategy === 'fallback-model' ? 'flash' : item.model;
}

function resultSummary(
  status: ImageshopBatchGenerationResult['status'],
  attempts: ImageshopBatchGenerationAttempt[],
  nextIndex: number,
): ImageshopBatchGenerationResult {
  return {
    status,
    attempts,
    nextIndex,
    completedCount: attempts.filter((attempt) => attempt.status === 'generated').length,
    failedCount: attempts.filter((attempt) => attempt.status === 'failed').length,
    skippedCount: attempts.filter((attempt) => attempt.status === 'skipped').length,
  };
}

export async function runImageshopGenerationBatch({
  items,
  execute,
  strategy = 'normal',
  startIndex = 0,
  previousAttempts = [],
  pauseOnFailure = false,
  shouldPause,
  onAttempt,
}: {
  items: ImageshopBatchGenerationItem[];
  execute: (input: ImageshopBatchExecutionInput) => Promise<ImageshopBatchExecutionResult>;
  strategy?: ImageshopBatchRetryStrategy;
  startIndex?: number;
  previousAttempts?: ImageshopBatchGenerationAttempt[];
  pauseOnFailure?: boolean;
  shouldPause?: () => boolean;
  onAttempt?: (attempt: ImageshopBatchGenerationAttempt) => void;
}): Promise<ImageshopBatchGenerationResult> {
  const attempts = [...previousAttempts];

  for (let index = startIndex; index < items.length; index += 1) {
    if (shouldPause?.()) return resultSummary('paused', attempts, index);
    const item = items[index];
    const retryCount = attempts.filter((attempt) => attempt.queueItemId === item.queueItemId).length;
    const model = modelForStrategy(item, strategy);
    const referenceUrls = referencesForStrategy(item, strategy);

    if (item.skip) {
      const attempt: ImageshopBatchGenerationAttempt = {
        id: `${item.queueItemId}-${Date.now()}-${attempts.length + 1}`,
        queueItemId: item.queueItemId,
        pageNumber: item.pageNumber,
        panelNumber: item.panelNumber,
        status: 'skipped',
        model,
        promptHash: promptHash(item.prompt),
        referenceCount: referenceUrls.length,
        elapsedMs: 0,
        seed: null,
        retryCount,
        strategy,
      };
      attempts.push(attempt);
      onAttempt?.(attempt);
      continue;
    }

    const startedAt = Date.now();
    const execution = await execute({
      item,
      model,
      referenceUrls,
      strategy,
      retryCount,
    });
    const elapsedMs = Math.max(0, Date.now() - startedAt);

    if (execution.ok) {
      const attempt: ImageshopBatchGenerationAttempt = {
        id: `${item.queueItemId}-${Date.now()}-${attempts.length + 1}`,
        queueItemId: item.queueItemId,
        pageNumber: item.pageNumber,
        panelNumber: item.panelNumber,
        status: 'generated',
        model,
        promptHash: promptHash(item.prompt),
        referenceCount: referenceUrls.length,
        elapsedMs,
        seed: execution.seed,
        retryCount,
        strategy,
        imageUrl: execution.imageUrl,
      };
      attempts.push(attempt);
      onAttempt?.(attempt);
      continue;
    }

    const attempt: ImageshopBatchGenerationAttempt = {
      id: `${item.queueItemId}-${Date.now()}-${attempts.length + 1}`,
      queueItemId: item.queueItemId,
      pageNumber: item.pageNumber,
      panelNumber: item.panelNumber,
      status: 'failed',
      model,
      promptHash: promptHash(item.prompt),
      referenceCount: referenceUrls.length,
      elapsedMs,
      seed: null,
      retryCount,
      strategy,
      errorClass: execution.diagnostic.errorClass,
      errorMessage: execution.diagnostic.message,
      suggestedAction: execution.diagnostic.suggestedAction,
    };
    attempts.push(attempt);
    onAttempt?.(attempt);
    if (pauseOnFailure) return resultSummary('paused', attempts, index + 1);
  }

  return resultSummary('completed', attempts, items.length);
}
