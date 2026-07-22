import {
  inferOutlineTargetPageCount,
  parseOutlineActHeading,
  parseOutlineActLine,
  parseOutlineActListItem,
  parseOutlineBeatLine,
  parseOutlineNumberedBeatLine,
  type OutlineBeat,
} from './writerExportFormats';

export type OutlinePassageAssignment =
  | 'title'
  | 'premise'
  | 'act'
  | 'page_beat'
  | 'notes'
  | 'unassigned';

export type OutlineAssignmentProvenance = 'deterministic' | 'user' | 'ai';

export type OutlinePastePassage = {
  id: string;
  text: string;
  startLine: number;
  endLine: number;
  assignment: OutlinePassageAssignment;
  provenance: OutlineAssignmentProvenance;
  actName?: string;
  pageTarget?: number;
};

export type OutlinePasteDiagnostic = {
  originalText: string;
  passages: OutlinePastePassage[];
  proposedOutline: Record<string, unknown>;
  warnings: Array<{
    code: 'duplicate_page' | 'page_gap' | 'unassigned';
    message: string;
    passageIds: string[];
  }>;
  inferredPageCount: number | null;
  requiresReview: boolean;
};

type DiagnosticSection = 'none' | 'acts' | 'beats';

function stablePassageId(text: string, lineNumber: number): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return `outline-passage-${lineNumber}-${(hash >>> 0).toString(36)}`;
}

function isActsHeader(line: string): boolean {
  return line.toUpperCase() === 'ACTS:';
}

function isPageBeatsHeader(line: string): boolean {
  return line.toUpperCase() === 'PAGE BEATS:';
}

function parseExplicitPageBeat(line: string): OutlineBeat | null {
  const body = line.replace(/^[-*]\s+/, '');
  if (!/^Page\s+\d+\b/i.test(body)) return null;
  return parseOutlineBeatLine(body);
}

function classifyPassages(text: string): OutlinePastePassage[] {
  const passages: OutlinePastePassage[] = [];
  let section: DiagnosticSection = 'none';
  let currentActName: string | undefined;
  let canContinueAct = false;

  text.split('\n').forEach((rawLine, index) => {
    const lineNumber = index + 1;
    const line = rawLine.trim();
    if (!line) return;

    const passage: OutlinePastePassage = {
      id: stablePassageId(rawLine, lineNumber),
      text: rawLine,
      startLine: lineNumber,
      endLine: lineNumber,
      assignment: 'unassigned',
      provenance: 'deterministic',
    };
    const upper = line.toUpperCase();

    if (upper.startsWith('TITLE:')) {
      passage.assignment = 'title';
      section = 'none';
      currentActName = undefined;
      canContinueAct = false;
    } else if (upper.startsWith('PREMISE:')) {
      passage.assignment = 'premise';
      section = 'none';
      currentActName = undefined;
      canContinueAct = false;
    } else if (isActsHeader(line)) {
      passage.assignment = 'act';
      section = 'acts';
      currentActName = undefined;
      canContinueAct = false;
    } else if (isPageBeatsHeader(line)) {
      passage.assignment = 'page_beat';
      section = 'beats';
      currentActName = undefined;
      canContinueAct = false;
    } else {
      const actHeading = parseOutlineActHeading(line);
      const numberedBeat = section === 'acts' ? null : parseOutlineNumberedBeatLine(line);
      const explicitPageBeat = section === 'acts' ? null : parseExplicitPageBeat(line);

      if (actHeading) {
        passage.assignment = 'act';
        passage.actName = actHeading.name;
        currentActName = actHeading.name;
        canContinueAct = section === 'acts';
      } else if (/^[-*]\s+/.test(line) && section === 'acts') {
        const body = line.replace(/^[-*]\s+/, '');
        const parsedAct = parseOutlineActListItem(body);
        passage.assignment = 'act';
        passage.actName = parsedAct.name;
        currentActName = parsedAct.name;
        canContinueAct = true;
      } else if (numberedBeat || explicitPageBeat) {
        const beat = numberedBeat ?? explicitPageBeat;
        passage.assignment = 'page_beat';
        passage.pageTarget = beat?.page_target;
        section = 'beats';
        currentActName = undefined;
        canContinueAct = false;
      } else if (/^[-*]\s+/.test(line) && section === 'beats') {
        const beat = parseOutlineBeatLine(line.replace(/^[-*]\s+/, ''));
        passage.assignment = 'page_beat';
        passage.pageTarget = beat.page_target;
        canContinueAct = false;
      } else if (section === 'acts' && currentActName && canContinueAct) {
        passage.assignment = 'act';
        passage.actName = currentActName;
      }
    }

    passages.push(passage);
  });

  return passages;
}

