import type {
  GeminiImageDiagnostic,
  OnyxModelId,
} from '@/shared/api/geminiImageApi';
import {
  filterImageshopGenerationRequestReferences,
  hashImageshopGenerationPrompt,
  type ImageshopGenerationRequest,
} from '@/portals/storyline/imageshopGenerationRequest';

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
  request?: ImageshopGenerationRequest;
  model: OnyxModelId;
  references: Array<{
    id: string;
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
  referenceIds?: string[];
  failedReferenceIds?: string[];
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
      failedReferenceIds?: string[];
    };

export type ImageshopBatchExecutionInput = {
  item: ImageshopBatchGenerationItem;
  model: OnyxModelId;
  referenceUrls: string[];
  references: ImageshopBatchGenerationItem['references'];
  request?: ImageshopGenerationRequest;
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

export function getLatestImageshopBatchAttempts(
  attempts: readonly ImageshopBatchGenerationAttempt[],
): ImageshopBatchGenerationAttempt[] {
  const latestByPanel = new Map<
    string,
    { attempt: ImageshopBatchGenerationAttempt; index: number }
  >();
  attempts.forEach((attempt, index) => {
    latestByPanel.set(attempt.queueItemId, { attempt, index });
  });
  return [...latestByPanel.values()]
    .sort((left, right) => left.index - right.index)
    .map(({ attempt }) => attempt);
}

function referencesForStrategy(
  item: ImageshopBatchGenerationItem,
  strategy: ImageshopBatchRetryStrategy,
  failedReferenceIds: ReadonlySet<string>,
): ImageshopBatchGenerationItem['references'] {
  const references =
    strategy === 'without-failed-refs'
      ? item.references.filter(
          (reference) =>
            reference.status !== 'failed' && !failedReferenceIds.has(reference.id),
        )
      : item.references;
  return strategy === 'smaller-refs' ? references.slice(0, 6) : references;
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
  const latestAttempts = getLatestImageshopBatchAttempts(attempts);
  return {
    status,
    attempts,
    nextIndex,
    completedCount: latestAttempts.filter((attempt) => attempt.status === 'generated').length,
    failedCount: latestAttempts.filter((attempt) => attempt.status === 'failed').length,
    skippedCount: latestAttempts.filter((attempt) => attempt.status === 'skipped').length,
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
  onAttempt?: (attempt: ImageshopBatchGenerationAttempt) => void | Promise<void>;
}): Promise<ImageshopBatchGenerationResult> {
  const attempts = [...previousAttempts];

  for (let index = startIndex; index < items.length; index += 1) {
    if (shouldPause?.()) return resultSummary('paused', attempts, index);
    const item = items[index];
    const retryCount = attempts.filter((attempt) => attempt.queueItemId === item.queueItemId).length;
    const model = modelForStrategy(item, strategy);
    const failedReferenceIds = new Set(
      attempts
        .filter((attempt) => attempt.queueItemId === item.queueItemId)
        .flatMap((attempt) => attempt.failedReferenceIds ?? []),
    );
    const references = referencesForStrategy(item, strategy, failedReferenceIds);
    const referenceUrls = references.map((reference) => reference.imageUrl.trim()).filter(Boolean);
    const request = item.request
      ? filterImageshopGenerationRequestReferences(
          item.request,
          references.map((reference) => reference.id),
        )
      : undefined;

    if (item.skip) {
      const attempt: ImageshopBatchGenerationAttempt = {
        id: `${item.queueItemId}-${Date.now()}-${attempts.length + 1}`,
        queueItemId: item.queueItemId,
        pageNumber: item.pageNumber,
        panelNumber: item.panelNumber,
        status: 'skipped',
        model,
        promptHash: request?.promptHash ?? hashImageshopGenerationPrompt(item.prompt),
        referenceCount: referenceUrls.length,
        referenceIds: references.map((reference) => reference.id),
        elapsedMs: 0,
        seed: null,
        retryCount,
        strategy,
      };
      attempts.push(attempt);
      await onAttempt?.(attempt);
      continue;
    }

    const startedAt = Date.now();
    const execution = await execute({
      item,
      model,
      referenceUrls,
      references,
      request,
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
        promptHash: request?.promptHash ?? hashImageshopGenerationPrompt(item.prompt),
        referenceCount: referenceUrls.length,
        referenceIds: references.map((reference) => reference.id),
        elapsedMs,
        seed: execution.seed,
        retryCount,
        strategy,
        imageUrl: execution.imageUrl,
      };
      attempts.push(attempt);
      await onAttempt?.(attempt);
      continue;
    }

    const attempt: ImageshopBatchGenerationAttempt = {
      id: `${item.queueItemId}-${Date.now()}-${attempts.length + 1}`,
      queueItemId: item.queueItemId,
      pageNumber: item.pageNumber,
      panelNumber: item.panelNumber,
      status: 'failed',
      model,
      promptHash: request?.promptHash ?? hashImageshopGenerationPrompt(item.prompt),
      referenceCount: referenceUrls.length,
      referenceIds: references.map((reference) => reference.id),
      elapsedMs,
      seed: null,
      retryCount,
      strategy,
      errorClass: execution.diagnostic.errorClass,
      errorMessage: execution.diagnostic.message,
      suggestedAction: execution.diagnostic.suggestedAction,
      failedReferenceIds: execution.failedReferenceIds,
    };
    attempts.push(attempt);
    await onAttempt?.(attempt);
    if (pauseOnFailure) return resultSummary('paused', attempts, index + 1);
  }

  return resultSummary('completed', attempts, items.length);
}
