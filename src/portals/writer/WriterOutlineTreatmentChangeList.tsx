import { useMemo, useState } from 'react';
import type { TreatmentManifestEntry } from './writerOutlineTreatmentValidation';

type Filter = 'all' | 'moved' | 'combined' | 'enhanced' | 'added' | 'needs_attention';

export function WriterOutlineTreatmentChangeList({
  entries,
  onReject,
}: {
  entries: TreatmentManifestEntry[];
  onReject(resultBeatId: string): void;
}) {
  const [filter, setFilter] = useState<Filter>('all');
  const visible = useMemo(
    () => entries.filter((entry) => (
      filter === 'all'
      || entry.changeType === filter
      || (filter === 'needs_attention' && !entry.reason.trim())
    )),
    [entries, filter],
  );

  return (
    <section aria-labelledby="writer-treatment-changes-heading" className="mt-5 rounded-xl border border-black/10 bg-white/45 p-4">
      <h3 id="writer-treatment-changes-heading" className="text-xs font-black uppercase tracking-wider text-slate-700">Review changes</h3>
      <div className="mt-3 flex flex-wrap gap-2" aria-label="Filter treatment changes">
        {(['all', 'moved', 'combined', 'enhanced', 'added', 'needs_attention'] as const).map((value) => (
          <button
            key={value}
            type="button"
            aria-pressed={filter === value}
            onClick={() => setFilter(value)}
            className={`rounded-full border px-3 py-1 text-[10px] font-black capitalize ${filter === value ? 'border-black bg-black text-white' : 'border-black/15 bg-white text-black'}`}
          >
            {value === 'all'
              ? 'All changes'
              : value === 'moved'
                ? 'Reordered'
                : value === 'needs_attention'
                  ? 'Needs attention'
                  : `${value.charAt(0).toUpperCase()}${value.slice(1)}`}
          </button>
        ))}
      </div>
      {visible.length ? (
        <ul className="mt-3 space-y-2">
          {visible.map((entry) => (
            <li key={entry.resultBeatId} className="rounded-lg border border-black/10 bg-white/70 p-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-wide text-teal-900">{entry.changeType.replace('_', ' ')}</p>
                  <p className="mt-1 text-xs font-black text-slate-950">
                    {entry.proposedPage ? `Page ${entry.proposedPage}` : 'Page not assigned'}
                    {entry.originalPages.length ? ` · from page${entry.originalPages.length > 1 ? 's' : ''} ${entry.originalPages.join(', ')}` : ''}
                  </p>
                  <p className="mt-1 text-xs font-semibold text-slate-800">{entry.reason}</p>
                  <details className="mt-2 text-[10px] font-semibold text-slate-600">
                    <summary className="cursor-pointer font-black">Technical details</summary>
                    <p className="mt-1">
                      Source: {entry.sourceBeatIds.length ? entry.sourceBeatIds.join(', ') : 'New AI beat'} · Result: {entry.resultBeatId}
                    </p>
                  </details>
                </div>
                {entry.changeType !== 'unchanged' && entry.changeType !== 'language_polished' ? (
                  <button
                    type="button"
                    onClick={() => onReject(entry.resultBeatId)}
                    className="rounded-md border border-amber-800/30 bg-amber-50 px-3 py-1.5 text-[10px] font-black text-amber-950"
                  >
                    {entry.changeType === 'added' ? 'Remove added beat' : 'Restore source beat'}
                  </button>
                ) : (
                  <span className="rounded-full bg-emerald-50 px-2 py-1 text-[9px] font-black uppercase text-emerald-900">Kept</span>
                )}
              </div>
            </li>
          ))}
        </ul>
      ) : <p role="status" className="mt-3 text-xs font-semibold text-slate-600">No changes match this filter.</p>}
    </section>
  );
}