function appendSummary(existing: string | undefined, next: string): string {
  return [existing, next.trim()].filter(Boolean).join(' ');
}

function buildProposedOutline(
  passages: OutlinePastePassage[],
  recognizedActListItemIds: ReadonlySet<string>,
): Record<string, unknown> {
  const proposed: Record<string, unknown> = {};
  const acts: Array<{ name?: string; goal?: string; summary?: string }> = [];
  const pageBeats: OutlineBeat[] = [];
  const notes: string[] = [];
  let sawActs = false;
  let sawPageBeats = false;

  for (const passage of passages) {
    const line = passage.text.trim();
    if (passage.assignment === 'title') {
      proposed.title = line.toUpperCase().startsWith('TITLE:')
        ? line.slice(line.indexOf(':') + 1).trim()
        : line;
      continue;
    }
    if (passage.assignment === 'premise') {
      proposed.premise = line.toUpperCase().startsWith('PREMISE:')
        ? line.slice(line.indexOf(':') + 1).trim()
        : line;
      continue;
    }
    if (passage.assignment === 'notes') {
      notes.push(passage.text);
      continue;
    }
    if (passage.assignment === 'act') {
      sawActs = true;
      if (isActsHeader(line)) continue;

      const isListItem = /^[-*]\s+/.test(line);
      const body = line.replace(/^[-*]\s+/, '');
      const heading = parseOutlineActHeading(body);
      const isRecognizedActListItem = isListItem && recognizedActListItemIds.has(passage.id);
      const parsedAct = isRecognizedActListItem
        ? parseOutlineActListItem(body)
        : heading;
      if (parsedAct) {
        acts.push(passage.actName
          ? { ...parsedAct, name: passage.actName }
          : parsedAct);
        continue;
      }

      if (passage.actName) {
        const previous = acts.at(-1);
        if (previous?.name === passage.actName) {
          previous.summary = appendSummary(previous.summary, body);
        } else {
          acts.push({ name: passage.actName, summary: body });
        }
        continue;
      }

      const fallbackAct = parseOutlineActLine(body);
      acts.push(fallbackAct);
      continue;
    }
    if (passage.assignment === 'page_beat') {
      sawPageBeats = true;
      if (isPageBeatsHeader(line)) continue;

      const body = line.replace(/^[-*]\s+/, '');
      const beat = parseOutlineNumberedBeatLine(body) ?? parseOutlineBeatLine(body);
      if (typeof passage.pageTarget === 'number') beat.page_target = passage.pageTarget;
      if (passage.provenance !== 'deterministic'
        && !beat.scene
        && !beat.summary
        && !beat.emotional_turn) {
        beat.summary = line;
      }
      pageBeats.push(beat);
    }
  }

  if (sawActs) proposed.acts = acts;
  if (sawPageBeats) proposed.page_beats = pageBeats;
  if (notes.length) proposed.notes = notes;
  return proposed;
}

