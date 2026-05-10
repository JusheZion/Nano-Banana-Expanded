import type { GuidedComicAssistResult } from '@/shared/writer/types';
import {
  createGuidedComicStarterLayout,
  createGuidedComicStarterLayoutFromAiIntent,
  getGuidedComicActivePanelCount,
  getGuidedComicExistingPanelBeats,
  normalizeGuidedComicLayoutIntent,
  normalizeGuidedComicLayoutTemplateId,
  syncGuidedComicLayoutGeometry,
  type GuidedComicPanelGeometry,
} from '@/portals/guided-comic/guidedComicLayoutPlan';

export type GuidedComicAiStepId = 'setup' | 'story' | 'pages' | 'visual-prep' | 'art' | 'layout' | 'export';

type GuidedComicAiSetupForm = {
  seriesTitle: string;
  issueTitle: string;
  issueNumber: string;
  targetPageCount: string;
  genre: string;
  tone: string;
  premise: string;
};

type GuidedComicAiStoryForm = {
  premise: string;
  mainCharacters: string;
  conflict: string;
  setting: string;
  endingGoal: string;
};

type GuidedComicAiArtDirection = {
  artStyle: string;
  defaultAspectRatio: string;
  renderingStyle: string;
  colorMood: string;
  lighting: string;
  continuityNotes: string;
  excludeTextFromImages: boolean;
};

export type GuidedComicAiOutlineBeat = {
  id: string;
  title: string;
  description: string;
  locked?: boolean;
};

export type GuidedComicAiPageCard = {
  pageNumber: number;
  summary: string;
  panelCount: string;
  keyCharacters: string;
  keyLocation: string;
  expanded?: boolean;
  panelBeats: string[];
};

export type GuidedComicAiDraft = {
  currentStep: GuidedComicAiStepId;
  setupForm: GuidedComicAiSetupForm;
  storyForm: GuidedComicAiStoryForm;
  artDirection: GuidedComicAiArtDirection;
  outlineBeats: GuidedComicAiOutlineBeat[];
  pageCards: GuidedComicAiPageCard[];
  characterReferences: Record<string, unknown[]>;
  locationReferences: Record<string, unknown[]>;
  npcReferences: Record<string, unknown[]>;
  panelArtStatuses: Record<string, unknown>;
  panelArtImages: Record<string, unknown>;
  pageLayoutTemplates: Record<number, string>;
  pageLayoutIntents: Record<number, string>;
  pageLayoutGeometry: Record<number, GuidedComicPanelGeometry[]>;
  selectedPageNumber?: number | null;
  selectedPanelId?: string | null;
};

export type GuidedComicPacingCheck = {
  id: string;
  label: string;
  status: 'ready' | 'needs-work';
  detail: string;
};

export type GuidedComicAiContext = Omit<GuidedComicAiDraft, 'selectedPageNumber' | 'selectedPanelId'> & {
  selectedPage?: GuidedComicAiPageCard;
  selectedPanel?: {
    id: string;
    pageNumber: number;
    panelNumber: number;
    beatText: string;
  };
  selectedPageNumber?: number | null;
  selectedPanelId?: string | null;
  referenceCounts: {
    characters: number;
    locations: number;
    npcs: number;
  };
  missingReferences: string[];
};

export type GuidedComicAiApplyOptions = {
  mode: 'empty-only' | 'replace-confirmed';
  selectedOnly?: boolean;
  selectedPageNumber?: number | null;
};

const GUIDED_AI_MAX_STRING_LENGTH = 1600;
const GUIDED_AI_MAX_ARRAY_LENGTH = 80;
const GUIDED_AI_MAX_OBJECT_DEPTH = 8;

function isBlank(value: unknown): boolean {
  return typeof value !== 'string' || value.trim().length === 0;
}

function isLikelyImageKey(key: string): boolean {
  const normalized = key.toLowerCase();
  return normalized.includes('imageurl') || normalized === 'url' || normalized === 'src' || normalized.includes('dataurl');
}

function compactGuidedAiString(value: string, key = ''): string {
  const trimmed = value.trim();
  if (/^data:image\//i.test(trimmed)) {
    return `[image data omitted: ${value.length} chars]`;
  }
  if (isLikelyImageKey(key) && /^https?:\/\//i.test(trimmed)) {
    return `[image url omitted: ${value.length} chars]`;
  }
  if (value.length <= GUIDED_AI_MAX_STRING_LENGTH) return value;
  return `${value.slice(0, GUIDED_AI_MAX_STRING_LENGTH)}\n[truncated: ${value.length} chars total]`;
}

