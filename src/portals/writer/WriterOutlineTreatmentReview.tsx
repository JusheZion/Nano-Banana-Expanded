import { useEffect, useRef, useState } from 'react';
import { issueOutlineSchema } from '@/shared/writer/schemas';
import type { IssueOutline } from '@/shared/writer/types';

export type WriterOutlineTreatmentReviewProps = {
  currentOutline: Record<string, unknown> | null;
  proposal: Record<string, unknown>;
  busy?: boolean;
  error?: string | null;
  onCancel(): void;
  onRegenerate(): void;
  onKeepAlternate?(proposal: IssueOutline): void;
  onMakeOfficial(proposal: IssueOutline): void;
};

export function WriterOutlineTreatmentReview({
  currentOutline,
  proposal,
  busy = false,
  error: externalError,
  onCancel,
  onRegenerate,
  onKeepAlternate,
  onMakeOfficial,
}: WriterOutlineTreatmentReviewProps) {
  const [draft, setDraft] = useState(() => JSON.stringify(proposal, null, 2));
  const [error, setError] = useState<string | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    setDraft(JSON.stringify(proposal, null, 2));
  }, [proposal]);
  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  const promote = () => {
    try {
      const parsed = issueOutlineSchema.parse(JSON.parse(draft));
      setError(null);
      onMakeOfficial(parsed);
    } catch {
      setError('Enter valid JSON matching the outline fields before making this official.');
    }
  };

  const keepAlternate = () => {
    try {
      const parsed = issueOutlineSchema.parse(JSON.parse(draft));
      setError(null);
      onKeepAlternate?.(parsed);
    } catch {
      setError('Enter valid JSON matching the outline fields before keeping this alternate.');
    }
  };

  return (
    <div className="fixed inset-0 z-[95] overflow-y-auto bg-black/60 p-4 pb-[calc(5.5rem+env(safe-area-inset-bottom))] md:p-8" role="presentation">
      <section role="dialog" aria-modal="true" aria-labelledby="writer-treatment-heading" className="mx-auto max-w-6xl rounded-2xl border border-white/60 bg-[#dff5f1] p-5 shadow-2xl">
        <p className="text-[10px] font-black uppercase tracking-[0.24em] text-teal-900/60">AI Treatment · Preview only</p>
        <h2 ref={headingRef} tabIndex={-1} id="writer-treatment-heading" className="mt-1 font-serif text-3xl font-black text-slate-950">Review before making official</h2>
        <p className="mt-2 text-sm font-semibold text-slate-800/75">Edit the proposal below. Your current official outline remains unchanged until you select Make official.</p>

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

        {error || externalError ? <p role="alert" className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-xs font-bold text-red-900">{error ?? externalError}</p> : null}
        <div className="sticky bottom-[calc(4.5rem+env(safe-area-inset-bottom))] mt-5 flex flex-wrap justify-end gap-2 rounded-xl border border-black/10 bg-[#dff5f1]/95 p-3 shadow-lg md:bottom-0">
          <button type="button" disabled={busy} onClick={onCancel} className="rounded-lg border border-black/20 bg-white px-4 py-2 text-sm font-black">Cancel proposal</button>
          <button type="button" disabled={busy} onClick={onRegenerate} className="rounded-lg border border-black/20 bg-white px-4 py-2 text-sm font-black">Regenerate proposal</button>
          {onKeepAlternate ? <button type="button" disabled={busy} onClick={keepAlternate} className="rounded-lg border border-sky-700/30 bg-sky-50 px-4 py-2 text-sm font-black text-sky-950">Keep as alternate</button> : null}
          <button type="button" disabled={busy} onClick={promote} className="rounded-lg bg-black px-5 py-2 text-sm font-black text-white">{busy ? 'Saving…' : 'Make official'}</button>
        </div>
      </section>
    </div>
  );
}
