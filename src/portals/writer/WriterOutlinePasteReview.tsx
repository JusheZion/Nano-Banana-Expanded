import { useEffect, useMemo, useRef, useState } from 'react';
import { Tooltip } from '@/shared/components/Tooltip';
import {
  assignOutlinePassages,
  type OutlinePassageAssignment,
  type OutlinePasteDiagnostic,
  type OutlinePastePassage,
} from './writerOutlinePasteDiagnostic';
import type { OutlinePastePreferences } from './writerOutlinePastePreferences';

const FOCUSABLE_SELECTOR = [
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'a[href]',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

export type WriterOutlinePasteReviewProps = {
  diagnostic: OutlinePasteDiagnostic;
  preferences: OutlinePastePreferences;
  busy?: boolean;
  error?: string | null;
  onApply(diagnostic: OutlinePasteDiagnostic): void;
  onKeepUnstructured(originalText: string): void;
  onCancel(): void;
  onPreferencesChange(next: OutlinePastePreferences): void;
};

const ASSIGNMENT_OPTIONS: ReadonlyArray<{
  value: OutlinePassageAssignment;
  label: string;
}> = [
  { value: 'title', label: 'Title' },
  { value: 'premise', label: 'Premise' },
  { value: 'act', label: 'Act' },
  { value: 'page_beat', label: 'Page Beat' },
  { value: 'notes', label: 'Notes' },
  { value: 'unassigned', label: 'Unassigned Text' },
];

const PROVENANCE_LABELS: Record<OutlinePastePassage['provenance'], string> = {
  deterministic: 'Recognized by rules',
  user: 'Manually assigned',
  ai: 'Suggested by AI',
};

const STAT_ITEMS: ReadonlyArray<{
  assignment: OutlinePassageAssignment;
  label: string;
}> = [
  { assignment: 'title', label: 'Title' },
  { assignment: 'premise', label: 'Premise' },
  { assignment: 'act', label: 'Acts' },
  { assignment: 'page_beat', label: 'Page Beats' },
  { assignment: 'notes', label: 'Notes' },
];

function pluralizePassage(count: number): string {
  return `${count} ${count === 1 ? 'passage' : 'passages'}`;
}

function passageDisplayText(passage: OutlinePastePassage): string {
  return passage.text.trim() || `Lines ${passage.startLine}–${passage.endLine}`;
}

function assignmentDetails(passage: OutlinePastePassage): string | null {
  if (passage.assignment === 'act' && passage.actName) return passage.actName;
  if (passage.assignment === 'page_beat' && passage.pageTarget) return `Page ${passage.pageTarget}`;
  return null;
}

export function WriterOutlinePasteReview({
  diagnostic,
  preferences,
  busy = false,
  error = null,
  onApply,
  onKeepUnstructured,
  onCancel,
  onPreferencesChange,
}: WriterOutlinePasteReviewProps) {
  const [workingDiagnostic, setWorkingDiagnostic] = useState(diagnostic);
  const [selectedPassageIds, setSelectedPassageIds] = useState<Set<string>>(() => new Set());
  const [assignment, setAssignment] = useState<OutlinePassageAssignment>('notes');
  const [actName, setActName] = useState('');
  const [firstPageNumber, setFirstPageNumber] = useState('');
  const [feedback, setFeedback] = useState('No passages selected.');
  const [validationMessage, setValidationMessage] = useState<string | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);
  const selectAllRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setWorkingDiagnostic(diagnostic);
    setSelectedPassageIds(new Set());
    setAssignment('notes');
    setActName('');
    setFirstPageNumber('');
    setValidationMessage(null);
    setFeedback('No passages selected.');
  }, [diagnostic]);

  useEffect(() => {
    previouslyFocusedRef.current = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    headingRef.current?.focus();
    return () => {
      const previous = previouslyFocusedRef.current;
      if (previous?.isConnected) previous.focus();
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (busy) return;
        event.preventDefault();
        onCancel();
        return;
      }
      if (event.key !== 'Tab') return;

      const dialog = dialogRef.current;
      if (!dialog) return;
      const focusable = Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
        .filter((element) => element.getAttribute('aria-hidden') !== 'true');
      if (focusable.length === 0) {
        event.preventDefault();
        dialog.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;
      const activeIndex = focusable.indexOf(active as HTMLElement);
      if (event.shiftKey && (active === first || activeIndex === -1)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (active === last || activeIndex === -1)) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [busy, onCancel]);

  const selectedCount = selectedPassageIds.size;
  const allSelected = workingDiagnostic.passages.length > 0
    && selectedCount === workingDiagnostic.passages.length;
  const someSelected = selectedCount > 0 && !allSelected;

  useEffect(() => {
    if (selectAllRef.current) selectAllRef.current.indeterminate = someSelected;
  }, [someSelected]);

  const counts = useMemo(() => {
    const next: Record<OutlinePassageAssignment, number> = {
      title: 0,
      premise: 0,
      act: 0,
      page_beat: 0,
      notes: 0,
      unassigned: 0,
    };
    workingDiagnostic.passages.forEach((passage) => {
      next[passage.assignment] += 1;
    });
    return next;
  }, [workingDiagnostic.passages]);

  const unassignedPassages = workingDiagnostic.passages.filter((passage) => (
    passage.assignment === 'unassigned'
  ));

  const updateSelectionFeedback = (next: Set<string>) => {
    setSelectedPassageIds(next);
    setValidationMessage(null);
    setFeedback(next.size === 0 ? 'No passages selected.' : `${pluralizePassage(next.size)} selected.`);
  };

  const togglePassage = (passageId: string) => {
    if (busy) return;
    const next = new Set(selectedPassageIds);
    if (next.has(passageId)) next.delete(passageId);
    else next.add(passageId);
    updateSelectionFeedback(next);
  };

  const toggleAll = () => {
    if (busy) return;
    updateSelectionFeedback(allSelected
      ? new Set()
      : new Set(workingDiagnostic.passages.map((passage) => passage.id)));
  };

  const applyAssignment = () => {
    if (busy) return;
    if (selectedCount === 0) {
      setValidationMessage('Select at least one passage before assigning.');
      return;
    }
    if (assignment === 'title' || assignment === 'premise') {
      const label = assignment === 'title' ? 'Title' : 'Premise';
      if (selectedCount !== 1) {
        setValidationMessage(`Choose exactly one passage for ${label}.`);
        return;
      }
      const selectedId = [...selectedPassageIds][0];
      const existingOwner = workingDiagnostic.passages.some((passage) => (
        passage.assignment === assignment && passage.id !== selectedId
      ));
      if (existingOwner) {
        setValidationMessage(`${label} already has a passage. Move it to another destination first.`);
        return;
      }
    }
    if (assignment === 'act' && !actName.trim()) {
      setValidationMessage('Enter an Act name or number before assigning.');
      return;
    }

    const firstPage = Number(firstPageNumber);
    if (assignment === 'page_beat') {
      const lastPage = firstPage + selectedCount - 1;
      if (!firstPageNumber.trim()
        || !Number.isInteger(firstPage)
        || firstPage < 1
        || lastPage > 200) {
        setValidationMessage('Enter a whole first page number from 1 to 200.');
        return;
      }
    }

    const next = assignOutlinePassages(
      workingDiagnostic,
      [...selectedPassageIds],
      assignment,
      assignment === 'act'
        ? { actName }
        : assignment === 'page_beat'
          ? { firstPageTarget: firstPage }
          : undefined,
    );
    setWorkingDiagnostic(next);
    setSelectedPassageIds(new Set());
    setValidationMessage(null);
    const label = ASSIGNMENT_OPTIONS.find((option) => option.value === assignment)?.label ?? assignment;
    setFeedback(`Assigned ${pluralizePassage(selectedCount)} to ${label}.`);
  };

  const restoreOriginal = () => {
    if (busy) return;
    setWorkingDiagnostic(diagnostic);
    setSelectedPassageIds(new Set());
    setValidationMessage(null);
    setFeedback('Original recognition restored.');
  };

  const actionDisabled = busy;
  const visibleStatus = busy ? 'Applying reviewed paste.' : feedback;

  return (
    <div
      role="presentation"
      data-testid="outline-paste-review-backdrop"
      className="fixed inset-0 z-[220] flex items-start justify-center overflow-y-auto bg-black/45 p-3 backdrop-blur-sm sm:p-6"
      onPointerDown={(event) => event.stopPropagation()}
      onMouseDown={(event) => event.stopPropagation()}
      onClick={(event) => event.stopPropagation()}
    >
    <section
      ref={dialogRef}
      role="dialog"
      tabIndex={-1}
      aria-modal="true"
      aria-busy={busy}
      aria-labelledby="writer-outline-paste-review-title"
      className="my-auto w-full max-w-6xl min-w-0 rounded-2xl border border-white/40 bg-white/90 p-4 text-slate-950 shadow-2xl shadow-teal-950/25 backdrop-blur-xl sm:p-6"
    >
      <header className="border-b border-slate-900/10 pb-4">
        <p className="text-[0.68rem] font-bold uppercase tracking-[0.2em] text-amber-800">
          Simple workflow · Paste review
        </p>
        <h2
          ref={headingRef}
          id="writer-outline-paste-review-title"
          tabIndex={-1}
          className="mt-1 text-xl font-black tracking-tight text-slate-950 outline-none focus-visible:ring-2 focus-visible:ring-amber-600 focus-visible:ring-offset-2 sm:text-2xl"
        >
          Review what the outline recognized
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-700">
          Your original paste is preserved, nothing has been discarded, and your official outline has not changed.
        </p>
      </header>

      {preferences.showFirstUseGuidance ? (
        <aside className="mt-4 border-l-4 border-amber-500 bg-amber-50/90 px-4 py-3">
          <h3 className="text-sm font-extrabold text-amber-950">Why this review opened</h3>
          <p className="mt-1 text-sm leading-relaxed text-amber-950/80">
            The paste included text the outline could not place confidently. Your original is preserved;
            Unassigned Text needs your decision, and you can select passages to assign them manually.
            Nothing changes until you choose Apply reviewed paste.
          </p>
          <label className="mt-3 inline-flex cursor-pointer items-center gap-2 text-xs font-semibold text-amber-950">
            <input
              type="checkbox"
              disabled={busy}
              className="h-4 w-4 accent-amber-700 focus-visible:ring-2 focus-visible:ring-amber-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              onChange={(event) => {
                if (busy || !event.currentTarget.checked) return;
                onPreferencesChange({ ...preferences, showFirstUseGuidance: false });
              }}
            />
            Don&apos;t show these tips again
          </label>
        </aside>
      ) : null}

      <div
        data-testid="paste-review-layout"
        className="mt-5 grid min-w-0 grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(17rem,0.65fr)]"
      >
        <section aria-labelledby="paste-review-passages-title" className="min-w-0">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-[0.68rem] font-bold uppercase tracking-[0.16em] text-slate-500">Working copy</p>
              <h3 id="paste-review-passages-title" className="text-base font-extrabold text-slate-950">
                Recognized passages
              </h3>
            </div>
            <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-bold text-slate-700">
              <input
                ref={selectAllRef}
                type="checkbox"
                checked={allSelected}
                disabled={busy || workingDiagnostic.passages.length === 0}
                onChange={toggleAll}
                className="h-4 w-4 accent-amber-700 focus-visible:ring-2 focus-visible:ring-amber-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed"
              />
              Select all passages
            </label>
          </div>

          <div className="mt-3 divide-y divide-slate-900/10 border-y border-slate-900/15">
            {workingDiagnostic.passages.map((passage) => {
              const detail = assignmentDetails(passage);
              return (
                <label
                  key={passage.id}
                  className="group grid min-w-0 cursor-pointer grid-cols-[auto_minmax(0,1fr)] gap-3 px-2 py-3 transition-colors hover:bg-amber-50/70 has-[:focus-visible]:bg-amber-50/70"
                >
                  <input
                    type="checkbox"
                    aria-label={`Select passage: ${passageDisplayText(passage)}`}
                    checked={selectedPassageIds.has(passage.id)}
                    disabled={busy}
                    onChange={() => togglePassage(passage.id)}
                    className="mt-1 h-4 w-4 accent-amber-700 focus-visible:ring-2 focus-visible:ring-amber-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed"
                  />
                  <span className="min-w-0">
                    <span className="block whitespace-pre-wrap break-words text-sm font-medium leading-relaxed text-slate-900">
                      {passageDisplayText(passage)}
                    </span>
                    <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[0.68rem] font-semibold text-slate-600">
                      <span>{ASSIGNMENT_OPTIONS.find((option) => option.value === passage.assignment)?.label}</span>
                      {detail ? <span>· {detail}</span> : null}
                      <span>· {PROVENANCE_LABELS[passage.provenance]}</span>
                      <span>· Line {passage.startLine}</span>
                    </span>
                  </span>
                </label>
              );
            })}
          </div>
        </section>

        <aside className="min-w-0 border-t border-slate-900/15 pt-4 lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0">
          <section aria-labelledby="paste-review-summary-title">
            <p className="text-[0.68rem] font-bold uppercase tracking-[0.16em] text-slate-500">Recognition</p>
            <h3 id="paste-review-summary-title" className="text-base font-extrabold text-slate-950">Outline summary</h3>
            <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3 lg:grid-cols-2">
              {STAT_ITEMS.map((item) => (
                <div key={item.assignment} className="flex items-baseline justify-between border-b border-slate-900/10 pb-1">
                  <dt className="text-xs font-semibold text-slate-600">{item.label}</dt>
                  <dd
                    data-testid={`count-${item.assignment}`}
                    className="text-sm font-black tabular-nums text-slate-950"
                  >
                    {counts[item.assignment]}
                  </dd>
                </div>
              ))}
            </dl>
          </section>

          <section aria-labelledby="paste-review-unassigned-title" className="mt-5 border-l-4 border-rose-500 bg-rose-50/85 px-3 py-3">
            <div className="flex items-baseline justify-between gap-3">
              <h3 id="paste-review-unassigned-title" className="text-sm font-extrabold text-rose-950">Unassigned Text</h3>
              <span data-testid="unassigned-count" className="text-lg font-black tabular-nums text-rose-800">
                {counts.unassigned}
              </span>
            </div>
            {unassignedPassages.length ? (
              <ul className="mt-2 space-y-1 text-xs leading-relaxed text-rose-950/80">
                {unassignedPassages.map((passage) => (
                  <li key={passage.id} className="break-words">• {passageDisplayText(passage)}</li>
                ))}
              </ul>
            ) : (
              <p className="mt-1 text-xs font-semibold text-emerald-800">Everything has an outline destination.</p>
            )}
          </section>

          {workingDiagnostic.warnings.length ? (
            <section aria-labelledby="paste-review-warnings-title" className="mt-4">
              <h3 id="paste-review-warnings-title" className="text-xs font-extrabold uppercase tracking-[0.12em] text-slate-700">
                Warnings
              </h3>
              <ul className="mt-2 space-y-1.5 text-xs leading-relaxed text-slate-700">
                {workingDiagnostic.warnings.map((warning, index) => (
                  <li key={`${warning.code}-${index}`} className="border-l-2 border-amber-500 pl-2">
                    {warning.message}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <section aria-labelledby="paste-review-assign-title" className="mt-5 border-t border-slate-900/15 pt-4">
            <h3 id="paste-review-assign-title" className="text-sm font-extrabold text-slate-950">Manual assignment</h3>
            <p className="mt-1 text-xs leading-relaxed text-slate-600">
              Select one or more passages, choose their destination, then assign them to this working copy.
              Nothing changes until you choose Apply reviewed paste.
            </p>
            <label className="mt-3 block text-xs font-bold text-slate-700">
              Assign selected to
              <select
                value={assignment}
                disabled={busy}
                onChange={(event) => {
                  if (busy) return;
                  setAssignment(event.currentTarget.value as OutlinePassageAssignment);
                  setValidationMessage(null);
                }}
                className="mt-1 w-full rounded-lg border border-slate-400 bg-white px-3 py-2 text-sm font-semibold text-slate-950 outline-none transition focus-visible:border-amber-700 focus-visible:ring-2 focus-visible:ring-amber-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {ASSIGNMENT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>

            {assignment === 'act' ? (
              <label className="mt-3 block text-xs font-bold text-slate-700">
                Act name or number
                <input
                  type="text"
                  value={actName}
                  disabled={busy}
                  onChange={(event) => {
                    if (busy) return;
                    setActName(event.currentTarget.value);
                    setValidationMessage(null);
                  }}
                  placeholder="Act II"
                  className="mt-1 w-full rounded-lg border border-slate-400 bg-white px-3 py-2 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus-visible:border-amber-700 focus-visible:ring-2 focus-visible:ring-amber-600 disabled:cursor-not-allowed disabled:opacity-60"
                />
              </label>
            ) : null}

            {assignment === 'page_beat' ? (
              <label className="mt-3 block text-xs font-bold text-slate-700">
                First page number
                <input
                  type="number"
                  min={1}
                  max={200}
                  step={1}
                  value={firstPageNumber}
                  disabled={busy}
                  onChange={(event) => {
                    if (busy) return;
                    setFirstPageNumber(event.currentTarget.value);
                    setValidationMessage(null);
                  }}
                  className="mt-1 w-full rounded-lg border border-slate-400 bg-white px-3 py-2 text-sm text-slate-950 outline-none transition focus-visible:border-amber-700 focus-visible:ring-2 focus-visible:ring-amber-600 disabled:cursor-not-allowed disabled:opacity-60"
                />
                <span className="mt-1 block font-normal text-slate-500">
                  Multiple selections continue sequentially from this page.
                </span>
              </label>
            ) : null}

            {validationMessage ? (
              <p role="alert" className="mt-3 border-l-2 border-rose-600 pl-2 text-xs font-semibold text-rose-800">
                {validationMessage}
              </p>
            ) : null}

            <button
              type="button"
              disabled={busy}
              onClick={applyAssignment}
              className="mt-3 w-full rounded-lg bg-slate-900 px-3 py-2 text-sm font-extrabold text-white transition hover:bg-slate-800 active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Assign selected passages
            </button>

            <Tooltip content="Discard local review edits and return to the parser's first recognition." side="top">
              <button
                type="button"
                disabled={busy}
                onClick={restoreOriginal}
                className="mt-2 w-full rounded-lg border border-slate-400 bg-white px-3 py-2 text-xs font-bold text-slate-700 transition hover:border-amber-600 hover:text-slate-950 active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Restore original recognition
              </button>
            </Tooltip>
          </section>
        </aside>
      </div>

      <div className="mt-5 border-t border-slate-900/15 pt-4">
        {error ? (
          <p role="alert" className="mb-3 border-l-4 border-rose-600 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-900">
            {error}
          </p>
        ) : null}
        <p role="status" aria-live="polite" aria-atomic="true" className="mb-3 min-h-5 text-xs font-semibold text-slate-600">
          {visibleStatus}
        </p>
        <div
          data-testid="paste-review-actions"
          className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end"
        >
          <button
            type="button"
            disabled={actionDisabled}
            onClick={() => {
              if (busy) return;
              onCancel();
            }}
            className="rounded-lg px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-900/5 hover:text-slate-950 active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Cancel — keep current outline
          </button>
          <button
            type="button"
            disabled={actionDisabled}
            onClick={() => {
              if (busy) return;
              onKeepUnstructured(workingDiagnostic.originalText);
            }}
            className="rounded-lg border border-slate-400 bg-white px-4 py-2 text-sm font-bold text-slate-800 transition hover:border-amber-600 hover:bg-amber-50 active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Keep as unstructured source
          </button>
          <button
            type="button"
            aria-label={busy ? 'Applying reviewed paste' : undefined}
            disabled={actionDisabled}
            onClick={() => {
              if (busy) return;
              onApply(workingDiagnostic);
            }}
            className="rounded-lg bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600 px-5 py-2 text-sm font-black text-slate-950 shadow-md shadow-amber-950/20 transition hover:brightness-105 active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy ? 'Applying…' : 'Apply reviewed paste'}
          </button>
        </div>
      </div>
    </section>
    </div>
  );
}