function compactGuidedAiValue(value: unknown, depth = 0, key = ''): unknown {
  if (typeof value === 'string') return compactGuidedAiString(value, key);
  if (value == null || typeof value !== 'object') return value;
  if (depth >= GUIDED_AI_MAX_OBJECT_DEPTH) return '[nested context omitted]';

  if (Array.isArray(value)) {
    return value
      .slice(0, GUIDED_AI_MAX_ARRAY_LENGTH)
      .map((item) => compactGuidedAiValue(item, depth + 1, key));
  }

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([entryKey, entryValue]) => [
      entryKey,
      compactGuidedAiValue(entryValue, depth + 1, entryKey),
    ]),
  );
}

function referenceCount(map: Record<string, unknown[]>): number {
  return Object.values(map).reduce((total, refs) => total + (Array.isArray(refs) ? refs.length : 0), 0);
}

function splitTerms(value: string): string[] {
  return value
    .split(/[\n,]/)
    .map((term) => term.trim())
    .filter(Boolean);
}

function panelIdFor(pageNumber: number, panelNumber: number): string {
  return `page-${pageNumber}-panel-${panelNumber}`;
}

function normalizeAiPageCard(page: GuidedComicAiPageCard): GuidedComicAiPageCard {
  return {
    ...page,
    panelCount: String(getGuidedComicActivePanelCount(page)),
    panelBeats: getGuidedComicExistingPanelBeats(page),
  };
}

export function buildGuidedComicAiContext(draft: GuidedComicAiDraft): GuidedComicAiContext {
  const normalizedDraft: GuidedComicAiDraft = {
    ...draft,
    pageCards: draft.pageCards.map(normalizeAiPageCard),
  };
  const compactDraft = compactGuidedAiValue(normalizedDraft) as GuidedComicAiDraft;
  const selectedPage =
    normalizedDraft.pageCards.find((page) => page.pageNumber === draft.selectedPageNumber) ?? normalizedDraft.pageCards[0];
  const selectedPanel = draft.selectedPanelId
    ? normalizedDraft.pageCards
        .flatMap((page) =>
          getGuidedComicExistingPanelBeats(page).map((beatText, panelIndex) => ({
            id: panelIdFor(page.pageNumber, panelIndex + 1),
            pageNumber: page.pageNumber,
            panelNumber: panelIndex + 1,
            beatText,
          })),
        )
        .find((panel) => panel.id === draft.selectedPanelId)
    : undefined;
  const missingCharacters = Array.from(
    new Set(draft.pageCards.flatMap((page) => splitTerms(page.keyCharacters))),
  ).filter((name) => (draft.characterReferences[name] ?? []).length === 0);
  const missingLocations = Array.from(
    new Set(draft.pageCards.flatMap((page) => splitTerms(page.keyLocation))),
  ).filter((name) => (draft.locationReferences[name] ?? []).length === 0);

  return {
    ...compactDraft,
    selectedPage: compactGuidedAiValue(selectedPage) as GuidedComicAiPageCard | undefined,
    selectedPanel: compactGuidedAiValue(selectedPanel) as GuidedComicAiContext['selectedPanel'],
    referenceCounts: {
      characters: referenceCount(draft.characterReferences),
      locations: referenceCount(draft.locationReferences),
      npcs: referenceCount(draft.npcReferences),
    },
    missingReferences: [...missingCharacters.map((name) => `Character: ${name}`), ...missingLocations.map((name) => `Location: ${name}`)],
  };
}

function hasText(value: unknown): boolean {
  return typeof value === 'string' && value.trim().length > 0;
}

function beatReady(outlineBeats: GuidedComicAiOutlineBeat[], id: string): boolean {
  return outlineBeats.some((beat) => beat.id === id && hasText(beat.description));
}

function hasRepeatedPanelLanguage(pageCards: GuidedComicAiPageCard[]): boolean {
  const normalized = pageCards
    .flatMap((page) => page.panelBeats)
    .map((beat) => beat.toLowerCase())
    .filter(Boolean);
  const closeUpCount = normalized.filter((beat) => beat.includes('close-up') || beat.includes('close up')).length;
  const wideCount = normalized.filter((beat) => beat.includes('wide')).length;
  return closeUpCount >= 3 || wideCount >= 4;
}

