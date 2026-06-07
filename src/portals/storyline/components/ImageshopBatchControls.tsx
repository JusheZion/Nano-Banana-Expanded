import {
  getLatestImageshopBatchAttempts,
  type ImageshopBatchGenerationAttempt,
  type ImageshopBatchRetryStrategy,
} from '@/portals/storyline/imageshopBatchGeneration';

export type ImageshopBatchUiStatus = 'idle' | 'running' | 'paused' | 'completed';

export function ImageshopBatchControls({
  status,
  attempts,
  totalItems,
  canGenerate,
  onGeneratePage,
  onGenerateAll,
  onRetryFailed,
  onPause,
  onResume,
  onSkipSelected,
}: {
  status: ImageshopBatchUiStatus;
  attempts: ImageshopBatchGenerationAttempt[];
  totalItems: number;
  canGenerate: boolean;
  onGeneratePage: () => void;
  onGenerateAll: () => void;
  onRetryFailed: (strategy: ImageshopBatchRetryStrategy) => void;
  onPause: () => void;
  onResume: () => void;
  onSkipSelected: () => void;
}) {
  const running = status === 'running';
  const latestAttempts = getLatestImageshopBatchAttempts(attempts);
  const failedAttempts = latestAttempts.filter((attempt) => attempt.status === 'failed');
  const generatedAttempts = latestAttempts.filter((attempt) => attempt.status === 'generated');
  const skippedAttempts = latestAttempts.filter((attempt) => attempt.status === 'skipped');
  const elapsedMs = attempts.reduce((total, attempt) => total + attempt.elapsedMs, 0);

  return (
    <div className="border border-white/10 bg-black/25 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/45">Batch generation</p>
        <span className="text-[10px] uppercase text-white/55">{status}</span>
      </div>

      <div className="mt-2 grid grid-cols-4 gap-1 text-center text-[10px]">
        <div className="border border-white/10 p-1.5">
          <span className="block text-white/40">Total</span>
          <strong className="text-white/75">{totalItems}</strong>
        </div>
        <div className="border border-white/10 p-1.5">
          <span className="block text-white/40">Generated</span>
          <strong className="text-emerald-200">{generatedAttempts.length}</strong>
        </div>
        <div className="border border-white/10 p-1.5">
          <span className="block text-white/40">Failed</span>
          <strong className="text-rose-200">{failedAttempts.length}</strong>
        </div>
        <div className="border border-white/10 p-1.5">
          <span className="block text-white/40">Elapsed</span>
          <strong className="text-white/75">{(elapsedMs / 1000).toFixed(1)}s</strong>
        </div>
      </div>

      <div className="mt-2 flex flex-wrap gap-1.5">
        <button
          type="button"
          disabled={!canGenerate || running}
          onClick={onGeneratePage}
          className="border border-white/15 bg-white/5 px-2 py-1 text-[10px] text-white/75 disabled:opacity-40"
        >
          Generate page
        </button>
        <button
          type="button"
          disabled={!canGenerate || running}
          onClick={onGenerateAll}
          className="border border-white/15 bg-white/5 px-2 py-1 text-[10px] text-white/75 disabled:opacity-40"
        >
          Generate all drafts
        </button>
        <button
          type="button"
          disabled={!running}
          onClick={onPause}
          className="border border-amber-200/25 bg-amber-300/10 px-2 py-1 text-[10px] text-amber-100 disabled:opacity-40"
        >
          Pause batch
        </button>
        <button
          type="button"
          disabled={status !== 'paused'}
          onClick={onResume}
          className="border border-emerald-200/25 bg-emerald-300/10 px-2 py-1 text-[10px] text-emerald-100 disabled:opacity-40"
        >
          Resume batch
        </button>
        <button
          type="button"
          disabled={running}
          onClick={onSkipSelected}
          className="border border-white/15 bg-white/5 px-2 py-1 text-[10px] text-white/65 disabled:opacity-40"
        >
          Skip selected panel
        </button>
      </div>

      <div className="mt-2 flex flex-wrap gap-1.5">
        <button
          type="button"
          disabled={failedAttempts.length === 0 || running}
          onClick={() => onRetryFailed('normal')}
          className="border border-rose-200/25 bg-rose-300/10 px-2 py-1 text-[10px] text-rose-50 disabled:opacity-40"
        >
          Retry failed panels
        </button>
        <button
          type="button"
          disabled={failedAttempts.length === 0 || running}
          onClick={() => onRetryFailed('without-failed-refs')}
          className="border border-rose-200/25 bg-rose-300/10 px-2 py-1 text-[10px] text-rose-50 disabled:opacity-40"
        >
          Retry without failed refs
        </button>
        <button
          type="button"
          disabled={failedAttempts.length === 0 || running}
          onClick={() => onRetryFailed('smaller-refs')}
          className="border border-rose-200/25 bg-rose-300/10 px-2 py-1 text-[10px] text-rose-50 disabled:opacity-40"
        >
          Retry smaller refs
        </button>
        <button
          type="button"
          disabled={failedAttempts.length === 0 || running}
          onClick={() => onRetryFailed('fallback-model')}
          className="border border-rose-200/25 bg-rose-300/10 px-2 py-1 text-[10px] text-rose-50 disabled:opacity-40"
        >
          Retry fallback model
        </button>
      </div>

      {failedAttempts[failedAttempts.length - 1] ? (
        <p className="mt-2 text-[10px] text-rose-100/80">
          Last failure: {failedAttempts[failedAttempts.length - 1].errorClass} ·{' '}
          {failedAttempts[failedAttempts.length - 1].errorMessage}
        </p>
      ) : skippedAttempts.length > 0 ? (
        <p className="mt-2 text-[10px] text-white/45">{skippedAttempts.length} panel skipped.</p>
      ) : null}
    </div>
  );
}
