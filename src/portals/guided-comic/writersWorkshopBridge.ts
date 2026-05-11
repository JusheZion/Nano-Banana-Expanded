import type { WriterIssueRow, WriterPageRow } from '@/shared/api/arcsWriterRoom';
import { pageBeatsJsonSchema } from '@/shared/writer/schemas';
import type {
  IssueOutline,
  IssueOutlinePageBeat,
  PageBeatsJson,
  WriterToolsDraftDialoguePayload,
  WriterToolsOutlineIssuePayload,
  WriterToolsPacingReviewPayload,
  WriterToolsPageBeatsIssuePayload,
} from '@/shared/writer/types';

export type GuidedComicBridgePageCard = {
  pageNumber: number;
  summary: string;
  panelCount: string;
  keyCharacters: string;
  keyLocation: string;
  expanded: boolean;
  panelBeats: string[];
};

export type GuidedComicBridgeOutlineBeat = {
  id: 'opening-hook' | 'rising-conflict' | 'midpoint-turn' | 'climax' | 'ending-beat';
  title: string;
  description: string;
  locked: boolean;
};

export type GuidedComicStoryFoundationBridge = {
  writerIssueId?: string | null;
  seriesTitle: string;
  issueTitle: string;
  issueNumber: string;
  targetPageCount: string;
  genre: string;
  tone: string;
  premise: string;
  characters: string;
  setting: string;
  conflict: string;
  endingGoal: string;
};

export type WriterIssueBridgeDraft = {
  title: string;
  issueNumber: number | null;
  synopsis: string;
  notes: {
    guidedComic: {
      seriesTitle: string;
      genre: string;
      tone: string;
      targetPageCount: number | null;
      storyFoundation: Pick<
        GuidedComicStoryFoundationBridge,
        'premise' | 'characters' | 'setting' | 'conflict' | 'endingGoal'
      >;
    };
  };
};

export type GuidedComicBridgeDialogueSeed = {
  pageId?: string;
  pageNumber: number;
  scriptText: string;
  panelSeeds: Array<{
    panelNumber: number;
    beatText: string;
    dialogueText: string;
  }>;
};

export type GuidedWriterToolAction = 'outline' | 'pacing' | 'page-beats' | 'dialogue';

export type GuidedWriterToolRequestOptions = {
  issueId: string;
  targetPageCount?: number;
  outlineSupplement?: string;
  batchLimit?: number;
  batchOffset?: number;
  pageId?: string;
};

export type GuidedWriterToolRequest =
  | WriterToolsOutlineIssuePayload
  | WriterToolsPacingReviewPayload
  | WriterToolsPageBeatsIssuePayload
  | WriterToolsDraftDialoguePayload;

type WriterPageBridgeRow = Pick<WriterPageRow, 'id' | 'page_number' | 'beats_json' | 'script_text'>;

type PageCardOptions = {
  targetPageCount?: number;
  defaultPanelCount?: number | string;
  existingCards?: GuidedComicBridgePageCard[];
};

type GuidedComicNotes = WriterIssueBridgeDraft['notes']['guidedComic'];

const GUIDED_OUTLINE_BEAT_SLOTS: Array<Pick<GuidedComicBridgeOutlineBeat, 'id' | 'title'>> = [
  { id: 'opening-hook', title: 'Opening Hook' },
  { id: 'rising-conflict', title: 'Rising Conflict' },
  { id: 'midpoint-turn', title: 'Midpoint Turn' },
  { id: 'climax', title: 'Climax' },
  { id: 'ending-beat', title: 'Ending Beat' },
];

function coercePositiveInteger(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 1) return null;
  return value;
}

function coercePositiveIntegerText(value: unknown): string {
  const positiveInteger = coercePositiveInteger(value);
  return positiveInteger === null ? '' : String(positiveInteger);
}

function trimText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function readGuidedComicNotes(notes: Record<string, unknown>): Partial<GuidedComicNotes> {
  const guidedComic = notes.guidedComic;
  if (!guidedComic || typeof guidedComic !== 'object' || Array.isArray(guidedComic)) return {};
  return guidedComic as Partial<GuidedComicNotes>;
}

function readStoryFoundationNotes(
  notes: Partial<GuidedComicNotes>,
): Partial<GuidedComicNotes['storyFoundation']> {
  const storyFoundation = notes.storyFoundation;
  if (!storyFoundation || typeof storyFoundation !== 'object' || Array.isArray(storyFoundation)) return {};
  return storyFoundation as Partial<GuidedComicNotes['storyFoundation']>;
}

