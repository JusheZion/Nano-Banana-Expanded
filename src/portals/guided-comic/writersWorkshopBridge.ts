import type { WriterIssueRow, WriterPageRow } from '@/shared/api/arcsWriterRoom';
import { pageBeatsJsonSchema } from '@/shared/writer/schemas';
import type { GuidedComicLayoutIntent, GuidedComicLayoutPanelPlan } from './guidedComicLayoutPlan';
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

export type GuidedComicVisualReferenceNeeds = {
  characters: string[];
  locations: string[];
  npcs: string[];
};

export type GuidedComicVisualPanelMetadata = {
  panelId?: string;
  panelNumber: number;
  beatText: string;
  dialogueText: string;
  visualPrompt: string;
  layoutIntent: GuidedComicLayoutIntent;
  referenceNeeds: GuidedComicVisualReferenceNeeds;
};

export type GuidedComicVisualPageMetadata = {
  pageNumber: number;
  summary: string;
  layoutIntent: GuidedComicLayoutIntent;
  referenceNeeds: GuidedComicVisualReferenceNeeds;
  panels: GuidedComicVisualPanelMetadata[];
  scriptText?: string;
};

export type GuidedComicDialogueSeedStatus = 'generated' | 'edited' | 'accepted' | 'rejected';
export type GuidedComicDialogueSeedKind = 'dialogue' | 'narration';
export type GuidedComicDialogueSeedSource = 'writer-tools' | 'manual';

export type GuidedComicEditableDialogueSeed = {
  id: string;
  pageId?: string;
  pageNumber: number;
  panelNumber: number;
  order: number;
  kind: GuidedComicDialogueSeedKind;
  speaker?: string;
  text: string;
  originalText: string;
  beatText: string;
  status: GuidedComicDialogueSeedStatus;
  source: GuidedComicDialogueSeedSource;
};

export type GuidedComicDialoguePanelDensity = {
  panelNumber: number;
  seedCount: number;
  wordCount: number;
  narrationCount: number;
  dialogueCount: number;
  hasCrowdingRisk: boolean;
  indicators: string[];
};

export type GuidedComicDialogueDensitySummary = {
  pageNumber: number | null;
  totalWordCount: number;
  pageIndicators: string[];
  panelSummaries: GuidedComicDialoguePanelDensity[];
};