export function getGuidedComicPacingChecks(context: GuidedComicAiContext): GuidedComicPacingCheck[] {
  const targetPageCount = Number.parseInt(context.setupForm.targetPageCount, 10);
  const pageCountBalanced =
    Number.isFinite(targetPageCount) && targetPageCount > 0
      ? Math.abs(context.pageCards.length - targetPageCount) <= Math.max(1, Math.ceil(targetPageCount * 0.15))
      : context.pageCards.length > 0;
  const hasMissingLocations = context.pageCards.some((page) => hasText(page.keyLocation)) && context.referenceCounts.locations === 0;
  const hasMissingCharacters = context.pageCards.some((page) => hasText(page.keyCharacters)) && context.referenceCounts.characters === 0;

  return [
    {
      id: 'opening-hook',
      label: 'Opening hook clarity',
      status: beatReady(context.outlineBeats, 'opening-hook') ? 'ready' : 'needs-work',
      detail: beatReady(context.outlineBeats, 'opening-hook') ? 'Opening hook has a beat.' : 'Add a clear first-page hook.',
    },
    {
      id: 'rising-action',
      label: 'Rising action',
      status: beatReady(context.outlineBeats, 'rising-conflict') ? 'ready' : 'needs-work',
      detail: beatReady(context.outlineBeats, 'rising-conflict') ? 'Rising conflict is represented.' : 'Clarify the escalation before the midpoint.',
    },
    {
      id: 'midpoint-turn',
      label: 'Midpoint turn',
      status: beatReady(context.outlineBeats, 'midpoint-turn') ? 'ready' : 'needs-work',
      detail: beatReady(context.outlineBeats, 'midpoint-turn') ? 'Midpoint has a turn.' : 'Add a reversal or reveal near the middle.',
    },
    {
      id: 'climax',
      label: 'Climax',
      status: beatReady(context.outlineBeats, 'climax') ? 'ready' : 'needs-work',
      detail: beatReady(context.outlineBeats, 'climax') ? 'Climax has an action.' : 'Define the decisive final action.',
    },
    {
      id: 'ending-beat',
      label: 'Ending beat',
      status: beatReady(context.outlineBeats, 'ending-beat') ? 'ready' : 'needs-work',
      detail: beatReady(context.outlineBeats, 'ending-beat') ? 'Ending has a beat.' : 'Add the final image, change, or hook.',
    },
    {
      id: 'page-count-balance',
      label: 'Page count balance',
      status: pageCountBalanced ? 'ready' : 'needs-work',
      detail: pageCountBalanced ? 'Current page count is near target.' : 'Generated or planned pages do not match the target count.',
    },
    {
      id: 'repeated-panel-types',
      label: 'Repeated panel types',
      status: hasRepeatedPanelLanguage(context.pageCards) ? 'needs-work' : 'ready',
      detail: hasRepeatedPanelLanguage(context.pageCards) ? 'Panel beats repeat similar camera language.' : 'Panel descriptions show enough variety.',
    },
    {
      id: 'missing-locations',
      label: 'Missing locations',
      status: hasMissingLocations ? 'needs-work' : 'ready',
      detail: hasMissingLocations ? 'Page cards mention locations without saved location references.' : 'Location needs look covered.',
    },
    {
      id: 'missing-characters',
      label: 'Missing characters',
      status: hasMissingCharacters ? 'needs-work' : 'ready',
      detail: hasMissingCharacters ? 'Page cards mention characters without saved character references.' : 'Character needs look covered.',
    },
  ];
}

function applyStringField<T extends Record<string, unknown>>(
  target: T,
  field: string,
  value: unknown,
  mode: GuidedComicAiApplyOptions['mode'],
): T {
  if (typeof value !== 'string') return target;
  if (mode === 'empty-only' && !isBlank(target[field])) return target;
  return { ...target, [field]: value };
}

function applyFormReplacements<T extends Record<string, unknown>>(
  form: T,
  replacements: Record<string, unknown> | undefined,
  mode: GuidedComicAiApplyOptions['mode'],
): T {
  if (!replacements) return form;
  return Object.entries(replacements).reduce((next, [field, value]) => applyStringField(next, field, value, mode), form);
}

function applyOutlineBeats(
  outlineBeats: GuidedComicAiOutlineBeat[],
  suggestions: GuidedComicAssistResult['outlineBeats'],
  mode: GuidedComicAiApplyOptions['mode'],
): GuidedComicAiOutlineBeat[] {
  if (!suggestions?.length) return outlineBeats;
  const next = [...outlineBeats];
  suggestions.forEach((suggestion, index) => {
    const existingIndex = suggestion.id
      ? next.findIndex((beat) => beat.id === suggestion.id)
      : index < next.length
        ? index
        : -1;
    if (existingIndex === -1) {
      next.push({
        id: suggestion.id ?? `ai-beat-${next.length + 1}`,
        title: suggestion.title ?? `AI Beat ${next.length + 1}`,
        description: suggestion.description,
      });
      return;
    }
    const current = next[existingIndex]!;
    if (mode === 'empty-only' && !isBlank(current.description)) return;
    next[existingIndex] = {
      ...current,
      title: suggestion.title ?? current.title,
      description: suggestion.description,
    };
  });
  return next;
}

