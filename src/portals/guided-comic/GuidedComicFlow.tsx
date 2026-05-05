import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  BookOpenText,
  ChevronLeft,
  ChevronRight,
  Download,
  ImagePlus,
  LayoutTemplate,
  MonitorUp,
  Palette,
  Clipboard,
  PanelTop,
  RefreshCw,
  Rocket,
  Upload,
  Sparkles,
  Trash2,
  ZoomIn,
} from 'lucide-react';
import {
  ACCENT_BLUE_GRADIENT,
  ACCENT_GOLD_GRADIENT,
  ACCENT_GOLD_LIGHT,
  ACCENT_GOLD_SOLID,
  PRIMARY_BG,
  PRIMARY_BG_DARK,
  PRIMARY_BG_FLAT,
  TEXT_ON_BLUE,
  TEXT_ON_GOLD,
} from '@/shared/theme/Phase12DesignTokens';
import { Tooltip } from '@/shared/components/Tooltip';
import { VaultImageWithFallback } from '@/components/ui/VaultImageWithFallback';
import type { Portal } from '@/shared/portals';
import { useGuidedComicVaultBridge } from '@/stores/guidedComicVaultBridge';
import { useImageWorkshopBridge, type GuidedImageWorkshopReference } from '@/stores/imageWorkshopBridge';
import { useGuidedComicLayoutBridge, type GuidedComicLayoutPanelImage } from '@/stores/guidedComicLayoutBridge';
import {
  getGuidedComicActivePanelCount,
  getGuidedComicExistingPanelBeats,
  getGuidedComicLayoutGridStyle,
  getGuidedComicLayoutPanels,
} from '@/portals/guided-comic/guidedComicLayoutPlan';

export type GuidedComicStepId =
  | 'setup'
  | 'story'
  | 'pages'
  | 'visual-prep'
  | 'art'
  | 'layout'
  | 'export';

type GuidedComicStep = {
  id: GuidedComicStepId;
  label: string;
  eyebrow: string;
  title: string;
  summary: string;
  helperText: string;
  actionLabel: string;
  workflowCards: {
    title: string;
    body: string;
  }[];
  Icon: React.ComponentType<{ className?: string }>;
};

export function shouldRenderGuidedPageNavigator(stepId: GuidedComicStepId, pageCount: number): boolean {
  return (stepId === 'pages' || stepId === 'layout') && pageCount > 0;
}

export const ADVANCED_STUDIO_ACTION_LABELS = {
  openBlank: 'Open blank Advanced Studio',
  sendPage: 'Send this page to Advanced Studio',
} as const;

type SetupFormState = {
  seriesTitle: string;
  issueTitle: string;
  issueNumber: string;
  targetPageCount: string;
  genre: string;
  tone: string;
  premise: string;
};

type StoryFormState = {
  premise: string;
  mainCharacters: string;
  conflict: string;
  setting: string;
  endingGoal: string;
};

type ArtDirectionState = {
  artStyle: string;
  defaultAspectRatio: string;
  renderingStyle: string;
  colorMood: string;
  lighting: string;
  continuityNotes: string;
  excludeTextFromImages: boolean;
};

type OutlineBeatId = 'opening-hook' | 'rising-conflict' | 'midpoint-turn' | 'climax' | 'ending-beat';

type OutlineBeat = {
  id: OutlineBeatId;
  title: string;
  description: string;
  locked: boolean;
};

type PageCard = {
  pageNumber: number;
  summary: string;
  panelCount: string;
  keyCharacters: string;
  keyLocation: string;
  expanded: boolean;
  panelBeats: string[];
};

type ReferenceImage = {
  referenceId?: string;
  imageUrl: string;
  displayName: string;
  profileName?: string;
  collectionName?: string;
  sourceLabel?: string;
  imageLabel?: string;
  castName?: string;
};

type PanelArtStatus = 'needs-art' | 'ready' | 'approved';

type PanelArtQueueItem = {
  id: string;
  pageNumber: number;
  panelNumber: number;
  beatText: string;
  characters: string[];
  location: string;
};

type PanelArtImageState = {
  imageUrl: string;
  source: 'imageshop' | 'vault' | 'upload' | 'paste';
  returnedAt: string;
  prompt?: string;
  sourceLabel?: string;
};

type LayoutTemplateId = 'auto' | 'three-panel' | 'four-panel' | 'six-panel-grid' | 'splash';

type LayoutTemplateOption = {
  id: LayoutTemplateId;
  label: string;
};

type GuidedComicDraftState = {
  version: 1;
  savedAt: string;
  activeIndex: number;
  setupForm: SetupFormState;
  storyForm: StoryFormState;
  artDirection: ArtDirectionState;
  outlineBeats: OutlineBeat[];
  pageCards: PageCard[];
  characterReferences: Record<string, ReferenceImage[]>;
  locationReferences: Record<string, ReferenceImage[]>;
  npcReferences: Record<string, ReferenceImage[]>;
  selectedPanelId: string | null;
  panelArtStatuses: Record<string, PanelArtStatus>;
  panelArtImages: Record<string, PanelArtImageState>;
  pageLayoutTemplates: Record<number, LayoutTemplateId>;
};

const GUIDED_COMIC_DRAFT_STORAGE_KEY = 'arcs.guidedComicFlowDraft.v1';

const GENRE_OPTIONS = [
  'Superhero',
  'Fantasy',
  'Sci-fi',
  'Mystery',
  'Slice of life',
  'Horror',
  'Romance',
  'Adventure',
  'Custom',
];

const TONE_OPTIONS = [
  'Cinematic',
  'Playful',
  'Epic',
  'Noir',
  'Satirical',
  'Hopeful',
  'Dark',
  'Wonder-filled',
  'Custom',
];

const DEFAULT_SETUP_FORM: SetupFormState = {
  seriesTitle: '',
  issueTitle: '',
  issueNumber: '1',
  targetPageCount: '22',
  genre: GENRE_OPTIONS[0],
  tone: TONE_OPTIONS[0],
  premise: '',
};

const DEFAULT_STORY_FORM: StoryFormState = {
  premise: '',
  mainCharacters: '',
  conflict: '',
  setting: '',
  endingGoal: '',
};

const DEFAULT_ART_DIRECTION: ArtDirectionState = {
  artStyle: '',
  defaultAspectRatio: 'Match panel layout',
  renderingStyle: '',
  colorMood: '',
  lighting: '',
  continuityNotes: '',
  excludeTextFromImages: true,
};

const ASPECT_RATIO_OPTIONS = [
  'Match panel layout',
  '1:1 square',
  '4:5 portrait',
  '2:3 comic page portrait',
  '3:2 landscape',
  '16:9 cinematic',
  '9:16 vertical',
  'Custom',
];

const INITIAL_OUTLINE_BEATS: OutlineBeat[] = [
  { id: 'opening-hook', title: 'Opening Hook', description: '', locked: false },
  { id: 'rising-conflict', title: 'Rising Conflict', description: '', locked: false },
  { id: 'midpoint-turn', title: 'Midpoint Turn', description: '', locked: false },
  { id: 'climax', title: 'Climax', description: '', locked: false },
  { id: 'ending-beat', title: 'Ending Beat', description: '', locked: false },
];

const DEFAULT_PANEL_BEATS = [
  'Panel 1: Establishing shot',
  'Panel 2: Character moment',
  'Panel 3: Conflict/dialogue',
  'Panel 4: Transition or hook',
];

const LAYOUT_TEMPLATE_OPTIONS: LayoutTemplateOption[] = [
  { id: 'auto', label: 'Auto layout' },
  { id: 'three-panel', label: '3-panel page' },
  { id: 'four-panel', label: '4-panel page' },
  { id: 'six-panel-grid', label: '6-panel grid' },
  { id: 'splash', label: 'Splash page' },
];

const STEPS: GuidedComicStep[] = [
  {
    id: 'setup',
    label: 'Setup',
    eyebrow: 'Start here',
    title: 'Choose the shape of the comic',
    summary: 'Set the format, tone, audience, and working title before any panels are created.',
    helperText: 'This step turns a loose idea into the basic project brief ARCS can carry through the rest of the flow.',
    actionLabel: 'Build Story Foundation',
    workflowCards: [
      {
        title: 'Project Brief',
        body: 'Working title, series or one-shot choice, issue number, audience, tone, and genre.',
      },
      {
        title: 'Comic Format',
        body: 'Choose webtoon or page spread, page size, target length, cover needs, and reading direction.',
      },
      {
        title: 'Foundation Output',
        body: 'A concise creative brief that can seed Writers Workshop, visual prep, and layout planning.',
      },
    ],
    Icon: Rocket,
  },
  {
    id: 'story',
    label: 'Story',
    eyebrow: 'Script foundation',
    title: 'Bring in the story spine',
    summary: 'Capture the synopsis, outline, page beats, or script context that will guide the rest of the workflow.',
    helperText: 'This step is where the comic’s narrative source of truth comes together before page planning.',
    actionLabel: 'Generate Issue Outline',
    workflowCards: [
      {
        title: 'Synopsis Source',
        body: 'Draft a synopsis here or prepare to pull issue context from Writers Workshop.',
      },
      {
        title: 'Outline Shape',
        body: 'Review act beats, page targets, key reveals, emotional turns, and dialogue needs.',
      },
      {
        title: 'Story Output',
        body: 'A usable issue outline that can feed page beats and later guide panel composition.',
      },
    ],
    Icon: BookOpenText,
  },
  {
    id: 'pages',
    label: 'Pages',
    eyebrow: 'Structure',
    title: 'Plan pages and panel density',
    summary: 'Decide how many pages are needed and where big moments deserve more space.',
    helperText: 'This step maps story beats into pages so the comic has pacing before artwork begins.',
    actionLabel: 'Prepare Visual References',
    workflowCards: [
      {
        title: 'Page Targets',
        body: 'Define page count, cover pages, double-page spread moments, and recap or end-card needs.',
      },
      {
        title: 'Panel Density',
        body: 'Mark quiet pages, action pages, hero panels, splash moments, and dialogue-heavy pages.',
      },
      {
        title: 'Page Output',
        body: 'A page-by-page plan ready for Writers Workshop page beats or manual layout drafting.',
      },
    ],
    Icon: PanelTop,
  },
  {
    id: 'visual-prep',
    label: 'Visual Prep',
    eyebrow: 'Reference pass',
    title: 'Gather characters, locations, and props',
    summary: 'Review what should come from the Image Vault and what still needs reference art.',
    helperText: 'This step lines up the Image Vault, Character Studio, Asset Studio, and Imageshop before panel art.',
    actionLabel: 'Generate Panel Art',
    workflowCards: [
      {
        title: 'Vault Matches',
        body: 'Identify existing character profiles, asset collections, NPC refs, and supporting images.',
      },
      {
        title: 'Missing References',
        body: 'List recurring cast, locations, props, costumes, and mood refs that still need creation.',
      },
      {
        title: 'Prep Output',
        body: 'A visual prep queue for Illustrator’s Imageshop, Character Studio, and Asset Studio.',
      },
    ],
    Icon: ImagePlus,
  },
  {
    id: 'art',
    label: 'Art',
    eyebrow: 'Image creation',
    title: 'Create or select panel artwork',
    summary: 'Move from prepared references into art selection for the pages that need images.',
    helperText: 'This step is the artwork pass: pick finished images, note gaps, and prepare panel assignments.',
    actionLabel: 'Arrange Comic Pages',
    workflowCards: [
      {
        title: 'Art Queue',
        body: 'Track panels needing new art, panels using vault images, and panels that only need placeholders.',
      },
      {
        title: 'Style Continuity',
        body: 'Carry character consistency, setting continuity, aspect ratio, camera notes, and lighting notes.',
      },
      {
        title: 'Art Output',
        body: 'Panel-ready image selections that can be placed into the advanced Comics Studio canvas.',
      },
    ],
    Icon: Palette,
  },
  {
    id: 'layout',
    label: 'Layout',
    eyebrow: 'Comic assembly',
    title: 'Arrange panels, balloons, and pacing',
    summary: 'Use the guided plan to enter layout work, then refine in the advanced comic editor when needed.',
    helperText: 'This step turns planned pages and prepared art into a layout checklist before precision editing.',
    actionLabel: 'Export Comic',
    workflowCards: [
      {
        title: 'Layout Draft',
        body: 'Choose page templates, panel order, gutter rhythm, splash panels, and spread composition.',
      },
      {
        title: 'Lettering Pass',
        body: 'Plan speech balloons, captions, sound effects, reading order, and dialogue balance.',
      },
      {
        title: 'Layout Output',
        body: 'A page assembly plan for the existing advanced editor with panels, balloons, and assets in mind.',
      },
    ],
    Icon: LayoutTemplate,
  },
  {
    id: 'export',
    label: 'Export',
    eyebrow: 'Finish',
    title: 'Review and publish the issue',
    summary: 'Check pages, confirm export format, and prepare the comic for download or sharing.',
    helperText: 'This step helps catch missing images, rough lettering, and format choices before final export.',
    actionLabel: 'Export Comic',
    workflowCards: [
      {
        title: 'Readthrough',
        body: 'Review page order, story clarity, missing panels, unfinished balloons, and visual consistency.',
      },
      {
        title: 'Export Choice',
        body: 'Prepare PNG or PDF output, page naming, dimensions, and final quality checks.',
      },
      {
        title: 'Export Output',
        body: 'A final readiness checklist before using the advanced studio export tools.',
      },
    ],
    Icon: Download,
  },
];

interface GuidedComicFlowProps {
  onNavigatePortal: (portal: Portal) => void;
  onOpenAdvancedStudio: () => void;
  requestedStepId?: GuidedComicStepId | null;
}