function defaultPanelCountValue(value: PageCardOptions['defaultPanelCount']): string {
  if (typeof value === 'number' && Number.isInteger(value) && value > 0) return String(value);
  if (typeof value === 'string' && value.trim()) return value.trim();
  return '3';
}

export function buildGuidedWriterToolRequest(
  action: GuidedWriterToolAction,
  options: GuidedWriterToolRequestOptions,
): GuidedWriterToolRequest {
  if (action === 'outline') {
    return {
      mode: 'outline_issue',
      issue_id: options.issueId,
      ...(options.targetPageCount ? { target_page_count: options.targetPageCount } : {}),
      ...(options.outlineSupplement?.trim() ? { outline_supplement: options.outlineSupplement.trim() } : {}),
    };
  }
  if (action === 'pacing') {
    return {
      mode: 'pacing_review',
      issue_id: options.issueId,
      ...(options.targetPageCount ? { target_page_count: options.targetPageCount } : {}),
    };
  }
  if (action === 'page-beats') {
    return {
      mode: 'page_beats_issue',
      issue_id: options.issueId,
      skip_existing: false,
      ...(options.batchLimit ? { batch_limit: options.batchLimit } : {}),
      ...(options.batchOffset != null ? { batch_offset: options.batchOffset } : {}),
    };
  }
  if (!options.pageId) {
    throw new Error('pageId is required for guided Writer dialogue requests');
  }
  return {
    mode: 'draft_dialogue',
    page_id: options.pageId,
    style: 'comic_script',
  };
}

export function getGuidedWriterPageBeatBatchOffsets(targetPageCount: number, batchSize: number): number[] {
  const pageCount = Math.max(0, Math.floor(targetPageCount));
  const safeBatchSize = Math.max(1, Math.floor(batchSize));
  const offsets: number[] = [];
  for (let offset = 0; offset < pageCount; offset += safeBatchSize) {
    offsets.push(offset);
  }
  return offsets;
}

export function createWriterIssueDraftFromGuidedStoryFoundation(
  foundation: GuidedComicStoryFoundationBridge,
): WriterIssueBridgeDraft {
  const synopsis = [
    trimText(foundation.premise),
    trimText(foundation.characters) ? `Characters: ${trimText(foundation.characters)}` : '',
    trimText(foundation.setting) ? `Setting: ${trimText(foundation.setting)}` : '',
    trimText(foundation.conflict) ? `Conflict: ${trimText(foundation.conflict)}` : '',
    trimText(foundation.endingGoal) ? `Ending goal: ${trimText(foundation.endingGoal)}` : '',
  ]
    .filter(Boolean)
    .join('\n\n');

  return {
    title: trimText(foundation.issueTitle) || trimText(foundation.seriesTitle) || 'Untitled guided comic',
    issueNumber: coercePositiveInteger(Number(trimText(foundation.issueNumber))) ?? null,
    synopsis,
    notes: {
      guidedComic: {
        seriesTitle: trimText(foundation.seriesTitle),
        genre: trimText(foundation.genre),
        tone: trimText(foundation.tone),
        targetPageCount: coercePositiveInteger(Number(trimText(foundation.targetPageCount))) ?? null,
        storyFoundation: {
          premise: trimText(foundation.premise),
          characters: trimText(foundation.characters),
          setting: trimText(foundation.setting),
          conflict: trimText(foundation.conflict),
          endingGoal: trimText(foundation.endingGoal),
        },
      },
    },
  };
}

export function mapWriterIssueToGuidedStoryFoundation(
  issue: WriterIssueRow,
  options: { outline?: IssueOutline } = {},
): GuidedComicStoryFoundationBridge {
  const guidedNotes = readGuidedComicNotes(issue.notes);
  const storyNotes = readStoryFoundationNotes(guidedNotes);

  return {
    writerIssueId: issue.id,
    seriesTitle: trimText(guidedNotes.seriesTitle),
    issueTitle: trimText(issue.title) || trimText(options.outline?.title),
    issueNumber: coercePositiveIntegerText(issue.issue_number),
    targetPageCount: coercePositiveIntegerText(guidedNotes.targetPageCount),
    genre: trimText(guidedNotes.genre),
    tone: trimText(guidedNotes.tone),
    premise: trimText(options.outline?.premise) || trimText(storyNotes.premise) || trimText(issue.synopsis),
    characters: trimText(storyNotes.characters),
    setting: trimText(storyNotes.setting),
    conflict: trimText(storyNotes.conflict),
    endingGoal: trimText(storyNotes.endingGoal),
  };
}

