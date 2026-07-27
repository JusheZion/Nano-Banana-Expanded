type WriterPacingBatchStatusProps = {
  batchBusy: boolean;
  batchMode: 'pacing_review' | 'canon_check' | null;
  batchLabel: string;
  error: string | null;
};

export function WriterPacingBatchStatus({
  batchBusy,
  batchMode,
  batchLabel,
  error,
}: WriterPacingBatchStatusProps) {
  return (
    <>
      {batchBusy && batchMode === 'pacing_review' ? (
        <div
          role="status"
          aria-live="polite"
          className="border-l-4 border-teal-600 bg-white/80 px-4 py-3 text-xs font-bold text-slate-800"
        >
          Pacing {batchLabel || '…'}
        </div>
      ) : null}
      {error ? (
        <div
          role="alert"
          className="whitespace-pre-line border-l-4 border-red-600 bg-red-50 px-4 py-3 text-xs text-red-900"
        >
          <strong>Pacing needs attention.</strong> {error}
        </div>
      ) : null}
    </>
  );
}
