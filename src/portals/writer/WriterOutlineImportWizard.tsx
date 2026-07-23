import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { WriterOutlinePasteReview } from './WriterOutlinePasteReview';
import { analyzeOutlinePaste, type OutlinePasteDiagnostic } from './writerOutlinePasteDiagnostic';
import type { OutlinePastePreferences } from './writerOutlinePastePreferences';
import {
  clearOutlineImportDraft,
  loadOutlineImportDraft,
  saveOutlineImportDraft,
} from './writerOutlineImportDraft';

export type WriterOutlineImportWizardProps = {
  issueId: string;
  initialText?: string;
  preferences: OutlinePastePreferences;
  onPreferencesChange(next: OutlinePastePreferences): void;
  onApply(diagnostic: OutlinePasteDiagnostic): void;
  onClose(): void;
  onSuggest?(diagnostic: OutlinePasteDiagnostic): Promise<OutlinePasteDiagnostic>;
};

export function WriterOutlineImportWizard({
  issueId,
  initialText = '',
  preferences,
  onPreferencesChange,
  onApply,
  onClose,
  onSuggest,
}: WriterOutlineImportWizardProps) {
  const savedDraft = typeof window === 'undefined' ? null : loadOutlineImportDraft(window.localStorage, issueId);
  const [source, setSource] = useState(savedDraft?.diagnostic.originalText ?? initialText);
  const [sourceType, setSourceType] = useState<'clipboard' | 'txt' | 'md'>(savedDraft?.diagnostic.sourceType ?? 'clipboard');
  const [diagnostic, setDiagnostic] = useState<OutlinePasteDiagnostic | null>(savedDraft?.step === 2 ? savedDraft.diagnostic : null);
  const [message, setMessage] = useState(savedDraft ? 'Resumed your saved import draft.' : 'Paste text or choose a TXT/Markdown file.');
  const [error, setError] = useState<string | null>(null);
  const [suggestBusy, setSuggestBusy] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  const readFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    if (!file) return;
    const extension = file.name.toLowerCase().split('.').pop();
    if (extension !== 'txt' && extension !== 'md') {
      setError('Choose a TXT or Markdown (.md) outline. Your current text was not changed.');
      event.currentTarget.value = '';
      return;
    }
    const text = await file.text();
    setSource(text);
    setSourceType(extension === 'md' ? 'md' : 'txt');
    setMessage(`${extension === 'md' ? 'Markdown' : 'TXT'} file loaded. Review it before importing.`);
    setError(null);
  };

  const closeImport = () => {
    const baseline = savedDraft?.diagnostic.originalText ?? initialText;
    if (source !== baseline && !window.confirm('Close this import? Your text will be saved as a resumable draft.')) return;
    if (source.trim() && typeof window !== 'undefined') {
      saveOutlineImportDraft(window.localStorage, issueId, analyzeOutlinePaste(source, sourceType), 1);
    }
    onClose();
  };

  const beginReview = async () => {
    const next = analyzeOutlinePaste(source, sourceType);
    setDiagnostic(next);
    if (typeof window !== 'undefined') saveOutlineImportDraft(window.localStorage, issueId, next, 2);
    if (preferences.aiClassification !== 'classify_with_review' || !onSuggest) return;
    setSuggestBusy(true);
    try {
      const suggested = await onSuggest(next);
      setDiagnostic(suggested);
      if (typeof window !== 'undefined') saveOutlineImportDraft(window.localStorage, issueId, suggested, 2);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'AI suggestions were unavailable. Continue manually.');
    } finally {
      setSuggestBusy(false);
    }
  };

  if (diagnostic) {
    return (
      <WriterOutlinePasteReview
        diagnostic={diagnostic}
        preferences={preferences}
        busy={suggestBusy}
        error={error}
        onApply={(reviewed) => {
          if (typeof window !== 'undefined') clearOutlineImportDraft(window.localStorage, issueId);
          onApply(reviewed);
        }}
        onKeepUnstructured={() => onApply(diagnostic)}
        onCancel={() => {
          setDiagnostic(null);
          setError(null);
        }}
        onPreferencesChange={onPreferencesChange}
        onSuggest={onSuggest ? async (current) => {
          setSuggestBusy(true);
          setError(null);
          try {
            const suggested = await onSuggest(current);
            setDiagnostic(suggested);
            if (typeof window !== 'undefined') saveOutlineImportDraft(window.localStorage, issueId, suggested, 2);
          } catch (cause) {
            setError(cause instanceof Error ? cause.message : 'AI suggestions were unavailable. Continue manually.');
          } finally {
            setSuggestBusy(false);
          }
        } : undefined}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/55 p-4" role="presentation">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="writer-outline-import-heading"
        className="w-full max-w-3xl rounded-2xl border border-white/60 bg-[#dff5f1] p-5 shadow-2xl"
      >
        <p className="text-[10px] font-black uppercase tracking-[0.24em] text-teal-900/60">Advanced Tools · Outline import</p>
        <h2 ref={headingRef} tabIndex={-1} id="writer-outline-import-heading" className="mt-1 font-serif text-3xl font-black text-slate-950">
          Import without losing your text
        </h2>
        <p className="mt-2 text-sm font-semibold text-slate-800/75">
          Paste any outline or load TXT/Markdown. Nothing becomes official until you review and apply it.
        </p>

        <label className="mt-5 block text-xs font-black text-slate-900">
          Choose TXT or Markdown outline
          <input
            aria-label="Choose TXT or Markdown outline"
            type="file"
            accept=".txt,.md,text/plain,text/markdown"
            onChange={(event) => void readFile(event)}
            className="mt-2 block w-full rounded-lg border border-black/15 bg-white p-2 text-xs"
          />
        </label>

        <label className="mt-4 block text-xs font-black text-slate-900">
          Outline import source
          <textarea
            aria-label="Outline import source"
            value={source}
            onChange={(event) => {
              setSource(event.currentTarget.value);
              setSourceType('clipboard');
              setError(null);
            }}
            rows={14}
            className="mt-2 w-full resize-y rounded-xl border border-black/15 bg-white p-4 font-mono text-sm leading-relaxed text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-700/50"
          />
        </label>

        {error ? <p role="alert" className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs font-bold text-red-900">{error}</p> : null}
        <p role="status" aria-live="polite" className="mt-3 text-xs font-semibold text-slate-700">{message}</p>

        <div className="mt-5 flex flex-wrap justify-end gap-2">
          {savedDraft ? (
            <button
              type="button"
              onClick={() => {
                if (typeof window !== 'undefined') clearOutlineImportDraft(window.localStorage, issueId);
                setSource(initialText);
                setMessage('Saved draft discarded.');
              }}
              className="mr-auto rounded-lg border border-rose-700/25 bg-rose-50 px-4 py-2 text-sm font-black text-rose-900"
            >
              Discard saved draft
            </button>
          ) : null}
          <button type="button" onClick={closeImport} className="rounded-lg border border-black/20 bg-white px-4 py-2 text-sm font-black text-slate-900">Close import</button>
          <button
            type="button"
            disabled={!source.trim()}
            onClick={() => void beginReview()}
            className="rounded-lg bg-black px-5 py-2 text-sm font-black text-white disabled:opacity-40"
          >
            Review import
          </button>
        </div>
      </section>
    </div>
  );
}
