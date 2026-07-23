import type { OutlinePastePreferences } from './writerOutlinePastePreferences';

export type WriterOutlinePasteSettingsProps = {
  surface: 'local' | 'story';
  idPrefix: string;
  value: OutlinePastePreferences;
  onChange(next: OutlinePastePreferences): void;
};

export function WriterOutlinePasteSettings({
  surface,
  idPrefix,
  value,
  onChange,
}: WriterOutlinePasteSettingsProps) {
  const reviewId = `${idPrefix}-review-frequency`;
  const aiId = `${idPrefix}-ai-classification`;
  const guidanceId = `${idPrefix}-first-use-guidance`;

  return (
    <div className={surface === 'story' ? 'space-y-4' : 'space-y-3'}>
      <div className={surface === 'story' ? 'grid gap-4 sm:grid-cols-2' : 'space-y-3'}>
        <label htmlFor={reviewId} className="block text-[11px] font-black text-black/70">
          Review pasted outlines
          <select
            id={reviewId}
            value={value.reviewFrequency}
            onChange={(event) => onChange({
              ...value,
              reviewFrequency: event.currentTarget.value as OutlinePastePreferences['reviewFrequency'],
            })}
            className="mt-1.5 block w-full rounded-md border border-black/15 bg-white px-2.5 py-2 text-xs font-semibold text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-700/40"
          >
            <option value="always">Always open review</option>
            <option value="when_needed">Review only when needed</option>
            <option value="never_interrupt">Never interrupt — keep uncertain text unstructured</option>
          </select>
        </label>

        <label htmlFor={aiId} className="block text-[11px] font-black text-black/70">
          AI classification
          <select
            id={aiId}
            value={value.aiClassification}
            onChange={(event) => onChange({
              ...value,
              aiClassification: event.currentTarget.value as OutlinePastePreferences['aiClassification'],
            })}
            className="mt-1.5 block w-full rounded-md border border-black/15 bg-white px-2.5 py-2 text-xs font-semibold text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-700/40"
          >
            <option value="off">Off</option>
            <option value="suggest">Suggest destinations when requested</option>
            <option value="classify_with_review">Offer suggestions in review</option>
          </select>
        </label>
      </div>

      <p className="text-[10px] font-semibold leading-snug text-black/52">
        AI is optional. Suggestions never rewrite source text and remain editable until you apply the review.
      </p>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-black/10 pt-3">
        <label htmlFor={guidanceId} className="inline-flex items-center gap-2 text-[11px] font-bold text-black/65">
          <input
            id={guidanceId}
            type="checkbox"
            checked={value.showFirstUseGuidance}
            onChange={(event) => onChange({ ...value, showFirstUseGuidance: event.currentTarget.checked })}
            className="h-4 w-4 accent-amber-700 focus-visible:ring-2 focus-visible:ring-amber-700/40"
          />
          Show first-use guidance
        </label>
        <button
          type="button"
          disabled={value.showFirstUseGuidance}
          onClick={() => onChange({ ...value, showFirstUseGuidance: true })}
          className="text-[10px] font-black text-amber-900 underline decoration-amber-700/40 underline-offset-2 hover:decoration-amber-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-700/40 disabled:cursor-not-allowed disabled:text-black/35 disabled:no-underline"
        >
          Reset first-use guidance
        </button>
      </div>
    </div>
  );
}
