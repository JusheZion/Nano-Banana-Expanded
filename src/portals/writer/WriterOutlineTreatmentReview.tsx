import { useEffect, useMemo, useRef, useState } from 'react';
import { issueOutlineSchema } from '@/shared/writer/schemas';
import type { IssueOutline } from '@/shared/writer/types';
import { TREATMENT_CONTRACTS } from './writerOutlineTreatmentContracts';
import {
  rejectTreatmentChange,
  validateTreatmentProposal,
  type TreatmentProposalSession,
} from './writerOutlineTreatmentValidation';
import { WriterOutlineTreatmentChangeList } from './WriterOutlineTreatmentChangeList';

export type WriterOutlineTreatmentReviewProps = {
  currentOutline: Record<string, unknown> | null;
  proposal: Record<string, unknown>;
  session?: TreatmentProposalSession;
  workflowMode?: 'simple' | 'advanced';
  busy?: boolean;
  error?: string | null;
  onCancel(): void;
  onRegenerate(): void;
  onKeepAlternate?(proposal: IssueOutline, session?: TreatmentProposalSession): void;
  onMakeOfficial(proposal: IssueOutline, session?: TreatmentProposalSession): void;
};

export function WriterOutlineTreatmentReview({
  currentOutline,
  proposal,
  session,
  workflowMode = 'simple',
  busy = false,
  error: externalError,
  onCancel,
  onRegenerate,
  onKeepAlternate,
  onMakeOfficial,
}: WriterOutlineTreatmentReviewProps) {
  const [draft, setDraft] = useState(() => JSON.stringify(proposal, null, 2));
  const [reviewSession, setReviewSession] = useState(session);
  const [error, setError] = useState<string | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    setDraft(JSON.stringify(proposal, null, 2));
    setReviewSession(session);
  }, [proposal, session]);
  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  const parsedDraft = useMemo(() => {
    try {
      const parsed = issueOutlineSchema.parse(JSON.parse(draft));
      const validation = reviewSession
        ? validateTreatmentProposal({ ...reviewSession, proposal: parsed })
        : null;
      return { parsed, validation, error: null };
    } catch {
      return { parsed: null, validation: null, error: 'Enter valid JSON matching the outline fields before making this official.' };
    }
  }, [draft, reviewSession]);
  const promotionBlocked = Boolean(parsedDraft.error || parsedDraft.validation?.valid === false);

  const promote = () => {
    if (!parsedDraft.parsed || promotionBlocked) {
      setError(parsedDraft.error ?? 'This proposal no longer satisfies the selected treatment contract.');
      return;
    }
    setError(null);
    if (reviewSession) onMakeOfficial(parsedDraft.parsed, { ...reviewSession, proposal: parsedDraft.parsed });
    else onMakeOfficial(parsedDraft.parsed);
  };

  const keepAlternate = () => {
    try {
      const parsed = issueOutlineSchema.parse(JSON.parse(draft));
      setError(null);
      if (reviewSession) onKeepAlternate?.(parsed, { ...reviewSession, proposal: parsed });
      else onKeepAlternate?.(parsed);
    } catch {
      setError('Enter valid JSON matching the outline fields before keeping this alternate.');
    }
  };
  const contract = reviewSession ? TREATMENT_CONTRACTS[reviewSession.mode] : null;
  const validation = parsedDraft.validation;

  return (
    <div
      className="fixed inset-0 z-[95] overflow-y-auto bg-black/60 p-4 pb-[calc(5.5rem+env(safe-area-inset-bottom))] md:p-8"
      role="presentation"
      onKeyDown={(event) => {
        if (event.key === 'Escape' && !busy) onCancel();
      }}
    >
      <section role="dialog" aria-modal="true" aria-labelledby="writer-treatment-heading" className="mx-auto max-w-6xl rounded-2xl border border-white/60 bg-[#dff5f1] p-5 shadow-2xl">
        <p className="text-[10px] font-black uppercase tracking-[0.24em] text-teal-900/60">AI Treatment · Preview only</p>
        <h2 ref={headingRef} tabIndex={-1} id="writer-treatment-heading" className="mt-1 font-serif text-3xl font-black text-slate-950">Review before making official</h2>
        <p className="mt-2 text-sm font-semibold text-slate-800/75">Edit the proposal below. Your current official outline remains unchanged until you select Make official.</p>
        {contract && validation ? (
          <div className="mt-4 grid gap-3 rounded-xl border border-teal-900/15 bg-white/55 p-4 sm:grid-cols-2">
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-teal-900/60">Selected contract</p>
              <p className="mt-1 text-sm font-black text-slate-950">{contract.label}</p>
              <p className="mt-1 text-xs font-semibold text-slate-700">{contract.description}</p>
            </div>
            <div aria-label="Treatment preservation summary" className="grid grid-cols-3 gap-2 text-center">
              {[
                ['Pages', `${validation.summary.sourcePages} → ${validation.summary.proposedPages}`],
                ['Preserved', validation.summary.preserved],
                ['Combined', validation.summary.combined],
                ['Enhanced', validation.summary.enhanced],
                ['Added', validation.summary.added],
              ].map(([label, value]) => (
                <div key={label} className="rounded-lg bg-white/75 p-2">
                  <strong className="block text-sm text-slate-950">{value}</strong>
                  <span className="text-[9px] font-black uppercase text-slate-600">{label}</span>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-700">Current official outline</h3>
            <pre className="mt-2 max-h-[32rem] overflow-auto rounded-xl border border-black/10 bg-white/65 p-4 text-xs leading-relaxed text-slate-800">{JSON.stringify(currentOutline ?? {}, null, 2)}</pre>
          </div>
          <label className="text-xs font-black uppercase tracking-wider text-slate-700">
            Editable AI outline proposal
            <textarea
              aria-label="Editable AI outline proposal"
              value={draft}
              onChange={(event) => setDraft(event.currentTarget.value)}
              rows={24}
              className="mt-2 w-full rounded-xl border border-black/15 bg-white p-4 font-mono text-xs leading-relaxed text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-700/50"
            />
          </label>
        </div>

        {workflowMode === 'advanced' && reviewSession ? (
          <WriterOutlineTreatmentChangeList
            entries={reviewSession.manifest.entries}
            onReject={(resultBeatId) => {
              const next = rejectTreatmentChange(reviewSession, resultBeatId);
              setReviewSession(next);
              setDraft(JSON.stringify(next.proposal, null, 2));
              setError(null);
            }}
          />
        ) : null}
        {workflowMode === 'simple' && reviewSession ? (
          <details className="mt-4 rounded-xl border border-black/10 bg-white/45 p-4">
            <summary className="cursor-pointer text-xs font-black text-slate-800">Review details</summary>
            <ul className="mt-3 space-y-2 text-xs font-semibold text-slate-700">
              {reviewSession.manifest.entries.map((entry) => (
                <li key={entry.resultBeatId}>
                  {entry.changeType.replace('_', ' ')}: {entry.sourceBeatIds.length ? entry.sourceBeatIds.join(', ') : 'New AI beat'} → {entry.resultBeatId}
                </li>
              ))}
            </ul>
          </details>
        ) : null}

        {error || externalError || parsedDraft.error || parsedDraft.validation?.valid === false ? <p role="alert" className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-xs font-bold text-red-900">{error ?? externalError ?? parsedDraft.error ?? 'This proposal has contract violations. Restore or regenerate the affected changes before making it official.'}</p> : null}
        <div className="sticky bottom-[calc(4.5rem+env(safe-area-inset-bottom))] mt-5 flex flex-wrap justify-end gap-2 rounded-xl border border-black/10 bg-[#dff5f1]/95 p-3 shadow-lg md:bottom-0">
          <button type="button" disabled={busy} onClick={onCancel} className="rounded-lg border border-black/20 bg-white px-4 py-2 text-sm font-black">Cancel proposal</button>
          <button type="button" disabled={busy} onClick={onRegenerate} className="rounded-lg border border-black/20 bg-white px-4 py-2 text-sm font-black">Regenerate proposal</button>
          {onKeepAlternate ? <button type="button" disabled={busy} onClick={keepAlternate} className="rounded-lg border border-sky-700/30 bg-sky-50 px-4 py-2 text-sm font-black text-sky-950">Keep as alternate</button> : null}
          <button type="button" disabled={busy || promotionBlocked} onClick={promote} className="rounded-lg bg-black px-5 py-2 text-sm font-black text-white disabled:opacity-40">{busy ? 'Saving…' : 'Make official'}</button>
        </div>
      </section>
    </div>
  );
}
