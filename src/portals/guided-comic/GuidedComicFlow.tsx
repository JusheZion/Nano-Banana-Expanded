import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  BookOpenText,
  ChevronLeft,
  ChevronRight,
  Download,
  ImagePlus,
  LayoutTemplate,
  Palette,
  PanelTop,
  Rocket,
  Sparkles,
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

type GuidedComicStepId =
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

type ReferenceStatus = 'missing' | 'ready';
type ReferenceSource = 'added' | 'built' | 'vault';

type VisualReferenceState = {
  status: ReferenceStatus;
  source?: ReferenceSource;
  referenceId?: string;
  imageUrl?: string;
  sourceLabel?: string;
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
  outlineBeats: OutlineBeat[];
  pageCards: PageCard[];
  characterReferences: Record<string, VisualReferenceState>;
  locationReferences: Record<string, VisualReferenceState>;
  selectedPanelId: string | null;
  panelArtStatuses: Record<string, PanelArtStatus>;
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
      outlineBeats: Array.isArray(parsed.outlineBeats) ? (parsed.outlineBeats as OutlineBeat[]) : cloneInitialOutlineBeats(),
      pageCards: Array.isArray(parsed.pageCards) ? (parsed.pageCards as PageCard[]) : [],
      characterReferences: parsed.characterReferences ?? {},
      locationReferences: parsed.locationReferences ?? {},
      selectedPanelId: typeof parsed.selectedPanelId === 'string' ? parsed.selectedPanelId : null,
      panelArtStatuses: parsed.panelArtStatuses ?? {},
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

function pagePanelArtSummary(page: PageCard, panelArtStatuses: Record<string, PanelArtStatus>): string {
  const panelStatuses = page.panelBeats.map((_, panelIndex) => {
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

export function GuidedComicFlow({ onNavigatePortal, onOpenAdvancedStudio }: GuidedComicFlowProps) {
  const skipNextDraftSaveRef = useRef(false);
  const requestVaultSelection = useGuidedComicVaultBridge((s) => s.requestVaultSelection);
  const consumeVaultSelection = useGuidedComicVaultBridge((s) => s.consumeSelection);
  const restoredDraft = useMemo(() => readGuidedComicDraft(), []);
  const [activeIndex, setActiveIndex] = useState(() => restoredDraft?.activeIndex ?? 0);
  const [setupForm, setSetupForm] = useState<SetupFormState>(() => restoredDraft?.setupForm ?? DEFAULT_SETUP_FORM);
  const [storyForm, setStoryForm] = useState<StoryFormState>(() => restoredDraft?.storyForm ?? DEFAULT_STORY_FORM);
  const [outlineBeats, setOutlineBeats] = useState<OutlineBeat[]>(() => restoredDraft?.outlineBeats ?? cloneInitialOutlineBeats());
  const [pageCards, setPageCards] = useState<PageCard[]>(() => restoredDraft?.pageCards ?? []);
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
  const [characterReferences, setCharacterReferences] = useState<Record<string, VisualReferenceState>>(
    () => restoredDraft?.characterReferences ?? {},
  );
  const [locationReferences, setLocationReferences] = useState<Record<string, VisualReferenceState>>(
    () => restoredDraft?.locationReferences ?? {},
  );
  const [selectedPanelId, setSelectedPanelId] = useState<string | null>(() => restoredDraft?.selectedPanelId ?? null);
  const [panelArtStatuses, setPanelArtStatuses] = useState<Record<string, PanelArtStatus>>(
    () => restoredDraft?.panelArtStatuses ?? {},
  );
  const [pageLayoutTemplates, setPageLayoutTemplates] = useState<Record<number, LayoutTemplateId>>(
    () => restoredDraft?.pageLayoutTemplates ?? {},
  );
  const [draftSavedAt, setDraftSavedAt] = useState<string | null>(() => restoredDraft?.savedAt ?? null);

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
      outlineBeats,
      pageCards,
      characterReferences,
      locationReferences,
      selectedPanelId,
      panelArtStatuses,
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
    characterReferences,
    locationReferences,
    outlineBeats,
    pageCards,
    pageLayoutTemplates,
    panelArtStatuses,
    selectedPanelId,
    setupForm,
    storyForm,
  ]);

  useEffect(() => {
    const selection = consumeVaultSelection();
    if (!selection) return;

    setActiveIndex(STEPS.findIndex((step) => step.id === 'visual-prep'));
    const reference: VisualReferenceState = {
      status: 'ready',
      source: 'vault',
      referenceId: selection.referenceId,
      imageUrl: selection.imageUrl,
      sourceLabel: selection.sourceLabel,
    };

    if (selection.type === 'character') {
      setCharacterReferences((current) => ({ ...current, [selection.name]: reference }));
      return;
    }

    setLocationReferences((current) => ({ ...current, [selection.name]: reference }));
  }, [consumeVaultSelection]);

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

  const goBack = () => setActiveIndex((index) => Math.max(0, index - 1));
  const goNext = () => setActiveIndex((index) => Math.min(STEPS.length - 1, index + 1));
  const updateSetupField = (field: keyof SetupFormState, value: string) => {
    setSetupForm((current) => ({ ...current, [field]: value }));
  };
  const updateStoryField = (field: keyof StoryFormState, value: string) => {
    setStoryForm((current) => ({ ...current, [field]: value }));
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
        return {
          ...page,
          panelBeats: page.panelBeats.map((beat, index) => (index === panelIndex ? value : beat)),
        };
      }),
    );
  };
  const markCharacterReference = (name: string, source: ReferenceSource) => {
    setCharacterReferences((current) => ({
      ...current,
      [name]: { status: 'ready', source },
    }));
  };
  const markLocationReference = (name: string, source: ReferenceSource) => {
    setLocationReferences((current) => ({
      ...current,
      [name]: { status: 'ready', source },
    }));
  };
  const requestCharacterVaultReference = (name: string) => {
    requestVaultSelection({ type: 'character', name });
  };
  const requestLocationVaultReference = (name: string) => {
    requestVaultSelection({ type: 'location', name });
  };
  const updatePanelArtStatus = (panelId: string, status: PanelArtStatus) => {
    setPanelArtStatuses((current) => ({ ...current, [panelId]: status }));
  };
  const updatePageLayoutTemplate = (pageNumber: number, templateId: LayoutTemplateId) => {
    setPageLayoutTemplates((current) => ({ ...current, [pageNumber]: templateId }));
  };
  const clearGuidedDraft = () => {
    const confirmed = window.confirm('Clear the saved guided comic draft from this browser? This resets the guided flow.');
    if (!confirmed) return;

    skipNextDraftSaveRef.current = true;
    removeGuidedComicDraft();
    setActiveIndex(0);
    setSetupForm(DEFAULT_SETUP_FORM);
    setStoryForm(DEFAULT_STORY_FORM);
    setOutlineBeats(cloneInitialOutlineBeats());
    setPageCards([]);
    setCharacterReferences({});
    setLocationReferences({});
    setSelectedPanelId(null);
    setPanelArtStatuses({});
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
    () => pageCharacters.filter((character) => characterReferences[character]?.status === 'ready').length,
    [characterReferences, pageCharacters],
  );
  const readyLocationCount = useMemo(
    () => pageLocations.filter((location) => locationReferences[location]?.status === 'ready').length,
    [locationReferences, pageLocations],
  );
  const totalVisualReferences = pageCharacters.length + pageLocations.length;
  const readyVisualReferences = readyCharacterCount + readyLocationCount;
  const missingVisualReferences = Math.max(0, totalVisualReferences - readyVisualReferences);
  const panelArtQueue = useMemo<PanelArtQueueItem[]>(
    () =>
      pageCards.flatMap((page) =>
        page.panelBeats.map((beatText, panelIndex) => {
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
      pageCards.length > 0 && pageCards.every((page) => page.summary.trim() && page.panelBeats.some((beat) => beat.trim()));
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
      { label: 'Panel placeholders ready', complete: pageCards.every((page) => page.panelBeats.length >= 4) },
    ];
  }, [pageCards, setupForm.targetPageCount]);

  return (
    <div
      className="min-h-full w-full overflow-y-auto custom-scrollbar text-white"
      style={{ background: PRIMARY_BG }}
    >
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-5 py-6 lg:px-8 xl:pr-64">
        <header
          className="overflow-hidden rounded-2xl border shadow-2xl"
          style={{
            background: `linear-gradient(135deg, ${PRIMARY_BG_FLAT} 0%, ${PRIMARY_BG_DARK} 62%, #1b2450 100%)`,
            borderColor: `${ACCENT_GOLD_SOLID}66`,
          }}
        >
          <div className="flex flex-col gap-5 p-5 lg:flex-row lg:items-end lg:justify-between lg:p-7">
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
            <div className="flex shrink-0 flex-col gap-3 sm:items-end">
              <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                <span className="rounded-full border border-emerald-300/25 bg-emerald-300/10 px-3 py-1.5 text-xs font-bold text-emerald-100">
                  {draftSavedAt ? 'Saved locally' : 'Local draft not saved'}
                </span>
                <button
                  type="button"
                  onClick={clearGuidedDraft}
                  className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-bold text-white/70 transition hover:bg-white/10"
                >
                  Clear guided draft
                </button>
              </div>
              <Tooltip content="Open the current full Comics Studio editor">
                <button
                  type="button"
                  onClick={onOpenAdvancedStudio}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-bold text-white/85 transition hover:bg-white/10 active:scale-[0.99]"
                  style={{ borderColor: `${ACCENT_GOLD_SOLID}88`, background: 'rgba(255,255,255,0.08)' }}
                >
                  <LayoutTemplate className="h-4 w-4" aria-hidden />
                  Open Advanced Comics Studio
                </button>
              </Tooltip>
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
          className="fixed bottom-6 right-6 top-24 z-20 hidden w-56 flex-col rounded-2xl border border-white/10 bg-black/70 p-3 shadow-2xl backdrop-blur-xl xl:flex"
          aria-label="Persistent guided comic steps"
        >
          <div className="mb-3 px-2">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: ACCENT_GOLD_LIGHT }}>
              Guided steps
            </p>
            <p className="mt-1 text-xs text-white/45">{activeIndex + 1} of {STEPS.length}</p>
          </div>
          <nav className="flex min-h-0 flex-1 flex-col gap-2">
            {STEPS.map((step, index) => {
              const selected = index === activeIndex;
              const complete = index < activeIndex;
              const StepIcon = step.Icon;
              return (
                <button
                  key={step.id}
                  type="button"
                  onClick={() => setActiveIndex(index)}
                  className="flex items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition hover:bg-white/10"
                  style={{
                    background: selected ? ACCENT_BLUE_GRADIENT : complete ? 'rgba(252,246,186,0.08)' : 'transparent',
                    borderColor: selected ? ACCENT_GOLD_SOLID : 'rgba(255,255,255,0.12)',
                    color: selected ? TEXT_ON_BLUE : 'rgba(255,255,255,0.76)',
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
                    <span className="block truncate text-sm font-black">{step.label}</span>
                    <span className="block text-[10px] font-bold uppercase tracking-[0.14em] opacity-65">
                      Step {index + 1}
                    </span>
                  </span>
                </button>
              );
            })}
          </nav>
          <div className="mt-3 grid grid-cols-2 gap-2 border-t border-white/10 pt-3">
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

        <main className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <section className="rounded-2xl border border-white/10 bg-white/[0.07] p-5 shadow-xl backdrop-blur-md lg:p-7">
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

            <div className="mt-6 rounded-xl border border-dashed border-white/20 bg-black/25 p-5">
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
                    onClick={() => onNavigatePortal('lab')}
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
                    return (
                      <article key={page.pageNumber} className="rounded-xl border border-white/10 bg-white/[0.06] p-4">
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                          <div className="min-w-0">
                            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/45">
                              Page {page.pageNumber}
                            </p>
                            <h3 className="mt-1 text-lg font-black text-white">Page {page.pageNumber}</h3>
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
                            <div className="mt-3 grid gap-3 md:grid-cols-2">
                              {page.panelBeats.map((panelBeat, panelIndex) => (
                                <label
                                  key={`${page.pageNumber}-${panelIndex}`}
                                  className="flex flex-col gap-1.5 text-xs font-bold uppercase tracking-[0.14em] text-white/55"
                                >
                                  Panel {panelIndex + 1}
                                  <input
                                    type="text"
                                    value={panelBeat}
                                    onChange={(event) =>
                                      updatePagePanelBeat(page.pageNumber, panelIndex, event.target.value)
                                    }
                                    className="rounded-lg border border-white/15 bg-black/35 px-3 py-2.5 text-sm font-medium normal-case tracking-normal text-white outline-none focus:border-amber-300/70"
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
                <div className="mt-5 grid gap-4">
                  <div className="rounded-xl border border-amber-300/25 bg-amber-300/10 p-4 text-sm leading-relaxed text-amber-50">
                    Image Vault selection is wired for character and location rows. Use Advanced Imageshop for actual
                    image generation; the other controls below remain local planning/status controls only.
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
                          const reference = characterReferences[character];
                          const ready = reference?.status === 'ready';
                          return (
                            <div
                              key={character}
                              className="grid gap-3 rounded-lg border border-white/10 bg-black/25 p-3 lg:grid-cols-[minmax(0,1fr)_auto]"
                            >
                              <div className="min-w-0">
                                <p className="truncate text-sm font-bold text-white">{character}</p>
                                <span
                                  className="mt-2 inline-flex rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em]"
                                  style={{
                                    borderColor: ready ? `${ACCENT_GOLD_SOLID}88` : 'rgba(255,255,255,0.16)',
                                    color: ready ? ACCENT_GOLD_LIGHT : 'rgba(255,255,255,0.62)',
                                  }}
                                >
                                  {ready ? 'Ready' : 'Missing reference'}
                                </span>
                                {reference?.imageUrl ? (
                                  <div className="mt-3 rounded-xl border border-emerald-300/20 bg-emerald-300/10 p-2.5">
                                    <VaultImageWithFallback
                                      src={reference.imageUrl}
                                      alt={`${character} vault reference`}
                                      frameClassName="flex h-36 w-full items-center justify-center overflow-hidden rounded-lg bg-black/35"
                                      imgClassName="max-h-36 w-full object-contain"
                                    />
                                    <div className="mt-2 min-w-0">
                                      <p className="text-xs font-bold text-emerald-100">From Image Vault</p>
                                      <p className="truncate text-[11px] text-white/55">
                                        {reference.sourceLabel ?? reference.referenceId}
                                      </p>
                                    </div>
                                  </div>
                                ) : null}
                              </div>
                              <div className="grid gap-2 sm:grid-cols-3 lg:w-[360px]">
                                <button
                                  type="button"
                                  onClick={() => markCharacterReference(character, 'added')}
                                  className="rounded-lg border border-white/15 bg-white/10 px-3 py-2 text-xs font-bold text-white/80 transition hover:bg-white/15"
                                >
                                  Mark ready: reference planned
                                </button>
                                <button
                                  type="button"
                                  onClick={() => markCharacterReference(character, 'built')}
                                  className="rounded-lg border border-white/15 bg-white/10 px-3 py-2 text-xs font-bold text-white/80 transition hover:bg-white/15"
                                >
                                  Mark ready: character planned
                                </button>
                                <button
                                  type="button"
                                  onClick={() => requestCharacterVaultReference(character)}
                                  className="rounded-lg border border-white/15 bg-white/10 px-3 py-2 text-xs font-bold text-white/80 transition hover:bg-white/15"
                                >
                                  Use from vault
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
                          const reference = locationReferences[location];
                          const ready = reference?.status === 'ready';
                          return (
                            <div
                              key={location}
                              className="grid gap-3 rounded-lg border border-white/10 bg-black/25 p-3 lg:grid-cols-[minmax(0,1fr)_auto]"
                            >
                              <div className="min-w-0">
                                <p className="truncate text-sm font-bold text-white">{location}</p>
                                <span
                                  className="mt-2 inline-flex rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em]"
                                  style={{
                                    borderColor: ready ? `${ACCENT_GOLD_SOLID}88` : 'rgba(255,255,255,0.16)',
                                    color: ready ? ACCENT_GOLD_LIGHT : 'rgba(255,255,255,0.62)',
                                  }}
                                >
                                  {ready ? 'Ready' : 'Missing reference'}
                                </span>
                                {reference?.imageUrl ? (
                                  <div className="mt-3 rounded-xl border border-emerald-300/20 bg-emerald-300/10 p-2.5">
                                    <VaultImageWithFallback
                                      src={reference.imageUrl}
                                      alt={`${location} vault reference`}
                                      frameClassName="flex h-36 w-full items-center justify-center overflow-hidden rounded-lg bg-black/35"
                                      imgClassName="max-h-36 w-full object-contain"
                                    />
                                    <div className="mt-2 min-w-0">
                                      <p className="text-xs font-bold text-emerald-100">From Image Vault</p>
                                      <p className="truncate text-[11px] text-white/55">
                                        {reference.sourceLabel ?? reference.referenceId}
                                      </p>
                                    </div>
                                  </div>
                                ) : null}
                              </div>
                              <div className="grid gap-2 sm:grid-cols-3 lg:w-[360px]">
                                <button
                                  type="button"
                                  onClick={() => markLocationReference(location, 'added')}
                                  className="rounded-lg border border-white/15 bg-white/10 px-3 py-2 text-xs font-bold text-white/80 transition hover:bg-white/15"
                                >
                                  Mark ready: reference planned
                                </button>
                                <button
                                  type="button"
                                  onClick={() => markLocationReference(location, 'built')}
                                  className="rounded-lg border border-white/15 bg-white/10 px-3 py-2 text-xs font-bold text-white/80 transition hover:bg-white/15"
                                >
                                  Mark ready: asset planned
                                </button>
                                <button
                                  type="button"
                                  onClick={() => requestLocationVaultReference(location)}
                                  className="rounded-lg border border-white/15 bg-white/10 px-3 py-2 text-xs font-bold text-white/80 transition hover:bg-white/15"
                                >
                                  Use from vault
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
                    <div className="mt-4 grid gap-2 sm:grid-cols-2">
                      <button
                        type="button"
                        disabled
                        className="rounded-lg border border-white/15 bg-white/5 px-3 py-2.5 text-xs font-bold text-white/35 disabled:cursor-not-allowed"
                      >
                        Add NPC reference (not connected yet)
                      </button>
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
                    {pageCharacters.length} characters and {pageLocations.length} locations found.{' '}
                    {readyVisualReferences} ready. {missingVisualReferences} need references before generating art.
                  </div>
                </div>
              ) : isArtStep ? (
                <div className="mt-5 grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
                  <div className="rounded-xl border border-amber-300/25 bg-amber-300/10 p-4 text-sm leading-relaxed text-amber-50 xl:col-span-2">
                    Panel art generation is not wired here yet. Use Advanced Imageshop to generate actual images for
                    now. This queue only tracks local panel status.
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

                        <div className="mt-5 min-h-[16rem] rounded-xl border border-dashed border-white/20 bg-black/25 p-5">
                          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/45">
                            Panel beat
                          </p>
                          <p className="mt-3 text-lg font-semibold leading-relaxed text-white/85">
                            {selectedPanel.beatText || 'Add a panel beat on the Pages step.'}
                          </p>
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
                    pageCards.map((page) => (
                      <article key={page.pageNumber} className="rounded-xl border border-white/10 bg-white/[0.06] p-4">
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
                              value={pageLayoutTemplates[page.pageNumber] ?? 'auto'}
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

                        <div className="mt-4 grid gap-3 md:grid-cols-2">
                          <div className="rounded-lg border border-white/10 bg-black/20 p-3">
                            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/45">
                              Panel count
                            </p>
                            <p className="mt-1 text-sm font-bold text-white/85">{page.panelCount} panels</p>
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
                      </article>
                    ))
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
                      <button
                        type="button"
                        onClick={onOpenAdvancedStudio}
                        className="rounded-lg border px-3 py-2.5 text-xs font-bold text-white/85 transition hover:bg-white/10"
                        style={{ borderColor: `${ACCENT_GOLD_SOLID}88`, background: 'rgba(255,255,255,0.08)' }}
                      >
                        Open Advanced Comics Studio
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
            <div className="mt-5 rounded-xl border border-white/10 bg-white/[0.06] p-4">
              <p className="text-xs font-bold text-white/85">Ready for precision work?</p>
              <p className="mt-2 text-xs leading-relaxed text-white/55">
                Open the full studio when you are ready to work directly on the canvas.
              </p>
              <button
                type="button"
                onClick={onOpenAdvancedStudio}
                className="mt-4 w-full rounded-lg border px-3 py-2 text-xs font-bold text-white/85 transition hover:bg-white/10"
                style={{ borderColor: `${ACCENT_GOLD_SOLID}88`, background: 'rgba(255,255,255,0.08)' }}
              >
                Open Advanced Comics Studio
              </button>
            </div>
          </aside>
        </main>
      </div>
    </div>
  );
}
