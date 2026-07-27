import { useEffect, useMemo, useState } from 'react';
import type {
  PacingRevisionChange,
  PacingRevisionDecisionPatch,
  PacingRevisionLayer,
  PacingRevisionSet,
} from '@/shared/writer/pacingRevisionSchemas';
import {
  approvedPacingRevisionChanges,
  effectivePacingRevisionCandidate,
  eligiblePacingRevisionChanges,
  flattenPacingRevisionChanges,
  pacingRevisionDependencyBlockers,
  pacingRevisionLayerSummary,
  pacingRevisionMissingDependencyIds,
} from './writerPacingRevisionModel';
import type { PacingRevisionRetryTarget } from './useWriterPacingRevisionSet';

type Props = {
  revisionSet: PacingRevisionSet;
  busy?: boolean;
  applying?: boolean;
  advanced?: boolean;
  onChange: (changeId: string, patch: PacingRevisionDecisionPatch) => Promise<void> | void;
  onApply: () => Promise<void> | void;
  onRetryFailed?: (targets: PacingRevisionRetryTarget[]) => Promise<void> | void;
  onNavigateToPage?: (
    pageNumber: number,
    destinationLayer: PacingRevisionLayer,
  ) => Promise<void> | void;
};

const LAYERS: Array<{ id: PacingRevisionLayer; label: string }> = [
  { id: 'outline', label: 'Live Outline' },
  { id: 'beats', label: 'Page Beats' },
  { id: 'dialogue', label: 'Dialogue' },
];

function destinationLayer(
  layer: PacingRevisionLayer,
): Extract<PacingRevisionLayer, 'beats' | 'dialogue'> {
  return layer === 'dialogue' ? 'dialogue' : 'beats';
}

function layerSummaryLabel(
  summary: ReturnType<typeof pacingRevisionLayerSummary>,
): string {
  const parts = [`${summary.remaining} remaining`];
  if (summary.ready > 0) parts.push(`${summary.ready} ready`);
  if (summary.applied > 0) parts.push(`${summary.applied} applied`);
  return parts.join(' · ');
}

function sidebarStatus(change: PacingRevisionChange): string {
  if (change.generation_status === 'applied') return 'Applied';
  if (change.decision === 'rejected') return 'Rejected';
  if (change.decision === 'approved') return 'Approved';
  return 'Pending';
}

function proposedBeat(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const record = value as Record<string, unknown>;
  const nested = record.proposed_beat;
  return nested && typeof nested === 'object' && !Array.isArray(nested)
    ? nested as Record<string, unknown>
    : record;
}

function readableValue(layer: PacingRevisionLayer, value: unknown): string {
  if (value == null) return 'No saved content.';
  if (typeof value === 'string') return value;
  if (layer === 'outline') {
    const values = Array.isArray(value) ? value : [proposedBeat(value)];
    return values.map((entry) => {
      if (!entry || typeof entry !== 'object') return String(entry);
      const record = entry as Record<string, unknown>;
      return [record.scene, record.summary ?? record.text, record.emotional_turn]
        .filter((part): part is string => typeof part === 'string' && Boolean(part.trim()))
        .join('\n');
    }).filter(Boolean).join('\n\n') || 'No readable outline text.';
  }
  if (layer === 'beats') {
    const panels = (value as { panels?: unknown }).panels;
    if (!Array.isArray(panels)) return 'No panel beats.';
    return panels.map((panel, index) => {
      const action = panel && typeof panel === 'object'
        ? (panel as { action?: unknown }).action
        : null;
      return `Panel ${index + 1}: ${typeof action === 'string' ? action : 'Action missing'}`;
    }).join('\n');
  }
  return String(value);
}

function editedCandidateFromText(change: PacingRevisionChange, text: string): unknown {
  if (change.layer === 'dialogue') return text;
  if (change.layer === 'outline') {
    const proposal = change.ai_proposal && typeof change.ai_proposal === 'object'
      ? change.ai_proposal as Record<string, unknown>
      : {};
    const beat = proposedBeat(proposal);
    return {
      ...proposal,
      proposed_beat: { ...beat, summary: text.trim() },
    };
  }
  const proposal = change.ai_proposal && typeof change.ai_proposal === 'object'
    ? change.ai_proposal as Record<string, unknown>
    : {};
  const panels = Array.isArray(proposal.panels) ? proposal.panels : [];
  const actions = text.split('\n').map((line) => line.replace(/^Panel \d+:\s*/, '').trim());
  return {
    ...proposal,
    panels: panels.map((panel, index) => ({
      ...(panel && typeof panel === 'object' ? panel : {}),
      action: actions[index] ?? '',
    })),
  };
}

