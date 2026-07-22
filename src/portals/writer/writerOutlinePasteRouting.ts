import { parseOutlineText } from './writerExportFormats';
import {
  analyzeOutlinePaste,
  type OutlinePasteDiagnostic,
} from './writerOutlinePasteDiagnostic';
import type { OutlinePastePreferences } from './writerOutlinePastePreferences';

export type OutlinePasteRoute = 'review' | 'structured' | 'unstructured';

export type OutlineRecognitionSummary = {
  state: OutlinePasteRoute | 'applied' | 'partial';
  counts: {
    title: number;
    premise: number;
    act: number;
    pageBeat: number;
    notes: number;
    unassigned: number;
  };
  inferredPageCount: number | null;
  message: string;
};

function needsReview(diagnostic: OutlinePasteDiagnostic): boolean {
  return diagnostic.requiresReview
    || diagnostic.warnings.some((warning) => warning.severity === 'blocking');
}

export function routeOutlinePaste(
  diagnostic: OutlinePasteDiagnostic,
  preferences: OutlinePastePreferences,
): OutlinePasteRoute {
  if (preferences.reviewFrequency === 'always') return 'review';
  if (!needsReview(diagnostic)) return 'structured';
  return preferences.reviewFrequency === 'never_interrupt' ? 'unstructured' : 'review';
}

export function insertOutlinePasteText(
  currentText: string,
  pastedText: string,
  selectionStart: number,
  selectionEnd: number,
): { text: string; caret: number } {
  const start = Math.max(0, Math.min(selectionStart, currentText.length));
  const end = Math.max(start, Math.min(selectionEnd, currentText.length));
  return {
    text: `${currentText.slice(0, start)}${pastedText}${currentText.slice(end)}`,
    caret: start + pastedText.length,
  };
}

export function summarizeOutlineRecognition(
  diagnostic: OutlinePasteDiagnostic,
  state: OutlineRecognitionSummary['state'],
): OutlineRecognitionSummary {
  const count = (assignment: OutlinePasteDiagnostic['passages'][number]['assignment']) => (
    diagnostic.passages.filter((passage) => passage.assignment === assignment).length
  );
  const counts = {
    title: count('title'),
    premise: count('premise'),
    act: count('act'),
    pageBeat: count('page_beat'),
    notes: count('notes'),
    unassigned: count('unassigned'),
  };
  const recognized = [
    counts.title ? `${counts.title} title` : '',
    counts.premise ? `${counts.premise} premise` : '',
    counts.act ? `${counts.act} ${counts.act === 1 ? 'act' : 'acts'}` : '',
    counts.pageBeat ? `${counts.pageBeat} page ${counts.pageBeat === 1 ? 'beat' : 'beats'}` : '',
    counts.notes ? `${counts.notes} ${counts.notes === 1 ? 'note' : 'notes'}` : '',
  ].filter(Boolean).join(', ');
  const pageTarget = diagnostic.inferredPageCount
    ? ` Page target ${diagnostic.inferredPageCount}.`
    : ' No page target detected.';
  const message = state === 'review'
    ? `Paste review opened. ${recognized || 'No structure was confidently recognized.'}${pageTarget}`
    : state === 'unstructured'
      ? `Paste kept unstructured exactly as provided. Nothing was silently converted.${pageTarget}`
      : state === 'applied'
        ? `Reviewed paste applied as a new official outline version.${pageTarget}`
        : state === 'partial'
          ? `The reviewed outline was saved, but source synchronization needs attention.${pageTarget}`
          : `Recognized ${recognized || 'plain text'}.${pageTarget}`;
  return { state, counts, inferredPageCount: diagnostic.inferredPageCount, message };
}

export function prepareOfficialOutlineTextSave(
  draft: string,
  existingOutline: Record<string, unknown>,
):
  | { kind: 'review'; diagnostic: OutlinePasteDiagnostic }
  | { kind: 'save'; outlineJson: Record<string, unknown> } {
  const diagnostic = analyzeOutlinePaste(draft, 'txt');
  if (needsReview(diagnostic)) return { kind: 'review', diagnostic };
  return {
    kind: 'save',
    outlineJson: { ...existingOutline, ...parseOutlineText(draft) },
  };
}

export async function routeOfficialOutlineTextSave(input: {
  draft: string;
  existingOutline: Record<string, unknown>;
  onReview(diagnostic: OutlinePasteDiagnostic): void;
  onSave(outlineJson: Record<string, unknown>): void | Promise<void>;
}): Promise<'review' | 'saved'> {
  const prepared = prepareOfficialOutlineTextSave(input.draft, input.existingOutline);
  if (prepared.kind === 'review') {
    input.onReview(prepared.diagnostic);
    return 'review';
  }
  await input.onSave(prepared.outlineJson);
  return 'saved';
}