export function mapWriterOutlineToGuidedOutlineBeats(outline: IssueOutline): GuidedComicBridgeOutlineBeat[] {
  return GUIDED_OUTLINE_BEAT_SLOTS.map((slot, index) => {
    const act = outline.acts?.[index];
    const pageBeat = outline.page_beats?.[index];
    return {
      ...slot,
      description: trimText(act?.summary) || trimText(act?.goal) || trimText(pageBeat?.summary),
      locked: false,
    };
  });
}

function sentence(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return '';
  return /[.!?]$/.test(trimmed) ? trimmed : `${trimmed}.`;
}

function formatOutlineBeatSummary(beat: IssueOutlinePageBeat): string {
  const lines = [beat.summary.trim()];
  if (beat.emotional_turn?.trim()) {
    lines.push(`Turn: ${beat.emotional_turn.trim()}`);
  }
  return lines.filter(Boolean).join('\n\n');
}

function getPageBeatsJson(value: unknown): PageBeatsJson | null {
  const parsed = pageBeatsJsonSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

function formatWriterPanelBeat(panel: PageBeatsJson['panels'][number], fallbackIndex: number): string {
  const panelNumber = coercePositiveInteger(panel.index) ?? fallbackIndex;
  const details = [
    sentence(panel.action),
    panel.composition?.trim() ? sentence(`Composition: ${panel.composition.trim()}`) : '',
    panel.emotion?.trim() ? sentence(`Emotion: ${panel.emotion.trim()}`) : '',
    panel.dialogue_placeholder?.trim() ? sentence(`Dialogue: ${panel.dialogue_placeholder.trim()}`) : '',
    panel.sfx?.trim() ? sentence(`SFX: ${panel.sfx.trim()}`) : '',
  ].filter(Boolean);
  return `Panel ${panelNumber}: ${details.join(' ')}`;
}

function pageCardFromExistingOrDefault(
  pageNumber: number,
  beatsJson: PageBeatsJson | null,
  options: PageCardOptions,
): GuidedComicBridgePageCard {
  const existing = options.existingCards?.find((card) => card.pageNumber === pageNumber);
  const panelBeats = beatsJson?.panels.map((panel, index) => formatWriterPanelBeat(panel, index + 1)) ?? [];
  const panelCount = existing?.panelCount ?? String(beatsJson?.panels.length || defaultPanelCountValue(options.defaultPanelCount));

  return {
    pageNumber,
    summary: existing?.summary?.trim() ? existing.summary : beatsJson?.one_line_hook?.trim() ?? '',
    panelCount,
    keyCharacters: existing?.keyCharacters ?? '',
    keyLocation: existing?.keyLocation ?? '',
    expanded: existing?.expanded ?? true,
    panelBeats,
  };
}

export function mapWriterOutlineToGuidedPageCards(
  outline: IssueOutline,
  options: Pick<PageCardOptions, 'targetPageCount' | 'defaultPanelCount'> = {},
): GuidedComicBridgePageCard[] {
  const pageBeats = outline.page_beats ?? [];
  const maxBeatPage = pageBeats.reduce((maxPage, beat, index) => {
    return Math.max(maxPage, coercePositiveInteger(beat.page_target) ?? index + 1);
  }, 0);
  const targetPageCount = Math.max(coercePositiveInteger(options.targetPageCount) ?? 0, maxBeatPage);
  const beatsByPage = new Map<number, IssueOutlinePageBeat[]>();

  pageBeats.forEach((beat, index) => {
    const pageNumber = coercePositiveInteger(beat.page_target) ?? index + 1;
    beatsByPage.set(pageNumber, [...(beatsByPage.get(pageNumber) ?? []), beat]);
  });

  return Array.from({ length: targetPageCount }, (_, index) => {
    const pageNumber = index + 1;
    const beats = beatsByPage.get(pageNumber) ?? [];
    return {
      pageNumber,
      summary: beats.map(formatOutlineBeatSummary).filter(Boolean).join('\n\n'),
      panelCount: defaultPanelCountValue(options.defaultPanelCount),
      keyCharacters: '',
      keyLocation: beats.find((beat) => beat.scene?.trim())?.scene?.trim() ?? '',
      expanded: true,
      panelBeats: [],
    };
  });
}

export function mapWriterPagesToGuidedPageCards(
  pages: WriterPageBridgeRow[],
  options: PageCardOptions = {},
): GuidedComicBridgePageCard[] {
  return [...pages]
    .sort((a, b) => a.page_number - b.page_number)
    .map((page) => pageCardFromExistingOrDefault(page.page_number, getPageBeatsJson(page.beats_json), options));
}

function sortPageCards(cards: GuidedComicBridgePageCard[]): GuidedComicBridgePageCard[] {
  return [...cards].sort((a, b) => a.pageNumber - b.pageNumber);
}

function mergePageCardWithImport(
  existing: GuidedComicBridgePageCard | undefined,
  imported: GuidedComicBridgePageCard,
): GuidedComicBridgePageCard {
  if (!existing) return imported;
  return {
    pageNumber: imported.pageNumber,
    summary: existing.summary.trim() ? existing.summary : imported.summary,
    panelCount: existing.panelCount.trim() ? existing.panelCount : imported.panelCount,
    keyCharacters: existing.keyCharacters.trim() ? existing.keyCharacters : imported.keyCharacters,
    keyLocation: existing.keyLocation.trim() ? existing.keyLocation : imported.keyLocation,
    expanded: existing.expanded,
    panelBeats: existing.panelBeats.length > 0 ? existing.panelBeats : imported.panelBeats,
  };
}

export function mergeWriterOutlineIntoGuidedPageCards(
  existingCards: GuidedComicBridgePageCard[],
  outlineCards: GuidedComicBridgePageCard[],
): GuidedComicBridgePageCard[] {
  const existingByPage = new Map(existingCards.map((card) => [card.pageNumber, card]));
  const importedByPage = new Map(outlineCards.map((card) => [card.pageNumber, card]));
  const pageNumbers = new Set([...existingByPage.keys(), ...importedByPage.keys()]);

  return sortPageCards(
    Array.from(pageNumbers).map((pageNumber) => {
      const existing = existingByPage.get(pageNumber);
      const imported = importedByPage.get(pageNumber);
      return imported ? mergePageCardWithImport(existing, imported) : existing!;
    }),
  );
}

export function mergeWriterPagesIntoGuidedPageCards(
  existingCards: GuidedComicBridgePageCard[],
  pages: WriterPageBridgeRow[],
  options: Omit<PageCardOptions, 'existingCards'> = {},
): GuidedComicBridgePageCard[] {
  const importedCards = mapWriterPagesToGuidedPageCards(pages, {
    ...options,
    existingCards,
  });
  const importedByPage = new Map(importedCards.map((card) => [card.pageNumber, card]));
  const existingByPage = new Map(existingCards.map((card) => [card.pageNumber, card]));
  const pageNumbers = new Set([...existingByPage.keys(), ...importedByPage.keys()]);

  return sortPageCards(
    Array.from(pageNumbers).map((pageNumber) => importedByPage.get(pageNumber) ?? existingByPage.get(pageNumber)!),
  );
}

function parseScriptPanelDialogue(scriptText: string): Map<number, string> {
  const panelDialogue = new Map<number, string[]>();
  let activePanelNumber: number | null = null;

  for (const rawLine of scriptText.split(/\r?\n/)) {
    const line = rawLine.trim();
    const panelHeading = line.match(/^panel\s+(\d+)/i);
    if (panelHeading) {
      activePanelNumber = Number(panelHeading[1]);
      if (!panelDialogue.has(activePanelNumber)) {
        panelDialogue.set(activePanelNumber, []);
      }
      continue;
    }

    if (!line || activePanelNumber === null) continue;
    panelDialogue.set(activePanelNumber, [...(panelDialogue.get(activePanelNumber) ?? []), line]);
  }

  return new Map(Array.from(panelDialogue.entries()).map(([panelNumber, lines]) => [panelNumber, lines.join('\n')]));
}

export function mapWriterDialogueToGuidedDialogueSeeds(pages: WriterPageBridgeRow[]): GuidedComicBridgeDialogueSeed[] {
  return [...pages]
    .sort((a, b) => a.page_number - b.page_number)
    .filter((page) => Boolean(page.script_text?.trim()))
    .map((page) => {
      const scriptText = page.script_text?.trim() ?? '';
      const beatsJson = getPageBeatsJson(page.beats_json);
      const panelDialogue = parseScriptPanelDialogue(scriptText);
      return {
        pageId: page.id,
        pageNumber: page.page_number,
        scriptText,
        panelSeeds: Array.from(panelDialogue.entries()).map(([panelNumber, dialogueText]) => ({
          panelNumber,
          beatText: beatsJson?.panels.find((panel, index) => (panel.index ?? index + 1) === panelNumber)?.action ?? '',
          dialogueText,
        })),
      };
    });
}