function editableValue(change: PacingRevisionChange): string {
  const value = effectivePacingRevisionCandidate(change);
  if (change.layer === 'outline') {
    const summary = proposedBeat(value).summary;
    return typeof summary === 'string' ? summary : '';
  }
  return readableValue(change.layer, value);
}

export function WriterPacingRevisionWorkspace({
  revisionSet,
  busy = false,
  applying = false,
  advanced = false,
  onChange,
  onApply,
  onRetryFailed,
  onNavigateToPage,
}: Props) {
  const allChanges = useMemo(() => flattenPacingRevisionChanges(revisionSet), [revisionSet]);
  const [layer, setLayer] = useState<PacingRevisionLayer>('outline');
  const [activeChangeId, setActiveChangeId] = useState<string | null>(
    allChanges.find((change) => change.layer === 'outline')?.id ?? allChanges[0]?.id ?? null,
  );
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [showFailures, setShowFailures] = useState(false);
  const [missingPreview, setMissingPreview] = useState<{
    page: number;
    layer: Extract<PacingRevisionLayer, 'beats' | 'dialogue'>;
  } | null>(null);
  const failureRegionId = 'pacing-failed-layer-details';
  const archived = revisionSet.status === 'archived';
  const terminal = revisionSet.status === 'applied'
    || revisionSet.status === 'archived'
    || revisionSet.status === 'discarded';

  const visibleItems = revisionSet.items.filter((item) =>
    item.changes.some((change) => change.layer === layer)
  );
  const activeChange = missingPreview?.layer === layer
    ? null
    : allChanges.find((change) => change.id === activeChangeId && change.layer === layer)
      ?? visibleItems[0]?.changes.find((change) => change.layer === layer)
      ?? null;
  const activeChangeReadOnly = terminal
    || activeChange?.generation_status === 'applied'
    || activeChange?.decision === 'rejected';
  const activeLayerLabel = LAYERS.find((entry) => entry.id === layer)?.label ?? 'current tab';
  const activeLayerEligible = terminal
    ? []
    : eligiblePacingRevisionChanges(revisionSet, { layer });
  const selectableChanges = useMemo(
    () => terminal ? [] : eligiblePacingRevisionChanges(revisionSet),
    [revisionSet, terminal],
  );
  const selectedEligible = activeLayerEligible.filter((change) => selectedIds.has(change.id));
  const allActiveEligibleSelected = activeLayerEligible.length > 0
    && activeLayerEligible.every((change) => selectedIds.has(change.id));
  const pendingCount = allChanges.filter((change) => change.decision === 'pending').length;
  const approvedEligibleCount = approvedPacingRevisionChanges(revisionSet).length;
  const failureRows = useMemo(() => {
    if (terminal) return [];
    const readyLayers = new Map<number, Set<'beats' | 'dialogue'>>();
    for (const change of allChanges) {
      if (
        change.page_number == null
        || !['beats', 'dialogue'].includes(change.layer)
        || !['ready', 'applied'].includes(change.generation_status)
      ) continue;
      const layers = readyLayers.get(change.page_number) ?? new Set<'beats' | 'dialogue'>();
      layers.add(change.layer as 'beats' | 'dialogue');
      readyLayers.set(change.page_number, layers);
    }
    const rows = new Map<string, {
      page: number;
      layer: 'beats' | 'dialogue';
      reason: string;
    }>();
    for (const failure of revisionSet.failure_ledger) {
      const layers = failure.layer
        ? [failure.layer]
        : (['beats', 'dialogue'] as const).filter(
          (candidate) => !readyLayers.get(failure.page_number)?.has(candidate)
        );
      for (const failedLayer of layers) {
        const key = `${failure.page_number}:${failedLayer}`;
        if (!rows.has(key)) {
          rows.set(key, {
            page: failure.page_number,
            layer: failedLayer,
            reason: failure.reason,
          });
        }
      }
    }
    const affectedPages = new Set(
      revisionSet.items.flatMap((item) => item.affected_page_numbers)
    );
    for (const page of affectedPages) {
      for (const missingLayer of ['beats', 'dialogue'] as const) {
        if (readyLayers.get(page)?.has(missingLayer)) continue;
        const key = `${page}:${missingLayer}`;
        if (!rows.has(key)) {
          rows.set(key, {
            page,
            layer: missingLayer,
            reason: 'Candidate has not been generated yet.',
          });
        }
      }
    }
    return [...rows.values()].sort((a, b) =>
      a.page - b.page || (a.layer === 'beats' ? -1 : 1)
    );
  }, [allChanges, revisionSet.failure_ledger, revisionSet.items, terminal]);
  const approvedChanges = allChanges.filter((change) => change.decision === 'approved');
  const allApprovedChangesApplied = approvedChanges.length > 0
    && approvedChanges.every((change) => change.generation_status === 'applied');
  const applyLabel = revisionSet.status === 'applied'
    ? 'All approved changes applied'
    : allApprovedChangesApplied
      ? 'All approved changes applied'
      : revisionSet.status === 'discarded'
        ? 'Revision discarded'
        : 'Apply approved changes';

  useEffect(() => {
    const eligibleIds = new Set(selectableChanges.map((change) => change.id));
    setSelectedIds((current) => {
      const next = new Set([...current].filter((id) => eligibleIds.has(id)));
      if (
        next.size === current.size
        && [...next].every((id) => current.has(id))
      ) return current;
      return next;
    });
  }, [selectableChanges]);

  const chooseLayer = (nextLayer: PacingRevisionLayer) => {
    setLayer(nextLayer);
    setEditing(false);
    setMissingPreview(null);
    const first = allChanges.find((change) => change.layer === nextLayer);
    setActiveChangeId(first?.id ?? null);
  };

  const isVirtualPage = (
    pageNumber: number,
    item = revisionSet.items.find((candidate) =>
      candidate.affected_page_numbers.includes(pageNumber)
    ),
  ) => {
    const pageChanges = item?.changes.filter((change) => change.page_number === pageNumber) ?? [];
    if (pageChanges.some((change) => change.generation_status === 'applied')) return false;
    if (pageChanges.some((change) => change.page_id === null)) return true;
    if (pageChanges.some((change) => typeof change.page_id === 'string')) return false;
    if (!item?.changes.some((change) => change.page_id === null)) return false;
    const physicalPageNumbers = allChanges.flatMap((change) =>
      typeof change.page_id === 'string' && change.page_number != null
        ? [change.page_number]
        : []
    );
    return pageNumber > Math.max(0, ...physicalPageNumbers);
  };

  const openPage = (
    pageNumber: number,
    requestedLayer: PacingRevisionLayer,
    item = revisionSet.items.find((candidate) =>
      candidate.affected_page_numbers.includes(pageNumber)
    ),
  ) => {
    const nextLayer = destinationLayer(requestedLayer);
    if (!isVirtualPage(pageNumber, item)) {
      void onNavigateToPage?.(pageNumber, requestedLayer);
      return;
    }
    setLayer(nextLayer);
    setEditing(false);
    const matchingChange = item?.changes.find((change) =>
      change.layer === nextLayer && change.page_number === pageNumber
    ) ?? allChanges.find((change) =>
      change.layer === nextLayer && change.page_number === pageNumber
    );
    if (matchingChange) {
      setMissingPreview(null);
      setActiveChangeId(matchingChange.id);
      return;
    }
    setActiveChangeId(null);
    setMissingPreview({ page: pageNumber, layer: nextLayer });
  };

  const selectAllActiveLayer = () => {
    setSelectedIds((current) => {
      const next = new Set(current);
      for (const change of activeLayerEligible) next.add(change.id);
      return next;
    });
  };

  const clearActiveLayerSelection = () => {
    setSelectedIds((current) => {
      const next = new Set(current);
      for (const change of allChanges) {
        if (change.layer === layer) next.delete(change.id);
      }
      return next;
    });
  };

  const batchDecision = async (decision: 'approved' | 'rejected') => {
    await Promise.all(selectedEligible.map((change) => onChange(change.id, { decision })));
    const actedOnIds = new Set(selectedEligible.map((change) => change.id));
    setSelectedIds((current) => {
      const next = new Set(current);
      for (const changeId of actedOnIds) next.delete(changeId);
      return next;
    });
  };

  return (
    <section aria-labelledby="pacing-revision-title" className="overflow-hidden border border-slate-300 bg-[#f4f0e7] text-slate-950 shadow-xl">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-300 bg-slate-950 px-5 py-4 text-white">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-300">Story Review · Revision Set</p>
          <h2 id="pacing-revision-title" className="mt-1 font-serif text-2xl font-semibold">Pacing revision workspace</h2>
          <p aria-live="polite" className="mt-1 text-xs text-white/65">{pendingCount} pending · {approvedEligibleCount} ready to apply · {failureRows.length} failed or missing layers</p>
        </div>
        <div>
          {revisionSet.status === 'applied' && (
            <span role="status" aria-live="polite" className="sr-only">{applyLabel}</span>
          )}
          {archived ? (
            <span className="border border-white/30 px-4 py-2 text-xs font-black uppercase tracking-wide text-white/80">
              Archived · read-only
            </span>
          ) : (
            <button
              type="button"
              disabled={busy || terminal || approvedEligibleCount === 0}
              onClick={() => void onApply()}
              className="bg-amber-300 px-5 py-2.5 text-xs font-black text-slate-950 transition hover:bg-amber-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              {applying ? 'Applying…' : applyLabel}
            </button>
          )}
        </div>
      </header>

      <div className="flex overflow-x-auto border-b border-slate-300 bg-white" role="tablist" aria-label="Revision layers">
        {LAYERS.map((entry) => {
          const summary = pacingRevisionLayerSummary(revisionSet, entry.id);
          return (
            <button
              key={entry.id}
              type="button"
              role="tab"
              aria-selected={layer === entry.id}
              onClick={() => chooseLayer(entry.id)}
              className={`min-w-fit border-b-2 px-5 py-3 text-xs font-black transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-amber-500 ${
                layer === entry.id
                  ? 'border-amber-500 bg-amber-50 text-slate-950'
                  : 'border-transparent text-slate-500 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              {entry.label} <span className="ml-1 text-[10px] opacity-60">· {layerSummaryLabel(summary)}</span>
            </button>
          );
        })}
      </div>

      {failureRows.length > 0 && (
        <div className="border-b border-red-200 bg-red-50 px-5 py-3 text-xs text-red-900">
          <div role="alert" className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <strong>{failureRows.length} failed or missing layers need attention.</strong>
              {layer === 'outline' && (
                <p className="mt-1">Page Beats and Dialogue failures do not prevent Outline approval.</p>
              )}
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                aria-expanded={showFailures}
                aria-controls={failureRegionId}
                onClick={() => setShowFailures((current) => !current)}
                className="font-black underline decoration-2 underline-offset-2 transition-colors hover:text-red-700 active:text-red-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600"
              >
                {showFailures ? 'Hide failed layers' : 'Show failed layers'}
              </button>
              {onRetryFailed && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void onRetryFailed(failureRows.map(({ page, layer: failedLayer }) => ({ page, layer: failedLayer })))}
                  className="font-black underline decoration-2 underline-offset-2 transition-colors hover:text-red-700 active:text-red-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Retry all failed layers
                </button>
              )}
            </div>
          </div>
          {showFailures && (
            <ul
              id={failureRegionId}
              data-testid="pacing-recovery-list"
              className="mt-3 max-h-80 space-y-2 overflow-y-auto overscroll-contain pr-2"
            >
              {failureRows.map((failure) => {
                const layerLabel = failure.layer === 'beats' ? 'Page Beats' : 'Dialogue';
                return (
                  <li key={`${failure.page}:${failure.layer}`} className="flex flex-wrap items-center justify-between gap-3 border-t border-red-200 pt-2">
                    <span><strong>Page {failure.page} · {layerLabel}:</strong> {failure.reason}</span>
                    <span className="flex gap-3">
                      {onNavigateToPage && (
                        <button type="button" disabled={busy} aria-label={`Open page ${failure.page} for ${layerLabel}`} onClick={() => openPage(failure.page, failure.layer)} className="font-black underline transition-colors hover:text-red-700 active:text-red-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 disabled:cursor-not-allowed disabled:opacity-40">
                          Open page {failure.page}
                        </button>
                      )}
                      {onRetryFailed && (
                        <button type="button" disabled={busy} aria-label={`Retry ${layerLabel} for page ${failure.page}`} onClick={() => void onRetryFailed([{ page: failure.page, layer: failure.layer }])} className="font-black underline transition-colors hover:text-red-700 active:text-red-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 disabled:cursor-not-allowed disabled:opacity-40">
                          Retry {layerLabel}
                        </button>
                      )}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      <div className="grid min-h-[520px] grid-cols-[minmax(0,1fr)] lg:grid-cols-[260px_minmax(0,1fr)]">
        <nav aria-label="Revision items" className="flex min-w-0 flex-col border-b border-slate-300 bg-[#e7e0d2] lg:max-h-[520px] lg:border-b-0 lg:border-r">
          <div className="flex shrink-0 items-center justify-between px-4 py-3">
            <span className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-600">Revision items</span>
            <span className="text-[10px] font-bold text-slate-500">{visibleItems.length}</span>
          </div>
          {!terminal && <div className="flex shrink-0 flex-wrap items-center gap-2 border-t border-slate-300/70 px-3 py-2">
            <button
              type="button"
              disabled={busy || activeLayerEligible.length === 0 || allActiveEligibleSelected}
              onClick={selectAllActiveLayer}
              className="text-[10px] font-black text-slate-700 underline underline-offset-2 transition-colors hover:text-amber-800 active:text-amber-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Select all in {activeLayerLabel}
            </button>
            <button
              type="button"
              disabled={busy || selectedEligible.length === 0}
              onClick={clearActiveLayerSelection}
              className="text-[10px] font-black text-slate-600 underline underline-offset-2 transition-colors hover:text-slate-950 active:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Clear {activeLayerLabel} selection
            </button>
          </div>}
          <ol data-testid="pacing-revision-item-list" className="max-h-60 min-h-0 flex-1 overflow-y-auto lg:max-h-none">
            {visibleItems.map((item) => (
              <li key={item.id}>
                <div className="border-y border-slate-300/70 px-4 py-2 text-[10px] font-black uppercase tracking-wide text-slate-600">
                  <p>{item.title}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    <span>{layer === 'outline' ? 'Affected pages' : 'Pages'}</span>
                    {item.affected_page_numbers.map((pageNumber) => {
                      const nextLayer = destinationLayer(layer);
                      const virtual = isVirtualPage(pageNumber, item);
                      const layerLabel = nextLayer === 'beats' ? 'Page Beats' : 'Dialogue';
                      return (
                        <button
                          key={pageNumber}
                          type="button"
                          aria-label={virtual
                            ? `Open virtual page ${pageNumber} ${layerLabel} preview`
                            : `Open page ${pageNumber} in ${layerLabel}`}
                          onClick={() => openPage(pageNumber, layer, item)}
                          className="min-h-7 min-w-7 border border-slate-400 bg-white/70 px-1.5 text-[10px] font-black text-slate-800 transition-colors hover:border-amber-600 hover:bg-amber-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-700"
                        >
                          {pageNumber}
                        </button>
                      );
                    })}
                  </div>
                </div>
                {item.changes.filter((change) => change.layer === layer).map((change) => (
                  <div key={change.id} className={`flex items-start gap-2 px-3 py-2 ${activeChange?.id === change.id ? 'bg-white' : 'hover:bg-white/55'}`}>
                    {!terminal && <input
                      type="checkbox"
                      aria-label={`Select ${item.title} ${layer} change`}
                      checked={selectedIds.has(change.id)}
                      disabled={busy || terminal || !activeLayerEligible.some((eligible) => eligible.id === change.id)}
                      onChange={(event) => {
                        const next = new Set(selectedIds);
                        if (event.target.checked) next.add(change.id);
                        else next.delete(change.id);
                        setSelectedIds(next);
                      }}
                      className="mt-1 accent-amber-600"
                    />}
                    <button
                      type="button"
                      onClick={() => {
                        setActiveChangeId(change.id);
                        setEditing(false);
                        setMissingPreview(null);
                      }}
                      className="min-w-0 flex-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600"
                    >
                      <span className="block truncate text-xs font-bold">{change.reason}</span>
                      <span className="mt-1 block text-[10px] font-black uppercase text-slate-500">{sidebarStatus(change)}</span>
                    </button>
                  </div>
                ))}
              </li>
            ))}
          </ol>
          {!terminal && <div data-testid="pacing-batch-footer" className="sticky bottom-0 z-10 flex shrink-0 gap-2 border-t border-slate-300 bg-[#e7e0d2] p-3 shadow-[0_-8px_16px_-16px_rgba(15,23,42,0.8)]">
            <button type="button" disabled={busy || selectedEligible.length === 0} onClick={() => void batchDecision('approved')} className="flex-1 bg-emerald-700 px-2 py-2 text-[10px] font-black text-white transition-colors hover:bg-emerald-600 active:bg-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-900 disabled:cursor-not-allowed disabled:opacity-40">Approve selected ({selectedEligible.length})</button>
            <button type="button" disabled={busy || selectedEligible.length === 0} onClick={() => void batchDecision('rejected')} className="flex-1 bg-slate-700 px-2 py-2 text-[10px] font-black text-white transition-colors hover:bg-slate-600 active:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 disabled:cursor-not-allowed disabled:opacity-40">Reject selected ({selectedEligible.length})</button>
          </div>}
        </nav>

        <main className="min-w-0 bg-white/65 p-4 md:p-6">
          {activeChange ? (
            <>
              {(() => {
                const blockers = pacingRevisionDependencyBlockers(activeChange, allChanges);
                const missingIds = pacingRevisionMissingDependencyIds(activeChange, allChanges);
                const blockerCount = blockers.length + missingIds.length;
                if (blockerCount === 0) return null;
                return (
                <div role="note" className="mb-4 border-l-4 border-amber-500 bg-amber-50 px-4 py-3 text-xs text-amber-950">
                  This suggestion depends on {blockerCount} earlier change{blockerCount === 1 ? '' : 's'}. {blockerCount} unresolved dependenc{blockerCount === 1 ? 'y' : 'ies'} must be approved or applied before this suggestion is ready.
                  {blockers[0] && <button
                    type="button"
                    onClick={() => {
                      const dependency = blockers[0];
                      setLayer(dependency.layer);
                      setActiveChangeId(dependency.id);
                      setMissingPreview(null);
                    }}
                    className="ml-2 font-black underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-700"
                  >
                    Go to dependency
                  </button>}
                </div>
                );
              })()}
              <div className="mb-4 flex flex-wrap items-center gap-2 border-b border-slate-300 pb-3 text-xs font-black text-slate-700">
                <span>
                  {activeChange.layer === 'outline'
                    ? `Affected pages ${revisionSet.items.find((item) => item.id === activeChange.item_id)?.affected_page_numbers.join(', ') ?? 'unavailable'} · Live Outline`
                    : `Page ${activeChange.page_number ?? 'unavailable'} · ${activeChange.layer === 'beats' ? 'Page Beats' : 'Dialogue'}`}
                </span>
                {activeChange.page_id === null
                  && activeChange.layer !== 'outline'
                  && activeChange.generation_status !== 'applied'
                  && (
                  <span
                    role="status"
                    aria-live="polite"
                    className="bg-teal-100 px-2 py-1 text-[10px] uppercase tracking-wide text-teal-900"
                  >
                    Virtual page · will be created on Apply
                  </span>
                )}
              </div>
              <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-4 md:grid-cols-2" data-testid="revision-comparison-panels">
                <article className="min-w-0 border-t-4 border-slate-500 bg-slate-100 p-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
                    {archived
                      ? 'Archived current'
                      : activeChange.generation_status === 'applied'
                        ? 'Before this revision'
                        : 'Current live'}
                  </p>
                  <pre className="mt-3 whitespace-pre-wrap break-words font-sans text-sm leading-6 text-slate-800">{readableValue(activeChange.layer, activeChange.current_value)}</pre>
                </article>
                <article className="min-w-0 border-t-4 border-amber-500 bg-amber-50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-amber-800">
                      {archived
                        ? 'Archived proposal'
                        : activeChange.generation_status === 'applied'
                        ? 'Applied revision'
                        : activeChange.decision === 'rejected'
                          ? 'Rejected proposal'
                          : activeChange.decision === 'approved'
                            ? 'Approved proposal'
                            : activeChange.edited_candidate == null
                              ? 'AI proposal'
                              : 'Edited candidate'}
                    </p>
                    {!activeChangeReadOnly && <button
                      type="button"
                      onClick={() => {
                        setDraft(editableValue(activeChange));
                        setEditing(true);
                      }}
                      className="text-[10px] font-black underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-700"
                    >
                      Edit suggestion
                    </button>}
                  </div>
                  {editing && !activeChangeReadOnly ? (
                    <div className="mt-3">
                      <label className="sr-only" htmlFor={`pacing-edit-${activeChange.id}`}>Edit suggested change</label>
                      <textarea id={`pacing-edit-${activeChange.id}`} value={draft} onChange={(event) => setDraft(event.target.value)} className="min-h-44 w-full resize-y border border-amber-300 bg-white p-3 text-sm leading-6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600" />
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button type="button" onClick={() => { void onChange(activeChange.id, { edited_candidate: editedCandidateFromText(activeChange, draft) }); setEditing(false); }} className="bg-slate-950 px-3 py-2 text-xs font-black text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600">Save edit</button>
                        <button type="button" onClick={() => setEditing(false)} className="px-3 py-2 text-xs font-black text-slate-600 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500">Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <pre className="mt-3 whitespace-pre-wrap break-words font-sans text-sm leading-6 text-slate-900">{readableValue(activeChange.layer, effectivePacingRevisionCandidate(activeChange))}</pre>
                  )}
                  {activeChange.edited_candidate != null && !editing && !activeChangeReadOnly && (
                    <button type="button" onClick={() => void onChange(activeChange.id, { edited_candidate: null })} className="mt-3 text-xs font-black text-amber-900 underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-700">Reset to AI proposal</button>
                  )}
                </article>
              </div>
              {!activeChangeReadOnly && <div className="mt-4 flex flex-wrap justify-end gap-2 border-t border-slate-300 pt-4">
                <button type="button" aria-pressed={activeChange.decision === 'rejected'} disabled={busy} onClick={() => void onChange(activeChange.id, { decision: 'rejected' })} className={`px-4 py-2 text-xs font-black text-red-700 hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-700 disabled:opacity-40 ${activeChange.decision === 'rejected' ? 'bg-red-100 ring-1 ring-red-300' : ''}`}>Reject</button>
                <button type="button" aria-pressed={activeChange.decision === 'pending'} disabled={busy} onClick={() => void onChange(activeChange.id, { decision: 'pending' })} className={`px-4 py-2 text-xs font-black text-slate-600 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-600 disabled:opacity-40 ${activeChange.decision === 'pending' ? 'bg-slate-200 ring-1 ring-slate-300' : ''}`}>Decide later</button>
                <button type="button" aria-pressed={activeChange.decision === 'approved'} disabled={busy} onClick={() => void onChange(activeChange.id, { decision: 'approved' })} className={`bg-emerald-700 px-5 py-2 text-xs font-black text-white hover:bg-emerald-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-950 disabled:opacity-40 ${activeChange.decision === 'approved' ? 'ring-2 ring-emerald-950 ring-offset-2' : ''}`}>Approve change</button>
              </div>}
              {advanced && (
                <details className="mt-5 border-t border-slate-300 pt-3 text-xs">
                  <summary className="cursor-pointer font-black">Advanced details</summary>
                  <pre className="mt-2 max-h-60 overflow-auto bg-slate-950 p-3 text-[10px] text-slate-100">{JSON.stringify(activeChange, null, 2)}</pre>
                </details>
              )}
            </>
          ) : missingPreview?.layer === layer ? (
            <div className="flex min-h-[420px] items-center justify-center text-center">
              <div>
                <p className="font-serif text-xl font-semibold">
                  Page {missingPreview.page} {missingPreview.layer === 'beats' ? 'Page Beats' : 'Dialogue'} preview has not been generated yet.
                </p>
                <p className="mt-2 text-sm text-slate-500">Use the failed-layer recovery action to generate this virtual-page preview.</p>
                {onRetryFailed && !terminal && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void onRetryFailed([{
                      page: missingPreview.page,
                      layer: missingPreview.layer,
                    }])}
                    className="mt-4 bg-slate-950 px-4 py-2 text-xs font-black text-white transition-colors hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Retry {missingPreview.layer === 'beats' ? 'Page Beats' : 'Dialogue'} for virtual page {missingPreview.page}
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="flex min-h-[420px] items-center justify-center text-center">
              <div>
                <p className="font-serif text-xl font-semibold">No {LAYERS.find((entry) => entry.id === layer)?.label} changes</p>
                <p className="mt-2 text-sm text-slate-500">This layer has no generated suggestions in the current Revision Set.</p>
              </div>
            </div>
          )}
        </main>
      </div>
    </section>
  );
}
