import { useEffect, useRef, type ReactNode } from 'react';
import type { PacingRevisionSet } from '@/shared/writer/pacingRevisionSchemas';
import { WriterPacingRevisionWorkspace } from './WriterPacingRevisionWorkspace';

type Props = {
  workflow: 'Simple' | 'Advanced';
  activeSet?: PacingRevisionSet | null;
  historySets: PacingRevisionSet[];
  selectedSet: PacingRevisionSet | null;
  loading: boolean;
  error: string | null;
  archiveBusy?: boolean;
  onRetry: () => Promise<void> | void;
  onSelect: (set: PacingRevisionSet) => void;
  onClose: () => void;
  onArchive?: (set: PacingRevisionSet) => Promise<void> | void;
};

const UNFINISHED_ARCHIVE_CONFIRMATION =
  'Move this unfinished Revision Set to Revision history? Its unfinished decisions and edits will become read-only. The live outline, Page Beats, and Dialogue will not change.';
const FAILED_ARCHIVE_CONFIRMATION =
  'Move this failed Revision Set to Revision history? Its failure details will be preserved as read-only history. The live outline, Page Beats, and Dialogue will not change.';
const APPLIED_ARCHIVE_CONFIRMATION =
  'Move this applied Revision Set to Revision history? “Undo applied set” will no longer be available here. Outline version history can restore an Outline version, but prior Page Beats, Dialogue, and pacing-created pages will no longer be recoverable through Undo. The live outline, Page Beats, and Dialogue will not change.';

