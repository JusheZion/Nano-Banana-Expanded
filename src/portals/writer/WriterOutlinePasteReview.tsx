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
  if (passage.assignment === 'page_beat' && passage.pageRange?.valid) {
    return `Pages ${passage.pageRange.startPage}–${passage.pageRange.endPage}`;
  }
  if (passage.assignment === 'page_beat' && passage.pageTarget) return `Page ${passage.pageTarget}`;
  return null;
}

function passageLineLabel(passage: OutlinePastePassage): string {
  return passage.startLine === passage.endLine
    ? `Line ${passage.startLine}`
    : `Lines ${passage.startLine}–${passage.endLine}`;
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
  const [showGuidanceThisSession, setShowGuidanceThisSession] = useState(true);
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
  const blockingWarnings = workingDiagnostic.warnings.filter((warning) => warning.severity === 'blocking');
  const advisoryWarnings = workingDiagnostic.warnings.filter((warning) => warning.severity === 'advisory');
  const warningPassageIds = useMemo(() => new Set(
    workingDiagnostic.warnings.flatMap((warning) => warning.passageIds),
  ), [workingDiagnostic.warnings]);
  const applyBlocked = validationMessage !== null || blockingWarnings.length > 0;
  const assignmentLabel = ASSIGNMENT_OPTIONS.find((option) => option.value === assignment)?.label ?? assignment;
  const firstPage = Number(firstPageNumber);
  const lastSelectedPage = firstPage + selectedCount - 1;
  const assignmentDisabledReason = selectedCount === 0
    ? 'Select passages to enable assignment.'
    : (assignment === 'title' || assignment === 'premise') && selectedCount !== 1
      ? `Choose exactly one passage for ${assignmentLabel}.`
      : assignment === 'act' && !actName.trim()
        ? 'Enter an Act name or number to enable assignment.'
        : assignment === 'page_beat' && (
          !firstPageNumber.trim()
          || !Number.isInteger(firstPage)
          || firstPage < 1
          || lastSelectedPage > 200
        )
          ? 'Enter a whole first page number from 1 to 200 to enable assignment.'
          : null;
  const assignmentSummary = assignment === 'act' && actName.trim()
    ? `${assignmentLabel} · ${actName.trim()}`
    : assignment === 'page_beat' && !assignmentDisabledReason
      ? `${assignmentLabel} · ${selectedCount === 1 ? `Page ${firstPage}` : `Pages ${firstPage}–${lastSelectedPage}`}`
      : assignmentLabel;

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
    if (assignmentDisabledReason) {
      setValidationMessage(assignmentDisabledReason);
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
    setFeedback(`Assigned ${pluralizePassage(selectedCount)} to ${assignmentLabel}.`);
  };

  const restoreOriginal = () => {
    if (busy) return;
    setWorkingDiagnostic(diagnostic);
    setSelectedPassageIds(new Set());
    setValidationMessage(null);
    setFeedback('Original recognition restored.');
  };

  const actionDisabled = busy;
  const applyDisabled = busy || applyBlocked;
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
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-800">
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

      {preferences.showFirstUseGuidance && showGuidanceThisSession ? (
        <aside className="mt-4 border-l-4 border-amber-500 bg-amber-50/90 px-4 py-3">
          <h3 className="text-sm font-extrabold text-amber-950">Why this review opened</h3>
          <p className="mt-1 text-sm leading-relaxed text-amber-950/80">
            Some pasted passages need a destination. Your original remains preserved. Review Unassigned Text,
            make manual assignments, then Apply when blocking issues are cleared.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
            <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-semibold text-amber-950">
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
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                if (busy) return;
                setShowGuidanceThisSession(false);
              }}
              className="text-xs font-bold text-amber-950 underline decoration-amber-700/50 underline-offset-2 hover:decoration-amber-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Dismiss tips for this session
            </button>
          </div>
        </aside>
      ) : null}

      <section
        data-testid="assignment-toolbar"
        aria-labelledby="paste-review-assign-title"
        className="mt-5 rounded-xl border border-slate-900/15 bg-white/95 p-3 shadow-sm lg:sticky lg:top-3 lg:z-20"
      >
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[12rem] flex-1">
            <h3 id="paste-review-assign-title" className="text-sm font-extrabold text-slate-950">Manual assignment</h3>
            <p className="mt-0.5 text-xs text-slate-600">
              Review selected passages here. Nothing changes until you choose Apply reviewed paste.
            </p>
            <label className="mt-1 block text-xs font-bold text-slate-700">
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
          </div>

          {assignment === 'act' ? (
            <label className="min-w-[12rem] flex-1 text-xs font-bold text-slate-700">
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
            <label className="min-w-[12rem] flex-1 text-xs font-bold text-slate-700">
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
              <span className="mt-1 block font-normal text-slate-500">Selections continue sequentially.</span>
            </label>
          ) : null}

          <div className="flex min-w-[13rem] flex-col items-stretch gap-2">
            <span data-testid="assignment-guidance" className="text-center text-xs font-bold text-slate-600">
              {assignmentDisabledReason ?? `${selectedCount} selected · Ready for ${assignmentSummary}`}
            </span>
            <span data-testid="selected-passage-count" className="sr-only">{selectedCount} selected</span>
            <button
              type="button"
              disabled={busy || assignmentDisabledReason !== null}
              onClick={applyAssignment}
              className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-extrabold text-white transition hover:bg-slate-800 active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Assign selected passages
            </button>
            <Tooltip content="Discard local review edits and return to the parser's first recognition." side="top">
              <button
                type="button"
                disabled={busy}
                onClick={restoreOriginal}
                className="w-full rounded-lg border border-slate-400 bg-white px-3 py-2 text-xs font-bold text-slate-700 transition hover:border-amber-600 hover:text-slate-950 active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Restore original recognition
              </button>
            </Tooltip>
          </div>
        </div>
        {validationMessage ? (
          <p role="alert" className="mt-3 border-l-2 border-rose-600 pl-2 text-xs font-semibold text-rose-800">
            {validationMessage}
          </p>
        ) : null}
      </section>

      <div
        data-testid="paste-review-layout"
        className="mt-5 grid min-w-0 grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(17rem,0.65fr)]"
      >
        <section aria-labelledby="paste-review-passages-title" className="min-w-0">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Working copy</p>
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
              const checkboxId = `paste-review-checkbox-${passage.id}`;
              const passageTextId = `paste-review-text-${passage.id}`;
              const metadataId = `paste-review-metadata-${passage.id}`;
              const selected = selectedPassageIds.has(passage.id);
              const warningAffected = warningPassageIds.has(passage.id);
              return (
                <div
                  key={passage.id}
                  id={`paste-review-${passage.id}`}
                  data-selected={selected ? 'true' : 'false'}
                  data-warning-affected={warningAffected ? 'true' : 'false'}
                  className={`group grid min-w-0 scroll-mt-32 cursor-pointer grid-cols-[auto_minmax(0,1fr)] gap-3 border-l-4 px-2 py-3 transition-colors hover:bg-amber-50/70 has-[:focus-visible]:bg-amber-50/70 ${
                    selected
                      ? 'border-amber-600 bg-amber-100/80 ring-1 ring-inset ring-amber-600/30'
                      : warningAffected
                        ? 'border-rose-500 bg-rose-50/45'
                        : 'border-transparent'
                  }`}
                >
                  <input
                    id={checkboxId}
                    type="checkbox"
                    aria-labelledby={passageTextId}
                    aria-describedby={metadataId}
                    checked={selected}
                    disabled={busy}
                    onChange={() => togglePassage(passage.id)}
                    className="mt-1 h-4 w-4 accent-amber-700 focus-visible:ring-2 focus-visible:ring-amber-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed"
                  />
                  <span className="min-w-0">
                    <label
                      id={passageTextId}
                      htmlFor={checkboxId}
                      className="block cursor-pointer whitespace-pre-wrap break-words text-sm font-medium leading-relaxed text-slate-900"
                    >
                      {passageDisplayText(passage)}
                    </label>
                    <span
                      id={metadataId}
                      className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-semibold text-slate-600"
                    >
                      <span>
                        Current assignment: {ASSIGNMENT_OPTIONS.find((option) => option.value === passage.assignment)?.label}
                      </span>
                      {detail ? <span>· {detail}</span> : null}
                      <span>· Provenance: {PROVENANCE_LABELS[passage.provenance]}</span>
                      <span>· {passageLineLabel(passage)}</span>
                      {warningAffected ? (
                        <span className="font-extrabold uppercase tracking-wide text-rose-700">· Needs review</span>
                      ) : null}
                    </span>
                  </span>
                </div>
              );
            })}
          </div>
        </section>

        <aside
          data-testid="paste-review-sidebar"
          className="min-w-0 border-t border-slate-900/15 pt-4 lg:sticky lg:top-28 lg:self-start lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0"
        >
          <section aria-labelledby="paste-review-summary-title">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Recognition</p>
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
              <div className="col-span-full flex items-baseline justify-between border-b border-slate-900/10 pb-1">
                <dt className="text-xs font-semibold text-slate-600">Detected pages</dt>
                <dd data-testid="inferred-page-count" className="text-sm font-black tabular-nums text-slate-950">
                  {workingDiagnostic.inferredPageCount ?? 'No page count detected'}
                </dd>
              </div>
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
                  <li key={passage.id} className="break-words">
                    <a
                      href={busy ? undefined : `#paste-review-${passage.id}`}
                      aria-disabled={busy || undefined}
                      aria-describedby={`paste-review-text-${passage.id}`}
                      className="font-semibold underline decoration-rose-700/35 underline-offset-2 hover:decoration-rose-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-600"
                    >
                      {passageLineLabel(passage)}
                    </a>
                  </li>
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
                  <li
                    key={`${warning.code}-${index}`}
                    className={`border-l-2 pl-2 ${warning.severity === 'blocking' ? 'border-rose-600' : 'border-amber-500'}`}
                  >
                    <span className="font-extrabold text-slate-900">
                      {warning.severity === 'blocking' ? 'Blocking' : 'Advisory'}:
                    </span>{' '}
                    {warning.message}
                    {warning.passageIds.length ? (
                      <span className="mt-1 block space-y-0.5">
                        {warning.passageIds.map((passageId) => {
                          const passage = workingDiagnostic.passages.find((candidate) => candidate.id === passageId);
                          if (!passage) return null;
                          return (
                            <a
                              key={passageId}
                              href={busy ? undefined : `#paste-review-${passageId}`}
                              aria-disabled={busy || undefined}
                              aria-describedby={`paste-review-text-${passageId}`}
                              className={`block break-words font-bold underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 ${
                                warning.severity === 'blocking'
                                  ? 'text-rose-800 decoration-rose-700/40 hover:decoration-rose-700 focus-visible:ring-rose-600'
                                  : 'text-amber-900 decoration-amber-700/40 hover:decoration-amber-700 focus-visible:ring-amber-600'
                              }`}
                            >
                              {assignmentDetails(passage) ? `${assignmentDetails(passage)} · ` : ''}
                              {passageLineLabel(passage)}
                            </a>
                          );
                        })}
                      </span>
                    ) : null}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

        </aside>
      </div>

      {selectedCount > 0 ? (
        <aside
          data-testid="mobile-assignment-bar"
          aria-label="Selected passage actions"
          className="fixed inset-x-3 bottom-3 z-20 border border-amber-700/30 bg-amber-50/95 px-3 py-2 shadow-xl backdrop-blur md:hidden"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0 text-xs text-slate-800">
              <p className="font-extrabold">{selectedCount} selected</p>
              <p className="truncate font-semibold">Destination: {assignmentSummary}</p>
              {assignmentDisabledReason ? <p className="text-rose-800">{assignmentDisabledReason}</p> : null}
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <a
                href="#paste-review-assign-title"
                className="rounded-md px-2 py-2 text-xs font-bold text-amber-950 underline decoration-amber-700/50 underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600"
              >
                Edit assignment options
              </a>
              <button
                type="button"
                aria-label="Assign selected passages from mobile action bar"
                disabled={busy || assignmentDisabledReason !== null}
                onClick={applyAssignment}
                className="rounded-md bg-slate-900 px-3 py-2 text-xs font-extrabold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Assign
              </button>
            </div>
          </div>
        </aside>
      ) : null}

      <div
        data-testid="paste-review-footer"
        className="sticky bottom-0 z-30 mt-5 border-t border-slate-900/15 bg-white/95 px-1 pb-1 pt-4 shadow-[0_-10px_18px_-18px_rgba(15,23,42,0.7)] backdrop-blur"
      >
        {error ? (
          <p role="alert" className="mb-3 border-l-4 border-rose-600 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-900">
            {error}
          </p>
        ) : null}
        <p role="status" aria-live="polite" aria-atomic="true" className="mb-3 min-h-5 text-xs font-semibold text-slate-600">
          {visibleStatus}
        </p>
        <p
          data-testid="apply-readiness"
          className={`mb-3 border-l-2 pl-2 text-xs font-semibold ${
            applyBlocked ? 'border-rose-600 text-rose-800' : 'border-emerald-600 text-emerald-800'
          }`}
        >
          {validationMessage
            ? `${validationMessage} Correct the assignment controls before Apply.`
            : blockingWarnings.length
              ? `${blockingWarnings.length} blocking ${blockingWarnings.length === 1 ? 'issue' : 'issues'} remaining. Select the affected passages, then use Manual assignment to resolve them before Apply.`
              : advisoryWarnings.length
                ? `Ready to apply with ${advisoryWarnings.length} advisory ${advisoryWarnings.length === 1 ? 'warning' : 'warnings'}.`
                : 'Ready to apply.'}
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
            disabled={applyDisabled}
            onClick={() => {
              if (applyDisabled) return;
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
