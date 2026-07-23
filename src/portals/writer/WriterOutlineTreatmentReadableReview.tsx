import { useMemo, useState } from 'react';
import type { IssueOutline, IssueOutlinePageBeat } from '@/shared/writer/types';
import type { TreatmentProposalSession } from './writerOutlineTreatmentValidation';
import {
  buildOutlineTreatmentReviewItems,
  normalizeOutlineReviewText,
} from './writerOutlineTreatmentReviewModel';
import { WriterOutlineTreatmentDiff } from './WriterOutlineTreatmentDiff';

function beatCopy(beat: IssueOutlinePageBeat | null): string {
  if (!beat) return 'No wording was supplied.';
  return [beat.scene, beat.summary, beat.emotional_turn]
    .filter(Boolean)
    .map((value) => normalizeOutlineReviewText(value))
    .join(' — ');
}

export function WriterOutlineTreatmentReadableReview({
  draft,
  session,
  onChange,
}: {
  draft: IssueOutline;
  session: TreatmentProposalSession;
  onChange(next: IssueOutline): void;
}) {
  const [showUnchanged, setShowUnchanged] = useState(false);
  const items = useMemo(() => buildOutlineTreatmentReviewItems(session), [session]);
  const visibleItems = items.filter((item) => showUnchanged || item.status !== 'unchanged');
  const changedPages = new Set(
    items.filter((item) => item.status !== 'unchanged' && item.page !== null).map((item) => item.page),
  );

  const updatePageBeat = (index: number, patch: Partial<IssueOutlinePageBeat>) => {
    const pageBeats = [...(draft.page_beats ?? [])];
    pageBeats[index] = { ...pageBeats[index]!, ...patch };
    onChange({ ...draft, page_beats: pageBeats });
  };

  const goToPage = (page: number) => {
    const editor = document.querySelector<HTMLTextAreaElement>(
      `[aria-label="Page ${page} summary"]`,
    );
    editor?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    editor?.focus();
  };

  return (
    <div className="space-y-5">
      <section aria-labelledby="outline-change-review-heading" className="rounded-xl border border-teal-900/15 bg-white/60 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 id="outline-change-review-heading" className="text-sm font-black text-slate-950">
              Changes to review
            </h3>
            <p className="mt-1 text-xs font-semibold text-slate-700">
              Changes are listed in page order. Rejected changes kept your original wording.
            </p>
          </div>
          <button
            type="button"
            aria-pressed={showUnchanged}
            onClick={() => setShowUnchanged((value) => !value)}
            className="rounded-full border border-slate-400 bg-white px-3 py-1.5 text-xs font-black text-slate-950 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-700/50"
          >
            {showUnchanged ? 'Hide unchanged pages' : 'Show unchanged pages'}
          </button>
        </div>

        <ol className="mt-4 space-y-3">
          {visibleItems.map((item) => {
            const original = beatCopy(item.original);
            const proposed = beatCopy(item.proposed);
            return (
              <li
                key={item.key}
                className={`rounded-xl border p-4 ${
                  item.status === 'rejected'
                    ? 'border-amber-700/35 bg-amber-50'
                    : item.status === 'accepted'
                      ? 'border-teal-700/30 bg-teal-50/75'
                      : 'border-slate-300 bg-white/70'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <strong className="text-sm text-slate-950">
                      {item.page === null ? 'Affected page unavailable' : `Page ${item.page}`}
                    </strong>
                    <span className="rounded-full bg-white/80 px-2 py-1 text-[10px] font-black uppercase text-slate-800">
                      {item.changeLabel}
                    </span>
                  </div>
                  {item.page !== null ? (
                    <button
                      type="button"
                      onClick={() => goToPage(item.page!)}
                      className="rounded-md border border-slate-400 bg-white px-3 py-1.5 text-xs font-black text-slate-950 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-700/50"
                    >
                      Go to page {item.page}
                    </button>
                  ) : null}
                </div>
                {item.status !== 'unchanged' ? (
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    <div className="rounded-lg bg-white/70 p-3">
                      <p className="text-[10px] font-black uppercase tracking-wide text-slate-600">Original</p>
                      <p className="mt-1 text-xs leading-relaxed text-slate-900">{original}</p>
                    </div>
                    <div className="rounded-lg bg-white/70 p-3">
                      <p className="text-[10px] font-black uppercase tracking-wide text-slate-600">
                        {item.status === 'rejected' ? 'Attempted AI change' : 'AI proposal'}
                      </p>
                      <p className="mt-1 text-xs leading-relaxed text-slate-900">
                        <WriterOutlineTreatmentDiff original={original} proposed={proposed} />
                      </p>
                    </div>
                  </div>
                ) : null}
                <p className="mt-3 text-xs font-semibold text-slate-800">{item.reason}</p>
                {item.status === 'rejected' ? (
                  <p className="mt-1 text-xs font-black text-amber-950">
                    This change was not applied. Your original wording was retained.
                  </p>
                ) : null}
              </li>
            );
          })}
        </ol>
      </section>

      <section aria-labelledby="outline-readable-editor-heading" className="rounded-xl border border-teal-900/15 bg-white/60 p-4">
        <h3 id="outline-readable-editor-heading" className="text-sm font-black text-slate-950">
          Edit the proposed outline
        </h3>
        <p className="mt-1 text-xs font-semibold text-slate-700">
          Highlighted page cards contain AI-proposed changes.
        </p>

        <div className="mt-4 grid gap-3">
          <label className="text-xs font-black text-slate-800">
            Outline title
            <input
              aria-label="Outline title"
              value={draft.title ?? ''}
              onChange={(event) => onChange({ ...draft, title: event.currentTarget.value })}
              className="mt-1 w-full rounded-lg border border-slate-400 bg-white px-3 py-2 text-sm font-semibold text-slate-950"
            />
          </label>
          <label className="text-xs font-black text-slate-800">
            Outline premise
            <textarea
              aria-label="Outline premise"
              value={normalizeOutlineReviewText(draft.premise)}
              onChange={(event) => onChange({ ...draft, premise: event.currentTarget.value })}
              rows={3}
              className="mt-1 w-full rounded-lg border border-slate-400 bg-white px-3 py-2 text-sm leading-relaxed text-slate-950"
            />
          </label>
        </div>

        {(draft.acts ?? []).length ? (
          <div className="mt-4 space-y-3">
            <h4 className="text-xs font-black uppercase tracking-wide text-slate-700">Acts</h4>
            {(draft.acts ?? []).map((act, index) => (
              <div key={`${act.name ?? 'act'}-${index}`} className="grid gap-2 rounded-lg border border-slate-300 bg-white/75 p-3 md:grid-cols-[12rem_1fr]">
                <input
                  aria-label={`Act ${index + 1} name`}
                  value={act.name ?? ''}
                  onChange={(event) => {
                    const acts = [...(draft.acts ?? [])];
                    acts[index] = { ...acts[index], name: event.currentTarget.value };
                    onChange({ ...draft, acts });
                  }}
                  className="rounded-md border border-slate-400 bg-white px-3 py-2 text-sm font-black text-slate-950"
                />
                <textarea
                  aria-label={`Act ${index + 1} summary`}
                  value={normalizeOutlineReviewText(act.summary)}
                  onChange={(event) => {
                    const acts = [...(draft.acts ?? [])];
                    acts[index] = { ...acts[index], summary: event.currentTarget.value };
                    onChange({ ...draft, acts });
                  }}
                  rows={3}
                  className="rounded-md border border-slate-400 bg-white px-3 py-2 text-sm leading-relaxed text-slate-950"
                />
              </div>
            ))}
          </div>
        ) : null}

        <div className="mt-5 space-y-3">
          <h4 className="text-xs font-black uppercase tracking-wide text-slate-700">Page beats</h4>
          {(draft.page_beats ?? []).map((beat, index) => {
            const page = beat.page_target ?? index + 1;
            const changed = changedPages.has(page);
            return (
              <article
                key={beat.treatment_beat_id ?? `${page}-${index}`}
                id={`proposal-page-${page}`}
                data-status={changed ? 'changed' : 'unchanged'}
                className={`rounded-xl border p-3 ${
                  changed
                    ? 'border-amber-600/50 bg-amber-50 ring-2 ring-amber-300/35'
                    : 'border-slate-300 bg-white/75'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <h5 className="text-sm font-black text-slate-950">Page {page}</h5>
                  {changed ? (
                    <span className="rounded-full bg-amber-200 px-2 py-1 text-[10px] font-black uppercase text-amber-950">
                      AI change
                    </span>
                  ) : null}
                </div>
                <textarea
                  aria-label={`Page ${page} summary`}
                  value={normalizeOutlineReviewText(beat.summary)}
                  onChange={(event) => updatePageBeat(index, { summary: event.currentTarget.value })}
                  rows={4}
                  className="mt-2 w-full rounded-lg border border-slate-400 bg-white px-3 py-2 text-sm leading-relaxed text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-700/50"
                />
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
