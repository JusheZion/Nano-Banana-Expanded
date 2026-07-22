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
export type OutlinePasteSourceType = 'clipboard' | 'txt' | 'md';

export type OutlineDetectedPageRange = {
  startPage: number;
  endPage: number;
  valid: boolean;
};

export type OutlinePastePassage = {
  id: string;
  text: string;
  startLine: number;
  endLine: number;
  assignment: OutlinePassageAssignment;
  provenance: OutlineAssignmentProvenance;
  actName?: string;
  pageTarget?: number;
  pageRange?: OutlineDetectedPageRange;
};

export type OutlinePasteDiagnostic = {
  originalText: string;
  sourceType: OutlinePasteSourceType;
  passages: OutlinePastePassage[];
  proposedOutline: Record<string, unknown>;
  warnings: Array<{
    code:
      | 'duplicate_page'
      | 'page_gap'
      | 'unassigned'
      | 'duplicate_title'
      | 'duplicate_premise'
      | 'overlapping_page_range'
      | 'invalid_page_range';
    severity: 'blocking' | 'advisory';
    message: string;
    passageIds: string[];
  }>;
  detectedPageRanges: Array<OutlineDetectedPageRange & { passageId: string }>;
  inferredPageCount: number | null;
  requiresReview: boolean;
};

type DiagnosticSection = 'none' | 'acts' | 'beats' | 'notes';

function normalizeRecognitionLine(rawLine: string): { line: string; markdownHeading: boolean } {
  let line = rawLine.trim();
  const markdownHeading = /^#{1,6}\s+/.test(line);
  line = line.replace(/^#{1,6}\s+/, '');
  line = line.replace(/\*\*|__/g, '');
  return { line: line.trim(), markdownHeading };
}

function stablePassageId(text: string, lineNumber: number): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return `outline-passage-${lineNumber}-${(hash >>> 0).toString(36)}`;
}

function isActsHeader(line: string): boolean {
  return /^ACTS:?$/i.test(line);
}

function isPageBeatsHeader(line: string): boolean {
  return /^PAGE BEATS:?$/i.test(line);
}

function isNotesHeader(line: string): boolean {
  return /^NOTES:?$/i.test(line);
}

function parsePageRange(line: string): OutlineDetectedPageRange | null {
  const body = line.replace(/^[-*]\s+/, '');
  const match = body.match(/^Pages\s+(\d+)\s*[-–—]\s*(\d+)\b/i);
  if (!match) return null;
  const startPage = Number(match[1]);
  const endPage = Number(match[2]);
  return {
    startPage,
    endPage,
    valid: startPage >= 1 && startPage <= endPage && endPage <= 200,
  };
}