function looksLikeDefaultPanelBeats(beats: string[]): boolean {
  return beats.length > 0 && beats.every((beat, index) => beat.trim().toLowerCase().startsWith(`panel ${index + 1}:`));
}

function shouldApplySuggestedPanelCount(
  base: GuidedComicAiPageCard,
  suggestedPanelCount: unknown,
): suggestedPanelCount is string {
  if (typeof suggestedPanelCount !== 'string') return false;
  if (isBlank(base.panelCount)) return true;
  return base.panelCount === '4' && (base.panelBeats.length === 0 || looksLikeDefaultPanelBeats(base.panelBeats));
}

function applyPanelBeats(
  currentBeats: string[],
  suggestedBeats: string[] | undefined,
  mode: GuidedComicAiApplyOptions['mode'],
  panelCount: string,
): string[] {
  const activePanelCount = getGuidedComicActivePanelCount({ panelCount, panelBeats: currentBeats });
  if (!suggestedBeats?.length) return currentBeats.slice(0, activePanelCount);
  if (mode === 'replace-confirmed') {
    return Array.from({ length: activePanelCount }, (_, index) => suggestedBeats[index] ?? '');
  }
  const maxLength = Math.max(currentBeats.length, suggestedBeats.length);
  return Array.from({ length: Math.min(maxLength, activePanelCount) }, (_, index) => {
    const current = currentBeats[index] ?? '';
    return isBlank(current) ? suggestedBeats[index] ?? current : current;
  });
}

function applyPageUpdates(
  pageCards: GuidedComicAiPageCard[],
  updates: GuidedComicAssistResult['pageUpdates'],
  options: GuidedComicAiApplyOptions,
): GuidedComicAiPageCard[] {
  if (!updates?.length) return pageCards;
  const allowedUpdates = options.selectedOnly && options.selectedPageNumber
    ? updates.filter((update) => update.pageNumber === options.selectedPageNumber)
    : updates;
  const next = [...pageCards];
  allowedUpdates.forEach((update) => {
    const pageIndex = next.findIndex((page) => page.pageNumber === update.pageNumber);
    const existing = next[pageIndex];
    const base: GuidedComicAiPageCard =
      existing ??
      ({
        pageNumber: update.pageNumber,
        summary: '',
        panelCount: '4',
        keyCharacters: '',
        keyLocation: '',
        expanded: false,
        panelBeats: [],
      } satisfies GuidedComicAiPageCard);
    const nextPanelCount = shouldApplySuggestedPanelCount(base, update.panelCount)
      ? String(getGuidedComicActivePanelCount({ panelCount: update.panelCount, panelBeats: update.panelBeats ?? base.panelBeats }))
      : base.panelCount;
    const merged: GuidedComicAiPageCard = {
      ...base,
      summary: typeof update.summary === 'string' && (options.mode === 'replace-confirmed' || isBlank(base.summary)) ? update.summary : base.summary,
      panelCount: nextPanelCount,
      keyCharacters:
        typeof update.keyCharacters === 'string' && (options.mode === 'replace-confirmed' || isBlank(base.keyCharacters))
          ? update.keyCharacters
          : base.keyCharacters,
      keyLocation:
        typeof update.keyLocation === 'string' && (options.mode === 'replace-confirmed' || isBlank(base.keyLocation))
          ? update.keyLocation
          : base.keyLocation,
      panelBeats: applyPanelBeats(base.panelBeats, update.panelBeats, options.mode, nextPanelCount),
    };
    if (pageIndex === -1) {
      next.push(merged);
    } else {
      next[pageIndex] = merged;
    }
  });
  return next.sort((a, b) => a.pageNumber - b.pageNumber);
}

function layoutPageFor(pageCards: GuidedComicAiPageCard[], pageNumber: number): GuidedComicAiPageCard | undefined {
  return pageCards.find((page) => page.pageNumber === pageNumber);
}

function copyPanelMediaMetadata(
  starterGeometry: GuidedComicPanelGeometry[],
  existingGeometry: GuidedComicPanelGeometry[] | undefined,
): GuidedComicPanelGeometry[] {
  const existingById = new Map((existingGeometry ?? []).map((panel) => [panel.panelId, panel]));
  return starterGeometry.map((panel) => {
    const existing = existingById.get(panel.panelId);
    if (!existing) return panel;
    return {
      ...panel,
      locked: existing.locked,
      imageId: existing.imageId,
      imageUrl: existing.imageUrl,
      imageFit: existing.imageFit,
      imageFocusX: existing.imageFocusX,
      imageFocusY: existing.imageFocusY,
      imageZoom: existing.imageZoom,
    };
  });
}

