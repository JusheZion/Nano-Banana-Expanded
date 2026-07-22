import { useRef, useState, type ClipboardEvent } from 'react';
import { analyzeOutlinePaste, type OutlinePasteDiagnostic } from './writerOutlinePasteDiagnostic';
import type { OutlinePastePreferences } from './writerOutlinePastePreferences';
import {
  insertOutlinePasteText,
  routeOutlinePaste,
  summarizeOutlineRecognition,
  type OutlineRecognitionSummary,
} from './writerOutlinePasteRouting';
import { WRITER_OUTLINE_TEMPLATE_FILES } from './writerOutlineTemplates';
import { WriterOutlinePasteSettings } from './WriterOutlinePasteSettings';

export type WriterOutlineSourceEditorProps = {
  id: string;
  value: string;
  onChange(value: string): void;
  preferences: OutlinePastePreferences;
  onPreferencesChange(next: OutlinePastePreferences): void;
  onReview(diagnostic: OutlinePasteDiagnostic): void;
  recognition?: OutlineRecognitionSummary | null;
  onRecognitionChange?(summary: OutlineRecognitionSummary): void;
  rows?: number;
  placeholder?: string;
  className?: string;
};

export function WriterOutlineSourceEditor({
  id,
  value,
  onChange,
  preferences,
  onPreferencesChange,
  onReview,
  recognition,
  onRecognitionChange,
  rows = 8,
  placeholder = 'Paste your outline in any format — a numbered list, summary, or rough notes...',
  className = '',
}: WriterOutlineSourceEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [localRecognition, setLocalRecognition] = useState<OutlineRecognitionSummary | null>(null);
  const displayedRecognition = recognition === undefined ? localRecognition : recognition;

  const publishRecognition = (summary: OutlineRecognitionSummary) => {
    setLocalRecognition(summary);
    onRecognitionChange?.(summary);
  };

  const handlePaste = (event: ClipboardEvent<HTMLTextAreaElement>) => {
    const pastedText = event.clipboardData.getData('text/plain');
    event.preventDefault();
    const target = event.currentTarget;
    const inserted = insertOutlinePasteText(
      value,
      pastedText,
      target.selectionStart ?? value.length,
      target.selectionEnd ?? value.length,
    );
    const diagnostic = analyzeOutlinePaste(inserted.text, 'clipboard');
    const route = routeOutlinePaste(diagnostic, preferences);
    publishRecognition(summarizeOutlineRecognition(diagnostic, route));

    if (route === 'review') {
      onReview(diagnostic);
      return;
    }
    if (route === 'unstructured') {
      onChange(diagnostic.originalText);
      return;
    }

    onChange(inserted.text);
    window.requestAnimationFrame(() => {
      textareaRef.current?.setSelectionRange(inserted.caret, inserted.caret);
    });
  };

  return (
    <div className="space-y-2.5">
      <textarea
        ref={textareaRef}
        id={id}
        aria-label="Source outline"
        value={value}
        onChange={(event) => onChange(event.currentTarget.value)}
        onPaste={handlePaste}
        rows={rows}
        className={className}
        placeholder={placeholder}
      />

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[10px] font-black text-black/58">
        <details className="group">
          <summary className="cursor-pointer underline decoration-black/25 underline-offset-2 hover:decoration-black/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/25">
            Format guide
          </summary>
          <p className="mt-2 max-w-lg border-l-2 border-amber-700/45 pl-3 font-semibold leading-relaxed text-black/58">
            Title, premise, and acts are optional. Use Page 1 or numbered beats for page targets. Unrecognized prose is preserved for review.
          </p>
        </details>
        {WRITER_OUTLINE_TEMPLATE_FILES.map((file) => (
          <a
            key={file.filename}
            href={`/templates/${file.filename}`}
            download={file.filename}
            className="underline decoration-black/25 underline-offset-2 hover:decoration-black/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/25"
          >
            {file.format === 'text' ? 'TXT template' : 'Markdown template'}
          </a>
        ))}
        <details className="ml-auto min-w-[220px] rounded-md border border-black/10 bg-white/55 px-2.5 py-1.5">
          <summary className="cursor-pointer font-black text-black/64 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/25">
            Paste settings
          </summary>
          <div className="mt-3 border-t border-black/10 pt-3">
            <WriterOutlinePasteSettings
              surface="local"
              idPrefix={`${id}-paste-settings`}
              value={preferences}
              onChange={onPreferencesChange}
            />
          </div>
        </details>
      </div>

      {displayedRecognition ? (
        <div
          role="status"
          aria-live="polite"
          className={`flex items-start gap-2 border-l-2 px-3 py-2 text-[10px] font-semibold leading-snug ${
            displayedRecognition.state === 'unstructured' || displayedRecognition.state === 'partial'
              ? 'border-amber-700 bg-amber-50/60 text-amber-950/75'
              : displayedRecognition.state === 'review'
                ? 'border-sky-700 bg-sky-50/60 text-sky-950/75'
                : 'border-emerald-700 bg-emerald-50/60 text-emerald-950/75'
          }`}
        >
          {displayedRecognition.message}
        </div>
      ) : null}
    </div>
  );
}