function isUnrecognizedSectionHeading(line: string, markdownHeading: boolean): boolean {
  return markdownHeading || /^[A-Z][A-Z\s]+:?$/.test(line);
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
    const { line, markdownHeading } = normalizeRecognitionLine(rawLine);
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
    const pageRange = parsePageRange(line);

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
    } else if (isNotesHeader(line) || upper.startsWith('NOTES:')) {
      passage.assignment = 'notes';
      section = 'notes';
      currentActName = undefined;
      canContinueAct = false;
    } else if (pageRange) {
      passage.pageRange = pageRange;
      if (pageRange.valid) passage.assignment = 'page_beat';
      section = 'beats';
      currentActName = undefined;
      canContinueAct = false;
    } else {
      const actHeading = parseOutlineActHeading(line);
      const numberedBeat = section === 'acts' ? null : parseOutlineNumberedBeatLine(line);
      const explicitPageBeat = section === 'acts' ? null : parseExplicitPageBeat(line);

      if (isUnrecognizedSectionHeading(line, markdownHeading)) {
        section = 'none';
        currentActName = undefined;
        canContinueAct = false;
      } else if (actHeading) {
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
      } else if (section === 'notes') {
        passage.assignment = 'notes';
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
    const line = normalizeRecognitionLine(passage.text).line;
    if (passage.assignment === 'title') {
      if (proposed.title === undefined) {
        proposed.title = line.toUpperCase().startsWith('TITLE:')
          ? line.slice(line.indexOf(':') + 1).trim()
          : line;
      }
      continue;
    }
    if (passage.assignment === 'premise') {
      if (proposed.premise === undefined) {
        proposed.premise = line.toUpperCase().startsWith('PREMISE:')
          ? line.slice(line.indexOf(':') + 1).trim()
          : line;
      }
      continue;
    }
    if (passage.assignment === 'notes') {
      if (!isNotesHeader(line)) notes.push(passage.text);
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
      if (passage.provenance !== 'deterministic') {
        const beat: OutlineBeat = { summary: passage.text.trim().replace(/^[-*]\s+/, '') };
        if (typeof passage.pageTarget === 'number') beat.page_target = passage.pageTarget;
        pageBeats.push(beat);
        continue;
      }

      const range = passage.pageRange;
      const structuralBody = range
        ? body.replace(/^Pages\s+\d+\s*[-–—]\s*\d+\b/i, `Page ${range.startPage}`)
        : body;
      const beat = parseOutlineNumberedBeatLine(structuralBody) ?? parseOutlineBeatLine(structuralBody);
      if (range?.valid) {
        for (let page = range.startPage; page <= range.endPage; page += 1) {
          pageBeats.push({ ...beat, page_target: page });
        }
        continue;
      }
      if (typeof passage.pageTarget === 'number') beat.page_target = passage.pageTarget;
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
  const titlePassages = passages.filter((passage) => passage.assignment === 'title');
  const premisePassages = passages.filter((passage) => passage.assignment === 'premise');
  if (titlePassages.length > 1) {
    warnings.push({
      code: 'duplicate_title',
      severity: 'blocking',
      message: 'More than one passage is assigned as Title. Move extras to another destination.',
      passageIds: titlePassages.map((passage) => passage.id),
    });
  }
  if (premisePassages.length > 1) {
    warnings.push({
      code: 'duplicate_premise',
      severity: 'blocking',
      message: 'More than one passage is assigned as Premise. Move extras to another destination.',
      passageIds: premisePassages.map((passage) => passage.id),
    });
  }

  const invalidRanges = passages.filter((passage) => passage.pageRange && !passage.pageRange.valid);
  invalidRanges.forEach((passage) => warnings.push({
    code: 'invalid_page_range',
    severity: 'blocking',
    message: 'Page ranges must run from 1 to 200 with the first page before the last.',
    passageIds: [passage.id],
  }));

  const pageEntries = passages.flatMap((passage) => {
    if (passage.assignment !== 'page_beat') return [];
    if (passage.pageRange?.valid) {
      const pages: number[] = [];
      for (let page = passage.pageRange.startPage; page <= passage.pageRange.endPage; page += 1) pages.push(page);
      return [{ passage, pages, isRange: true }];
    }
    if (typeof passage.pageTarget === 'number' && passage.pageTarget >= 1 && passage.pageTarget <= 200) {
      return [{ passage, pages: [passage.pageTarget], isRange: false }];
    }
    return [];
  });
  const byPage = new Map<number, typeof pageEntries>();
  pageEntries.forEach((entry) => {
    entry.pages.forEach((page) => byPage.set(page, [...(byPage.get(page) ?? []), entry]));
  });

  const overlapPages: number[] = [];
  const overlapIds = new Set<string>();
  for (const [page, matches] of [...byPage.entries()].sort(([a], [b]) => a - b)) {
    if (matches.length < 2) continue;
    if (matches.some((match) => match.isRange)) {
      overlapPages.push(page);
      matches.forEach((match) => overlapIds.add(match.passage.id));
      continue;
    }
    warnings.push({
      code: 'duplicate_page',
      severity: 'blocking',
      message: `Page ${page} is assigned more than once.`,
      passageIds: matches.map((match) => match.passage.id),
    });
  }
  if (overlapPages.length) {
    warnings.push({
      code: 'overlapping_page_range',
      severity: 'blocking',
      message: `Overlapping page assignments detected at pages: ${overlapPages.join(', ')}.`,
      passageIds: passages.filter((passage) => overlapIds.has(passage.id)).map((passage) => passage.id),
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
        severity: 'advisory',
        message: `Missing page targets: ${missingPages.join(', ')}.`,
        passageIds: pageEntries.map(({ passage }) => passage.id),
      });
    }
  }

  const unassigned = passages.filter((passage) => passage.assignment === 'unassigned');
  if (unassigned.length) {
    warnings.push({
      code: 'unassigned',
      severity: 'blocking',
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
  passages.forEach((passage) => {
    if (passage.pageRange?.valid) assignedTargets.push(passage.pageRange.endPage);
  });
  if (assignedTargets.length) return Math.max(...assignedTargets);
  return inferOutlineTargetPageCount(originalText);
}

function createDiagnostic(
  originalText: string,
  passages: OutlinePastePassage[],
  sourceType: OutlinePasteSourceType,
  sourcePassages = classifyPassages(originalText),
): OutlinePasteDiagnostic {
  const warnings = buildWarnings(passages);
  const recognizedActListItemIds = new Set(sourcePassages
    .filter((passage) => (
      passage.assignment === 'act'
      && /^[-*]\s+/.test(normalizeRecognitionLine(passage.text).line)
    ))
    .map((passage) => passage.id));
  return {
    originalText,
    sourceType,
    passages,
    proposedOutline: buildProposedOutline(passages, recognizedActListItemIds),
    warnings,
    detectedPageRanges: passages.flatMap((passage) => (
      passage.pageRange ? [{ passageId: passage.id, ...passage.pageRange }] : []
    )),
    inferredPageCount: inferredPageCount(passages, originalText),
    requiresReview: warnings.length > 0,
  };
}

export function analyzeOutlinePaste(
  text: string,
  sourceType: OutlinePasteSourceType = 'clipboard',
): OutlinePasteDiagnostic {
  const passages = classifyPassages(text);
  return createDiagnostic(text, passages, sourceType, passages);
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
    delete updated.pageRange;
    if (assignment === 'act' && metadata.actName?.trim()) updated.actName = metadata.actName.trim();
    if (assignment === 'page_beat') {
      updated.pageTarget = pageNumberById.get(passage.id) ?? passage.pageTarget;
    }
    return updated;
  });

  return createDiagnostic(diagnostic.originalText, passages, diagnostic.sourceType);
}