function buildWarnings(passages: OutlinePastePassage[]): OutlinePasteDiagnostic['warnings'] {
  const warnings: OutlinePasteDiagnostic['warnings'] = [];
  const pagePassages = passages.filter((passage) => (
    passage.assignment === 'page_beat'
    && typeof passage.pageTarget === 'number'
    && passage.pageTarget >= 1
    && passage.pageTarget <= 200
  ));
  const byPage = new Map<number, OutlinePastePassage[]>();
  for (const passage of pagePassages) {
    const matches = byPage.get(passage.pageTarget!) ?? [];
    matches.push(passage);
    byPage.set(passage.pageTarget!, matches);
  }

  for (const [page, matches] of [...byPage.entries()].sort(([a], [b]) => a - b)) {
    if (matches.length < 2) continue;
    warnings.push({
      code: 'duplicate_page',
      message: `Page ${page} is assigned more than once.`,
      passageIds: matches.map((passage) => passage.id),
    });
  }

  const assignedPages = [...byPage.keys()].sort((a, b) => a - b);
  if (assignedPages.length > 1) {
    const missingPages: number[] = [];
    for (let page = assignedPages[0]; page < assignedPages.at(-1)!; page += 1) {
      if (!byPage.has(page)) missingPages.push(page);
    }
    if (missingPages.length) {
      warnings.push({
        code: 'page_gap',
        message: `Missing page targets: ${missingPages.join(', ')}.`,
        passageIds: pagePassages.map((passage) => passage.id),
      });
    }
  }

  const unassigned = passages.filter((passage) => passage.assignment === 'unassigned');
  if (unassigned.length) {
    warnings.push({
      code: 'unassigned',
      message: `${unassigned.length} ${unassigned.length === 1 ? 'passage requires' : 'passages require'} assignment.`,
      passageIds: unassigned.map((passage) => passage.id),
    });
  }

  return warnings;
}

function inferredPageCount(passages: OutlinePastePassage[], originalText: string): number | null {
  const assignedTargets = passages
    .filter((passage) => passage.assignment === 'page_beat')
    .map((passage) => passage.pageTarget)
    .filter((page): page is number => typeof page === 'number' && page >= 1 && page <= 200);
  if (assignedTargets.length) return Math.max(...assignedTargets);
  return inferOutlineTargetPageCount(originalText);
}

function createDiagnostic(
  originalText: string,
  passages: OutlinePastePassage[],
  sourcePassages = classifyPassages(originalText),
): OutlinePasteDiagnostic {
  const warnings = buildWarnings(passages);
  const recognizedActListItemIds = new Set(sourcePassages
    .filter((passage) => passage.assignment === 'act' && /^[-*]\s+/.test(passage.text.trim()))
    .map((passage) => passage.id));
  return {
    originalText,
    passages,
    proposedOutline: buildProposedOutline(passages, recognizedActListItemIds),
    warnings,
    inferredPageCount: inferredPageCount(passages, originalText),
    requiresReview: warnings.length > 0,
  };
}

export function analyzeOutlinePaste(text: string): OutlinePasteDiagnostic {
  const passages = classifyPassages(text);
  return createDiagnostic(text, passages, passages);
}

export function assignOutlinePassages(
  diagnostic: OutlinePasteDiagnostic,
  passageIds: string[],
  assignment: OutlinePassageAssignment,
  metadata: { actName?: string; firstPageTarget?: number } = {},
): OutlinePasteDiagnostic {
  const selectedIds = new Set(passageIds);
  const selectedInSourceOrder = diagnostic.passages.filter((passage) => selectedIds.has(passage.id));
  const pageNumberById = new Map<string, number>();
  if (assignment === 'page_beat') {
    const firstPage = metadata.firstPageTarget;
    const selectionIsComplete = selectedInSourceOrder.length > 0
      && selectedInSourceOrder.length === selectedIds.size;
    const sequenceIsValid = typeof firstPage === 'number'
      && Number.isFinite(firstPage)
      && Number.isInteger(firstPage)
      && firstPage >= 1
      && firstPage + selectedInSourceOrder.length - 1 <= 200;
    if (!selectionIsComplete || !sequenceIsValid) return diagnostic;
    selectedInSourceOrder.forEach((passage, index) => pageNumberById.set(passage.id, firstPage + index));
  }

  const passages = diagnostic.passages.map((passage) => {
    if (!selectedIds.has(passage.id)) return passage;
    const updated: OutlinePastePassage = {
      ...passage,
      assignment,
      provenance: 'user',
    };
    delete updated.actName;
    delete updated.pageTarget;
    if (assignment === 'act' && metadata.actName?.trim()) updated.actName = metadata.actName.trim();
    if (assignment === 'page_beat') {
      updated.pageTarget = pageNumberById.get(passage.id) ?? passage.pageTarget;
    }
    return updated;
  });

  return createDiagnostic(diagnostic.originalText, passages);
}