function formatDate(value: string | null | undefined): string {
  if (!value) return 'date unavailable';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'date unavailable';
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function archiveConfirmation(set: PacingRevisionSet): string {
  if (set.status === 'applied') return APPLIED_ARCHIVE_CONFIRMATION;
  if (set.status === 'failed') return FAILED_ARCHIVE_CONFIRMATION;
  return UNFINISHED_ARCHIVE_CONFIRMATION;
}

function formatStatus(status: PacingRevisionSet['archived_from_status']): string {
  if (!status) return 'Unavailable';
  const normalized = status.replaceAll('_', ' ');
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function canArchive(set: PacingRevisionSet | null | undefined): set is PacingRevisionSet {
  return Boolean(set && ['ready', 'partially_ready', 'applied', 'failed'].includes(set.status));
}

export function WriterPacingRevisionHistory({
  workflow,
  activeSet,
  historySets,
  selectedSet,
  loading,
  error,
  archiveBusy = false,
  onRetry,
  onSelect,
  onClose,
  onArchive,
}: Props) {
  const archivedHeadingRef = useRef<HTMLHeadingElement>(null);
  const historySummaryRef = useRef<HTMLElement>(null);
  const restoreHistoryFocusRef = useRef(false);

  useEffect(() => {
    if (selectedSet) {
      archivedHeadingRef.current?.focus();
    } else if (restoreHistoryFocusRef.current) {
      restoreHistoryFocusRef.current = false;
      historySummaryRef.current?.focus();
    }
  }, [selectedSet]);

  if (selectedSet) {
    return (
      <section
        aria-labelledby={`pacing-archive-title-${workflow.toLowerCase()}`}
        className="space-y-3"
        data-testid={`pacing-revision-history-${workflow.toLowerCase()}`}
      >
        <div className="flex flex-wrap items-center justify-between gap-3 border-l-4 border-slate-700 bg-slate-100 px-4 py-3">
          <div className="min-w-0">
            <h3
              ref={archivedHeadingRef}
              id={`pacing-archive-title-${workflow.toLowerCase()}`}
              tabIndex={-1}
              className="font-serif text-lg font-semibold text-slate-950"
            >
              Archived Pacing Revision Set
            </h3>
            <p role="status" className="mt-1 text-xs font-bold text-slate-700">
              Archived revision set — official story content is unchanged.
            </p>
            <p className="mt-1 flex flex-wrap gap-x-2 text-[11px] text-slate-600">
              <span className="font-black uppercase tracking-wide">Archived</span>
              <span>Created on <time dateTime={selectedSet.created_at}>{formatDate(selectedSet.created_at)}</time></span>
              <span>Archived on <time dateTime={selectedSet.archived_at ?? undefined}>{formatDate(selectedSet.archived_at)}</time></span>
              <span>Previous status: {formatStatus(selectedSet.archived_from_status)}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              restoreHistoryFocusRef.current = true;
              onClose();
            }}
            className="border border-slate-400 bg-white px-3 py-2 text-xs font-black text-slate-800 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-700"
          >
            Back to current revision set
          </button>
        </div>
        <WriterPacingRevisionWorkspace
          revisionSet={selectedSet}
          advanced={workflow === 'Advanced'}
          onChange={() => undefined}
          onApply={() => undefined}
        />
      </section>
    );
  }

  return (
    <div
      className="flex min-w-0 flex-wrap items-start gap-3"
      data-testid={`pacing-revision-history-${workflow.toLowerCase()}`}
    >
      {canArchive(activeSet) && onArchive && (
        <button
          type="button"
          disabled={archiveBusy}
          onClick={() => {
            if (!window.confirm(archiveConfirmation(activeSet))) return;
            void onArchive(activeSet);
          }}
          className="border border-slate-400 bg-white px-3 py-2 text-xs font-black text-slate-800 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {archiveBusy ? 'Archiving…' : 'Archive revision set'}
        </button>
      )}
      <details className="min-w-[min(100%,18rem)] max-w-full border border-slate-300 bg-white">
        <summary
          ref={historySummaryRef}
          className="cursor-pointer px-3 py-2 text-xs font-black text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-amber-600"
        >
          Revision history ({historySets.length})
        </summary>
        <div className="border-t border-slate-200 p-3">
          {loading ? (
            <p role="status" className="text-xs text-slate-600">Loading revision history…</p>
          ) : error ? (
            <div role="alert" className="space-y-2 text-xs text-red-800">
              <p>{error}</p>
              <button
                type="button"
                onClick={() => void onRetry()}
                className="font-black underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-700"
              >
                Retry revision history
              </button>
            </div>
          ) : historySets.length === 0 ? (
            <p className="text-xs text-slate-600">No archived revision sets yet.</p>
          ) : (
            <ol className="max-h-72 space-y-2 overflow-y-auto">
              {historySets.map((set, index) => (
                <li
                  key={set.id}
                  className="flex min-w-0 flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-2 first:border-t-0 first:pt-0"
                >
                  <span className="min-w-0 break-words text-[11px] text-slate-600">
                    <strong className="mr-2 uppercase tracking-wide text-slate-800">Archived</strong>
                    <span className="mr-2">Created <time dateTime={set.created_at}>{formatDate(set.created_at)}</time></span>
                    <span className="mr-2">Archived <time dateTime={set.archived_at ?? undefined}>{formatDate(set.archived_at)}</time></span>
                    <span>Previous status: {formatStatus(set.archived_from_status)}</span>
                  </span>
                  <button
                    type="button"
                    aria-label={`View archived revision set ${index + 1} of ${historySets.length}`}
                    onClick={() => onSelect(set)}
                    className="text-xs font-black text-slate-800 underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-700"
                  >
                    View archived revision set
                  </button>
                </li>
              ))}
            </ol>
          )}
        </div>
      </details>
    </div>
  );
}

type LayoutProps = Props & {
  archiveStatus?: string | null;
  children?: ReactNode;
};

export function WriterPacingRevisionHistoryLayout({
  archiveStatus,
  children,
  ...historyProps
}: LayoutProps) {
  const workflowId = historyProps.workflow.toLowerCase();
  return (
    <div
      className="space-y-3"
      data-testid={`pacing-revision-history-layout-${workflowId}`}
    >
      {archiveStatus && (
        <div role="status" className="border-l-4 border-emerald-600 bg-emerald-50 px-4 py-3 text-xs font-bold text-emerald-950">
          {archiveStatus}
        </div>
      )}
      <WriterPacingRevisionHistory {...historyProps} />
      {!historyProps.selectedSet && children}
    </div>
  );
}
