import { memo } from 'react';

export const WriterLoreLoadError = memo(function WriterLoreLoadError({
  error,
  loading,
  onRetry,
}: {
  error: string | null;
  loading: boolean;
  onRetry: () => void;
}) {
  if (!error) return null;
  return (
    <div
      role="alert"
      className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-md border border-red-800/20 bg-red-100/90 px-3 py-2 text-xs font-semibold text-red-900"
    >
      <span>Story Canon could not be loaded: {error}</span>
      <button
        type="button"
        disabled={loading}
        onClick={onRetry}
        className="min-h-9 rounded-md border border-red-900/25 bg-white px-3 text-[10px] font-black uppercase tracking-wide text-red-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-700 disabled:opacity-45"
      >
        {loading ? 'Retrying…' : 'Retry'}
      </button>
    </div>
  );
});