function applyLayoutSuggestions(
  draft: GuidedComicAiDraft,
  nextPageCards: GuidedComicAiPageCard[],
  updates: GuidedComicAssistResult['pageUpdates'],
  options: GuidedComicAiApplyOptions,
): Pick<GuidedComicAiDraft, 'pageLayoutTemplates' | 'pageLayoutIntents' | 'pageLayoutGeometry'> {
  if (!updates?.length) {
    return {
      pageLayoutTemplates: draft.pageLayoutTemplates,
      pageLayoutIntents: draft.pageLayoutIntents,
      pageLayoutGeometry: draft.pageLayoutGeometry,
    };
  }

  const selectedUpdates = options.selectedOnly && options.selectedPageNumber
    ? updates.filter((update) => update.pageNumber === options.selectedPageNumber)
    : updates;
  let pageLayoutTemplates = { ...draft.pageLayoutTemplates };
  let pageLayoutIntents = { ...draft.pageLayoutIntents };
  let pageLayoutGeometry = { ...draft.pageLayoutGeometry };

  selectedUpdates.forEach((update) => {
    const page = layoutPageFor(nextPageCards, update.pageNumber);
    if (!page) return;
    const templateId = normalizeGuidedComicLayoutTemplateId(update.layoutTemplate);
    const layoutIntent = normalizeGuidedComicLayoutIntent(update.layoutIntent);
    const existingGeometry = pageLayoutGeometry[update.pageNumber];

    if (templateId) {
      pageLayoutTemplates = { ...pageLayoutTemplates, [update.pageNumber]: templateId };
      pageLayoutIntents = { ...pageLayoutIntents };
      delete pageLayoutIntents[update.pageNumber];
      pageLayoutGeometry = {
        ...pageLayoutGeometry,
        [update.pageNumber]: copyPanelMediaMetadata(
          createGuidedComicStarterLayout(page, templateId, {}),
          existingGeometry,
        ),
      };
      return;
    }

    if (layoutIntent) {
      const currentTemplate = normalizeGuidedComicLayoutTemplateId(pageLayoutTemplates[update.pageNumber]) ?? 'auto';
      pageLayoutTemplates = { ...pageLayoutTemplates, [update.pageNumber]: currentTemplate };
      pageLayoutIntents = { ...pageLayoutIntents, [update.pageNumber]: layoutIntent };
      pageLayoutGeometry = {
        ...pageLayoutGeometry,
        [update.pageNumber]: copyPanelMediaMetadata(
          createGuidedComicStarterLayoutFromAiIntent(page, layoutIntent, {}),
          existingGeometry,
        ),
      };
      return;
    }

    if (existingGeometry) {
      pageLayoutGeometry = {
        ...pageLayoutGeometry,
        [update.pageNumber]: syncGuidedComicLayoutGeometry(
          page,
          existingGeometry,
          normalizeGuidedComicLayoutTemplateId(pageLayoutTemplates[update.pageNumber]) ?? 'auto',
          {},
        ),
      };
    }
  });

  return { pageLayoutTemplates, pageLayoutIntents, pageLayoutGeometry };
}

export function applyGuidedComicAiResult(
  draft: GuidedComicAiDraft,
  result: GuidedComicAssistResult,
  options: GuidedComicAiApplyOptions,
): GuidedComicAiDraft {
  const nextPageCards = applyPageUpdates(draft.pageCards, result.pageUpdates, options);
  const layoutSuggestions = applyLayoutSuggestions(draft, nextPageCards, result.pageUpdates, options);
  return {
    ...draft,
    setupForm: applyFormReplacements(draft.setupForm, result.replacements?.setupForm, options.mode) as GuidedComicAiSetupForm,
    storyForm: applyFormReplacements(draft.storyForm, result.replacements?.storyForm, options.mode) as GuidedComicAiStoryForm,
    artDirection: {
      ...draft.artDirection,
      ...(options.mode === 'replace-confirmed' ? result.replacements?.artDirection : {}),
    },
    outlineBeats: applyOutlineBeats(draft.outlineBeats, result.outlineBeats, options.mode),
    pageCards: nextPageCards,
    pageLayoutTemplates: layoutSuggestions.pageLayoutTemplates,
    pageLayoutIntents: layoutSuggestions.pageLayoutIntents,
    pageLayoutGeometry: layoutSuggestions.pageLayoutGeometry,
  };
}