export type GuidedComicBalloonSeed = {
  seedId: string;
  panelId?: string;
  pageNumber: number;
  panelNumber: number;
  order: number;
  kind: GuidedComicDialogueSeedKind;
  speaker?: string;
  text: string;
  source: GuidedComicDialogueSeedSource;
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

export type GuidedWriterPageBeatImportStats = {
  pageRows: number;
  pagesWithPanelBeats: number;
  panelBeatCount: number;
  emptyPageNumbers: number[];
  invalidPageNumbers: number[];
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

function splitListText(value: unknown): string[] {
  return trimText(value)
    .split(/[\n,]/)
    .map((part) => part.trim())
    .filter(Boolean);
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

function readStringField(record: Record<string, unknown>, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return undefined;
}

function normalizePageBeatsJson(value: unknown): unknown {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return value;
  const record = value as Record<string, unknown>;
  if (!Array.isArray(record.panels)) return value;

  return {
    ...record,
    panels: record.panels.map((panel, index) => {
      if (!panel || typeof panel !== 'object' || Array.isArray(panel)) return panel;
      const panelRecord = panel as Record<string, unknown>;
      const action = readStringField(panelRecord, ['action', 'summary', 'description', 'beat', 'visual', 'notes', 'dialogue']);
      return {
        ...panelRecord,
        index: typeof panelRecord.index === 'number' ? panelRecord.index : index + 1,
        ...(action ? { action } : {}),
        ...(typeof panelRecord.dialogue_placeholder === 'string' || typeof panelRecord.dialogue !== 'string'
          ? {}
          : { dialogue_placeholder: panelRecord.dialogue }),
      };
    }),
  };
}

function getPageBeatsJson(value: unknown): PageBeatsJson | null {
  const parsed = pageBeatsJsonSchema.safeParse(normalizePageBeatsJson(value));
  return parsed.success ? parsed.data : null;
}

export function getWriterPageBeatImportStats(pages: WriterPageBridgeRow[]): GuidedWriterPageBeatImportStats {
  return pages.reduce<GuidedWriterPageBeatImportStats>(
    (stats, page) => {
      const beatsJson = getPageBeatsJson(page.beats_json);
      if (beatsJson) {
        return {
          ...stats,
          pagesWithPanelBeats: stats.pagesWithPanelBeats + 1,
          panelBeatCount: stats.panelBeatCount + beatsJson.panels.length,
        };
      }

      const rawPanels =
        page.beats_json && typeof page.beats_json === 'object' && !Array.isArray(page.beats_json)
          ? (page.beats_json as { panels?: unknown }).panels
          : null;
      if (Array.isArray(rawPanels) && rawPanels.length > 0) {
        return {
          ...stats,
          invalidPageNumbers: [...stats.invalidPageNumbers, page.page_number],
        };
      }

      return {
        ...stats,
        emptyPageNumbers: [...stats.emptyPageNumbers, page.page_number],
      };
    },
    {
      pageRows: pages.length,
      pagesWithPanelBeats: 0,
      panelBeatCount: 0,
      emptyPageNumbers: [],
      invalidPageNumbers: [],
    },
  );
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

function parseDialogueLine(line: string): {
  kind: GuidedComicDialogueSeedKind;
  speaker?: string;
  text: string;
} {
  const trimmed = line.trim();
  const speakerMatch = trimmed.match(/^([A-Z][A-Z0-9 _-]{1,30}):\s*(.+)$/);
  if (!speakerMatch) {
    return { kind: 'dialogue', text: trimmed };
  }
  const speaker = speakerMatch[1].trim();
  const text = speakerMatch[2].trim();
  const kind = /\b(CAPTION|NARRATION|NARRATOR|BOX)\b/.test(speaker) ? 'narration' : 'dialogue';
  return { kind, speaker, text };
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

export function createEditableDialogueSeedsFromWriterSeed(
  seed: GuidedComicBridgeDialogueSeed,
): GuidedComicEditableDialogueSeed[] {
  return seed.panelSeeds.flatMap((panelSeed) =>
    panelSeed.dialogueText
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line, index) => {
        const parsedLine = parseDialogueLine(line);
        const order = index + 1;
        return {
          id: `page-${seed.pageNumber}-panel-${panelSeed.panelNumber}-line-${order}`,
          pageId: seed.pageId,
          pageNumber: seed.pageNumber,
          panelNumber: panelSeed.panelNumber,
          order,
          kind: parsedLine.kind,
          speaker: parsedLine.speaker,
          text: parsedLine.text,
          originalText: line,
          beatText: panelSeed.beatText,
          status: 'generated',
          source: 'writer-tools',
        };
      }),
  );
}

export function updateEditableDialogueSeedText(
  seeds: GuidedComicEditableDialogueSeed[],
  seedId: string,
  text: string,
): GuidedComicEditableDialogueSeed[] {
  return seeds.map((seed) =>
    seed.id === seedId
      ? {
          ...seed,
          text,
          status: seed.status === 'accepted' || seed.status === 'rejected' ? seed.status : 'edited',
        }
      : seed,
  );
}

export function setEditableDialogueSeedStatus(
  seeds: GuidedComicEditableDialogueSeed[],
  seedId: string,
  status: GuidedComicDialogueSeedStatus,
): GuidedComicEditableDialogueSeed[] {
  return seeds.map((seed) => (seed.id === seedId ? { ...seed, status } : seed));
}

function wordCount(value: string): number {
  return value.trim().split(/\s+/).filter(Boolean).length;
}

export function analyzeGuidedDialogueSeedDensity(
  seeds: GuidedComicEditableDialogueSeed[],
): GuidedComicDialogueDensitySummary {
  const activeSeeds = seeds.filter((seed) => seed.status !== 'rejected' && seed.text.trim());
  const seedsByPanel = new Map<number, GuidedComicEditableDialogueSeed[]>();
  activeSeeds.forEach((seed) => {
    seedsByPanel.set(seed.panelNumber, [...(seedsByPanel.get(seed.panelNumber) ?? []), seed]);
  });

  const panelSummaries = Array.from(seedsByPanel.entries())
    .sort(([a], [b]) => a - b)
    .map(([panelNumber, panelSeeds]) => {
      const panelWordCount = panelSeeds.reduce((total, seed) => total + wordCount(seed.text), 0);
      const narrationCount = panelSeeds.filter((seed) => seed.kind === 'narration').length;
      const dialogueCount = panelSeeds.filter((seed) => seed.kind === 'dialogue').length;
      const indicators: string[] = [];
      if (panelSeeds.length >= 2) indicators.push('dense dialogue');
      if (panelWordCount >= 24) indicators.push('high text load');
      if (panelSeeds.length >= 2 && panelWordCount >= 24) indicators.push('possible crowding');
      if (panelWordCount >= 18) indicators.push('consider reducing dialogue');
      if (panelWordCount >= 32) indicators.push('consider splitting panel');

      return {
        panelNumber,
        seedCount: panelSeeds.length,
        wordCount: panelWordCount,
        narrationCount,
        dialogueCount,
        hasCrowdingRisk: indicators.includes('possible crowding'),
        indicators,
      };
    });

  const narrationTotal = activeSeeds.filter((seed) => seed.kind === 'narration').length;
  const dialogueTotal = activeSeeds.filter((seed) => seed.kind === 'dialogue').length;
  const pageIndicators: string[] = [];
  if (narrationTotal > 0 && dialogueTotal > 0 && Math.max(narrationTotal, dialogueTotal) >= 2) {
    pageIndicators.push('narration/dialogue imbalance');
  }
  if (panelSummaries.some((summary) => summary.hasCrowdingRisk)) {
    pageIndicators.push('possible crowding');
  }

  return {
    pageNumber: activeSeeds[0]?.pageNumber ?? null,
    totalWordCount: panelSummaries.reduce((total, panel) => total + panel.wordCount, 0),
    pageIndicators,
    panelSummaries,
  };
}

export function promoteAcceptedDialogueToBalloonSeeds(
  seeds: GuidedComicEditableDialogueSeed[],
  options: { panelIdFor?: (panelNumber: number) => string | undefined } = {},
): GuidedComicBalloonSeed[] {
  return seeds
    .filter((seed) => seed.status === 'accepted' && seed.text.trim())
    .sort((a, b) => a.pageNumber - b.pageNumber || a.panelNumber - b.panelNumber || a.order - b.order)
    .map((seed) => ({
      seedId: seed.id,
      panelId: options.panelIdFor?.(seed.panelNumber),
      pageNumber: seed.pageNumber,
      panelNumber: seed.panelNumber,
      order: seed.order,
      kind: seed.kind,
      speaker: seed.speaker,
      text: seed.text.trim(),
      source: seed.source,
    }));
}

function strongestLayoutIntent(panels: GuidedComicLayoutPanelPlan[]): GuidedComicLayoutIntent {
  if (panels.some((panel) => panel.intent === 'feature')) return 'feature';
  if (panels.some((panel) => panel.intent === 'wide')) return 'wide';
  if (panels.some((panel) => panel.intent === 'tall')) return 'tall';
  return 'normal';
}

function joinPromptLine(label: string, value: string): string {
  return value ? `${label}: ${sentence(value)}` : '';
}

function buildPanelVisualPrompt(options: {
  pageSummary: string;
  beatText: string;
  dialogueText: string;
  layoutIntent: GuidedComicLayoutIntent;
  referenceNeeds: GuidedComicVisualReferenceNeeds;
}): string {
  return [
    sentence(options.beatText),
    joinPromptLine('Page context', options.pageSummary),
    joinPromptLine('Dialogue context', options.dialogueText),
    options.referenceNeeds.characters.length > 0
      ? sentence(`Key characters: ${options.referenceNeeds.characters.join(', ')}`)
      : '',
    options.referenceNeeds.locations.length > 0
      ? sentence(`Key location: ${options.referenceNeeds.locations.join(', ')}`)
      : '',
    options.referenceNeeds.npcs.length > 0 ? sentence(`NPC context: ${options.referenceNeeds.npcs.join(', ')}`) : '',
    sentence(`Composition intent: ${options.layoutIntent}`),
  ]
    .filter(Boolean)
    .join(' ');
}

export function buildGuidedComicVisualPageMetadata(options: {
  page: GuidedComicBridgePageCard;
  layoutPanels: GuidedComicLayoutPanelPlan[];
  dialogueSeed?: GuidedComicBridgeDialogueSeed;
  editableDialogueSeeds?: GuidedComicEditableDialogueSeed[];
  npcNames?: string[];
}): GuidedComicVisualPageMetadata {
  const referenceNeeds: GuidedComicVisualReferenceNeeds = {
    characters: splitListText(options.page.keyCharacters),
    locations: splitListText(options.page.keyLocation),
    npcs: options.npcNames?.map((name) => name.trim()).filter(Boolean) ?? [],
  };
  const dialogueByPanel = new Map<number, string>();
  if (options.editableDialogueSeeds?.length) {
    options.editableDialogueSeeds
      .filter((seed) => seed.status !== 'rejected' && seed.text.trim())
      .sort((a, b) => a.panelNumber - b.panelNumber || a.order - b.order)
      .forEach((seed) => {
        const prefix = seed.speaker ? `${seed.speaker}: ` : '';
        const line = `${prefix}${seed.text.trim()}`;
        dialogueByPanel.set(seed.panelNumber, [dialogueByPanel.get(seed.panelNumber), line].filter(Boolean).join('\n'));
      });
  } else {
    options.dialogueSeed?.panelSeeds.forEach((seed) => {
      dialogueByPanel.set(seed.panelNumber, seed.dialogueText.trim());
    });
  }

  return {
    pageNumber: options.page.pageNumber,
    summary: trimText(options.page.summary),
    layoutIntent: strongestLayoutIntent(options.layoutPanels),
    referenceNeeds,
    ...(options.dialogueSeed?.scriptText ? { scriptText: options.dialogueSeed.scriptText } : {}),
    panels: options.layoutPanels.map((panel) => {
      const beatText = trimText(panel.beatText) || trimText(options.page.panelBeats[panel.panelNumber - 1]);
      const dialogueText = dialogueByPanel.get(panel.panelNumber) ?? '';
      return {
        panelId: panel.panelId,
        panelNumber: panel.panelNumber,
        beatText,
        dialogueText,
        layoutIntent: panel.intent,
        referenceNeeds,
        visualPrompt: buildPanelVisualPrompt({
          pageSummary: options.page.summary,
          beatText,
          dialogueText,
          layoutIntent: panel.intent,
          referenceNeeds,
        }),
      };
    }),
  };
}