function splitListText(value: string): string[] {
  return value
    .split(/[\n,]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function uniquePageCardTerms(values: string[]): string[] {
  const seen = new Set<string>();
  const uniqueTerms: string[] = [];

  values.flatMap(splitListText).forEach((term) => {
    const normalized = term.toLowerCase();
    if (seen.has(normalized)) return;
    seen.add(normalized);
    uniqueTerms.push(term);
  });

  return uniqueTerms;
}

function displayTitleCase(value: string): string {
  return value
    .trim()
    .split(/\s+/)
    .map((word) => {
      if (word.length <= 1) return word.toUpperCase();
      if (/^[A-Z0-9]{2,}$/.test(word)) return word;
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
}

type LegacyVisualReferenceState = {
  status?: unknown;
  referenceId?: unknown;
  imageUrl?: unknown;
  sourceLabel?: unknown;
  displayName?: unknown;
  profileName?: unknown;
  collectionName?: unknown;
  imageLabel?: unknown;
  castName?: unknown;
};

function getVisualReferenceDisplayName(fallbackName: string, reference?: ReferenceImage): string {
  return (
    reference?.castName?.trim() ||
    reference?.imageLabel?.trim() ||
    reference?.displayName?.trim() ||
    displayTitleCase(fallbackName)
  );
}

function getVisualReferenceGroupName(reference?: ReferenceImage): string | undefined {
  return reference?.profileName?.trim() || reference?.collectionName?.trim() || undefined;
}

function normalizeReferenceImage(fallbackName: string, raw: unknown): ReferenceImage | null {
  if (!raw || typeof raw !== 'object') return null;
  const candidate = raw as LegacyVisualReferenceState;
  const imageUrl = typeof candidate.imageUrl === 'string' ? candidate.imageUrl.trim() : '';
  if (!imageUrl) return null;

  const displayName =
    (typeof candidate.displayName === 'string' && candidate.displayName.trim()) ||
    (typeof candidate.castName === 'string' && candidate.castName.trim()) ||
    (typeof candidate.imageLabel === 'string' && candidate.imageLabel.trim()) ||
    (typeof candidate.sourceLabel === 'string' && candidate.sourceLabel.trim()) ||
    displayTitleCase(fallbackName);

  return {
    referenceId: typeof candidate.referenceId === 'string' ? candidate.referenceId : undefined,
    imageUrl,
    displayName,
    profileName: typeof candidate.profileName === 'string' ? candidate.profileName : undefined,
    collectionName: typeof candidate.collectionName === 'string' ? candidate.collectionName : undefined,
    sourceLabel: typeof candidate.sourceLabel === 'string' ? candidate.sourceLabel : undefined,
    imageLabel: typeof candidate.imageLabel === 'string' ? candidate.imageLabel : undefined,
    castName: typeof candidate.castName === 'string' ? candidate.castName : undefined,
  };
}

function normalizeReferenceMap(raw: unknown): Record<string, ReferenceImage[]> {
  if (!raw || typeof raw !== 'object') return {};
  const entries = Object.entries(raw as Record<string, unknown>);
  return entries.reduce<Record<string, ReferenceImage[]>>((next, [name, value]) => {
    const images = Array.isArray(value)
      ? value.flatMap((item) => {
          const normalized = normalizeReferenceImage(name, item);
          return normalized ? [normalized] : [];
        })
      : (() => {
          const normalized = normalizeReferenceImage(name, value);
          return normalized ? [normalized] : [];
        })();

    if (images.length > 0) {
      next[name] = images;
    }
    return next;
  }, {});
}

function ReferenceThumbnailStrip({
  references,
  emptyLabel,
  onRemove,
}: {
  references: ReferenceImage[];
  emptyLabel: string;
  onRemove: (referenceIndex: number) => void;
}) {
  if (references.length === 0) {
    return (
      <div className="flex h-[116px] min-w-0 items-center rounded-xl border border-dashed border-white/15 bg-black/20 px-3 text-xs text-white/38">
        {emptyLabel}
      </div>
    );
  }

  return (
    <div className="min-w-0 overflow-x-auto rounded-xl border border-white/10 bg-black/20 p-2">
      <div className="flex w-max max-w-none gap-2">
        {references.map((reference, index) => {
          const label = getVisualReferenceDisplayName(reference.sourceLabel || `Reference ${index + 1}`, reference);
          const groupName = getVisualReferenceGroupName(reference);
          return (
            <div
              key={`${reference.referenceId ?? reference.imageUrl}-${index}`}
              className="relative w-[88px] shrink-0 overflow-hidden rounded-lg border border-amber-300/25 bg-black/35"
              title={groupName ? `${label} · ${groupName}` : label}
            >
              <VaultImageWithFallback
                src={reference.imageUrl}
                alt={`${label} reference`}
                frameClassName="flex h-[76px] w-full items-center justify-center overflow-hidden bg-black/35"
                imgClassName="h-[76px] w-full object-cover"
              />
              <button
                type="button"
                aria-label={`Remove ${label}`}
                onClick={() => onRemove(index)}
                className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full border border-black/40 bg-black/75 text-xs font-black text-white shadow-lg transition hover:bg-red-500/85"
              >
                ×
              </button>
              <div className="border-t border-white/10 px-1.5 py-1">
                <p className="truncate text-[10px] font-bold leading-tight text-amber-50">{label}</p>
                {groupName ? (
                  <p className="mt-0.5 truncate text-[9px] leading-tight text-white/40">{groupName}</p>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function mapReferencesForImageshop(
  referencesByName: Record<string, ReferenceImage[]>,
  sourceType: GuidedImageWorkshopReference['sourceType'],
): GuidedImageWorkshopReference[] {
  return Object.entries(referencesByName).flatMap(([name, references]) =>
    references.map((reference) => ({
      name,
      displayName: getVisualReferenceDisplayName(name, reference),
      imageUrl: reference.imageUrl,
      referenceId: reference.referenceId,
      sourceLabel: reference.sourceLabel,
      sourceType,
      profileName: reference.profileName,
      imageLabel: reference.imageLabel,
      castName: reference.castName,
    })),
  );
}

function cloneInitialOutlineBeats(): OutlineBeat[] {
  return INITIAL_OUTLINE_BEATS.map((beat) => ({ ...beat }));
}

function safeActiveIndex(value: unknown): number {
  return typeof value === 'number' && Number.isInteger(value)
    ? Math.max(0, Math.min(value, STEPS.length - 1))
    : 0;
}

function readGuidedComicDraft(): GuidedComicDraftState | null {
  if (typeof window === 'undefined') return null;

  try {
    const rawDraft = window.localStorage.getItem(GUIDED_COMIC_DRAFT_STORAGE_KEY);
    if (!rawDraft) return null;

    const parsed = JSON.parse(rawDraft) as Partial<GuidedComicDraftState>;
    if (parsed.version !== 1) return null;

    return {
      version: 1,
      savedAt: typeof parsed.savedAt === 'string' ? parsed.savedAt : '',
      activeIndex: safeActiveIndex(parsed.activeIndex),
      setupForm: { ...DEFAULT_SETUP_FORM, ...parsed.setupForm },
      storyForm: { ...DEFAULT_STORY_FORM, ...parsed.storyForm },
      artDirection: { ...DEFAULT_ART_DIRECTION, ...parsed.artDirection },
      outlineBeats: Array.isArray(parsed.outlineBeats) ? (parsed.outlineBeats as OutlineBeat[]) : cloneInitialOutlineBeats(),
      pageCards: Array.isArray(parsed.pageCards) ? (parsed.pageCards as PageCard[]) : [],
      characterReferences: normalizeReferenceMap(parsed.characterReferences),
      locationReferences: normalizeReferenceMap(parsed.locationReferences),
      npcReferences: normalizeReferenceMap(parsed.npcReferences),
      selectedPanelId: typeof parsed.selectedPanelId === 'string' ? parsed.selectedPanelId : null,
      panelArtStatuses: parsed.panelArtStatuses ?? {},
      panelArtImages: parsed.panelArtImages ?? {},
      pageLayoutTemplates: parsed.pageLayoutTemplates ?? {},
    };
  } catch {
    return null;
  }
}

function removeGuidedComicDraft() {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.removeItem(GUIDED_COMIC_DRAFT_STORAGE_KEY);
  } catch {
    // Browsers can deny localStorage access; the in-memory flow can still continue.
  }
}

function panelArtQueueId(pageNumber: number, panelNumber: number): string {
  return `page-${pageNumber}-panel-${panelNumber}`;
}

function panelArtStatusLabel(status: PanelArtStatus): string {
  switch (status) {
    case 'approved':
      return 'Approved';
    case 'ready':
      return 'Ready';
    case 'needs-art':
      return 'Needs art';
  }
}

function panelArtSourceLabel(source: PanelArtImageState['source']): string {
  switch (source) {
    case 'imageshop':
      return 'Imageshop art';
    case 'vault':
      return 'Image Vault art';
    case 'upload':
      return 'Uploaded art';
    case 'paste':
      return 'Pasted art';
  }
}

function pagePanelArtSummary(page: PageCard, panelArtStatuses: Record<string, PanelArtStatus>): string {
  const panelStatuses = getGuidedComicExistingPanelBeats(page).map((_, panelIndex) => {
    const panelNumber = panelIndex + 1;
    return panelArtStatuses[panelArtQueueId(page.pageNumber, panelNumber)] ?? 'needs-art';
  });
  const approvedCount = panelStatuses.filter((status) => status === 'approved').length;
  const readyCount = panelStatuses.filter((status) => status === 'ready').length;
  const needsArtCount = panelStatuses.filter((status) => status === 'needs-art').length;
  return `${approvedCount} approved / ${readyCount} ready / ${needsArtCount} needs art`;
}

function outlineSeedForBeat(beatId: OutlineBeatId, story: StoryFormState): string {
  const characters = splitListText(story.mainCharacters);
  const locations = splitListText(story.setting);
  const lead = characters[0] || 'the lead character';
  const supporting = characters.slice(1, 3).join(', ');
  const setting = locations[0] || story.setting.trim() || 'the central setting';
  const premise = story.premise.trim() || 'the issue premise';
  const conflict = story.conflict.trim() || 'the main conflict';
  const ending = story.endingGoal.trim() || 'the ending goal';

  switch (beatId) {
    case 'opening-hook':
      return `Open on ${lead} in ${setting}, establishing ${premise}.`;
    case 'rising-conflict':
      return supporting
        ? `${lead} and ${supporting} collide with ${conflict}, raising the stakes.`
        : `${lead} collides with ${conflict}, raising the stakes.`;
    case 'midpoint-turn':
      return `A new reveal or reversal changes how ${lead} understands ${conflict}.`;
    case 'climax':
      return `${lead} makes the decisive move against ${conflict}.`;
    case 'ending-beat':
      return `End with ${ending}, leaving a clear final image or next-issue hook.`;
  }
}

function targetPageCountFromInput(value: string): number {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return 1;
  return Math.max(1, Math.min(parsed, 60));
}

function pageSummarySeed(pageNumber: number, targetPageCount: number, outlineBeats: OutlineBeat[]): string {
  const usableBeats = outlineBeats.filter((beat) => beat.description.trim() || beat.title.trim());
  if (usableBeats.length === 0) return '';
  const beatIndex = Math.min(
    usableBeats.length - 1,
    Math.floor(((pageNumber - 1) / Math.max(1, targetPageCount)) * usableBeats.length),
  );
  const beat = usableBeats[beatIndex];
  const title = beat.title.trim() || `Beat ${beatIndex + 1}`;
  const description = beat.description.trim();
  return description ? `${title}: ${description}` : title;
}

function buildPageCard(pageNumber: number, targetPageCount: number, outlineBeats: OutlineBeat[]): PageCard {
  return {
    pageNumber,
    summary: pageSummarySeed(pageNumber, targetPageCount, outlineBeats),
    panelCount: '4',
    keyCharacters: '',
    keyLocation: '',
    expanded: pageNumber === 1,
    panelBeats: DEFAULT_PANEL_BEATS,
  };
}

export function GuidedComicFlow({ onNavigatePortal, onOpenAdvancedStudio, requestedStepId }: GuidedComicFlowProps) {
  const skipNextDraftSaveRef = useRef(false);
  const pageSectionRefs = useRef<Record<number, HTMLElement | null>>({});
  const panelUploadInputRef = useRef<HTMLInputElement | null>(null);
  const panelPasteTargetRef = useRef<HTMLDivElement | null>(null);
  const requestVaultSelection = useGuidedComicVaultBridge((s) => s.requestVaultSelection);
  const consumeVaultSelection = useGuidedComicVaultBridge((s) => s.consumeSelection);
  const requestGuidedComicHandoff = useImageWorkshopBridge((s) => s.requestGuidedComicHandoff);
  const consumeGuidedComicPanelImageReturn = useImageWorkshopBridge((s) => s.consumeGuidedComicPanelImageReturn);
  const requestLayoutHandoff = useGuidedComicLayoutBridge((s) => s.requestLayoutHandoff);
  const restoredDraft = useMemo(() => readGuidedComicDraft(), []);
  const [activeIndex, setActiveIndex] = useState(() => restoredDraft?.activeIndex ?? 0);
  const [setupForm, setSetupForm] = useState<SetupFormState>(() => restoredDraft?.setupForm ?? DEFAULT_SETUP_FORM);
  const [storyForm, setStoryForm] = useState<StoryFormState>(() => restoredDraft?.storyForm ?? DEFAULT_STORY_FORM);
  const [artDirection, setArtDirection] = useState<ArtDirectionState>(
    () => restoredDraft?.artDirection ?? DEFAULT_ART_DIRECTION,
  );
  const [outlineBeats, setOutlineBeats] = useState<OutlineBeat[]>(() => restoredDraft?.outlineBeats ?? cloneInitialOutlineBeats());
  const [pageCards, setPageCards] = useState<PageCard[]>(() => restoredDraft?.pageCards ?? []);
  const [activePageNumber, setActivePageNumber] = useState<number | null>(() => restoredDraft?.pageCards?.[0]?.pageNumber ?? null);
  const activeStep = STEPS[activeIndex];
  const progress = useMemo(() => ((activeIndex + 1) / STEPS.length) * 100, [activeIndex]);
  const atStart = activeIndex === 0;
  const atEnd = activeIndex === STEPS.length - 1;
  const isSetupStep = activeStep.id === 'setup';
  const isStoryStep = activeStep.id === 'story';
  const isPagesStep = activeStep.id === 'pages';
  const isVisualPrepStep = activeStep.id === 'visual-prep';
  const isArtStep = activeStep.id === 'art';
  const isLayoutStep = activeStep.id === 'layout';
  const isExportStep = activeStep.id === 'export';
  const [characterReferences, setCharacterReferences] = useState<Record<string, ReferenceImage[]>>(
    () => restoredDraft?.characterReferences ?? {},
  );
  const [locationReferences, setLocationReferences] = useState<Record<string, ReferenceImage[]>>(
    () => restoredDraft?.locationReferences ?? {},
  );
  const [npcReferences, setNpcReferences] = useState<Record<string, ReferenceImage[]>>(
    () => restoredDraft?.npcReferences ?? {},
  );
  const [npcReferenceName, setNpcReferenceName] = useState('');
  const [selectedPanelId, setSelectedPanelId] = useState<string | null>(() => restoredDraft?.selectedPanelId ?? null);
  const [panelArtStatuses, setPanelArtStatuses] = useState<Record<string, PanelArtStatus>>(
    () => restoredDraft?.panelArtStatuses ?? {},
  );
  const [panelArtImages, setPanelArtImages] = useState<Record<string, PanelArtImageState>>(
    () => restoredDraft?.panelArtImages ?? {},
  );
  const [panelPasteMessage, setPanelPasteMessage] = useState<string | null>(null);
  const [pageLayoutTemplates, setPageLayoutTemplates] = useState<Record<number, LayoutTemplateId>>(
    () => restoredDraft?.pageLayoutTemplates ?? {},
  );
  const [pageNavigatorVisible, setPageNavigatorVisible] = useState(true);
  const [draftSavedAt, setDraftSavedAt] = useState<string | null>(() => restoredDraft?.savedAt ?? null);

  const assignPanelArtImage = useCallback(
    (
      panelId: string,
      image: Pick<PanelArtImageState, 'imageUrl' | 'source'> & Partial<Omit<PanelArtImageState, 'imageUrl' | 'source'>>,
    ) => {
      setSelectedPanelId(panelId);
      setPanelArtImages((current) => ({
        ...current,
        [panelId]: {
          ...image,
          returnedAt: image.returnedAt ?? new Date().toISOString(),
        },
      }));
      setPanelArtStatuses((current) => ({ ...current, [panelId]: 'ready' }));
    },
    [setPanelArtImages, setPanelArtStatuses, setSelectedPanelId],
  );

  useEffect(() => {
    if (!requestedStepId) return;
    const requestedIndex = STEPS.findIndex((step) => step.id === requestedStepId);
    if (requestedIndex === -1) return;
    setActiveIndex(requestedIndex);
  }, [requestedStepId]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (skipNextDraftSaveRef.current) {
      skipNextDraftSaveRef.current = false;
      return;
    }

    const draft: GuidedComicDraftState = {
      version: 1,
      savedAt: new Date().toISOString(),
      activeIndex,
      setupForm,
      storyForm,
      artDirection,
      outlineBeats,
      pageCards,
      characterReferences,
      locationReferences,
      npcReferences,
      selectedPanelId,
      panelArtStatuses,
      panelArtImages,
      pageLayoutTemplates,
    };

    try {
      window.localStorage.setItem(GUIDED_COMIC_DRAFT_STORAGE_KEY, JSON.stringify(draft));
      setDraftSavedAt(draft.savedAt);
    } catch {
      setDraftSavedAt(null);
    }
  }, [
    activeIndex,
    artDirection,
    characterReferences,
    locationReferences,
    npcReferences,
    outlineBeats,
    pageCards,
    pageLayoutTemplates,
    panelArtImages,
    panelArtStatuses,
    selectedPanelId,
    setupForm,
    storyForm,
  ]);

  useEffect(() => {
    const selection = consumeVaultSelection();
    if (!selection) return;

    if (selection.type === 'panel-art') {
      setActiveIndex(STEPS.findIndex((step) => step.id === 'art'));
      assignPanelArtImage(selection.name, {
        imageUrl: selection.imageUrl,
        source: 'vault',
        sourceLabel: selection.sourceLabel,
      });
      return;
    }

    setActiveIndex(STEPS.findIndex((step) => step.id === 'visual-prep'));
    const reference: ReferenceImage = {
      referenceId: selection.referenceId,
      imageUrl: selection.imageUrl,
      sourceLabel: selection.sourceLabel,
      displayName: selection.displayName || selection.castName || selection.imageLabel || selection.sourceLabel,
      profileName: selection.profileName,
      collectionName: selection.collectionName,
      imageLabel: selection.imageLabel,
      castName: selection.castName,
    };

    if (selection.type === 'character') {
      setCharacterReferences((current) => ({
        ...current,
        [selection.name]: [...(current[selection.name] ?? []), reference],
      }));
      return;
    }

    if (selection.type === 'npc') {
      setNpcReferences((current) => ({
        ...current,
        [selection.name]: [...(current[selection.name] ?? []), reference],
      }));
      return;
    }

    setLocationReferences((current) => ({
      ...current,
      [selection.name]: [...(current[selection.name] ?? []), reference],
    }));
  }, [assignPanelArtImage, consumeVaultSelection]);

  useEffect(() => {
    const panelReturn = consumeGuidedComicPanelImageReturn();
    if (!panelReturn) return;

    const panelId = panelReturn.panelId ?? panelArtQueueId(panelReturn.pageNumber, panelReturn.panelNumber);
    setActiveIndex(STEPS.findIndex((step) => step.id === 'art'));
    assignPanelArtImage(panelId, {
      imageUrl: panelReturn.imageUrl,
      source: 'imageshop',
      returnedAt: panelReturn.returnedAt,
      prompt: panelReturn.prompt,
    });
  }, [assignPanelArtImage, consumeGuidedComicPanelImageReturn]);

  useEffect(() => {
    if (!isStoryStep) return;
    const setupPremise = setupForm.premise.trim();
    if (!setupPremise || storyForm.premise.trim()) return;
    setStoryForm((current) => ({ ...current, premise: setupPremise }));
  }, [isStoryStep, setupForm.premise, storyForm.premise]);

  useEffect(() => {
    if (!isPagesStep) return;
    const hasStorySeed = [
      storyForm.premise,
      storyForm.mainCharacters,
      storyForm.conflict,
      storyForm.setting,
      storyForm.endingGoal,
    ].some((value) => value.trim());
    if (!hasStorySeed) return;
    setOutlineBeats((current) => {
      let changed = false;
      const next = current.map((beat) => {
        if (beat.locked || beat.description.trim()) return beat;
        const seeded = outlineSeedForBeat(beat.id, storyForm);
        if (!seeded.trim()) return beat;
        changed = true;
        return { ...beat, description: seeded };
      });
      return changed ? next : current;
    });
  }, [isPagesStep, storyForm]);

  useEffect(() => {
    if (!isPagesStep) return;
    const targetPageCount = targetPageCountFromInput(setupForm.targetPageCount);
    setPageCards((current) => {
      const next: PageCard[] = [];
      for (let index = 0; index < targetPageCount; index += 1) {
        const pageNumber = index + 1;
        const existing = current.find((page) => page.pageNumber === pageNumber);
        next.push(existing ?? buildPageCard(pageNumber, targetPageCount, outlineBeats));
      }
      return next;
    });
  }, [isPagesStep, outlineBeats, setupForm.targetPageCount]);

  useEffect(() => {
    if (!isLayoutStep) return;
    setPageLayoutTemplates((current) => {
      let changed = false;
      const next = { ...current };
      pageCards.forEach((page) => {
        if (next[page.pageNumber]) return;
        next[page.pageNumber] = 'auto';
        changed = true;
      });
      return changed ? next : current;
    });
  }, [isLayoutStep, pageCards]);

  useEffect(() => {
    if (!shouldRenderGuidedPageNavigator(activeStep.id, pageCards.length)) return;
    if (pageCards.some((page) => page.pageNumber === activePageNumber)) return;
    setActivePageNumber(pageCards[0]?.pageNumber ?? null);
  }, [activePageNumber, activeStep.id, pageCards]);

  useEffect(() => {
    if (!shouldRenderGuidedPageNavigator(activeStep.id, pageCards.length)) return;
    if (typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visibleEntry = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        const pageNumber = Number((visibleEntry?.target as HTMLElement | undefined)?.dataset.guidedPageNumber);
        if (Number.isFinite(pageNumber)) setActivePageNumber(pageNumber);
      },
      {
        root: null,
        rootMargin: '-20% 0px -55% 0px',
        threshold: [0.1, 0.35, 0.6],
      },
    );

    pageCards.forEach((page) => {
      const node = pageSectionRefs.current[page.pageNumber];
      if (node) observer.observe(node);
    });

    return () => observer.disconnect();
  }, [activeStep.id, pageCards]);

  const goBack = () => setActiveIndex((index) => Math.max(0, index - 1));
  const goNext = () => setActiveIndex((index) => Math.min(STEPS.length - 1, index + 1));
  const jumpToPage = (pageNumber: number) => {
    setActivePageNumber(pageNumber);
    pageSectionRefs.current[pageNumber]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  const updateSetupField = (field: keyof SetupFormState, value: string) => {
    setSetupForm((current) => ({ ...current, [field]: value }));
  };
  const updateStoryField = (field: keyof StoryFormState, value: string) => {
    setStoryForm((current) => ({ ...current, [field]: value }));
  };
  const updateArtDirectionField = <Field extends keyof ArtDirectionState>(
    field: Field,
    value: ArtDirectionState[Field],
  ) => {
    setArtDirection((current) => ({ ...current, [field]: value }));
  };
  const updatePageCard = (
    pageNumber: number,
    updates: Partial<Pick<PageCard, 'summary' | 'panelCount' | 'keyCharacters' | 'keyLocation' | 'expanded'>>,
  ) => {
    setPageCards((current) => current.map((page) => (page.pageNumber === pageNumber ? { ...page, ...updates } : page)));
  };
  const updatePagePanelBeat = (pageNumber: number, panelIndex: number, value: string) => {
    setPageCards((current) =>
      current.map((page) => {
        if (page.pageNumber !== pageNumber) return page;
        const nextBeats = Array.from(
          { length: Math.max(page.panelBeats.length, panelIndex + 1) },
          (_, index) => page.panelBeats[index] ?? '',
        );
        nextBeats[panelIndex] = value;
        return {
          ...page,
          panelBeats: nextBeats,
        };
      }),
    );
  };
  const requestCharacterVaultReference = (name: string) => {
    requestVaultSelection({ type: 'character', name });
  };
  const requestLocationVaultReference = (name: string) => {
    requestVaultSelection({ type: 'location', name });
  };
  const requestNpcVaultReference = () => {
    const name = npcReferenceName.trim();
    requestVaultSelection({ type: 'npc', name: name || 'NPC reference' });
  };
  const removeCharacterReference = (name: string, referenceIndex: number) => {
    setCharacterReferences((current) => {
      const nextImages = (current[name] ?? []).filter((_, index) => index !== referenceIndex);
      const next = { ...current };
      if (nextImages.length > 0) {
        next[name] = nextImages;
      } else {
        delete next[name];
      }
      return next;
    });
  };
  const removeLocationReference = (name: string, referenceIndex: number) => {
    setLocationReferences((current) => {
      const nextImages = (current[name] ?? []).filter((_, index) => index !== referenceIndex);
      const next = { ...current };
      if (nextImages.length > 0) {
        next[name] = nextImages;
      } else {
        delete next[name];
      }
      return next;
    });
  };
  const removeNpcReference = (name: string, referenceIndex: number) => {
    setNpcReferences((current) => {
      const nextImages = (current[name] ?? []).filter((_, index) => index !== referenceIndex);
      const next = { ...current };
      if (nextImages.length > 0) {
        next[name] = nextImages;
      } else {
        delete next[name];
      }
      return next;
    });
  };
  const updatePanelArtStatus = (panelId: string, status: PanelArtStatus) => {
    setPanelArtStatuses((current) => ({ ...current, [panelId]: status }));
  };
  const deletePanelArtImage = (panelId: string) => {
    setPanelArtImages((current) => {
      const next = { ...current };
      delete next[panelId];
      return next;
    });
    setPanelArtStatuses((current) => ({ ...current, [panelId]: 'needs-art' }));
  };
  const requestPanelArtVaultImage = () => {
    if (!selectedPanel) return;
    requestVaultSelection({ type: 'panel-art', name: selectedPanel.id });
  };
  const readPanelArtFile = (file: File, source: 'upload' | 'paste') => {
    if (!selectedPanel || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = () => {
      const imageUrl = typeof reader.result === 'string' ? reader.result : '';
      if (!imageUrl) return;
      assignPanelArtImage(selectedPanel.id, {
        imageUrl,
        source,
        sourceLabel: file.name || (source === 'paste' ? 'Pasted image' : 'Uploaded image'),
      });
      setPanelPasteMessage(source === 'paste' ? 'Pasted image assigned to this panel.' : null);
    };
    reader.readAsDataURL(file);
  };
  const handlePanelArtUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    if (file) readPanelArtFile(file, 'upload');
    event.currentTarget.value = '';
  };
  const focusPanelPasteTarget = () => {
    setPanelPasteMessage('Paste an image now with Command+V or Ctrl+V.');
    panelPasteTargetRef.current?.focus();
  };
  const handlePanelArtPaste = (event: React.ClipboardEvent<HTMLDivElement>) => {
    const imageFile = Array.from(event.clipboardData.files).find((file) => file.type.startsWith('image/'));
    if (!imageFile) {
      setPanelPasteMessage('Clipboard did not include an image file.');
      return;
    }
    event.preventDefault();
    readPanelArtFile(imageFile, 'paste');
  };
  const updatePageLayoutTemplate = (pageNumber: number, templateId: LayoutTemplateId) => {
    setPageLayoutTemplates((current) => ({ ...current, [pageNumber]: templateId }));
  };
  const openPageInAdvancedStudio = (page: PageCard) => {
    const layoutTemplate = pageLayoutTemplates[page.pageNumber] ?? 'auto';
    const layoutPanels = getGuidedComicLayoutPanels(page, layoutTemplate);
    const orderedPanelIds = layoutPanels.map(
      (panel) => panel.panelId ?? panelArtQueueId(page.pageNumber, panel.panelNumber),
    );
    const handoffPanelArtImages = orderedPanelIds.reduce<Record<string, GuidedComicLayoutPanelImage>>((images, panelId) => {
      const image = panelArtImages[panelId];
      if (!image) return images;
      images[panelId] = {
        panelId,
        imageUrl: image.imageUrl,
        prompt: image.prompt,
        returnedAt: image.returnedAt,
        source: image.source,
      };
      return images;
    }, {});

    requestLayoutHandoff({
      pageNumber: page.pageNumber,
      layoutTemplate,
      orderedPanelIds,
      panelArtImages: handoffPanelArtImages,
      panelBeats: orderedPanelIds.map((panelId, index) => ({
        panelId,
        panelNumber: index + 1,
        beatText: layoutPanels[index]?.beatText ?? '',
      })),
    });
    onOpenAdvancedStudio();
  };
  const clearGuidedDraft = () => {
    const confirmed = window.confirm('Clear the saved guided comic draft from this browser? This resets the guided flow.');
    if (!confirmed) return;

    skipNextDraftSaveRef.current = true;
    removeGuidedComicDraft();
    setActiveIndex(0);
    setSetupForm(DEFAULT_SETUP_FORM);
    setStoryForm(DEFAULT_STORY_FORM);
    setArtDirection(DEFAULT_ART_DIRECTION);
    setOutlineBeats(cloneInitialOutlineBeats());
    setPageCards([]);
    setCharacterReferences({});
    setLocationReferences({});
    setNpcReferences({});
    setNpcReferenceName('');
    setSelectedPanelId(null);
    setPanelArtStatuses({});
    setPanelArtImages({});
    setPageLayoutTemplates({});
    setDraftSavedAt(null);
  };

  const storyCharacters = useMemo(() => splitListText(storyForm.mainCharacters), [storyForm.mainCharacters]);
  const storyLocations = useMemo(() => splitListText(storyForm.setting), [storyForm.setting]);
  const pageCharacters = useMemo(
    () => uniquePageCardTerms(pageCards.map((page) => page.keyCharacters)),
    [pageCards],
  );
  const pageLocations = useMemo(
    () => uniquePageCardTerms(pageCards.map((page) => page.keyLocation)),
    [pageCards],
  );
  const readyCharacterCount = useMemo(
    () => pageCharacters.filter((character) => (characterReferences[character] ?? []).length > 0).length,
    [characterReferences, pageCharacters],
  );
  const readyLocationCount = useMemo(
    () => pageLocations.filter((location) => (locationReferences[location] ?? []).length > 0).length,
    [locationReferences, pageLocations],
  );
  const npcReferenceNames = useMemo(() => Object.keys(npcReferences), [npcReferences]);
  const readyNpcCount = useMemo(
    () => npcReferenceNames.filter((npc) => (npcReferences[npc] ?? []).length > 0).length,
    [npcReferenceNames, npcReferences],
  );
  const totalVisualReferences = pageCharacters.length + pageLocations.length + npcReferenceNames.length;
  const readyVisualReferences = readyCharacterCount + readyLocationCount + readyNpcCount;
  const missingVisualReferences = Math.max(0, totalVisualReferences - readyVisualReferences);
  const openImageshopWithGuidedReferences = useCallback(() => {
    const characters = mapReferencesForImageshop(characterReferences, 'character');
    const locations = mapReferencesForImageshop(locationReferences, 'asset');
    const npcs = mapReferencesForImageshop(npcReferences, 'npc');
    const pageSummary = pageCards
      .map((page) => page.summary.trim())
      .filter(Boolean)
      .join('\n');

    requestGuidedComicHandoff({
      source: 'guided-comic',
      currentStep: 'visual-prep',
      sourceLabel: 'Guided Comic Flow · Visual Prep',
      characters,
      locations,
      npcs,
      pageSummary: pageSummary || undefined,
    });
  }, [
    characterReferences,
    locationReferences,
    npcReferences,
    pageCards,
    requestGuidedComicHandoff,
  ]);
  const panelArtQueue = useMemo<PanelArtQueueItem[]>(
    () =>
      pageCards.flatMap((page) =>
        getGuidedComicExistingPanelBeats(page).map((beatText, panelIndex) => {
          const panelNumber = panelIndex + 1;
          return {
            id: panelArtQueueId(page.pageNumber, panelNumber),
            pageNumber: page.pageNumber,
            panelNumber,
            beatText,
            characters: splitListText(page.keyCharacters),
            location: page.keyLocation.trim(),
          };
        }),
      ),
    [pageCards],
  );
  const selectedPanel =
    panelArtQueue.find((panel) => panel.id === selectedPanelId) ?? panelArtQueue[0] ?? null;
  const selectedPanelStatus = selectedPanel
    ? panelArtStatuses[selectedPanel.id] ?? 'needs-art'
    : 'needs-art';
  const selectedPanelArtImage = selectedPanel ? panelArtImages[selectedPanel.id] : null;
  const openImageshopWithSelectedPanel = useCallback(() => {
    if (!selectedPanel) return;

    const page = pageCards.find((card) => card.pageNumber === selectedPanel.pageNumber);
    const characters = mapReferencesForImageshop(characterReferences, 'character');
    const locations = mapReferencesForImageshop(locationReferences, 'asset');
    const npcs = mapReferencesForImageshop(npcReferences, 'npc');

    requestGuidedComicHandoff({
      source: 'guided-comic',
      currentStep: 'art',
      returnTarget: 'guided-comic-art',
      sourceLabel: `Guided Comic Flow · Page ${selectedPanel.pageNumber}, Panel ${selectedPanel.panelNumber}`,
      panelId: selectedPanel.id,
      pageNumber: selectedPanel.pageNumber,
      panelNumber: selectedPanel.panelNumber,
      panelBeat: selectedPanel.beatText,
      pageSummary: page?.summary.trim() || undefined,
      pageKeyCharacters: selectedPanel.characters,
      pageKeyLocation: selectedPanel.location || undefined,
      artDirection,
      characters,
      locations,
      npcs,
    });
  }, [
    artDirection,
    characterReferences,
    locationReferences,
    npcReferences,
    pageCards,
    requestGuidedComicHandoff,
    selectedPanel,
  ]);
  const layoutChecklistItems = useMemo(() => {
    const allPagesPlanned =
      pageCards.length > 0 && pageCards.every((page) => page.summary.trim() && Number.parseInt(page.panelCount, 10) > 0);
    const panelArtReviewed =
      panelArtQueue.length > 0 && panelArtQueue.every((panel) => (panelArtStatuses[panel.id] ?? 'needs-art') !== 'needs-art');
    const layoutTemplatesSelected =
      pageCards.length > 0 && pageCards.every((page) => Boolean(pageLayoutTemplates[page.pageNumber]));
    return [
      { label: 'All pages planned', complete: allPagesPlanned },
      { label: 'Panel art reviewed', complete: panelArtReviewed },
      { label: 'Layout templates selected', complete: layoutTemplatesSelected },
      { label: 'Ready for export', complete: allPagesPlanned && panelArtReviewed && layoutTemplatesSelected },
    ];
  }, [pageCards, pageLayoutTemplates, panelArtQueue, panelArtStatuses]);
  const exportSummary = useMemo(() => {
    const approvedArtCount = panelArtQueue.filter((panel) => panelArtStatuses[panel.id] === 'approved').length;
    const pagesWithLayoutTemplates = pageCards.filter((page) => Boolean(pageLayoutTemplates[page.pageNumber])).length;
    return {
      totalPages: pageCards.length,
      totalPanelBeats: panelArtQueue.length,
      approvedArtCount,
      pagesWithLayoutTemplates,
    };
  }, [pageCards, pageLayoutTemplates, panelArtQueue, panelArtStatuses]);
  const exportChecklistItems = useMemo(() => {
    const storyFoundationComplete = Boolean(
      (setupForm.seriesTitle.trim() || setupForm.issueTitle.trim()) &&
        setupForm.premise.trim() &&
        storyForm.premise.trim() &&
        storyForm.mainCharacters.trim() &&
        storyForm.conflict.trim(),
    );
    const outlineBeatsDrafted = outlineBeats.every((beat) => beat.description.trim());
    const pagesPlanned =
      pageCards.length > 0 &&
      pageCards.every((page) => page.summary.trim() && getGuidedComicExistingPanelBeats(page).some((beat) => beat.trim()));
    const visualReferencesReviewed = totalVisualReferences > 0 && missingVisualReferences === 0;
    const panelArtReviewed =
      panelArtQueue.length > 0 && panelArtQueue.every((panel) => (panelArtStatuses[panel.id] ?? 'needs-art') !== 'needs-art');
    const layoutTemplatesSelected =
      pageCards.length > 0 && pageCards.every((page) => Boolean(pageLayoutTemplates[page.pageNumber]));
    return [
      { label: 'Story foundation complete', complete: storyFoundationComplete },
      { label: 'Outline beats drafted', complete: outlineBeatsDrafted },
      { label: 'Pages planned', complete: pagesPlanned },
      { label: 'Visual references reviewed', complete: visualReferencesReviewed },
      { label: 'Panel art reviewed', complete: panelArtReviewed },
      { label: 'Layout templates selected', complete: layoutTemplatesSelected },
    ];
  }, [
    missingVisualReferences,
    outlineBeats,
    pageCards,
    pageLayoutTemplates,
    panelArtQueue,
    panelArtStatuses,
    setupForm.issueTitle,
    setupForm.premise,
    setupForm.seriesTitle,
    storyForm.conflict,
    storyForm.mainCharacters,
    storyForm.premise,
    totalVisualReferences,
  ]);
  const workingLogline = useMemo(() => {
    const characterLead = storyCharacters[0] || 'A lead character';
    const conflict = storyForm.conflict.trim() || 'faces a defining conflict';
    const setting = storyForm.setting.trim() ? ` in ${storyForm.setting.trim()}` : '';
    const ending = storyForm.endingGoal.trim() ? ` to ${storyForm.endingGoal.trim()}` : '';
    return `${characterLead} ${conflict}${setting}${ending}.`;
  }, [storyCharacters, storyForm.conflict, storyForm.endingGoal, storyForm.setting]);
  const issueSummary = useMemo(() => {
    const parts = [
      storyForm.premise.trim(),
      storyForm.conflict.trim() ? `Conflict: ${storyForm.conflict.trim()}` : '',
      storyForm.endingGoal.trim() ? `Ending goal: ${storyForm.endingGoal.trim()}` : '',
    ].filter(Boolean);
    return parts.join('\n\n') || 'Add premise, conflict, and ending goal to shape the issue summary.';
  }, [storyForm.conflict, storyForm.endingGoal, storyForm.premise]);
  const outlineQualityItems = useMemo(() => {
    const targetPageCount = targetPageCountFromInput(setupForm.targetPageCount);
    return [
      { label: 'Page count matches target', complete: pageCards.length === targetPageCount },
      { label: 'Page summaries started', complete: pageCards.some((page) => page.summary.trim()) },
      {
        label: 'Characters or locations noted',
        complete: pageCards.some((page) => page.keyCharacters.trim() || page.keyLocation.trim()),
      },
      { label: 'Panel placeholders ready', complete: pageCards.every((page) => getGuidedComicActivePanelCount(page) > 0) },
    ];
  }, [pageCards, setupForm.targetPageCount]);
  const shouldShowPageNavigator = shouldRenderGuidedPageNavigator(activeStep.id, pageCards.length);
  const pageNavigator =
    shouldShowPageNavigator ? (
      <section className="mt-3 border-t border-white/10 pt-3" aria-label="Page navigator">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/45">Pages</p>
          <button
            type="button"
            onClick={() => setPageNavigatorVisible((visible) => !visible)}
            className="rounded-lg border border-white/15 bg-black/25 px-2.5 py-1.5 text-[11px] font-bold text-white/80 transition hover:bg-white/10"
            aria-expanded={pageNavigatorVisible}
          >
            {pageNavigatorVisible ? 'Hide pages' : 'Show pages'}
          </button>
        </div>
        {pageNavigatorVisible ? (
          <div className="mt-2 flex max-h-40 flex-col gap-1 overflow-y-auto pr-1 custom-scrollbar">
            {pageCards.map((page) => {
              const selected = page.pageNumber === activePageNumber;
              return (
                <button
                  key={page.pageNumber}
                  type="button"
                  onClick={() => jumpToPage(page.pageNumber)}
                  className="rounded-lg border px-2.5 py-1.5 text-left text-xs font-bold transition hover:border-amber-300/55 hover:bg-amber-300/10"
                  style={{
                    background: selected ? 'rgba(252,246,186,0.14)' : 'rgba(255,255,255,0.04)',
                    borderColor: selected ? `${ACCENT_GOLD_SOLID}99` : 'rgba(255,255,255,0.12)',
                    color: selected ? ACCENT_GOLD_LIGHT : 'rgba(255,255,255,0.76)',
                  }}
                  aria-current={selected ? 'location' : undefined}
                >
                  Page {page.pageNumber}
                </button>
              );
            })}
          </div>
        ) : null}
      </section>
    ) : null;

  return (
    <div
      className="min-h-full w-full overflow-y-auto custom-scrollbar text-white"
      style={{ background: PRIMARY_BG }}
    >
      <div className="flex w-full max-w-none flex-col gap-6 px-5 py-6 lg:px-8 xl:pr-80">
        <header
          className="overflow-hidden rounded-2xl border shadow-2xl"
          style={{
            background: `linear-gradient(135deg, ${PRIMARY_BG_FLAT} 0%, ${PRIMARY_BG_DARK} 62%, #1b2450 100%)`,
            borderColor: `${ACCENT_GOLD_SOLID}66`,
          }}
        >
          <div className="flex flex-col gap-5 p-5 lg:p-7">
            <div className="min-w-0">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em]">
                <Sparkles className="h-3.5 w-3.5" style={{ color: ACCENT_GOLD_LIGHT }} aria-hidden />
                Guided Comic Flow
              </div>
              <h1 className="text-3xl font-black leading-tight text-white md:text-5xl">
                Create a comic without starting from a blank canvas
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-relaxed text-white/70 md:text-base">
                Move through a calm planning path for story, references, art, layout, and export before opening the
                full comic canvas.
              </p>
            </div>
          </div>
          <div className="h-1.5 w-full bg-black/35">
            <div
              className="h-full transition-all duration-300"
              style={{ width: `${progress}%`, background: ACCENT_GOLD_GRADIENT }}
              aria-hidden
            />
          </div>
        </header>

        <aside
          className="fixed bottom-6 right-6 top-24 z-20 hidden w-56 flex-col overflow-y-auto rounded-2xl border border-white/10 bg-black/70 p-3 shadow-2xl backdrop-blur-xl custom-scrollbar xl:flex"
          aria-label="Persistent guided comic steps"
        >
          <div className="mb-3 px-2">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: ACCENT_GOLD_LIGHT }}>
              Guided steps
            </p>
            <p className="mt-1 text-xs text-white/45">{activeIndex + 1} of {STEPS.length}</p>
          </div>
          <nav className="flex flex-col gap-1.5">
            {STEPS.map((step, index) => {
              const selected = index === activeIndex;
              const complete = index < activeIndex;
              const StepIcon = step.Icon;
              return (
                <button
                  key={step.id}
                  type="button"
                  onClick={() => setActiveIndex(index)}
                  className="flex items-center gap-2.5 rounded-xl border px-2.5 py-2 text-left transition hover:bg-white/10"
                  style={{
                    background: selected ? ACCENT_BLUE_GRADIENT : complete ? 'rgba(252,246,186,0.08)' : 'transparent',
                    borderColor: selected ? ACCENT_GOLD_SOLID : 'rgba(255,255,255,0.12)',
                    color: selected ? TEXT_ON_BLUE : 'rgba(255,255,255,0.76)',
                  }}
                  aria-current={selected ? 'step' : undefined}
                >
                  <span
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border"
                    style={{
                      background: selected || complete ? ACCENT_GOLD_GRADIENT : 'rgba(255,255,255,0.06)',
                      borderColor: selected || complete ? ACCENT_GOLD_SOLID : 'rgba(255,255,255,0.16)',
                      color: selected || complete ? TEXT_ON_GOLD : 'rgba(255,255,255,0.8)',
                    }}
                  >
                    <StepIcon className="h-3.5 w-3.5" aria-hidden />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-xs font-black">{step.label}</span>
                    <span className="block text-[10px] font-bold uppercase tracking-[0.14em] opacity-65">
                      Step {index + 1}
                    </span>
                  </span>
                </button>
              );
            })}
          </nav>
          {pageNavigator}
          <div className="mt-3 rounded-xl border border-white/10 bg-white/[0.06] p-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: ACCENT_GOLD_LIGHT }}>
              Local draft
            </p>
            <span className="mt-2 inline-flex rounded-full border border-emerald-300/25 bg-emerald-300/10 px-2.5 py-1 text-[11px] font-bold text-emerald-100">
              {draftSavedAt ? 'Saved locally' : 'Local draft not saved'}
            </span>
            <button
              type="button"
              onClick={clearGuidedDraft}
              className="mt-2 w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-xs font-bold text-white/70 transition hover:bg-white/10"
            >
              Clear guided draft
            </button>
            <Tooltip content="Open the advanced editor without sending a guided page">
              <button
                type="button"
                onClick={onOpenAdvancedStudio}
                className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-lg border px-3 py-2 text-xs font-bold text-white/85 transition hover:bg-white/10 active:scale-[0.99]"
                style={{ borderColor: `${ACCENT_GOLD_SOLID}88`, background: 'rgba(255,255,255,0.08)' }}
              >
                <LayoutTemplate className="h-4 w-4" aria-hidden />
                {ADVANCED_STUDIO_ACTION_LABELS.openBlank}
              </button>
            </Tooltip>
          </div>
          <div className="mt-auto grid grid-cols-2 gap-2 border-t border-white/10 pt-3">
            <button
              type="button"
              onClick={goBack}
              disabled={atStart}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-white/15 bg-white/10 px-3 py-2.5 text-xs font-bold text-white/85 transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden />
              Back
            </button>
            <button
              type="button"
              onClick={goNext}
              disabled={atEnd}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-xs font-black shadow-lg transition hover:scale-[1.01] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-45"
              style={{ background: ACCENT_GOLD_GRADIENT, color: TEXT_ON_GOLD }}
            >
              Next
              <ChevronRight className="h-4 w-4" aria-hidden />
            </button>
          </div>
        </aside>

        <nav
          className="grid gap-2 rounded-2xl border border-white/10 bg-black/30 p-2 shadow-xl backdrop-blur-sm md:grid-cols-7 xl:hidden"
          aria-label="Guided comic steps"
        >
          {STEPS.map((step, index) => {
            const selected = index === activeIndex;
            const complete = index < activeIndex;
            const StepIcon = step.Icon;
            return (
              <button
                key={step.id}
                type="button"
                onClick={() => setActiveIndex(index)}
                className="flex min-h-[4.5rem] items-center gap-3 rounded-xl border px-3 py-2 text-left transition hover:bg-white/10 md:flex-col md:items-start md:gap-2"
                style={{
                  background: selected ? ACCENT_BLUE_GRADIENT : complete ? 'rgba(252,246,186,0.08)' : 'transparent',
                  borderColor: selected ? ACCENT_GOLD_SOLID : 'rgba(255,255,255,0.12)',
                  color: selected ? TEXT_ON_BLUE : 'rgba(255,255,255,0.78)',
                }}
                aria-current={selected ? 'step' : undefined}
              >
                <span
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border"
                  style={{
                    background: selected || complete ? ACCENT_GOLD_GRADIENT : 'rgba(255,255,255,0.06)',
                    borderColor: selected || complete ? ACCENT_GOLD_SOLID : 'rgba(255,255,255,0.16)',
                    color: selected || complete ? TEXT_ON_GOLD : 'rgba(255,255,255,0.8)',
                  }}
                >
                  <StepIcon className="h-4 w-4" aria-hidden />
                </span>
                <span className="min-w-0">
                  <span className="block text-[10px] font-bold uppercase tracking-[0.16em] opacity-70">
                    Step {index + 1}
                  </span>
                  <span className="block truncate text-sm font-bold">{step.label}</span>
                </span>
              </button>
            );
          })}
        </nav>

        <div className="grid gap-2 rounded-2xl border border-white/10 bg-black/30 p-3 shadow-xl backdrop-blur-sm sm:grid-cols-[auto_auto] xl:hidden">
          <span className="inline-flex items-center justify-center rounded-full border border-emerald-300/25 bg-emerald-300/10 px-3 py-2 text-xs font-bold text-emerald-100">
            {draftSavedAt ? 'Saved locally' : 'Local draft not saved'}
          </span>
          <button
            type="button"
            onClick={clearGuidedDraft}
            className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-xs font-bold text-white/70 transition hover:bg-white/10"
          >
            Clear guided draft
          </button>
        </div>

        <main className="grid min-w-0 gap-6 2xl:grid-cols-[minmax(0,1fr)_320px]">
          <section className="min-w-0 rounded-2xl border border-white/10 bg-white/[0.07] p-5 shadow-xl backdrop-blur-md lg:p-7">
            <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.22em]" style={{ color: ACCENT_GOLD_LIGHT }}>
                  {activeStep.eyebrow}
                </p>
                <h2 className="mt-2 text-2xl font-black leading-tight text-white md:text-4xl">
                  {activeStep.title}
                </h2>
                <p className="mt-3 max-w-3xl text-sm leading-relaxed text-white/70 md:text-base">
                  {activeStep.summary}
                </p>
                <p className="mt-2 max-w-3xl text-sm leading-relaxed text-white/55">
                  {activeStep.helperText}
                </p>
              </div>
              <div
                className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border shadow-lg"
                style={{ background: ACCENT_GOLD_GRADIENT, borderColor: ACCENT_GOLD_SOLID, color: TEXT_ON_GOLD }}
              >
                <activeStep.Icon className="h-7 w-7" aria-hidden />
              </div>
            </div>

            <div className="mt-6 min-w-0 rounded-xl border border-dashed border-white/20 bg-black/25 p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white/90">{activeStep.actionLabel}</p>
                  <p className="mt-1 text-xs leading-relaxed text-white/55">
                    {isSetupStep
                      ? 'Complete the local brief, then continue into Story. Your draft is saved locally in this browser.'
                      : isStoryStep
                        ? 'Shape the story locally here. The outline action is still parked until AI wiring is added.'
                        : isPagesStep
                          ? 'Edit local page cards before moving into visual reference prep.'
                          : isVisualPrepStep
                            ? 'Use Image Vault to attach real references to character and location rows. Advanced Imageshop still handles image generation.'
                            : isArtStep
                              ? 'Panel art generation is not wired here yet. Use Advanced Imageshop to generate actual images for now.'
                              : isLayoutStep
                                ? 'Choose page layout templates locally before the final export review.'
                                : isExportStep
                                  ? 'Review the local comic plan. Export actions are placeholders until file generation is wired.'
                      : 'This button is a planning placeholder for now; no AI calls or data changes happen in this pass.'}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={!isSetupStep}
                  onClick={isSetupStep ? goNext : undefined}
                  className="inline-flex shrink-0 items-center justify-center rounded-lg px-4 py-2 text-xs font-black transition hover:scale-[1.01] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-70"
                  style={{ background: ACCENT_GOLD_GRADIENT, color: TEXT_ON_GOLD }}
                >
                  {activeStep.actionLabel}
                </button>
              </div>
              {isVisualPrepStep ? (
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={openImageshopWithGuidedReferences}
                    className="inline-flex items-center justify-center rounded-xl border px-4 py-3 text-sm font-black text-white/90 transition hover:bg-white/15 active:scale-[0.99]"
                    style={{ borderColor: `${ACCENT_GOLD_SOLID}88`, background: 'rgba(252,246,186,0.10)' }}
                  >
                    Open Illustrator's Imageshop
                  </button>
                  <button
                    type="button"
                    onClick={() => onNavigatePortal('reference')}
                    className="inline-flex items-center justify-center rounded-xl border px-4 py-3 text-sm font-black text-white/90 transition hover:bg-white/15 active:scale-[0.99]"
                    style={{ borderColor: `${ACCENT_GOLD_SOLID}88`, background: 'rgba(252,246,186,0.10)' }}
                  >
                    Open Image Vault
                  </button>
                </div>
              ) : null}

              {isSetupStep ? (
                <div className="mt-5 grid gap-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="flex flex-col gap-1.5 text-xs font-bold uppercase tracking-[0.14em] text-white/55">
                      Comic / series title
                      <input
                        type="text"
                        value={setupForm.seriesTitle}
                        onChange={(event) => updateSetupField('seriesTitle', event.target.value)}
                        placeholder="e.g. The Astral City"
                        className="rounded-lg border border-white/15 bg-black/35 px-3 py-2.5 text-sm font-medium normal-case tracking-normal text-white outline-none placeholder:text-white/30 focus:border-amber-300/70"
                      />
                    </label>
                    <label className="flex flex-col gap-1.5 text-xs font-bold uppercase tracking-[0.14em] text-white/55">
                      Issue title
                      <input
                        type="text"
                        value={setupForm.issueTitle}
                        onChange={(event) => updateSetupField('issueTitle', event.target.value)}
                        placeholder="e.g. Gate of the First Sun"
                        className="rounded-lg border border-white/15 bg-black/35 px-3 py-2.5 text-sm font-medium normal-case tracking-normal text-white outline-none placeholder:text-white/30 focus:border-amber-300/70"
                      />
                    </label>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <label className="flex flex-col gap-1.5 text-xs font-bold uppercase tracking-[0.14em] text-white/55">
                      Issue number
                      <input
                        type="number"
                        min="1"
                        value={setupForm.issueNumber}
                        onChange={(event) => updateSetupField('issueNumber', event.target.value)}
                        className="rounded-lg border border-white/15 bg-black/35 px-3 py-2.5 text-sm font-medium normal-case tracking-normal text-white outline-none focus:border-amber-300/70"
                      />
                    </label>
                    <label className="flex flex-col gap-1.5 text-xs font-bold uppercase tracking-[0.14em] text-white/55">
                      Target page count
                      <input
                        type="number"
                        min="1"
                        value={setupForm.targetPageCount}
                        onChange={(event) => updateSetupField('targetPageCount', event.target.value)}
                        className="rounded-lg border border-white/15 bg-black/35 px-3 py-2.5 text-sm font-medium normal-case tracking-normal text-white outline-none focus:border-amber-300/70"
                      />
                    </label>
                    <label className="flex flex-col gap-1.5 text-xs font-bold uppercase tracking-[0.14em] text-white/55">
                      Genre
                      <select
                        value={setupForm.genre}
                        onChange={(event) => updateSetupField('genre', event.target.value)}
                        className="rounded-lg border border-white/15 bg-black/35 px-3 py-2.5 text-sm font-medium normal-case tracking-normal text-white outline-none focus:border-amber-300/70"
                      >
                        {GENRE_OPTIONS.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="flex flex-col gap-1.5 text-xs font-bold uppercase tracking-[0.14em] text-white/55">
                      Tone
                      <select
                        value={setupForm.tone}
                        onChange={(event) => updateSetupField('tone', event.target.value)}
                        className="rounded-lg border border-white/15 bg-black/35 px-3 py-2.5 text-sm font-medium normal-case tracking-normal text-white outline-none focus:border-amber-300/70"
                      >
                        {TONE_OPTIONS.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>

                  <label className="flex flex-col gap-1.5 text-xs font-bold uppercase tracking-[0.14em] text-white/55">
                    Short idea / premise
                    <textarea
                      value={setupForm.premise}
                      onChange={(event) => updateSetupField('premise', event.target.value)}
                      rows={5}
                      placeholder="Describe the central conflict, main character, setting, or the image you want the comic to leave in the reader’s mind."
                      className="min-h-[8rem] resize-y rounded-lg border border-white/15 bg-black/35 px-3 py-2.5 text-sm font-medium normal-case leading-relaxed tracking-normal text-white outline-none placeholder:text-white/30 focus:border-amber-300/70"
                    />
                  </label>

                  <section className="rounded-xl border border-white/10 bg-black/25 p-4">
                    <div className="flex flex-col gap-1">
                      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/45">
                        Art Direction
                      </p>
                      <p className="text-xs leading-relaxed text-white/55">
                        Reusable visual defaults for panel Imageshop handoffs.
                      </p>
                    </div>
                    <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                      <label className="flex flex-col gap-1.5 text-xs font-bold uppercase tracking-[0.14em] text-white/55">
                        Art style
                        <input
                          type="text"
                          value={artDirection.artStyle}
                          onChange={(event) => updateArtDirectionField('artStyle', event.target.value)}
                          placeholder="e.g. clean modern superhero comic"
                          className="rounded-lg border border-white/15 bg-black/35 px-3 py-2.5 text-sm font-medium normal-case tracking-normal text-white outline-none placeholder:text-white/30 focus:border-amber-300/70"
                        />
                      </label>
                      <label className="flex flex-col gap-1.5 text-xs font-bold uppercase tracking-[0.14em] text-white/55">
                        Default aspect ratio
                        <select
                          value={artDirection.defaultAspectRatio}
                          onChange={(event) => updateArtDirectionField('defaultAspectRatio', event.target.value)}
                          className="rounded-lg border border-white/15 bg-black/35 px-3 py-2.5 text-sm font-medium normal-case tracking-normal text-white outline-none focus:border-amber-300/70"
                        >
                          {ASPECT_RATIO_OPTIONS.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="flex flex-col gap-1.5 text-xs font-bold uppercase tracking-[0.14em] text-white/55">
                        Rendering style
                        <input
                          type="text"
                          value={artDirection.renderingStyle}
                          onChange={(event) => updateArtDirectionField('renderingStyle', event.target.value)}
                          placeholder="e.g. inked linework with painterly color"
                          className="rounded-lg border border-white/15 bg-black/35 px-3 py-2.5 text-sm font-medium normal-case tracking-normal text-white outline-none placeholder:text-white/30 focus:border-amber-300/70"
                        />
                      </label>
                      <label className="flex flex-col gap-1.5 text-xs font-bold uppercase tracking-[0.14em] text-white/55">
                        Color mood
                        <input
                          type="text"
                          value={artDirection.colorMood}
                          onChange={(event) => updateArtDirectionField('colorMood', event.target.value)}
                          placeholder="e.g. saturated neon blues and warm golds"
                          className="rounded-lg border border-white/15 bg-black/35 px-3 py-2.5 text-sm font-medium normal-case tracking-normal text-white outline-none placeholder:text-white/30 focus:border-amber-300/70"
                        />
                      </label>
                      <label className="flex flex-col gap-1.5 text-xs font-bold uppercase tracking-[0.14em] text-white/55">
                        Lighting
                        <input
                          type="text"
                          value={artDirection.lighting}
                          onChange={(event) => updateArtDirectionField('lighting', event.target.value)}
                          placeholder="e.g. cinematic rim light, soft volumetric glow"
                          className="rounded-lg border border-white/15 bg-black/35 px-3 py-2.5 text-sm font-medium normal-case tracking-normal text-white outline-none placeholder:text-white/30 focus:border-amber-300/70"
                        />
                      </label>
                      <label className="flex items-start gap-3 rounded-lg border border-white/10 bg-white/[0.05] p-3 text-sm font-bold normal-case tracking-normal text-white/75">
                        <input
                          type="checkbox"
                          checked={artDirection.excludeTextFromImages}
                          onChange={(event) => updateArtDirectionField('excludeTextFromImages', event.target.checked)}
                          className="mt-1 h-4 w-4 accent-amber-300"
                        />
                        <span>Keep text, speech bubbles, and captions out of generated images</span>
                      </label>
                    </div>
                    <label className="mt-4 flex flex-col gap-1.5 text-xs font-bold uppercase tracking-[0.14em] text-white/55">
                      Continuity notes
                      <textarea
                        value={artDirection.continuityNotes}
                        onChange={(event) => updateArtDirectionField('continuityNotes', event.target.value)}
                        rows={4}
                        placeholder="Costumes, recurring props, camera rules, character consistency, or visual motifs to preserve across panels."
                        className="min-h-[6.5rem] resize-y rounded-lg border border-white/15 bg-black/35 px-3 py-2.5 text-sm font-medium normal-case leading-relaxed tracking-normal text-white outline-none placeholder:text-white/30 focus:border-amber-300/70"
                      />
                    </label>
                  </section>

                  <div className="grid gap-3 md:grid-cols-3">
                    <div className="rounded-lg border border-white/10 bg-white/[0.06] p-4">
                      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/45">Local only</p>
                      <p className="mt-2 text-xs leading-relaxed text-white/65">
                        Values stay in this browser and restore when you return to Comic Creator.
                      </p>
                    </div>
                    <div className="rounded-lg border border-white/10 bg-white/[0.06] p-4">
                      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/45">Story seed</p>
                      <p className="mt-2 text-xs leading-relaxed text-white/65">
                        The next pass can use this brief to shape outline and page planning tools.
                      </p>
                    </div>
                    <div className="rounded-lg border border-white/10 bg-white/[0.06] p-4">
                      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/45">Local draft</p>
                      <p className="mt-2 text-xs leading-relaxed text-white/65">
                        This saves to this browser only. It does not call AI or Supabase.
                      </p>
                    </div>
                  </div>
                </div>
              ) : isStoryStep ? (
                <div className="mt-5 grid gap-4">
                  <label className="flex flex-col gap-1.5 text-xs font-bold uppercase tracking-[0.14em] text-white/55">
                    Premise
                    <textarea
                      value={storyForm.premise}
                      onChange={(event) => updateStoryField('premise', event.target.value)}
                      rows={4}
                      placeholder="The short story idea that anchors this issue."
                      className="min-h-[7rem] resize-y rounded-lg border border-white/15 bg-black/35 px-3 py-2.5 text-sm font-medium normal-case leading-relaxed tracking-normal text-white outline-none placeholder:text-white/30 focus:border-amber-300/70"
                    />
                  </label>

                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="flex flex-col gap-1.5 text-xs font-bold uppercase tracking-[0.14em] text-white/55">
                      Main characters
                      <textarea
                        value={storyForm.mainCharacters}
                        onChange={(event) => updateStoryField('mainCharacters', event.target.value)}
                        rows={4}
                        placeholder="One per line or comma-separated: hero, rival, mentor..."
                        className="min-h-[7rem] resize-y rounded-lg border border-white/15 bg-black/35 px-3 py-2.5 text-sm font-medium normal-case leading-relaxed tracking-normal text-white outline-none placeholder:text-white/30 focus:border-amber-300/70"
                      />
                    </label>
                    <label className="flex flex-col gap-1.5 text-xs font-bold uppercase tracking-[0.14em] text-white/55">
                      Conflict
                      <textarea
                        value={storyForm.conflict}
                        onChange={(event) => updateStoryField('conflict', event.target.value)}
                        rows={4}
                        placeholder="What pressure, opponent, mystery, or impossible choice drives the issue?"
                        className="min-h-[7rem] resize-y rounded-lg border border-white/15 bg-black/35 px-3 py-2.5 text-sm font-medium normal-case leading-relaxed tracking-normal text-white outline-none placeholder:text-white/30 focus:border-amber-300/70"
                      />
                    </label>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="flex flex-col gap-1.5 text-xs font-bold uppercase tracking-[0.14em] text-white/55">
                      Setting
                      <textarea
                        value={storyForm.setting}
                        onChange={(event) => updateStoryField('setting', event.target.value)}
                        rows={4}
                        placeholder="Places, worlds, rooms, cities, or key visual environments."
                        className="min-h-[7rem] resize-y rounded-lg border border-white/15 bg-black/35 px-3 py-2.5 text-sm font-medium normal-case leading-relaxed tracking-normal text-white outline-none placeholder:text-white/30 focus:border-amber-300/70"
                      />
                    </label>
                    <label className="flex flex-col gap-1.5 text-xs font-bold uppercase tracking-[0.14em] text-white/55">
                      Ending goal
                      <textarea
                        value={storyForm.endingGoal}
                        onChange={(event) => updateStoryField('endingGoal', event.target.value)}
                        rows={4}
                        placeholder="What should change by the final page? Victory, loss, reveal, cliffhanger..."
                        className="min-h-[7rem] resize-y rounded-lg border border-white/15 bg-black/35 px-3 py-2.5 text-sm font-medium normal-case leading-relaxed tracking-normal text-white outline-none placeholder:text-white/30 focus:border-amber-300/70"
                      />
                    </label>
                  </div>
                </div>
              ) : isPagesStep ? (
                <div className="mt-5 grid gap-4">
                  {pageCards.map((page) => {
                    const status = page.summary.trim() ? 'Draft' : 'Needs summary';
                    const existingPanelBeats = getGuidedComicExistingPanelBeats(page);
                    return (
                      <article
                        key={page.pageNumber}
                        data-guided-page-number={page.pageNumber}
                        ref={(node) => {
                          pageSectionRefs.current[page.pageNumber] = node;
                        }}
                        className="rounded-xl border border-white/10 bg-white/[0.06] p-4"
                      >
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                          <div className="min-w-0">
                            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/45">
                              Page {page.pageNumber}
                            </p>
                            <h3 className="mt-1 text-lg font-black text-white">Page {page.pageNumber}</h3>
                            <p className="mt-1 text-xs font-semibold text-white/42">
                              {existingPanelBeats.length} panel{existingPanelBeats.length === 1 ? '' : 's'} shown
                            </p>
                          </div>
                          <div className="flex shrink-0 items-center gap-2">
                            <span
                              className="rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em]"
                              style={{
                                borderColor: page.summary.trim() ? `${ACCENT_GOLD_SOLID}88` : 'rgba(255,255,255,0.16)',
                                color: page.summary.trim() ? ACCENT_GOLD_LIGHT : 'rgba(255,255,255,0.68)',
                              }}
                            >
                              {status}
                            </span>
                            <button
                              type="button"
                              onClick={() => updatePageCard(page.pageNumber, { expanded: !page.expanded })}
                              className="rounded-lg border border-white/15 bg-black/25 px-3 py-2 text-xs font-bold text-white/80 transition hover:bg-white/10"
                              aria-expanded={page.expanded}
                            >
                              {page.expanded ? 'Hide panels' : 'Show panels'}
                            </button>
                          </div>
                        </div>

                        <label className="mt-3 flex flex-col gap-1.5 text-xs font-bold uppercase tracking-[0.14em] text-white/55">
                          Page summary
                          <textarea
                            value={page.summary}
                            onChange={(event) => updatePageCard(page.pageNumber, { summary: event.target.value })}
                            rows={3}
                            placeholder="What happens on this page?"
                            className="min-h-[6rem] resize-y rounded-lg border border-white/15 bg-black/35 px-3 py-2.5 text-sm font-medium normal-case leading-relaxed tracking-normal text-white outline-none placeholder:text-white/30 focus:border-amber-300/70"
                          />
                        </label>

                        <div className="mt-3 grid gap-3 md:grid-cols-[160px_minmax(0,1fr)_minmax(0,1fr)]">
                          <label className="flex flex-col gap-1.5 text-xs font-bold uppercase tracking-[0.14em] text-white/55">
                            Panel count
                            <select
                              value={page.panelCount}
                              onChange={(event) => updatePageCard(page.pageNumber, { panelCount: event.target.value })}
                              className="rounded-lg border border-white/15 bg-black/35 px-3 py-2.5 text-sm font-medium normal-case tracking-normal text-white outline-none focus:border-amber-300/70"
                            >
                              {[1, 2, 3, 4, 5, 6, 7, 8].map((count) => (
                                <option key={count} value={String(count)}>
                                  {count}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label className="flex flex-col gap-1.5 text-xs font-bold uppercase tracking-[0.14em] text-white/55">
                            Key characters
                            <input
                              type="text"
                              value={page.keyCharacters}
                              onChange={(event) => updatePageCard(page.pageNumber, { keyCharacters: event.target.value })}
                              placeholder="e.g. Flux, Aries"
                              className="rounded-lg border border-white/15 bg-black/35 px-3 py-2.5 text-sm font-medium normal-case tracking-normal text-white outline-none placeholder:text-white/30 focus:border-amber-300/70"
                            />
                          </label>
                          <label className="flex flex-col gap-1.5 text-xs font-bold uppercase tracking-[0.14em] text-white/55">
                            Key location
                            <input
                              type="text"
                              value={page.keyLocation}
                              onChange={(event) => updatePageCard(page.pageNumber, { keyLocation: event.target.value })}
                              placeholder="e.g. Observatory roof"
                              className="rounded-lg border border-white/15 bg-black/35 px-3 py-2.5 text-sm font-medium normal-case tracking-normal text-white outline-none placeholder:text-white/30 focus:border-amber-300/70"
                            />
                          </label>
                        </div>

                        {page.expanded ? (
                          <div className="mt-4 rounded-xl border border-white/10 bg-black/20 p-3">
                            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/45">
                              Placeholder panel beats
                            </p>
                            <div className="mt-3 grid gap-3">
                              {existingPanelBeats.map((panelBeat, panelIndex) => (
                                <label
                                  key={`${page.pageNumber}-${panelIndex}`}
                                  className="flex flex-col gap-1.5 text-xs font-bold uppercase tracking-[0.14em] text-white/55"
                                >
                                  Panel {panelIndex + 1}
                                  <textarea
                                    value={panelBeat}
                                    onChange={(event) =>
                                      updatePagePanelBeat(page.pageNumber, panelIndex, event.target.value)
                                    }
                                    rows={3}
                                    className="min-h-[7rem] resize-y rounded-lg border border-white/15 bg-black/35 px-3 py-2.5 text-sm font-medium normal-case leading-relaxed tracking-normal text-white outline-none focus:border-amber-300/70"
                                  />
                                </label>
                              ))}
                            </div>
                          </div>
                        ) : null}
                      </article>
                    );
                  })}
                </div>
              ) : isVisualPrepStep ? (
                <div className="mt-5 grid gap-3">
                  <div className="min-w-0 rounded-xl border border-amber-300/25 bg-amber-300/10 p-4 text-sm leading-relaxed text-amber-50">
                    Image Vault selection is wired for character, location, asset, and NPC rows. Opening Imageshop
                    sends every saved guided reference into the handoff.
                  </div>
                  <section className="rounded-xl border border-white/10 bg-white/[0.06] p-4">
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/45">
                          Characters
                        </p>
                        <h3 className="mt-1 text-lg font-black text-white">Character references</h3>
                      </div>
                      <p className="text-xs text-white/50">{pageCharacters.length} found from page cards</p>
                    </div>
                    <div className="mt-4 grid gap-2">
                      {pageCharacters.length > 0 ? (
                        pageCharacters.map((character) => {
                          const references = characterReferences[character] ?? [];
                          const ready = references.length > 0;
                          const displayName = displayTitleCase(character);
                          return (
                            <div
                              key={character}
                              className="grid gap-3 rounded-xl border border-white/10 bg-black/25 p-3 lg:grid-cols-[minmax(120px,150px)_minmax(0,1fr)_minmax(150px,190px)] lg:items-start"
                            >
                              <div className="min-w-0">
                                <p className="truncate text-sm font-bold text-white">{displayName}</p>
                                <span
                                  className="mt-2 inline-flex rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em]"
                                  style={{
                                    borderColor: ready ? `${ACCENT_GOLD_SOLID}88` : 'rgba(255,255,255,0.16)',
                                    color: ready ? ACCENT_GOLD_LIGHT : 'rgba(255,255,255,0.62)',
                                  }}
                                >
                                  {ready ? 'Ready' : 'Missing reference'}
                                </span>
                                <p className="mt-2 text-[11px] text-white/40">
                                  {references.length} selected
                                </p>
                              </div>
                              <ReferenceThumbnailStrip
                                references={references}
                                emptyLabel="Add one or more character references."
                                onRemove={(referenceIndex) => removeCharacterReference(character, referenceIndex)}
                              />
                              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
                                <button
                                  type="button"
                                  onClick={() => requestCharacterVaultReference(character)}
                                  className="rounded-lg border px-3 py-2 text-xs font-black transition hover:scale-[1.01] active:scale-[0.99]"
                                  style={{ borderColor: `${ACCENT_GOLD_SOLID}88`, background: ACCENT_GOLD_GRADIENT, color: TEXT_ON_GOLD }}
                                >
                                  Add reference
                                </button>
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <p className="rounded-lg border border-white/10 bg-black/25 p-3 text-sm text-white/50">
                          Add key characters on page cards to build this reference list.
                        </p>
                      )}
                    </div>
                  </section>

                  <section className="rounded-xl border border-white/10 bg-white/[0.06] p-4">
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/45">
                          Locations & Assets
                        </p>
                        <h3 className="mt-1 text-lg font-black text-white">Environment and asset references</h3>
                      </div>
                      <p className="text-xs text-white/50">{pageLocations.length} found from page cards</p>
                    </div>
                    <div className="mt-4 grid gap-2">
                      {pageLocations.length > 0 ? (
                        pageLocations.map((location) => {
                          const references = locationReferences[location] ?? [];
                          const ready = references.length > 0;
                          const displayName = displayTitleCase(location);
                          return (
                            <div
                              key={location}
                              className="grid gap-3 rounded-xl border border-white/10 bg-black/25 p-3 lg:grid-cols-[minmax(120px,150px)_minmax(0,1fr)_minmax(150px,190px)] lg:items-start"
                            >
                              <div className="min-w-0">
                                <p className="truncate text-sm font-bold text-white">{displayName}</p>
                                <span
                                  className="mt-2 inline-flex rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em]"
                                  style={{
                                    borderColor: ready ? `${ACCENT_GOLD_SOLID}88` : 'rgba(255,255,255,0.16)',
                                    color: ready ? ACCENT_GOLD_LIGHT : 'rgba(255,255,255,0.62)',
                                  }}
                                >
                                  {ready ? 'Ready' : 'Missing reference'}
                                </span>
                                <p className="mt-2 text-[11px] text-white/40">
                                  {references.length} selected
                                </p>
                              </div>
                              <ReferenceThumbnailStrip
                                references={references}
                                emptyLabel="Add one or more location or asset references."
                                onRemove={(referenceIndex) => removeLocationReference(location, referenceIndex)}
                              />
                              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
                                <button
                                  type="button"
                                  onClick={() => requestLocationVaultReference(location)}
                                  className="rounded-lg border px-3 py-2 text-xs font-black transition hover:scale-[1.01] active:scale-[0.99]"
                                  style={{ borderColor: `${ACCENT_GOLD_SOLID}88`, background: ACCENT_GOLD_GRADIENT, color: TEXT_ON_GOLD }}
                                >
                                  Add reference
                                </button>
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <p className="rounded-lg border border-white/10 bg-black/25 p-3 text-sm text-white/50">
                          Add key locations on page cards to build this reference list.
                        </p>
                      )}
                    </div>
                  </section>

                  <section className="rounded-xl border border-white/10 bg-white/[0.06] p-4">
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/45">
                      Supporting References
                    </p>
                    <h3 className="mt-1 text-lg font-black text-white">Extra continuity support</h3>
                    <div className="mt-4 grid gap-3">
                      <div className="grid gap-2 rounded-xl border border-white/10 bg-black/25 p-3 lg:grid-cols-[minmax(160px,220px)_minmax(0,1fr)_minmax(150px,190px)] lg:items-end">
                        <label className="grid min-w-0 gap-1">
                          <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/42">
                            NPC label
                          </span>
                          <input
                            type="text"
                            value={npcReferenceName}
                            onChange={(event) => setNpcReferenceName(event.target.value)}
                            placeholder="Alley witness"
                            className="rounded-lg border border-white/15 bg-black/35 px-3 py-2 text-sm font-medium normal-case tracking-normal text-white outline-none placeholder:text-white/28 focus:border-amber-300/70"
                          />
                        </label>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-white">
                            {npcReferenceName.trim() || 'NPC reference'}
                          </p>
                          <p className="mt-1 text-xs text-white/45">
                            Pick one-off characters, cameo refs, or NPC turnarounds from NPC Vault.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={requestNpcVaultReference}
                          className="rounded-lg border px-3 py-2 text-xs font-black transition hover:scale-[1.01] active:scale-[0.99]"
                          style={{ borderColor: `${ACCENT_GOLD_SOLID}88`, background: ACCENT_GOLD_GRADIENT, color: TEXT_ON_GOLD }}
                        >
                          Add NPC reference
                        </button>
                      </div>
                      {npcReferenceNames.length > 0 ? (
                        <div className="grid gap-2">
                          {npcReferenceNames.map((npcName) => {
                            const references = npcReferences[npcName] ?? [];
                            const ready = references.length > 0;
                            return (
                              <div
                                key={npcName}
                                className="grid gap-3 rounded-xl border border-white/10 bg-black/25 p-3 lg:grid-cols-[minmax(120px,150px)_minmax(0,1fr)_minmax(150px,190px)] lg:items-start"
                              >
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-bold text-white">
                                    {displayTitleCase(npcName)}
                                  </p>
                                  <span
                                    className="mt-2 inline-flex rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em]"
                                    style={{
                                      borderColor: ready ? `${ACCENT_GOLD_SOLID}88` : 'rgba(255,255,255,0.16)',
                                      color: ready ? ACCENT_GOLD_LIGHT : 'rgba(255,255,255,0.62)',
                                    }}
                                  >
                                    {ready ? 'Ready' : 'Missing reference'}
                                  </span>
                                  <p className="mt-2 text-[11px] text-white/40">
                                    {references.length} selected
                                  </p>
                                </div>
                                <ReferenceThumbnailStrip
                                  references={references}
                                  emptyLabel="Add one or more NPC references."
                                  onRemove={(referenceIndex) => removeNpcReference(npcName, referenceIndex)}
                                />
                                <button
                                  type="button"
                                  onClick={() => requestVaultSelection({ type: 'npc', name: npcName })}
                                  className="rounded-lg border px-3 py-2 text-xs font-black transition hover:scale-[1.01] active:scale-[0.99]"
                                  style={{ borderColor: `${ACCENT_GOLD_SOLID}88`, background: ACCENT_GOLD_GRADIENT, color: TEXT_ON_GOLD }}
                                >
                                  Add another
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      ) : null}
                    </div>
                    <div className="mt-4 grid gap-2 sm:grid-cols-2">
                      <button
                        type="button"
                        disabled
                        className="rounded-lg border border-white/15 bg-white/5 px-3 py-2.5 text-xs font-bold text-white/35 disabled:cursor-not-allowed"
                      >
                        Add style/mood reference (not connected yet)
                      </button>
                    </div>
                  </section>

                  <div className="rounded-xl border border-amber-300/25 bg-amber-300/10 p-4 text-sm font-bold text-amber-50">
                    {pageCharacters.length} characters, {pageLocations.length} locations, and {npcReferenceNames.length} NPC rows found.{' '}
                    {readyVisualReferences} ready. {missingVisualReferences} need references before generating art.
                  </div>
                </div>
              ) : isArtStep ? (
                <div className="mt-5 grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
                  <div className="rounded-xl border border-amber-300/25 bg-amber-300/10 p-4 text-sm leading-relaxed text-amber-50 xl:col-span-2">
                    Assign finished art directly from Image Vault, upload or paste a local image, or generate a new
                    version in Imageshop. Assigned images are saved in this guided draft and appear in Layout.
                  </div>
                  <section className="rounded-xl border border-white/10 bg-white/[0.06] p-4">
                    <div className="flex items-end justify-between gap-3">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/45">
                          Panel Art Queue
                        </p>
                        <h3 className="mt-1 text-lg font-black text-white">Pages and panels</h3>
                      </div>
                      <span className="text-xs text-white/50">{panelArtQueue.length} panels</span>
                    </div>
                    <div className="mt-4 max-h-[34rem] space-y-2 overflow-y-auto pr-1 custom-scrollbar">
                      {panelArtQueue.length > 0 ? (
                        panelArtQueue.map((panel) => {
                          const selected = selectedPanel?.id === panel.id;
                          const status = panelArtStatuses[panel.id] ?? 'needs-art';
                          return (
                            <button
                              key={panel.id}
                              type="button"
                              onClick={() => setSelectedPanelId(panel.id)}
                              className="w-full rounded-lg border p-3 text-left transition hover:bg-white/10"
                              style={{
                                background: selected ? 'rgba(252,246,186,0.12)' : 'rgba(0,0,0,0.22)',
                                borderColor: selected ? `${ACCENT_GOLD_SOLID}88` : 'rgba(255,255,255,0.12)',
                              }}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/45">
                                    Page {panel.pageNumber} / Panel {panel.panelNumber}
                                  </p>
                                  <p className="mt-1 line-clamp-2 text-sm font-semibold leading-snug text-white/85">
                                    {panel.beatText || 'Untitled panel beat'}
                                  </p>
                                </div>
                                <span
                                  className="shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em]"
                                  style={{
                                    borderColor:
                                      status === 'approved'
                                        ? 'rgba(134,239,172,0.45)'
                                        : status === 'ready'
                                          ? `${ACCENT_GOLD_SOLID}88`
                                          : 'rgba(255,255,255,0.16)',
                                    color:
                                      status === 'approved'
                                        ? 'rgb(187,247,208)'
                                        : status === 'ready'
                                          ? ACCENT_GOLD_LIGHT
                                          : 'rgba(255,255,255,0.62)',
                                  }}
                                >
                                  {panelArtStatusLabel(status)}
                                </span>
                              </div>
                            </button>
                          );
                        })
                      ) : (
                        <p className="rounded-lg border border-white/10 bg-black/25 p-3 text-sm text-white/50">
                          Build page cards first to create a panel art queue.
                        </p>
                      )}
                    </div>
                  </section>

                  <section className="rounded-xl border border-white/10 bg-white/[0.06] p-4">
                    {selectedPanel ? (
                      <>
                        <input
                          ref={panelUploadInputRef}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handlePanelArtUpload}
                        />
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/45">
                              Selected Panel
                            </p>
                            <h3 className="mt-1 text-2xl font-black text-white">
                              Page {selectedPanel.pageNumber}, Panel {selectedPanel.panelNumber}
                            </h3>
                          </div>
                          <span
                            className="inline-flex rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em]"
                            style={{
                              borderColor:
                                selectedPanelStatus === 'approved'
                                  ? 'rgba(134,239,172,0.45)'
                                  : selectedPanelStatus === 'ready'
                                    ? `${ACCENT_GOLD_SOLID}88`
                                    : 'rgba(255,255,255,0.16)',
                              color:
                                selectedPanelStatus === 'approved'
                                  ? 'rgb(187,247,208)'
                                  : selectedPanelStatus === 'ready'
                                    ? ACCENT_GOLD_LIGHT
                                    : 'rgba(255,255,255,0.62)',
                            }}
                          >
                            {panelArtStatusLabel(selectedPanelStatus)}
                          </span>
                        </div>

                        {selectedPanelArtImage ? (
                          <div className="mt-5 rounded-xl border border-emerald-300/20 bg-emerald-300/10 p-4">
                            <div className="flex items-center justify-between gap-3">
                              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-100/70">
                                {panelArtSourceLabel(selectedPanelArtImage.source)}
                              </p>
                              <span className="rounded-full border border-emerald-300/30 bg-emerald-300/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-emerald-100">
                                Ready
                              </span>
                            </div>
                            <div className="mt-3 overflow-hidden rounded-lg border border-white/10 bg-black/35">
                              <img
                                src={selectedPanelArtImage.imageUrl}
                                alt={`Assigned art for page ${selectedPanel.pageNumber}, panel ${selectedPanel.panelNumber}`}
                                className="max-h-[28rem] w-full object-contain"
                              />
                            </div>
                            {selectedPanelArtImage.sourceLabel ? (
                              <p className="mt-2 text-xs text-emerald-50/65">
                                Source: {selectedPanelArtImage.sourceLabel}
                              </p>
                            ) : null}
                            <div className="mt-3 grid gap-2 sm:grid-cols-3">
                              <button
                                type="button"
                                onClick={() => deletePanelArtImage(selectedPanel.id)}
                                className="inline-flex items-center justify-center gap-2 rounded-lg border border-red-300/25 bg-red-500/10 px-3 py-2 text-xs font-bold text-red-100 transition hover:bg-red-500/15"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                Delete
                              </button>
                              <button
                                type="button"
                                onClick={openImageshopWithSelectedPanel}
                                className="inline-flex items-center justify-center gap-2 rounded-lg border border-amber-300/30 bg-amber-300/10 px-3 py-2 text-xs font-bold text-amber-100 transition hover:bg-amber-300/15"
                              >
                                <RefreshCw className="h-3.5 w-3.5" />
                                Replace in Imageshop
                              </button>
                              <a
                                href={selectedPanelArtImage.imageUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/15 bg-white/10 px-3 py-2 text-xs font-bold text-white/80 transition hover:bg-white/15"
                              >
                                <ZoomIn className="h-3.5 w-3.5" />
                                View full image
                              </a>
                            </div>
                          </div>
                        ) : null}

                        <div className="mt-5 min-h-[16rem] rounded-xl border border-dashed border-white/20 bg-black/25 p-5">
                          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/45">
                            Panel beat
                          </p>
                          <p className="mt-3 text-lg font-semibold leading-relaxed text-white/85">
                            {selectedPanel.beatText || 'Add a panel beat on the Pages step.'}
                          </p>
                        </div>

                        <div
                          ref={panelPasteTargetRef}
                          tabIndex={0}
                          onPaste={handlePanelArtPaste}
                          className="mt-4 rounded-xl border border-white/10 bg-white/[0.04] p-4 outline-none focus:border-amber-300/55 focus:bg-amber-300/10"
                        >
                          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/45">
                            Panel image source
                          </p>
                          <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                            <button
                              type="button"
                              onClick={openImageshopWithSelectedPanel}
                              className="inline-flex items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-xs font-black transition hover:scale-[1.01] active:scale-[0.99]"
                              style={{ borderColor: `${ACCENT_GOLD_SOLID}88`, background: ACCENT_GOLD_GRADIENT, color: TEXT_ON_GOLD }}
                            >
                              <ImagePlus className="h-3.5 w-3.5" />
                              Generate in Imageshop
                            </button>
                            <button
                              type="button"
                              onClick={requestPanelArtVaultImage}
                              className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/15 bg-white/10 px-3 py-2.5 text-xs font-bold text-white/80 transition hover:bg-white/15"
                            >
                              <BookOpenText className="h-3.5 w-3.5" />
                              Use from Image Vault
                            </button>
                            <button
                              type="button"
                              onClick={() => panelUploadInputRef.current?.click()}
                              className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/15 bg-white/10 px-3 py-2.5 text-xs font-bold text-white/80 transition hover:bg-white/15"
                            >
                              <Upload className="h-3.5 w-3.5" />
                              Upload image
                            </button>
                            <button
                              type="button"
                              onClick={focusPanelPasteTarget}
                              className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/15 bg-white/10 px-3 py-2.5 text-xs font-bold text-white/80 transition hover:bg-white/15"
                            >
                              <Clipboard className="h-3.5 w-3.5" />
                              Paste image
                            </button>
                          </div>
                          {panelPasteMessage ? (
                            <p className="mt-2 text-xs text-amber-50/70">{panelPasteMessage}</p>
                          ) : (
                            <p className="mt-2 text-xs text-white/45">
                              Paste uses the image file you place on the clipboard while this panel source box is focused.
                            </p>
                          )}
                        </div>

                        <div className="mt-4 grid gap-3 md:grid-cols-2">
                          <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/45">
                              Characters used
                            </p>
                            {selectedPanel.characters.length > 0 ? (
                              <div className="mt-2 flex flex-wrap gap-1.5">
                                {selectedPanel.characters.map((character) => (
                                  <span
                                    key={character}
                                    className="rounded-full border border-amber-300/25 bg-amber-300/10 px-2 py-1 text-[11px] text-amber-100"
                                  >
                                    {character}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <p className="mt-2 text-xs leading-relaxed text-white/45">
                                No page characters listed.
                              </p>
                            )}
                          </div>
                          <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/45">
                              Location used
                            </p>
                            {selectedPanel.location ? (
                              <div className="mt-2">
                                <span className="rounded-full border border-sky-300/25 bg-sky-300/10 px-2 py-1 text-[11px] text-sky-100">
                                  {selectedPanel.location}
                                </span>
                              </div>
                            ) : (
                              <p className="mt-2 text-xs leading-relaxed text-white/45">
                                No page location listed.
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="mt-5 grid gap-2 sm:grid-cols-3">
                          <button
                            type="button"
                            onClick={() => updatePanelArtStatus(selectedPanel.id, 'ready')}
                            className="rounded-lg border border-white/15 bg-white/10 px-3 py-2.5 text-xs font-bold text-white/80 transition hover:bg-white/15"
                          >
                            Mark ready (status only)
                          </button>
                          <button
                            type="button"
                            onClick={() => updatePanelArtStatus(selectedPanel.id, 'approved')}
                            className="rounded-lg border border-white/15 bg-white/10 px-3 py-2.5 text-xs font-bold text-white/80 transition hover:bg-white/15"
                          >
                            Approve panel (status only)
                          </button>
                          <button
                            type="button"
                            onClick={() => updatePanelArtStatus(selectedPanel.id, 'needs-art')}
                            className="rounded-lg border border-white/15 bg-white/10 px-3 py-2.5 text-xs font-bold text-white/80 transition hover:bg-white/15"
                          >
                            Needs revision (status only)
                          </button>
                        </div>
                      </>
                    ) : (
                      <p className="rounded-lg border border-white/10 bg-black/25 p-3 text-sm text-white/50">
                        Build page cards first to preview panel art needs.
                      </p>
                    )}
                  </section>
                </div>
              ) : isLayoutStep ? (
                <div className="mt-5 grid gap-4">
                  {pageCards.length > 0 ? (
                    pageCards.map((page) => {
                      const templateId = pageLayoutTemplates[page.pageNumber] ?? 'auto';
                      const layoutPanels = getGuidedComicLayoutPanels(page, templateId);
                      const layoutGridStyle = getGuidedComicLayoutGridStyle(templateId, layoutPanels.length);
                      return (
                      <article
                        key={page.pageNumber}
                        data-guided-page-number={page.pageNumber}
                        ref={(node) => {
                          pageSectionRefs.current[page.pageNumber] = node;
                        }}
                        className="rounded-xl border border-white/10 bg-white/[0.06] p-4"
                      >
                        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px] lg:items-start">
                          <div className="min-w-0">
                            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/45">
                              Page {page.pageNumber}
                            </p>
                            <h3 className="mt-1 text-lg font-black text-white">Page {page.pageNumber} layout</h3>
                            <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-white/70">
                              {page.summary.trim() || 'Add a page summary on the Pages step.'}
                            </p>
                          </div>
                          <label className="flex flex-col gap-1.5 text-xs font-bold uppercase tracking-[0.14em] text-white/55">
                            Layout template
                            <select
                              value={templateId}
                              onChange={(event) =>
                                updatePageLayoutTemplate(page.pageNumber, event.target.value as LayoutTemplateId)
                              }
                              className="rounded-lg border border-white/15 bg-black/35 px-3 py-2.5 text-sm font-medium normal-case tracking-normal text-white outline-none focus:border-amber-300/70"
                            >
                              {LAYOUT_TEMPLATE_OPTIONS.map((option) => (
                                <option key={option.id} value={option.id}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          </label>
                        </div>

                        <div className="mt-4 rounded-xl border border-white/10 bg-black/25 p-3">
                          <div className="mb-2 flex items-center justify-between gap-3">
                            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/45">
                              Page layout preview
                            </p>
                            <span className="text-[11px] font-semibold text-white/45">
                              {LAYOUT_TEMPLATE_OPTIONS.find((option) => option.id === templateId)?.label ?? 'Auto layout'}
                            </span>
                          </div>
                          <div className="grid aspect-[2/3] gap-2" style={layoutGridStyle}>
                            {layoutPanels.map((panel) => {
                              const panelNumber = panel.panelNumber;
                              const panelId = panel.panelId ?? panelArtQueueId(page.pageNumber, panelNumber);
                              const panelImage = panelArtImages[panelId];
                              return (
                                <div
                                  key={panelId}
                                  className="relative min-h-0 overflow-hidden rounded-lg border border-white/10 bg-white/[0.05]"
                                  style={{
                                    gridColumn: panel.columnSpan > 1 ? `span ${panel.columnSpan} / span ${panel.columnSpan}` : undefined,
                                    gridRow: panel.rowSpan > 1 ? `span ${panel.rowSpan} / span ${panel.rowSpan}` : undefined,
                                  }}
                                >
                                  {panelImage ? (
                                    <VaultImageWithFallback
                                      src={panelImage.imageUrl}
                                      alt={`Page ${page.pageNumber}, panel ${panelNumber}`}
                                      frameClassName="h-full w-full"
                                      imgClassName="h-full w-full object-cover"
                                    />
                                  ) : (
                                    <div className="flex h-full min-h-[5rem] flex-col justify-between p-2">
                                      <span className="text-[10px] font-black uppercase tracking-[0.14em] text-white/35">
                                        Panel {panelNumber}
                                      </span>
                                      <p className="line-clamp-3 text-[11px] leading-snug text-white/55">
                                        {panel.beatText || 'Panel art placeholder'}
                                      </p>
                                      <span className="text-[9px] font-bold uppercase tracking-[0.12em] text-white/28">
                                        {panel.intent === 'feature'
                                          ? 'Feature beat'
                                          : panel.intent === 'wide'
                                            ? 'Wide beat'
                                            : panel.intent === 'tall'
                                              ? 'Tall beat'
                                              : 'Standard beat'}
                                      </span>
                                    </div>
                                  )}
                                  <span
                                    className={[
                                      'absolute left-2 top-2 rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.12em]',
                                      panelImage
                                        ? 'border-emerald-300/35 bg-emerald-400/20 text-emerald-100'
                                        : 'border-white/15 bg-black/55 text-white/65',
                                    ].join(' ')}
                                  >
                                    {panelImage ? 'Ready' : 'Needs art'}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        <div className="mt-4 grid gap-3 md:grid-cols-2">
                          <div className="rounded-lg border border-white/10 bg-black/20 p-3">
                            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/45">
                              Panel count
                            </p>
                            <p className="mt-1 text-sm font-bold text-white/85">
                              {layoutPanels.length} panel{layoutPanels.length === 1 ? '' : 's'}
                            </p>
                          </div>
                          <div className="rounded-lg border border-white/10 bg-black/20 p-3">
                            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/45">
                              Art status summary
                            </p>
                            <p className="mt-1 text-sm font-bold text-white/85">
                              {pagePanelArtSummary(page, panelArtStatuses)}
                            </p>
                          </div>
                        </div>
                        <div className="mt-4 rounded-lg border border-amber-300/20 bg-amber-300/[0.07] p-3">
                          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-amber-100/70">
                            Page {page.pageNumber} handoff
                          </p>
                          <button
                            type="button"
                            onClick={() => openPageInAdvancedStudio(page)}
                            className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-amber-300/35 bg-amber-300/15 px-4 py-2.5 text-sm font-black text-amber-100 transition hover:border-amber-200/55 hover:bg-amber-300/20 md:w-auto"
                          >
                            <MonitorUp className="h-4 w-4" aria-hidden="true" />
                            {ADVANCED_STUDIO_ACTION_LABELS.sendPage}
                          </button>
                        </div>
                      </article>
                      );
                    })
                  ) : (
                    <p className="rounded-lg border border-white/10 bg-black/25 p-3 text-sm text-white/50">
                      Build page cards first to plan page layouts.
                    </p>
                  )}
                </div>
              ) : isExportStep ? (
                <div className="mt-5 grid gap-4">
                  <section className="rounded-xl border border-white/10 bg-white/[0.06] p-4">
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/45">
                      Comic Project Summary
                    </p>
                    <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                      {[
                        ['Comic / series title', setupForm.seriesTitle.trim() || 'Untitled series'],
                        ['Issue title', setupForm.issueTitle.trim() || 'Untitled issue'],
                        ['Issue number', setupForm.issueNumber.trim() || '1'],
                        ['Target page count', String(targetPageCountFromInput(setupForm.targetPageCount))],
                        ['Genre', setupForm.genre],
                        ['Tone', setupForm.tone],
                      ].map(([label, value]) => (
                        <div key={label} className="rounded-lg border border-white/10 bg-black/20 p-3">
                          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/45">{label}</p>
                          <p className="mt-1 text-sm font-bold text-white/85">{value}</p>
                        </div>
                      ))}
                    </div>
                  </section>

                  <section className="rounded-xl border border-white/10 bg-white/[0.06] p-4">
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/45">
                      Page Readiness Summary
                    </p>
                    <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                      <div className="rounded-lg border border-white/10 bg-black/20 p-3">
                        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/45">Total pages</p>
                        <p className="mt-1 text-2xl font-black text-white">{exportSummary.totalPages}</p>
                      </div>
                      <div className="rounded-lg border border-white/10 bg-black/20 p-3">
                        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/45">
                          Total panel beats
                        </p>
                        <p className="mt-1 text-2xl font-black text-white">{exportSummary.totalPanelBeats}</p>
                      </div>
                      <div className="rounded-lg border border-white/10 bg-black/20 p-3">
                        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/45">
                          Approved art count
                        </p>
                        <p className="mt-1 text-2xl font-black text-white">{exportSummary.approvedArtCount}</p>
                      </div>
                      <div className="rounded-lg border border-white/10 bg-black/20 p-3">
                        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/45">
                          Layouts selected
                        </p>
                        <p className="mt-1 text-2xl font-black text-white">
                          {exportSummary.pagesWithLayoutTemplates}
                        </p>
                      </div>
                    </div>
                  </section>

                  <section className="rounded-xl border border-white/10 bg-white/[0.06] p-4">
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/45">
                      Export Planning
                    </p>
                    <div className="mt-4 grid gap-2 sm:grid-cols-3">
                      <button
                        type="button"
                        disabled
                        className="rounded-lg border border-white/15 bg-white/5 px-3 py-2.5 text-xs font-bold text-white/35"
                      >
                        Export PDF
                      </button>
                      <button
                        type="button"
                        disabled
                        className="rounded-lg border border-white/15 bg-white/5 px-3 py-2.5 text-xs font-bold text-white/35"
                      >
                        Export PNG pages
                      </button>
                    </div>
                  </section>
                </div>
              ) : (
                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  {activeStep.workflowCards.map((card) => (
                    <div key={card.title} className="rounded-lg border border-white/10 bg-white/[0.06] p-4">
                      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/45">{card.title}</p>
                      <p className="mt-2 text-xs leading-relaxed text-white/65">{card.body}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                onClick={goBack}
                disabled={atStart}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-sm font-bold text-white/85 transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" aria-hidden />
                Back
              </button>
              <div className="text-center text-xs font-bold uppercase tracking-[0.18em] text-white/45">
                {activeIndex + 1} of {STEPS.length}
              </div>
              <button
                type="button"
                onClick={goNext}
                disabled={atEnd}
                className="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-black shadow-lg transition hover:scale-[1.01] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-45"
                style={{ background: ACCENT_GOLD_GRADIENT, color: TEXT_ON_GOLD }}
              >
                Next
                <ChevronRight className="h-4 w-4" aria-hidden />
              </button>
            </div>
          </section>

          <aside className="rounded-2xl border border-white/10 bg-black/30 p-5 shadow-xl backdrop-blur-sm">
            {isStoryStep ? (
              <>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: ACCENT_GOLD_LIGHT }}>
                  Story preview
                </p>
                <h3 className="mt-2 text-lg font-black text-white">Live outline seed</h3>
                <div className="mt-4 space-y-3">
                  <div className="rounded-xl border border-white/10 bg-white/[0.06] p-3">
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/45">Working logline</p>
                    <p className="mt-2 text-xs leading-relaxed text-white/75">{workingLogline}</p>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-white/[0.06] p-3">
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/45">Issue summary</p>
                    <p className="mt-2 whitespace-pre-wrap text-xs leading-relaxed text-white/75">{issueSummary}</p>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-white/[0.06] p-3">
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/45">
                      Characters detected / listed
                    </p>
                    {storyCharacters.length > 0 ? (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {storyCharacters.map((character) => (
                          <span
                            key={character}
                            className="rounded-full border border-amber-300/25 bg-amber-300/10 px-2 py-1 text-[11px] text-amber-100"
                          >
                            {character}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-2 text-xs leading-relaxed text-white/45">Add characters to build this list.</p>
                    )}
                  </div>
                  <div className="rounded-xl border border-white/10 bg-white/[0.06] p-3">
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/45">
                      Locations detected / listed
                    </p>
                    {storyLocations.length > 0 ? (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {storyLocations.map((location) => (
                          <span
                            key={location}
                            className="rounded-full border border-sky-300/25 bg-sky-300/10 px-2 py-1 text-[11px] text-sky-100"
                          >
                            {location}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-2 text-xs leading-relaxed text-white/45">Add settings to build this list.</p>
                    )}
                  </div>
                </div>
              </>
            ) : isPagesStep ? (
              <>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: ACCENT_GOLD_LIGHT }}>
                  Quality checklist
                </p>
                <h3 className="mt-2 text-lg font-black text-white">Page plan readiness</h3>
                <div className="mt-4 space-y-2">
                  {outlineQualityItems.map((item) => (
                    <div
                      key={item.label}
                      className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2.5"
                    >
                      <span className="text-sm text-white/70">{item.label}</span>
                      <span
                        className="rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em]"
                        style={{
                          borderColor: item.complete ? `${ACCENT_GOLD_SOLID}88` : 'rgba(255,255,255,0.16)',
                          color: item.complete ? ACCENT_GOLD_LIGHT : 'rgba(255,255,255,0.45)',
                        }}
                      >
                        {item.complete ? 'Ready' : 'Open'}
                      </span>
                    </div>
                  ))}
                </div>
                <p className="mt-4 text-xs leading-relaxed text-white/55">
                  These checks only read local Setup, Story, outline, and page card values. They do not save or generate
                  anything yet.
                </p>
              </>
            ) : isLayoutStep ? (
              <>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: ACCENT_GOLD_LIGHT }}>
                  Layout checklist
                </p>
                <h3 className="mt-2 text-lg font-black text-white">Export readiness</h3>
                <div className="mt-4 space-y-2">
                  {layoutChecklistItems.map((item) => (
                    <div
                      key={item.label}
                      className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2.5"
                    >
                      <span className="text-sm text-white/70">{item.label}</span>
                      <span
                        className="rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em]"
                        style={{
                          borderColor: item.complete ? `${ACCENT_GOLD_SOLID}88` : 'rgba(255,255,255,0.16)',
                          color: item.complete ? ACCENT_GOLD_LIGHT : 'rgba(255,255,255,0.45)',
                        }}
                      >
                        {item.complete ? 'Ready' : 'Open'}
                      </span>
                    </div>
                  ))}
                </div>
                <p className="mt-4 text-xs leading-relaxed text-white/55">
                  This checklist only reads local page cards, panel art statuses, and layout template choices.
                </p>
              </>
            ) : isExportStep ? (
              <>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: ACCENT_GOLD_LIGHT }}>
                  Export checklist
                </p>
                <h3 className="mt-2 text-lg font-black text-white">Final review</h3>
                <div className="mt-4 space-y-2">
                  {exportChecklistItems.map((item) => (
                    <div
                      key={item.label}
                      className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2.5"
                    >
                      <span className="text-sm text-white/70">{item.label}</span>
                      <span
                        className="rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em]"
                        style={{
                          borderColor: item.complete ? `${ACCENT_GOLD_SOLID}88` : 'rgba(255,255,255,0.16)',
                          color: item.complete ? ACCENT_GOLD_LIGHT : 'rgba(255,255,255,0.45)',
                        }}
                      >
                        {item.complete ? 'Ready' : 'Open'}
                      </span>
                    </div>
                  ))}
                </div>
                <p className="mt-4 text-xs leading-relaxed text-white/55">
                  Export is still a local readiness review. PDF and PNG generation are intentionally disabled.
                </p>
              </>
            ) : (
              <>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: ACCENT_GOLD_LIGHT }}>
                  What happens next
                </p>
                <h3 className="mt-2 text-lg font-black text-white">
                  {isSetupStep
                    ? 'Your brief becomes the story starting point'
                    : `${activeStep.label} leads into the next pass`}
                </h3>
                <ul className="mt-4 space-y-3 text-sm leading-relaxed text-white/65">
                  {isSetupStep ? (
                    <>
                      <li>Use the title, issue details, genre, tone, and premise to frame the Story step.</li>
                      <li>Move forward to outline planning without saving anything outside this screen.</li>
                      <li>Return here anytime during this session to adjust the foundation.</li>
                    </>
                  ) : (
                    <>
                      <li>Review the guidance cards for this stage.</li>
                      <li>Use Back or Next to move through the comic workflow.</li>
                      <li>Open the advanced studio whenever you are ready for canvas work.</li>
                    </>
                  )}
                </ul>
              </>
            )}
          </aside>
        </main>
      </div>
    </div>
  );
}
