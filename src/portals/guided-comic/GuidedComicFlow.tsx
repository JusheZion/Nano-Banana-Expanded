import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  BookMarked,
  BookOpenText,
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  Edit3,
  FilePlus,
  FolderOpen,
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
  Save,
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
import {
  createWriterIssue,
  createWriterSeries,
  deleteWriterIssue,
  ensureWriterPagesToCount,
  listWriterIssues,
  listWriterOutlinesForIssue,
  listWriterPages,
  listWriterSeries,
  updateWriterIssue,
  updateWriterSeries,
  type WriterIssueRow,
  type WriterSeriesRow,
} from '@/shared/api/arcsWriterRoom';
import { invokeWriterTools } from '@/shared/api/writerTools';
import { isSupabaseConfigured } from '@/shared/lib/supabase';
import { guidedComicAssistResultSchema, issueOutlineSchema, WRITER_PAGE_BEATS_ISSUE_MAX } from '@/shared/writer/schemas';
import type { GuidedComicAssistAction, GuidedComicAssistResult } from '@/shared/writer/types';
import { useGuidedComicVaultBridge } from '@/stores/guidedComicVaultBridge';
import { useImageWorkshopBridge, type GuidedImageWorkshopReference } from '@/stores/imageWorkshopBridge';
import { useGuidedComicLayoutBridge, type GuidedComicLayoutPanelImage } from '@/stores/guidedComicLayoutBridge';
import { useWriterWorkshopBridge } from '@/stores/writerWorkshopBridge';
import {
  createGuidedComicStarterLayoutWithExistingMetadata,
  getGuidedComicActivePanelCount,
  getSnappedGuidedComicPanelGeometry,
  getGuidedComicExistingPanelBeats,
  getGuidedComicLayoutPanels,
  getGuidedComicSafeMarginPanelGeometry,
  moveGuidedComicPanelGeometry,
  NORMALIZED_LAYOUT_MARGIN,
  resizeGuidedComicPanelGeometry,
  syncGuidedComicLayoutGeometry,
  type GuidedComicImageFit,
  type GuidedComicLayoutGutterMode,
  type GuidedComicLayoutIntent,
  type GuidedComicLayoutMarginMode,
  type GuidedComicLayoutResizeHandle,
  type GuidedComicLayoutSettings,
  type GuidedComicPanelGeometry,
} from '@/portals/guided-comic/guidedComicLayoutPlan';
import {
  GUIDED_COMIC_PROJECT_LIBRARY_STORAGE_KEY,
  createGuidedComicProject,
  createGuidedComicProjectLibrary,
  deleteGuidedComicProject,
  duplicateGuidedComicProject,
  getGuidedComicProjectDisplayName,
  isGuidedComicProjectSnapshotDirty,
  parseGuidedComicProjectLibrary,
  renameGuidedComicProject,
  upsertGuidedComicProject,
  type GuidedComicProject,
  type GuidedComicProjectLibrary,
  type GuidedComicProjectSnapshot,
} from '@/portals/guided-comic/guidedComicProjectLibrary';
import {
  GUIDED_COMIC_LIVING_ARCHIVE_UNLOCK_COUNT,
  getGuidedComicCompletedIssueCount,
  getGuidedComicDeleteIssueLabel,
  getGuidedComicDeleteSeriesLabel,
  getGuidedComicLibrarySeriesGroups,
  getGuidedComicProjectCoverImageUrl,
  isGuidedComicLivingArchiveUnlocked,
  type GuidedComicSeriesGroup,
} from '@/portals/guided-comic/guidedComicLibraryView';
import {
  normalizeGuidedComicLibraryEntryLayout,
  readGuidedComicLibraryPreferences,
  writeGuidedComicLibraryPreferences,
  type GuidedComicLibraryEntryLayout,
  type GuidedComicLibraryPreferences,
} from '@/portals/guided-comic/guidedComicLibraryPreferences';
import {
  getGuidedComicLibraryQaFixture,
  readGuidedComicLibraryQaFixtureName,
} from '@/portals/guided-comic/guidedComicLibraryQaFixtures';
import {
  applyGuidedComicAiResult,
  buildGuidedComicAiContext,
  getGuidedComicPacingChecks,
  type GuidedComicAiDraft,
} from '@/portals/guided-comic/guidedComicAi';
import {
  analyzeGuidedDialogueSeedDensity,
  buildGuidedComicVisualPageMetadata,
  buildGuidedWriterToolRequest,
  createEditableDialogueSeedsFromWriterSeed,
  createWriterIssueDraftFromGuidedStoryFoundation,
  getGuidedWriterPageBeatBatchOffsets,
  getWriterPageBeatImportStats,
  mapWriterDialogueToGuidedDialogueSeeds,
  mapWriterIssueToGuidedStoryFoundation,
  mapWriterOutlineToGuidedOutlineBeats,
  mapWriterOutlineToGuidedPageCards,
  mergeWriterOutlineIntoGuidedPageCards,
  mergeWriterPagesIntoGuidedPageCards,
  promoteAcceptedDialogueToBalloonSeeds,
  setEditableDialogueSeedStatus,
  updateEditableDialogueSeedText,
  type GuidedComicBalloonSeed,
  type GuidedComicBridgeDialogueSeed,
  type GuidedComicDialogueSeedStatus,
  type GuidedComicEditableDialogueSeed,
  type GuidedWriterToolAction,
} from '@/portals/guided-comic/writersWorkshopBridge';

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

export function getGuidedPageNavigatorButtonLabel(pageNumber: number): string {
  return String(pageNumber);
}

export function shouldStartGuidedPanelMoveDrag(target: EventTarget | null): boolean {
  if (typeof Element === 'undefined') return false;
  if (!(target instanceof Element)) return false;
  return !target.closest('button,input,textarea,select,a,[role="slider"],[data-guided-panel-drag-exempt="true"]');
}

export type GuidedComicWorkspaceMode = 'issue-lightbox' | 'issue-cover' | 'story-prep' | 'page-production' | 'panel-focus';

type GuidedComicLibraryStage = 'series-gallery' | 'series-focus' | 'issue-gallery' | 'issue-workspace';

export type GuidedComicReopenPreference = 'last-active' | 'issue-lightbox' | 'page-production';

export const GUIDED_COMIC_REOPEN_PREFERENCE_LABELS: Record<GuidedComicReopenPreference, string> = {
  'last-active': 'Last active',
  'issue-lightbox': 'Issue Lightbox',
  'page-production': 'Page Production',
};

const GUIDED_COMIC_LIBRARY_ENTRY_LAYOUT_LABELS: Record<GuidedComicLibraryEntryLayout, string> = {
  'cover-gallery': 'Cover Gallery',
  'last-series': 'Last Series',
  'hybrid-shelf': 'Hybrid Shelf',
};

const GUIDED_COMIC_LIBRARY_ENTRY_LAYOUT_OPTIONS: GuidedComicLibraryEntryLayout[] = [
  'cover-gallery',
  'last-series',
  'hybrid-shelf',
];

const GUIDED_COMIC_REOPEN_PREFERENCE_STORAGE_KEY = 'arcs.guidedComicReopenPreference.v1';

const STORY_PREP_STEP_IDS = new Set<GuidedComicStepId>(['setup', 'story', 'pages', 'visual-prep']);

export function getGuidedComicWorkspaceMode(
  stepId: GuidedComicStepId,
  pageCount: number,
  productionPanelFocusOpen: boolean,
  requestedMode?: GuidedComicWorkspaceMode | null,
): GuidedComicWorkspaceMode {
  if (pageCount <= 0) return 'story-prep';
  if (requestedMode === 'issue-lightbox') return 'issue-lightbox';
  if (requestedMode === 'issue-cover') return 'issue-cover';
  if (productionPanelFocusOpen || requestedMode === 'panel-focus') return 'panel-focus';
  if (requestedMode === 'page-production') return 'page-production';
  return STORY_PREP_STEP_IDS.has(stepId) ? 'story-prep' : 'page-production';
}

export function normalizeGuidedComicWorkspaceMode(value: unknown): GuidedComicWorkspaceMode | null {
  return value === 'issue-lightbox' ||
    value === 'issue-cover' ||
    value === 'story-prep' ||
    value === 'page-production' ||
    value === 'panel-focus'
    ? value
    : null;
}

export function normalizeGuidedComicReopenPreference(value: unknown): GuidedComicReopenPreference {
  return value === 'issue-lightbox' || value === 'page-production' || value === 'last-active' ? value : 'last-active';
}

function readGuidedComicReopenPreference(): GuidedComicReopenPreference {
  if (typeof window === 'undefined') return 'last-active';

  try {
    return normalizeGuidedComicReopenPreference(window.localStorage.getItem(GUIDED_COMIC_REOPEN_PREFERENCE_STORAGE_KEY));
  } catch {
    return 'last-active';
  }
}

export const ADVANCED_STUDIO_ACTION_LABELS = {
  openBlank: 'Open blank Advanced Studio',
  sendPage: 'Send this page to Advanced Studio',
} as const;

export const GUIDED_LAYOUT_DISCLOSURE_COPY = {
  start: 'Start with a layout, then adjust it.',
  advanced: 'Use Advanced Studio for custom shapes, lettering, overlays, and final polish.',
} as const;

export const GUIDED_LAYOUT_DISCLOSURE_LEVELS = [
  {
    id: 'simple',
    label: 'Level 1: Simple',
    summary: 'Choose panel count, pick AI or starter layouts, and make quick size adjustments.',
    controls: [
      'Choose panel count',
      'Choose AI/start layout',
      'Make selected panel bigger',
      'Make selected panel wider',
      'Reset layout',
      'Regenerate layout',
    ],
  },
  {
    id: 'edit',
    label: 'Level 2: Edit',
    summary: 'Drag and resize rectangular panels while preserving images and snapping to the page.',
    controls: [
      'Drag rectangular panels',
      'Resize rectangular panels',
      'Snap to page margins/gutters',
      'Preserve images',
      'Show panel numbers and basic labels',
    ],
  },
  {
    id: 'advanced',
    label: 'Level 3: Advanced Studio',
    summary: 'Move to the power-user editor for final composition and publishing polish.',
    controls: [
      'Custom shapes',
      'Oval/circle panels',
      'Masks',
      'Overlays',
      'Balloons',
      'Lettering',
      'Freeform composition',
      'Advanced export polish',
    ],
  },
] as const;

type GuidedLayoutDisclosureMode = (typeof GUIDED_LAYOUT_DISCLOSURE_LEVELS)[0]['id'] | (typeof GUIDED_LAYOUT_DISCLOSURE_LEVELS)[1]['id'];

type SetupFormState = {
  seriesTitle: string;
  issueTitle: string;
  issueNumber: string;
  targetPageCount: string;
  genre: string;
  tone: string;
  layoutMarginMode: GuidedComicLayoutMarginMode;
  layoutGutterMode: GuidedComicLayoutGutterMode;
  premise: string;
};

type StoryFormState = {
  premise: string;
  mainCharacters: string;
  conflict: string;
  setting: string;
  endingGoal: string;
};

export type ArtDirectionState = {
  artStyle: string;
  defaultAspectRatio: string;
  renderingStyle: string;
  colorMood: string;
  lighting: string;
  continuityNotes: string;
  excludeTextFromImages: boolean;
};

export type CharacterPrepState = {
  roleSummary: string;
  visualDescription: string;
  costumeNotes: string;
  continuityNotes: string;
  artStyleNotes: string;
  expressionsMoods: string;
  visualTags: string;
  ready: boolean;
};

export type LocationPrepState = {
  settingSummary: string;
  moodTone: string;
  environmentNotes: string;
  lightingNotes: string;
  visualMotifs: string;
  ready: boolean;
};

export type PropPrepState = {
  name: string;
  continuityNotes: string;
  styleNotes: string;
  reuseTracking: string;
  references: ReferenceImage[];
  ready: boolean;
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
  imageId?: string;
  imageUrl: string;
  source: 'imageshop' | 'vault' | 'upload' | 'paste';
  returnedAt: string;
  prompt?: string;
  sourceLabel?: string;
};

export type GuidedProductionPageStatus =
  | 'needs beats'
  | 'needs dialogue'
  | 'needs references'
  | 'needs art'
  | 'layout ready'
  | 'ready for Advanced Studio';

export type GuidedProductionPanel = {
  panelId: string;
  panelNumber: number;
  beatText: string;
  dialogueText: string;
  status: PanelArtStatus;
  imageUrl?: string;
  imageSource?: PanelArtImageState['source'];
  layoutIntent: GuidedComicLayoutIntent;
};

type GuidedProductionReferenceOptions = {
  characterReferences?: Record<string, ReferenceImage[]>;
  locationReferences?: Record<string, ReferenceImage[]>;
  npcReferences?: Record<string, ReferenceImage[]>;
  npcNames?: string[];
};

type ComicProjectMetadataForm = {
  seriesTitle: string;
  issueTitle: string;
  issueNumber: string;
};

type ComicProjectMetadataDialog = {
  mode: 'save-as' | 'rename';
  form: ComicProjectMetadataForm;
} | null;

type LayoutTemplateId =
  | 'auto'
  | 'three-panel'
  | 'three-panel-wide-top'
  | 'three-panel-wide-bottom'
  | 'four-panel'
  | 'six-panel-grid'
  | 'splash';

type LayoutTemplateOption = {
  id: LayoutTemplateId;
  label: string;
};

type LayoutResizeHandle = GuidedComicLayoutResizeHandle;

type ActiveLayoutEdit = {
  pageNumber: number;
  panelId: string;
  mode: 'move' | 'resize';
  handle?: LayoutResizeHandle;
  startClientX: number;
  startClientY: number;
  canvasWidth: number;
  canvasHeight: number;
  startPanel: GuidedComicPanelGeometry;
  startGeometry: GuidedComicPanelGeometry[];
};

type ActiveImageFramingDrag = {
  pageNumber: number;
  panelId: string;
  startClientX: number;
  startClientY: number;
  frameWidth: number;
  frameHeight: number;
  startFocusX: number;
  startFocusY: number;
};

type GuidedComicDraftState = {
  version: 1;
  savedAt: string;
  writerIssueId?: string | null;
  activeIndex: number;
  activePageNumber?: number | null;
  workspaceMode?: GuidedComicWorkspaceMode;
  setupForm: SetupFormState;
  storyForm: StoryFormState;
  artDirection: ArtDirectionState;
  outlineBeats: OutlineBeat[];
  pageCards: PageCard[];
  characterReferences: Record<string, ReferenceImage[]>;
  locationReferences: Record<string, ReferenceImage[]>;
  npcReferences: Record<string, ReferenceImage[]>;
  characterPrep: Record<string, CharacterPrepState>;
  locationPrep: Record<string, LocationPrepState>;
  propPrep: Record<string, PropPrepState>;
  selectedPanelId: string | null;
  panelArtStatuses: Record<string, PanelArtStatus>;
  panelArtImages: Record<string, PanelArtImageState>;
  pageLayoutTemplates: Record<number, LayoutTemplateId>;
  pageLayoutIntents: Record<number, GuidedComicLayoutIntent>;
  pageLayoutGeometry: Record<number, GuidedComicPanelGeometry[]>;
  writerDialogueSeeds: Record<number, GuidedComicBridgeDialogueSeed>;
  editableDialogueSeeds: Record<number, GuidedComicEditableDialogueSeed[]>;
  promotedBalloonSeeds: Record<number, GuidedComicBalloonSeed[]>;
  issueCoverImage?: PanelArtImageState | null;
};

const GUIDED_COMIC_DRAFT_STORAGE_KEY = 'arcs.guidedComicFlowDraft.v1';
const PROJECT_LIBRARY_STATUS_CLEAR_DELAY_MS = 3200;

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
  layoutMarginMode: 'safe',
  layoutGutterMode: 'standard',
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

const DEFAULT_CHARACTER_PREP: CharacterPrepState = {
  roleSummary: '',
  visualDescription: '',
  costumeNotes: '',
  continuityNotes: '',
  artStyleNotes: '',
  expressionsMoods: '',
  visualTags: '',
  ready: false,
};

const DEFAULT_LOCATION_PREP: LocationPrepState = {
  settingSummary: '',
  moodTone: '',
  environmentNotes: '',
  lightingNotes: '',
  visualMotifs: '',
  ready: false,
};

const DEFAULT_PROP_PREP: PropPrepState = {
  name: '',
  continuityNotes: '',
  styleNotes: '',
  reuseTracking: '',
  references: [],
  ready: false,
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
  { id: 'three-panel-wide-top', label: '3-panel: wide top' },
  { id: 'three-panel-wide-bottom', label: '3-panel: two over wide' },
  { id: 'four-panel', label: '4-panel page' },
  { id: 'six-panel-grid', label: '6-panel grid' },
  { id: 'splash', label: 'Splash page' },
];

type GuidedComicAiActionOption = {
  action: GuidedComicAssistAction;
  label: string;
  description: string;
};

const GUIDED_COMIC_AI_ACTIONS_BY_STEP: Record<GuidedComicStepId, GuidedComicAiActionOption[]> = {
  setup: [
    { action: 'improve_premise', label: 'Improve premise', description: 'Tighten the hook without overwriting your draft.' },
    { action: 'suggest_genre_tone', label: 'Suggest genre/tone fit', description: 'Get a short fit check for genre and tone.' },
  ],
  story: [
    { action: 'improve_premise', label: 'Expand premise', description: 'Broaden the rough idea without judging story structure.' },
    { action: 'suggest_conflict_stakes_ending', label: 'Generate possible conflicts', description: 'Offer conflict and stakes options from the intake fields.' },
    { action: 'suggest_character_dynamics', label: 'Suggest character dynamics', description: 'Suggest relationships, tensions, and emotional turns.' },
    { action: 'generate_story_foundation', label: 'Generate story foundation', description: 'Draft the missing intake fields as a co-writer.' },
  ],
  pages: [
    { action: 'generate_page_plan', label: 'Generate page plan', description: 'Propose page summaries from the outline and target count.' },
    { action: 'generate_missing_page_summaries', label: 'Generate missing page summaries', description: 'Fill only empty page summaries by default.' },
    { action: 'regenerate_selected_page', label: 'Regenerate selected page', description: 'Preview a replacement for the active page only.' },
    { action: 'generate_panel_beats', label: 'Generate panel beats', description: 'Suggest panel beats from current page summaries.' },
  ],
  'visual-prep': [
    { action: 'suggest_reference_needs', label: 'Suggest reference needs', description: 'Find missing characters, locations, props, and style refs.' },
  ],
  art: [
    { action: 'strengthen_panel_prompt', label: 'Strengthen panel prompt', description: 'Improve the selected panel prompt text only.' },
    { action: 'suggest_shot_direction', label: 'Suggest shot/camera direction', description: 'Vary camera language for selected panel art.' },
  ],
  layout: [
    { action: 'suggest_layout_pacing', label: 'Suggest layout pacing', description: 'Review visual rhythm across pages.' },
    { action: 'recommend_layouts', label: 'Recommend layouts', description: 'Suggest splash, 3-panel, wide 3-panel, 4-panel, or 6-panel templates.' },
  ],
  export: [
    { action: 'review_readiness', label: 'Review readiness', description: 'Check whether the guided project is ready to export.' },
    { action: 'find_export_gaps', label: 'Find gaps before export', description: 'List missing story, art, reference, and layout items.' },
  ],
};

export const GUIDED_STORY_PHASE_COPY = {
  intakeTitle: 'Story Intake',
  intakeGoal: 'Capture rough creative intent only. The AI helps expand the idea before it reviews structure.',
  outlineTitle: 'Outline Generation',
  outlineGoal: 'Generate actual structural story beats, then edit or accept them.',
  reviewTitle: 'Readiness Review',
  reviewGoal: 'Optional editorial assistance appears after an outline exists.',
  assistantTitle: 'Story pacing assistant',
  assistantInactiveTitle: 'Outline development',
  assistantInactiveDetail: 'Add or generate outline beats first. Pacing review stays quiet until there is structure to respond to.',
} as const;

export const GUIDED_STORY_INTAKE_ACTION_LABELS = GUIDED_COMIC_AI_ACTIONS_BY_STEP.story.map((action) => action.label);

export function hasGuidedComicOutlineDraft(outlineBeats: Array<Pick<OutlineBeat, 'description'>>): boolean {
  return outlineBeats.some((beat) => beat.description.trim().length > 0);
}

export const GUIDED_WRITERS_WORKSHOP_BRIDGE_ACTIONS = {
  continueLocal: 'Continue locally',
  useWorkshop: 'Choose Writer issue',
  importLatest: 'Import outline/page beats',
  openLinked: 'Open linked issue in Writers Workshop',
  linkSelected: 'Link issue only',
  generateMissingPageBeats: 'Generate missing page beats',
} as const;

export const GUIDED_WRITERS_WORKSHOP_BRIDGE_COPY = {
  summary:
    'Linking connects this Guided draft to a Writer issue. Importing is the separate step that copies saved outline, page beats, panel beats, and dialogue seeds into Guided Comics.',
  linkedNextStepTitle: 'Linked issue ready',
  linkedNextStepBody:
    'Nothing is imported automatically. Choose whether to import saved Writer structure, generate missing page beats, or keep working locally with the link available.',
  importHelp: 'Copies the latest saved Writer outline, page beats, panel beats, and dialogue seeds into this Guided draft.',
  generateHelp: 'Runs Writer page-beat generation for the linked issue, then imports the generated beats into Guided pages.',
} as const;

export const GUIDED_WRITERS_WORKSHOP_TOOL_ACTIONS: Array<{
  action: GuidedWriterToolAction;
  label: string;
  description: string;
}> = [
  {
    action: 'outline',
    label: 'Generate Writer outline',
    description: 'Run the Writers Workshop outline_issue mode for the linked issue.',
  },
  {
    action: 'pacing',
    label: 'Run pacing review',
    description: 'Run the Writers Workshop pacing_review mode for the linked issue.',
  },
  {
    action: 'page-beats',
    label: 'Generate page beats',
    description: 'Run the Writers Workshop page_beats_issue mode in safe batches.',
  },
  {
    action: 'dialogue',
    label: 'Draft selected page dialogue',
    description: 'Run the Writers Workshop draft_dialogue mode for the active Guided page.',
  },
];

export const GUIDED_WRITERS_WORKSHOP_TOOL_ACTION_LABELS = GUIDED_WRITERS_WORKSHOP_TOOL_ACTIONS.map(
  (action) => action.label,
);

export const GUIDED_VISUAL_REFERENCE_ROW_CLASS =
  'grid gap-3 rounded-xl border border-white/10 bg-black/25 p-3 lg:grid-cols-[minmax(190px,260px)_minmax(0,1fr)_minmax(104px,124px)] lg:items-start';
export const GUIDED_VISUAL_REFERENCE_NAME_CLASS =
  'line-clamp-2 break-words text-sm font-bold leading-snug text-white';
export const GUIDED_VISUAL_REFERENCE_ACTION_LABEL = 'Add ref';
export const GUIDED_VISUAL_REFERENCE_EMPTY_LABELS = {
  character: 'No refs selected.',
  location: 'No refs selected.',
  npc: 'No refs selected.',
} as const;

function formatGuidedProgressElapsed(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

function useGuidedProgressElapsed(active: boolean): number {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (!active) {
      setSeconds(0);
      return undefined;
    }

    setSeconds(0);
    const interval = window.setInterval(() => setSeconds((current) => current + 1), 1000);
    return () => window.clearInterval(interval);
  }, [active]);

  return seconds;
}

type GuidedProgressButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  isLoading: boolean;
  loadingLabel: string;
  idleLabel: string;
  icon?: React.ReactNode;
};

function GuidedProgressButton({
  isLoading,
  loadingLabel,
  idleLabel,
  icon,
  className = '',
  children,
  ...buttonProps
}: GuidedProgressButtonProps) {
  const elapsedSeconds = useGuidedProgressElapsed(isLoading);
  const label = isLoading ? `${loadingLabel} ${formatGuidedProgressElapsed(elapsedSeconds)}` : idleLabel;

  return (
    <button
      {...buttonProps}
      aria-busy={isLoading || undefined}
      className={`guided-progress-button ${className}`}
      data-loading={isLoading ? 'true' : 'false'}
    >
      <span className="guided-progress-button__content inline-flex min-w-0 items-center justify-center gap-2">
        {icon}
        <span className="min-w-0">{children ?? label}</span>
      </span>
    </button>
  );
}

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
    title: 'Build the story in phases',
    summary: 'Start with rough creative intent, then generate editable outline beats before asking for pacing review.',
    helperText: 'The AI acts as a co-writer first. Structure checks stay quiet until there is an outline to respond to.',
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

function normalizeCharacterPrepMap(raw: unknown): Record<string, CharacterPrepState> {
  if (!raw || typeof raw !== 'object') return {};
  return Object.entries(raw as Record<string, Partial<CharacterPrepState>>).reduce<Record<string, CharacterPrepState>>(
    (next, [name, value]) => {
      if (!name.trim() || !value || typeof value !== 'object') return next;
      next[name] = { ...DEFAULT_CHARACTER_PREP, ...value, ready: Boolean(value.ready) };
      return next;
    },
    {},
  );
}

function normalizeLocationPrepMap(raw: unknown): Record<string, LocationPrepState> {
  if (!raw || typeof raw !== 'object') return {};
  return Object.entries(raw as Record<string, Partial<LocationPrepState>>).reduce<Record<string, LocationPrepState>>(
    (next, [name, value]) => {
      if (!name.trim() || !value || typeof value !== 'object') return next;
      next[name] = { ...DEFAULT_LOCATION_PREP, ...value, ready: Boolean(value.ready) };
      return next;
    },
    {},
  );
}

function normalizePropPrepMap(raw: unknown): Record<string, PropPrepState> {
  if (!raw || typeof raw !== 'object') return {};
  return Object.entries(raw as Record<string, Partial<PropPrepState>>).reduce<Record<string, PropPrepState>>(
    (next, [name, value]) => {
      if (!name.trim() || !value || typeof value !== 'object') return next;
      next[name] = {
        ...DEFAULT_PROP_PREP,
        ...value,
        name: typeof value.name === 'string' && value.name.trim() ? value.name : name,
        references: Array.isArray(value.references)
          ? value.references.flatMap((item) => {
              const normalized = normalizeReferenceImage(name, item);
              return normalized ? [normalized] : [];
            })
          : [],
        ready: Boolean(value.ready),
      };
      return next;
    },
    {},
  );
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
      writerIssueId: typeof parsed.writerIssueId === 'string' ? parsed.writerIssueId : null,
      activeIndex: safeActiveIndex(parsed.activeIndex),
      activePageNumber:
        typeof parsed.activePageNumber === 'number' && Number.isFinite(parsed.activePageNumber)
          ? parsed.activePageNumber
          : null,
      workspaceMode: normalizeGuidedComicWorkspaceMode(parsed.workspaceMode) ?? undefined,
      setupForm: { ...DEFAULT_SETUP_FORM, ...parsed.setupForm },
      storyForm: { ...DEFAULT_STORY_FORM, ...parsed.storyForm },
      artDirection: { ...DEFAULT_ART_DIRECTION, ...parsed.artDirection },
      outlineBeats: Array.isArray(parsed.outlineBeats) ? (parsed.outlineBeats as OutlineBeat[]) : cloneInitialOutlineBeats(),
      pageCards: Array.isArray(parsed.pageCards) ? (parsed.pageCards as PageCard[]) : [],
      characterReferences: normalizeReferenceMap(parsed.characterReferences),
      locationReferences: normalizeReferenceMap(parsed.locationReferences),
      npcReferences: normalizeReferenceMap(parsed.npcReferences),
      characterPrep: normalizeCharacterPrepMap(parsed.characterPrep),
      locationPrep: normalizeLocationPrepMap(parsed.locationPrep),
      propPrep: normalizePropPrepMap(parsed.propPrep),
      selectedPanelId: typeof parsed.selectedPanelId === 'string' ? parsed.selectedPanelId : null,
      panelArtStatuses: parsed.panelArtStatuses ?? {},
      panelArtImages: parsed.panelArtImages ?? {},
      issueCoverImage: parsed.issueCoverImage ?? null,
      pageLayoutTemplates: parsed.pageLayoutTemplates ?? {},
      pageLayoutIntents: parsed.pageLayoutIntents ?? {},
      pageLayoutGeometry: parsed.pageLayoutGeometry ?? {},
      writerDialogueSeeds: (parsed.writerDialogueSeeds ?? {}) as Record<number, GuidedComicBridgeDialogueSeed>,
      editableDialogueSeeds: (parsed.editableDialogueSeeds ?? {}) as Record<number, GuidedComicEditableDialogueSeed[]>,
      promotedBalloonSeeds: (parsed.promotedBalloonSeeds ?? {}) as Record<number, GuidedComicBalloonSeed[]>,
    };
  } catch {
    return null;
  }
}

function guidedComicStepIdFromIndex(activeIndex: number): GuidedComicStepId {
  return STEPS[safeActiveIndex(activeIndex)]?.id ?? 'setup';
}

function guidedComicStepIndexFromId(stepId: unknown): number {
  if (typeof stepId !== 'string') return 0;
  const index = STEPS.findIndex((step) => step.id === stepId);
  return index === -1 ? 0 : index;
}

function draftToGuidedComicProjectSnapshot(draft: GuidedComicDraftState): GuidedComicProjectSnapshot {
  return {
    writerIssueId: draft.writerIssueId ?? null,
    setupForm: draft.setupForm,
    storyForm: draft.storyForm,
    outlineBeats: draft.outlineBeats,
    pageCards: draft.pageCards,
    characterReferences: draft.characterReferences,
    locationReferences: draft.locationReferences,
    npcReferences: draft.npcReferences,
    characterPrep: draft.characterPrep,
    locationPrep: draft.locationPrep,
    propPrep: draft.propPrep,
    panelArtStatuses: draft.panelArtStatuses,
    panelArtImages: draft.panelArtImages,
    issueCoverImage: draft.issueCoverImage ?? null,
    pageLayoutTemplates: draft.pageLayoutTemplates,
    pageLayoutIntents: draft.pageLayoutIntents,
    pageLayoutGeometry: draft.pageLayoutGeometry,
    writerDialogueSeeds: draft.writerDialogueSeeds,
    editableDialogueSeeds: draft.editableDialogueSeeds,
    promotedBalloonSeeds: draft.promotedBalloonSeeds,
    artDirection: draft.artDirection,
    currentStep: guidedComicStepIdFromIndex(draft.activeIndex),
    selectedPanelId: draft.selectedPanelId,
    activePageNumber: draft.activePageNumber ?? null,
    workspaceMode: draft.workspaceMode,
  };
}

function snapshotToGuidedComicDraft(snapshot: GuidedComicProjectSnapshot, savedAt = ''): GuidedComicDraftState {
  return {
    version: 1,
    savedAt,
    writerIssueId: typeof snapshot.writerIssueId === 'string' ? snapshot.writerIssueId : null,
    activeIndex: guidedComicStepIndexFromId(snapshot.currentStep),
    activePageNumber:
      typeof snapshot.activePageNumber === 'number' && Number.isFinite(snapshot.activePageNumber)
        ? snapshot.activePageNumber
        : null,
    workspaceMode: normalizeGuidedComicWorkspaceMode(snapshot.workspaceMode) ?? undefined,
    setupForm: { ...DEFAULT_SETUP_FORM, ...snapshot.setupForm },
    storyForm: { ...DEFAULT_STORY_FORM, ...snapshot.storyForm },
    artDirection: { ...DEFAULT_ART_DIRECTION, ...snapshot.artDirection },
    outlineBeats: Array.isArray(snapshot.outlineBeats) ? (snapshot.outlineBeats as OutlineBeat[]) : cloneInitialOutlineBeats(),
    pageCards: Array.isArray(snapshot.pageCards) ? (snapshot.pageCards as PageCard[]) : [],
    characterReferences: normalizeReferenceMap(snapshot.characterReferences),
    locationReferences: normalizeReferenceMap(snapshot.locationReferences),
    npcReferences: normalizeReferenceMap(snapshot.npcReferences),
    characterPrep: normalizeCharacterPrepMap(snapshot.characterPrep),
    locationPrep: normalizeLocationPrepMap(snapshot.locationPrep),
    propPrep: normalizePropPrepMap(snapshot.propPrep),
    selectedPanelId: typeof snapshot.selectedPanelId === 'string' ? snapshot.selectedPanelId : null,
    panelArtStatuses: snapshot.panelArtStatuses as Record<string, PanelArtStatus>,
    panelArtImages: snapshot.panelArtImages as Record<string, PanelArtImageState>,
    issueCoverImage: snapshot.issueCoverImage as PanelArtImageState | null | undefined,
    pageLayoutTemplates: snapshot.pageLayoutTemplates as Record<number, LayoutTemplateId>,
    pageLayoutIntents: (snapshot.pageLayoutIntents ?? {}) as Record<number, GuidedComicLayoutIntent>,
    pageLayoutGeometry: (snapshot.pageLayoutGeometry ?? {}) as Record<number, GuidedComicPanelGeometry[]>,
    writerDialogueSeeds: (snapshot.writerDialogueSeeds ?? {}) as Record<number, GuidedComicBridgeDialogueSeed>,
    editableDialogueSeeds: (snapshot.editableDialogueSeeds ?? {}) as Record<number, GuidedComicEditableDialogueSeed[]>,
    promotedBalloonSeeds: (snapshot.promotedBalloonSeeds ?? {}) as Record<number, GuidedComicBalloonSeed[]>,
  };
}

function readGuidedComicProjectLibrary(): GuidedComicProjectLibrary | null {
  if (typeof window === 'undefined') return null;

  try {
    return parseGuidedComicProjectLibrary(window.localStorage.getItem(GUIDED_COMIC_PROJECT_LIBRARY_STORAGE_KEY));
  } catch {
    return null;
  }
}

function writeGuidedComicProjectLibrary(library: GuidedComicProjectLibrary | null) {
  if (typeof window === 'undefined') return;

  try {
    if (library && library.projects.length > 0) {
      window.localStorage.setItem(GUIDED_COMIC_PROJECT_LIBRARY_STORAGE_KEY, JSON.stringify(library));
    } else {
      window.localStorage.removeItem(GUIDED_COMIC_PROJECT_LIBRARY_STORAGE_KEY);
    }
  } catch {
    // Keep the local recovery draft usable if project library persistence fails.
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

function parsePanelArtQueueId(panelId: string): { pageNumber: number; panelNumber: number } | null {
  const match = panelId.match(/^page-(\d+)-panel-(\d+)$/i);
  if (!match) return null;

  return {
    pageNumber: Number.parseInt(match[1], 10),
    panelNumber: Number.parseInt(match[2], 10),
  };
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

function panelArtStatusButtonStyle(buttonStatus: PanelArtStatus, selectedStatus: PanelArtStatus): React.CSSProperties {
  const active = buttonStatus === selectedStatus;
  if (buttonStatus === 'approved') {
    return {
      borderColor: active ? 'rgba(134,239,172,0.78)' : 'rgba(134,239,172,0.26)',
      background: active ? 'rgba(34,197,94,0.22)' : 'rgba(255,255,255,0.08)',
      color: active ? 'rgb(220,252,231)' : 'rgba(255,255,255,0.78)',
    };
  }
  if (buttonStatus === 'ready') {
    return {
      borderColor: active ? `${ACCENT_GOLD_SOLID}dd` : 'rgba(255,255,255,0.16)',
      background: active ? ACCENT_GOLD_GRADIENT : 'rgba(255,255,255,0.08)',
      color: active ? TEXT_ON_GOLD : 'rgba(255,255,255,0.78)',
    };
  }
  return {
    borderColor: active ? 'rgba(251,113,133,0.72)' : 'rgba(255,255,255,0.16)',
    background: active ? 'rgba(244,63,94,0.18)' : 'rgba(255,255,255,0.08)',
    color: active ? 'rgb(255,228,230)' : 'rgba(255,255,255,0.78)',
  };
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

function guidedProductionStatusLabel(status: GuidedProductionPageStatus): string {
  return status === 'ready for Advanced Studio' ? 'Advanced-ready' : status;
}

function hasAnyReferenceMap(options: GuidedProductionReferenceOptions): boolean {
  return Boolean(
    options.characterReferences ||
      options.locationReferences ||
      options.npcReferences ||
      (options.npcNames && options.npcNames.length > 0),
  );
}

export function getGuidedProductionMissingReferences(
  page: PageCard,
  options: GuidedProductionReferenceOptions,
): string[] {
  if (!hasAnyReferenceMap(options)) return [];
  const missingCharacters = splitListText(page.keyCharacters).filter(
    (name) => (options.characterReferences?.[name] ?? []).length === 0,
  );
  const missingLocations = splitListText(page.keyLocation).filter(
    (name) => (options.locationReferences?.[name] ?? []).length === 0,
  );
  const missingNpcs = (options.npcNames ?? []).filter(
    (name) => (options.npcReferences?.[name] ?? []).length === 0,
  );
  return [...missingCharacters, ...missingLocations, ...missingNpcs];
}

export function buildGuidedProductionPrepContext(options: {
  characterNames?: string[];
  locationName?: string;
  characterPrep?: Record<string, CharacterPrepState>;
  locationPrep?: Record<string, LocationPrepState>;
  propPrep?: Record<string, PropPrepState>;
  artDirection?: ArtDirectionState;
}): string {
  const characterNotes = (options.characterNames ?? [])
    .map((name) => {
      const prep = options.characterPrep?.[name];
      if (!prep) return '';
      const details = [
        prep.visualDescription && `visual: ${prep.visualDescription}`,
        prep.costumeNotes && `costume: ${prep.costumeNotes}`,
        prep.continuityNotes && `continuity: ${prep.continuityNotes}`,
        prep.expressionsMoods && `expressions: ${prep.expressionsMoods}`,
        prep.visualTags && `tags: ${prep.visualTags}`,
      ].filter(Boolean);
      return details.length > 0 ? `${name} (${details.join('; ')})` : '';
    })
    .filter(Boolean);
  const locationPrep = options.locationName ? options.locationPrep?.[options.locationName] : undefined;
  const locationNotes =
    options.locationName && locationPrep
      ? [
          locationPrep.settingSummary && `setting: ${locationPrep.settingSummary}`,
          locationPrep.moodTone && `mood: ${locationPrep.moodTone}`,
          locationPrep.environmentNotes && `environment: ${locationPrep.environmentNotes}`,
          locationPrep.lightingNotes && `lighting: ${locationPrep.lightingNotes}`,
          locationPrep.visualMotifs && `motifs: ${locationPrep.visualMotifs}`,
        ].filter(Boolean)
      : [];
  const propNotes = Object.values(options.propPrep ?? {})
    .map((prop) => {
      const details = [
        prop.continuityNotes && `continuity: ${prop.continuityNotes}`,
        prop.styleNotes && `style: ${prop.styleNotes}`,
        prop.reuseTracking && `reuse: ${prop.reuseTracking}`,
      ].filter(Boolean);
      return details.length > 0 ? `${prop.name} (${details.join('; ')})` : '';
    })
    .filter(Boolean);
  const styleNotes = [
    options.artDirection?.artStyle && `style: ${options.artDirection.artStyle}`,
    options.artDirection?.renderingStyle && `rendering: ${options.artDirection.renderingStyle}`,
    options.artDirection?.colorMood && `color: ${options.artDirection.colorMood}`,
    options.artDirection?.lighting && `lighting: ${options.artDirection.lighting}`,
    options.artDirection?.continuityNotes && `continuity: ${options.artDirection.continuityNotes}`,
  ].filter(Boolean);
  return [
    characterNotes.length > 0 ? `Characters: ${characterNotes.join(' | ')}` : '',
    locationNotes.length > 0 ? `Location ${options.locationName}: ${locationNotes.join('; ')}` : '',
    propNotes.length > 0 ? `Props: ${propNotes.join(' | ')}` : '',
    styleNotes.length > 0 ? `Project look: ${styleNotes.join('; ')}` : '',
  ]
    .filter(Boolean)
    .join('\n');
}

function getGuidedProductionDialogueText(
  pageNumber: number,
  panelNumber: number,
  options: {
    writerDialogueSeed?: GuidedComicBridgeDialogueSeed;
    editableDialogueSeeds?: GuidedComicEditableDialogueSeed[];
  },
): string {
  const editableText = (options.editableDialogueSeeds ?? [])
    .filter((seed) => seed.pageNumber === pageNumber && seed.panelNumber === panelNumber && seed.status !== 'rejected')
    .sort((a, b) => a.order - b.order)
    .map((seed) => {
      const text = seed.text.trim();
      if (!text) return '';
      return seed.speaker ? `${seed.speaker}: ${text}` : text;
    })
    .filter(Boolean)
    .join('\n');
  if (editableText) return editableText;
  return options.writerDialogueSeed?.panelSeeds.find((seed) => seed.panelNumber === panelNumber)?.dialogueText.trim() ?? '';
}

export function getGuidedProductionPagePanels(
  page: PageCard,
  options: {
    layoutTemplateId?: LayoutTemplateId;
    panelArtStatuses?: Record<string, PanelArtStatus>;
    panelArtImages?: Record<string, PanelArtImageState>;
    writerDialogueSeed?: GuidedComicBridgeDialogueSeed;
    editableDialogueSeeds?: GuidedComicEditableDialogueSeed[];
  } & GuidedProductionReferenceOptions,
): GuidedProductionPanel[] {
  const layoutPanels = getGuidedComicLayoutPanels(page, options.layoutTemplateId ?? 'auto');
  return layoutPanels.map((panel) => {
    const panelId = panel.panelId ?? panelArtQueueId(page.pageNumber, panel.panelNumber);
    const image = options.panelArtImages?.[panelId];
    return {
      panelId,
      panelNumber: panel.panelNumber,
      beatText: panel.beatText || page.panelBeats[panel.panelNumber - 1] || '',
      dialogueText: getGuidedProductionDialogueText(page.pageNumber, panel.panelNumber, options),
      status: options.panelArtStatuses?.[panelId] ?? 'needs-art',
      imageUrl: image?.imageUrl,
      imageSource: image?.source,
      layoutIntent: panel.intent,
    };
  });
}

export function getGuidedProductionPageStatus(
  page: PageCard,
  options: {
    layoutTemplateId?: LayoutTemplateId;
    panelArtStatuses?: Record<string, PanelArtStatus>;
    panelArtImages?: Record<string, PanelArtImageState>;
    writerDialogueSeed?: GuidedComicBridgeDialogueSeed;
    editableDialogueSeeds?: GuidedComicEditableDialogueSeed[];
  } & GuidedProductionReferenceOptions,
): GuidedProductionPageStatus {
  const panels = getGuidedProductionPagePanels(page, options);
  if (panels.length === 0 || !panels.some((panel) => panel.beatText.trim())) return 'needs beats';
  if (!panels.some((panel) => panel.dialogueText.trim())) return 'needs dialogue';
  if (getGuidedProductionMissingReferences(page, options).length > 0) return 'needs references';
  const allPanelsHaveArt = panels.every((panel) => panel.status !== 'needs-art' || Boolean(panel.imageUrl));
  if (!allPanelsHaveArt) return 'needs art';
  if (options.layoutTemplateId) return 'ready for Advanced Studio';
  return 'layout ready';
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

function buildEmptyGuidedComicProjectSnapshot(): GuidedComicProjectSnapshot {
  return {
    writerIssueId: null,
    setupForm: DEFAULT_SETUP_FORM,
    storyForm: DEFAULT_STORY_FORM,
    outlineBeats: cloneInitialOutlineBeats(),
    pageCards: [],
    characterReferences: {},
    locationReferences: {},
    npcReferences: {},
    panelArtStatuses: {},
    panelArtImages: {},
    issueCoverImage: null,
    pageLayoutTemplates: {},
    pageLayoutIntents: {},
    pageLayoutGeometry: {},
    writerDialogueSeeds: {},
    editableDialogueSeeds: {},
    promotedBalloonSeeds: {},
    artDirection: DEFAULT_ART_DIRECTION,
    currentStep: 'setup',
    selectedPanelId: null,
  };
}

function getInitialGuidedComicLibrarySeriesKey(projects: GuidedComicProject[]): string | null {
  return getGuidedComicLibrarySeriesGroups(projects)[0]?.seriesKey ?? null;
}

function getInitialGuidedComicLibraryStage(
  preferences: GuidedComicLibraryPreferences,
  selectedSeriesKey: string | null,
  requestedStepId?: GuidedComicStepId | null,
): GuidedComicLibraryStage {
  if (requestedStepId) return 'issue-workspace';
  if (preferences.entryLayout === 'last-series' && selectedSeriesKey) return 'series-focus';
  return 'series-gallery';
}

function timestampMs(value: string | null | undefined): number {
  if (!value) return 0;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function shouldRestoreLocalGuidedDraftOverProject(
  draft: GuidedComicDraftState | null,
  project: GuidedComicProject,
): draft is GuidedComicDraftState {
  if (!draft) return false;
  return timestampMs(draft.savedAt) > timestampMs(project.updatedAt);
}

function getGuidedComicNextIssueNumber(projects: GuidedComicProject[]): string {
  const highestIssueNumber = projects.reduce((highest, project) => {
    const parsed = Number.parseFloat(project.issueNumber || project.snapshot.setupForm.issueNumber);
    return Number.isFinite(parsed) ? Math.max(highest, parsed) : highest;
  }, 0);

  return String(Math.max(1, Math.floor(highestIssueNumber) + 1));
}

const GUIDED_COMIC_PLACEHOLDER_COVER_BACKGROUNDS = [
  'linear-gradient(155deg,#f4d06f 0%,#5c2037 46%,#121421 100%)',
  'linear-gradient(155deg,#8dd8e8 0%,#193b68 52%,#070b17 100%)',
  'linear-gradient(155deg,#f0efe4 0%,#27707d 48%,#131f29 100%)',
  'linear-gradient(155deg,#d9a56b 0%,#6b2b22 50%,#181018 100%)',
  'linear-gradient(155deg,#b8d86f 0%,#244226 48%,#0d1512 100%)',
  'linear-gradient(155deg,#bca0f0 0%,#39265f 48%,#12101d 100%)',
];

function getGuidedComicPlaceholderCoverBackground(seed: string): string {
  const hash = Array.from(seed || 'untitled').reduce((total, character) => total + character.charCodeAt(0), 0);
  return GUIDED_COMIC_PLACEHOLDER_COVER_BACKGROUNDS[hash % GUIDED_COMIC_PLACEHOLDER_COVER_BACKGROUNDS.length];
}

function getGuidedComicCoverMotionStyle(restTransform: string, hoverTransform: string): React.CSSProperties {
  return {
    '--guided-cover-rest-transform': restTransform,
    '--guided-cover-hover-transform': hoverTransform,
  } as React.CSSProperties;
}

function formatGuidedComicLibraryUpdatedAt(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Updated recently';
  return `Updated ${date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
}

function getGuidedProductionCustomBeatText(panel: GuidedProductionPanel): string {
  const beatText = panel.beatText.trim();
  if (!beatText || beatText === DEFAULT_PANEL_BEATS[panel.panelNumber - 1]) return '';
  return beatText;
}

export function GuidedComicFlow({ onNavigatePortal, onOpenAdvancedStudio, requestedStepId }: GuidedComicFlowProps) {
  const skipNextDraftSaveRef = useRef(false);
  const pageSectionRefs = useRef<Record<number, HTMLElement | null>>({});
  const layoutCanvasRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const panelUploadInputRef = useRef<HTMLInputElement | null>(null);
  const panelPasteTargetRef = useRef<HTMLDivElement | null>(null);
  const requestVaultSelection = useGuidedComicVaultBridge((s) => s.requestVaultSelection);
  const consumeVaultSelection = useGuidedComicVaultBridge((s) => s.consumeSelection);
  const requestGuidedComicHandoff = useImageWorkshopBridge((s) => s.requestGuidedComicHandoff);
  const consumeGuidedComicPanelImageReturn = useImageWorkshopBridge((s) => s.consumeGuidedComicPanelImageReturn);
  const requestLayoutHandoff = useGuidedComicLayoutBridge((s) => s.requestLayoutHandoff);
  const requestWriterIssueOpen = useWriterWorkshopBridge((s) => s.requestIssueOpen);
  const [libraryQaFixtureName] = useState(() => readGuidedComicLibraryQaFixtureName());
  const [restoredProjectState] = useState(() => {
    const qaFixtureLibrary = getGuidedComicLibraryQaFixture(libraryQaFixtureName);
    const qaFixtureProject =
      qaFixtureLibrary?.projects.find((project) => project.projectId === qaFixtureLibrary.activeProjectId) ??
      qaFixtureLibrary?.projects[0] ??
      null;

    if (libraryQaFixtureName) {
      return {
        draft: qaFixtureProject ? snapshotToGuidedComicDraft(qaFixtureProject.snapshot, qaFixtureProject.updatedAt) : null,
        library: qaFixtureLibrary,
        activeProjectId: qaFixtureProject?.projectId ?? null,
        migratedDraft: false,
      };
    }

    const library = readGuidedComicProjectLibrary();
    const activeProject =
      library?.projects.find((project) => project.projectId === library.activeProjectId) ?? library?.projects[0] ?? null;
    const draft = readGuidedComicDraft();
    if (library && activeProject) {
      return {
        draft: shouldRestoreLocalGuidedDraftOverProject(draft, activeProject)
          ? draft
          : snapshotToGuidedComicDraft(activeProject.snapshot, activeProject.updatedAt),
        library,
        activeProjectId: activeProject.projectId,
        migratedDraft: false,
      };
    }

    if (!draft) {
      return {
        draft: null,
        library: null,
        activeProjectId: null,
        migratedDraft: false,
      };
    }

    const migratedLibrary = createGuidedComicProjectLibrary(draftToGuidedComicProjectSnapshot(draft));
    return {
      draft,
      library: migratedLibrary,
      activeProjectId: migratedLibrary.activeProjectId,
      migratedDraft: true,
    };
  });
  const restoredDraft = restoredProjectState.draft;
  const [projectLibrary, setProjectLibrary] = useState<GuidedComicProjectLibrary | null>(() => restoredProjectState.library);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(() => restoredProjectState.activeProjectId);
  const [projectLibraryStatus, setProjectLibraryStatus] = useState<string | null>(() =>
    libraryQaFixtureName
      ? `Loaded local Comic Library QA fixture: ${libraryQaFixtureName}.`
      : restoredProjectState.migratedDraft
        ? 'Recovered current draft into Comic Library.'
        : null,
  );
  const [libraryPreferences, setLibraryPreferences] = useState<GuidedComicLibraryPreferences>(() =>
    readGuidedComicLibraryPreferences(),
  );
  const [selectedSeriesKey, setSelectedSeriesKey] = useState<string | null>(() =>
    getInitialGuidedComicLibrarySeriesKey(restoredProjectState.library?.projects ?? []),
  );
  const [libraryStage, setLibraryStage] = useState<GuidedComicLibraryStage>(() =>
    getInitialGuidedComicLibraryStage(
      libraryPreferences,
      getInitialGuidedComicLibrarySeriesKey(restoredProjectState.library?.projects ?? []),
      requestedStepId,
    ),
  );
  const [activeIndex, setActiveIndex] = useState(() => restoredDraft?.activeIndex ?? 0);
  const [writerIssueId, setWriterIssueId] = useState<string | null>(() => restoredDraft?.writerIssueId ?? null);
  const [setupForm, setSetupForm] = useState<SetupFormState>(() => restoredDraft?.setupForm ?? DEFAULT_SETUP_FORM);
  const [storyForm, setStoryForm] = useState<StoryFormState>(() => restoredDraft?.storyForm ?? DEFAULT_STORY_FORM);
  const [artDirection, setArtDirection] = useState<ArtDirectionState>(
    () => restoredDraft?.artDirection ?? DEFAULT_ART_DIRECTION,
  );
  const [outlineBeats, setOutlineBeats] = useState<OutlineBeat[]>(() => restoredDraft?.outlineBeats ?? cloneInitialOutlineBeats());
  const [pageCards, setPageCards] = useState<PageCard[]>(() => restoredDraft?.pageCards ?? []);
  const [activePageNumber, setActivePageNumber] = useState<number | null>(
    () => restoredDraft?.activePageNumber ?? restoredDraft?.pageCards?.[0]?.pageNumber ?? null,
  );
  const [reopenPreference, setReopenPreference] = useState<GuidedComicReopenPreference>(() =>
    readGuidedComicReopenPreference(),
  );
  const [workspaceMode, setWorkspaceMode] = useState<GuidedComicWorkspaceMode>(() => {
    const pageCount = restoredDraft?.pageCards?.length ?? 0;
    const initialReopenPreference = readGuidedComicReopenPreference();
    const requestedMode: GuidedComicWorkspaceMode | undefined =
      initialReopenPreference === 'last-active' ? restoredDraft?.workspaceMode : initialReopenPreference;
    return getGuidedComicWorkspaceMode(
      guidedComicStepIdFromIndex(restoredDraft?.activeIndex ?? 0),
      pageCount,
      requestedMode === 'panel-focus',
      requestedMode,
    );
  });
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
  const [characterPrep, setCharacterPrep] = useState<Record<string, CharacterPrepState>>(
    () => restoredDraft?.characterPrep ?? {},
  );
  const [locationPrep, setLocationPrep] = useState<Record<string, LocationPrepState>>(
    () => restoredDraft?.locationPrep ?? {},
  );
  const [propPrep, setPropPrep] = useState<Record<string, PropPrepState>>(
    () => restoredDraft?.propPrep ?? {},
  );
  const [newPropName, setNewPropName] = useState('');
  const [pendingPrepUpload, setPendingPrepUpload] = useState<{
    type: 'character' | 'location' | 'prop';
    name: string;
  } | null>(null);
  const prepUploadInputRef = useRef<HTMLInputElement | null>(null);
  const [npcReferenceName, setNpcReferenceName] = useState('');
  const [selectedPanelId, setSelectedPanelId] = useState<string | null>(() => restoredDraft?.selectedPanelId ?? null);
  const [panelArtStatuses, setPanelArtStatuses] = useState<Record<string, PanelArtStatus>>(
    () => restoredDraft?.panelArtStatuses ?? {},
  );
  const [panelArtImages, setPanelArtImages] = useState<Record<string, PanelArtImageState>>(
    () => restoredDraft?.panelArtImages ?? {},
  );
  const [issueCoverImage, setIssueCoverImage] = useState<PanelArtImageState | null>(
    () => restoredDraft?.issueCoverImage ?? null,
  );
  const [panelPasteMessage, setPanelPasteMessage] = useState<string | null>(null);
  const [coverPasteMessage, setCoverPasteMessage] = useState<string | null>(null);
  const [pageLayoutTemplates, setPageLayoutTemplates] = useState<Record<number, LayoutTemplateId>>(
    () => restoredDraft?.pageLayoutTemplates ?? {},
  );
  const [pageLayoutIntents, setPageLayoutIntents] = useState<Record<number, GuidedComicLayoutIntent>>(
    () => restoredDraft?.pageLayoutIntents ?? {},
  );
  const [pageLayoutGeometry, setPageLayoutGeometry] = useState<Record<number, GuidedComicPanelGeometry[]>>(
    () => restoredDraft?.pageLayoutGeometry ?? {},
  );
  const [writerDialogueSeeds, setWriterDialogueSeeds] = useState<Record<number, GuidedComicBridgeDialogueSeed>>(
    () => restoredDraft?.writerDialogueSeeds ?? {},
  );
  const [editableDialogueSeeds, setEditableDialogueSeeds] = useState<Record<number, GuidedComicEditableDialogueSeed[]>>(
    () => restoredDraft?.editableDialogueSeeds ?? {},
  );
  const [promotedBalloonSeeds, setPromotedBalloonSeeds] = useState<Record<number, GuidedComicBalloonSeed[]>>(
    () => restoredDraft?.promotedBalloonSeeds ?? {},
  );
  const [writerBridgeExpanded, setWriterBridgeExpanded] = useState(false);
  const [writerBridgeSeries, setWriterBridgeSeries] = useState<WriterSeriesRow[]>([]);
  const [writerBridgeIssues, setWriterBridgeIssues] = useState<WriterIssueRow[]>([]);
  const [writerBridgeSelectedSeriesId, setWriterBridgeSelectedSeriesId] = useState<string>('');
  const [writerBridgeSelectedIssueId, setWriterBridgeSelectedIssueId] = useState<string>(() => restoredDraft?.writerIssueId ?? '');
  const [writerBridgeBusyAction, setWriterBridgeBusyAction] = useState<
    'load' | 'create' | 'delete' | 'link' | 'import' | 'open' | GuidedWriterToolAction | null
  >(null);
  const [writerBridgeMessage, setWriterBridgeMessage] = useState<string | null>(null);
  const [writerBridgeError, setWriterBridgeError] = useState<string | null>(null);
  const [layoutDisclosureMode, setLayoutDisclosureMode] = useState<GuidedLayoutDisclosureMode>('simple');
  const [activeLayoutEdit, setActiveLayoutEdit] = useState<ActiveLayoutEdit | null>(null);
  const [activeImageFramingDrag, setActiveImageFramingDrag] = useState<ActiveImageFramingDrag | null>(null);
  const [pageNavigatorVisible, setPageNavigatorVisible] = useState(true);
  const [, setProductionPanelFocusOpen] = useState(() => workspaceMode === 'panel-focus');
  const [primaryActionMessage, setPrimaryActionMessage] = useState<string | null>(null);
  const [draftSavedAt, setDraftSavedAt] = useState<string | null>(() => restoredDraft?.savedAt ?? null);
  const [guidedAiLoadingAction, setGuidedAiLoadingAction] = useState<GuidedComicAssistAction | null>(null);
  const [guidedAiError, setGuidedAiError] = useState<string | null>(null);
  const [guidedAiPreview, setGuidedAiPreview] = useState<{
    action: GuidedComicAssistAction;
    label: string;
    result: GuidedComicAssistResult;
    selectedOnly: boolean;
  } | null>(null);
  const [comicProjectMetadataDialog, setComicProjectMetadataDialog] = useState<ComicProjectMetadataDialog>(null);
  const [guidedAiAcceptedNotes, setGuidedAiAcceptedNotes] = useState<Pick<
    GuidedComicAssistResult,
    'pacingNotes' | 'referenceNeeds' | 'dialogueNotes' | 'narrationNotes'
  > | null>(null);
  const coverUploadInputRef = useRef<HTMLInputElement | null>(null);
  const coverPasteTargetRef = useRef<HTMLDivElement | null>(null);
  const currentProject = useMemo(
    () => projectLibrary?.projects.find((project) => project.projectId === activeProjectId) ?? null,
    [activeProjectId, projectLibrary],
  );
  const librarySeriesGroups = useMemo(
    () => getGuidedComicLibrarySeriesGroups(projectLibrary?.projects ?? [], libraryPreferences.seriesCoverProjectIds),
    [libraryPreferences.seriesCoverProjectIds, projectLibrary],
  );
  const selectedSeriesGroup = useMemo(
    () => librarySeriesGroups.find((group) => group.seriesKey === selectedSeriesKey) ?? librarySeriesGroups[0] ?? null,
    [librarySeriesGroups, selectedSeriesKey],
  );
  const recentLibraryProjects = useMemo(
    () =>
      [...(projectLibrary?.projects ?? [])]
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
        .slice(0, 4),
    [projectLibrary],
  );
  const completedLibraryIssueCount = useMemo(
    () => getGuidedComicCompletedIssueCount(projectLibrary?.projects ?? []),
    [projectLibrary],
  );
  const livingArchiveUnlocked = useMemo(
    () => isGuidedComicLivingArchiveUnlocked(projectLibrary?.projects ?? []),
    [projectLibrary],
  );
  const livingArchiveEnabled = livingArchiveUnlocked && libraryPreferences.livingArchiveBackgroundEnabled;
  const livingArchiveCoverUrls = useMemo(
    () =>
      (projectLibrary?.projects ?? [])
        .filter((project) => project.snapshot.currentStep === 'export')
        .map((project) => getGuidedComicProjectCoverImageUrl(project))
        .filter((coverImageUrl): coverImageUrl is string => Boolean(coverImageUrl))
        .slice(0, 10),
    [projectLibrary],
  );
  const guidedLayoutSettings = useMemo<GuidedComicLayoutSettings>(
    () => ({
      marginMode: setupForm.layoutMarginMode,
      gutterMode: setupForm.layoutGutterMode,
    }),
    [setupForm.layoutGutterMode, setupForm.layoutMarginMode],
  );
  const currentProjectSnapshot = useMemo<GuidedComicProjectSnapshot>(
    () => ({
      writerIssueId,
      setupForm,
      storyForm,
      outlineBeats,
      pageCards,
      characterReferences,
      locationReferences,
      npcReferences,
      characterPrep,
      locationPrep,
      propPrep,
      panelArtStatuses,
      panelArtImages,
      issueCoverImage,
      pageLayoutTemplates,
      pageLayoutIntents,
      pageLayoutGeometry,
      writerDialogueSeeds,
      editableDialogueSeeds,
      promotedBalloonSeeds,
      artDirection,
      currentStep: activeStep.id,
      selectedPanelId,
      activePageNumber,
      workspaceMode,
    }),
    [
      activeStep.id,
      activePageNumber,
      artDirection,
      characterPrep,
      characterReferences,
      editableDialogueSeeds,
      issueCoverImage,
      locationPrep,
      locationReferences,
      npcReferences,
      outlineBeats,
      pageCards,
      pageLayoutTemplates,
      pageLayoutIntents,
      pageLayoutGeometry,
      panelArtImages,
      panelArtStatuses,
      promotedBalloonSeeds,
      propPrep,
      selectedPanelId,
      setupForm,
      storyForm,
      workspaceMode,
      writerDialogueSeeds,
      writerIssueId,
    ],
  );
  const hasUnsavedProjectChanges = useMemo(
    () => isGuidedComicProjectSnapshotDirty(currentProjectSnapshot, currentProject),
    [currentProject, currentProjectSnapshot],
  );
  const hasSavedLibraryProjects = Boolean(projectLibrary?.projects.length);
  const currentComicDisplayName = currentProject
    ? getGuidedComicProjectDisplayName(currentProject)
    : getGuidedComicProjectDisplayName({
        seriesTitle: setupForm.seriesTitle,
        issueTitle: setupForm.issueTitle,
        issueNumber: setupForm.issueNumber,
      });
  const writerBridgeIssueOptions = useMemo(
    () =>
      writerBridgeIssues.map((issue) => ({
        issue,
        seriesTitle: writerBridgeSeries.find((series) => series.id === issue.series_id)?.title ?? 'Untitled series',
      })),
    [writerBridgeIssues, writerBridgeSeries],
  );
  const selectedWriterBridgeIssue =
    writerBridgeIssueOptions.find((option) => option.issue.id === writerBridgeSelectedIssueId) ??
    writerBridgeIssueOptions.find((option) => option.issue.id === writerIssueId) ??
    null;
  const linkedWriterBridgeIssue =
    writerBridgeIssueOptions.find((option) => option.issue.id === writerIssueId) ?? selectedWriterBridgeIssue;
  const writerDialogueSeedCount = Object.values(writerDialogueSeeds).reduce(
    (total, seed) => total + seed.panelSeeds.length,
    0,
  );

  useEffect(() => {
    if (libraryQaFixtureName) return;
    if (!projectLibrary) return;
    writeGuidedComicProjectLibrary(projectLibrary);
  }, [libraryQaFixtureName, projectLibrary]);

  useEffect(() => {
    if (librarySeriesGroups.length === 0) {
      if (selectedSeriesKey !== null) setSelectedSeriesKey(null);
      if (libraryStage === 'series-focus' || libraryStage === 'issue-gallery') setLibraryStage('series-gallery');
      return;
    }

    if (selectedSeriesKey && librarySeriesGroups.some((group) => group.seriesKey === selectedSeriesKey)) return;
    setSelectedSeriesKey(librarySeriesGroups[0]?.seriesKey ?? null);
  }, [librarySeriesGroups, libraryStage, selectedSeriesKey]);

  useEffect(() => {
    if (livingArchiveUnlocked || !libraryPreferences.livingArchiveBackgroundEnabled) return;
    const nextPreferences = {
      ...libraryPreferences,
      livingArchiveBackgroundEnabled: false,
    };
    setLibraryPreferences(nextPreferences);
    writeGuidedComicLibraryPreferences(nextPreferences);
  }, [libraryPreferences, livingArchiveUnlocked]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(GUIDED_COMIC_REOPEN_PREFERENCE_STORAGE_KEY, reopenPreference);
    } catch {
      // Browsers can deny localStorage access; the preference can remain in memory.
    }
  }, [reopenPreference]);

  useEffect(() => {
    if (!projectLibraryStatus) return;
    const timeout = window.setTimeout(() => setProjectLibraryStatus(null), PROJECT_LIBRARY_STATUS_CLEAR_DELAY_MS);
    return () => window.clearTimeout(timeout);
  }, [projectLibraryStatus]);

  useEffect(() => {
    if (writerIssueId) setWriterBridgeSelectedIssueId(writerIssueId);
  }, [writerIssueId]);

  const applyGuidedComicProjectSnapshot = useCallback((snapshot: GuidedComicProjectSnapshot, savedAt: string | null) => {
    const draft = snapshotToGuidedComicDraft(snapshot, savedAt ?? '');
    setActiveIndex(draft.activeIndex);
    setWriterIssueId(draft.writerIssueId ?? null);
    setSetupForm(draft.setupForm);
    setStoryForm(draft.storyForm);
    setArtDirection(draft.artDirection);
    setOutlineBeats(draft.outlineBeats);
    setPageCards(draft.pageCards);
    setActivePageNumber(draft.activePageNumber ?? draft.pageCards[0]?.pageNumber ?? null);
    setWorkspaceMode(draft.workspaceMode ?? getGuidedComicWorkspaceMode(guidedComicStepIdFromIndex(draft.activeIndex), draft.pageCards.length, false));
    setProductionPanelFocusOpen(draft.workspaceMode === 'panel-focus');
    setCharacterReferences(draft.characterReferences);
    setLocationReferences(draft.locationReferences);
    setNpcReferences(draft.npcReferences);
    setCharacterPrep(draft.characterPrep);
    setLocationPrep(draft.locationPrep);
    setPropPrep(draft.propPrep);
    setNewPropName('');
    setNpcReferenceName('');
    setSelectedPanelId(draft.selectedPanelId);
    setPanelArtStatuses(draft.panelArtStatuses);
    setPanelArtImages(draft.panelArtImages);
    setIssueCoverImage(draft.issueCoverImage ?? null);
    setCoverPasteMessage(null);
    setPageLayoutTemplates(draft.pageLayoutTemplates);
    setPageLayoutIntents(draft.pageLayoutIntents);
    setPageLayoutGeometry(draft.pageLayoutGeometry);
    setWriterDialogueSeeds(draft.writerDialogueSeeds);
    setEditableDialogueSeeds(draft.editableDialogueSeeds);
    setPromotedBalloonSeeds(draft.promotedBalloonSeeds);
    setWriterBridgeSelectedIssueId(draft.writerIssueId ?? '');
    setDraftSavedAt(savedAt);
  }, []);

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
      setPageLayoutGeometry((current) =>
        Object.fromEntries(
          Object.entries(current).map(([pageNumber, geometry]) => [
            pageNumber,
            geometry.map((panel) =>
              panel.panelId === panelId
                ? {
                  ...panel,
                  imageId: image.imageId,
                  imageUrl: image.imageUrl,
                  }
                : panel,
            ),
          ]),
        ) as Record<number, GuidedComicPanelGeometry[]>,
      );
      setPanelArtStatuses((current) => ({ ...current, [panelId]: 'ready' }));
    },
    [setPageLayoutGeometry, setPanelArtImages, setPanelArtStatuses, setSelectedPanelId],
  );

  useEffect(() => {
    if (!requestedStepId) return;
    const requestedIndex = STEPS.findIndex((step) => step.id === requestedStepId);
    if (requestedIndex === -1) return;
    setLibraryStage('issue-workspace');
    setActiveIndex(requestedIndex);
    setProductionPanelFocusOpen(false);
    setWorkspaceMode(getGuidedComicWorkspaceMode(STEPS[requestedIndex]?.id ?? 'setup', pageCards.length, false));
  }, [pageCards.length, requestedStepId]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (skipNextDraftSaveRef.current) {
      skipNextDraftSaveRef.current = false;
      return;
    }

    const draft: GuidedComicDraftState = {
      version: 1,
      savedAt: new Date().toISOString(),
      writerIssueId,
      activeIndex,
      activePageNumber,
      workspaceMode,
      setupForm,
      storyForm,
      artDirection,
      outlineBeats,
      pageCards,
      characterReferences,
      locationReferences,
      npcReferences,
      characterPrep,
      locationPrep,
      propPrep,
      selectedPanelId,
      panelArtStatuses,
      panelArtImages,
      issueCoverImage,
      pageLayoutTemplates,
      pageLayoutIntents,
      pageLayoutGeometry,
      writerDialogueSeeds,
      editableDialogueSeeds,
      promotedBalloonSeeds,
    };

    try {
      window.localStorage.setItem(GUIDED_COMIC_DRAFT_STORAGE_KEY, JSON.stringify(draft));
      setDraftSavedAt(draft.savedAt);
    } catch {
      setDraftSavedAt(null);
    }
  }, [
    activeIndex,
    activePageNumber,
    artDirection,
    characterPrep,
    characterReferences,
    editableDialogueSeeds,
    issueCoverImage,
    locationPrep,
    locationReferences,
    npcReferences,
    outlineBeats,
    pageCards,
    pageLayoutTemplates,
    pageLayoutIntents,
    pageLayoutGeometry,
    panelArtImages,
    panelArtStatuses,
    promotedBalloonSeeds,
    propPrep,
    selectedPanelId,
    setupForm,
    storyForm,
    workspaceMode,
    writerDialogueSeeds,
    writerIssueId,
  ]);

  useEffect(() => {
    const selection = consumeVaultSelection();
    if (!selection) return;

    if (selection.type === 'panel-art') {
      const fallbackPanelContext = parsePanelArtQueueId(selection.name);
      const selectionPageNumber = selection.pageNumber ?? fallbackPanelContext?.pageNumber ?? activePageNumber;

      setLibraryStage('issue-workspace');
      if (selectionPageNumber) setActivePageNumber(selectionPageNumber);
      setActiveIndex(STEPS.findIndex((step) => step.id === 'art'));
      setWorkspaceMode('panel-focus');
      setProductionPanelFocusOpen(true);
      assignPanelArtImage(selection.name, {
        imageId: selection.referenceId,
        imageUrl: selection.imageUrl,
        source: 'vault',
        sourceLabel: selection.sourceLabel,
      });
      return;
    }

    if (selection.type === 'cover') {
      setLibraryStage('issue-workspace');
      setActiveIndex(STEPS.findIndex((step) => step.id === 'art'));
      setWorkspaceMode('issue-cover');
      setProductionPanelFocusOpen(false);
      setIssueCoverImage({
        imageId: selection.referenceId,
        imageUrl: selection.imageUrl,
        source: 'vault',
        sourceLabel: selection.sourceLabel,
        returnedAt: new Date().toISOString(),
      });
      setCoverPasteMessage(`Assigned ${selection.displayName || selection.sourceLabel} as the issue cover.`);
      return;
    }

    setLibraryStage('issue-workspace');
    setActiveIndex(STEPS.findIndex((step) => step.id === 'visual-prep'));
    setWorkspaceMode('story-prep');
    setProductionPanelFocusOpen(false);
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

    if (selection.type === 'prop') {
      setPropPrep((current) => ({
        ...current,
        [selection.name]: {
          ...DEFAULT_PROP_PREP,
          ...(current[selection.name] ?? { name: selection.name }),
          name: selection.name,
          references: [...(current[selection.name]?.references ?? []), reference],
        },
      }));
      return;
    }

    setLocationReferences((current) => ({
      ...current,
      [selection.name]: [...(current[selection.name] ?? []), reference],
    }));
  }, [activePageNumber, assignPanelArtImage, consumeVaultSelection]);

  useEffect(() => {
    const panelReturn = consumeGuidedComicPanelImageReturn();
    if (!panelReturn) return;

    const panelId = panelReturn.panelId ?? panelArtQueueId(panelReturn.pageNumber, panelReturn.panelNumber);
    setActiveIndex(STEPS.findIndex((step) => step.id === 'art'));
    setWorkspaceMode('panel-focus');
    setProductionPanelFocusOpen(true);
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
    setPageLayoutGeometry((current) => {
      let changed = false;
      const next: Record<number, GuidedComicPanelGeometry[]> = {};
      pageCards.forEach((page) => {
        const templateId = pageLayoutTemplates[page.pageNumber] ?? 'auto';
        const synced = syncGuidedComicLayoutGeometry(page, current[page.pageNumber], templateId, guidedLayoutSettings);
        next[page.pageNumber] = synced;
        if (JSON.stringify(synced) !== JSON.stringify(current[page.pageNumber] ?? [])) {
          changed = true;
        }
      });
      if (Object.keys(current).some((pageNumber) => !next[Number(pageNumber)])) {
        changed = true;
      }
      return changed ? next : current;
    });
  }, [guidedLayoutSettings, isLayoutStep, pageCards, pageLayoutTemplates]);

  useEffect(() => {
    if (!shouldRenderGuidedPageNavigator(activeStep.id, pageCards.length)) return;
    if (pageCards.some((page) => page.pageNumber === activePageNumber)) return;
    setActivePageNumber(pageCards[0]?.pageNumber ?? null);
  }, [activePageNumber, activeStep.id, pageCards]);

  useEffect(() => {
    if (pageCards.length > 0) return;
    if (workspaceMode === 'story-prep') return;
    setProductionPanelFocusOpen(false);
    setWorkspaceMode('story-prep');
  }, [pageCards.length, workspaceMode]);

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

  const moveToStepIndex = (nextIndex: number) => {
    const safeIndex = Math.max(0, Math.min(STEPS.length - 1, nextIndex));
    setActiveIndex(safeIndex);
    setProductionPanelFocusOpen(false);
    setWorkspaceMode(
      getGuidedComicWorkspaceMode(STEPS[safeIndex]?.id ?? 'setup', pageCards.length, false, undefined),
    );
  };
  const openIssueLightbox = () => {
    setProductionPanelFocusOpen(false);
    setWorkspaceMode(pageCards.length > 0 ? 'issue-lightbox' : 'story-prep');
  };
  const openPageProduction = (pageNumber = activePageNumber ?? pageCards[0]?.pageNumber ?? null) => {
    if (pageNumber) setActivePageNumber(pageNumber);
    setActiveIndex(STEPS.findIndex((step) => step.id === 'art'));
    setProductionPanelFocusOpen(false);
    setWorkspaceMode(pageCards.length > 0 ? 'page-production' : 'story-prep');
  };
  const goBack = () => moveToStepIndex(activeIndex - 1);
  const goNext = () => moveToStepIndex(activeIndex + 1);
  const handlePrimaryStepAction = () => {
    if (isExportStep) {
      setPrimaryActionMessage(
        'Export review is ready. Download packaging is not wired yet, so use Advanced Studio for final canvas export after review.',
      );
      return;
    }

    setPrimaryActionMessage(null);
    goNext();
  };
  const jumpToPage = (pageNumber: number) => {
    setActivePageNumber(pageNumber);
    setProductionPanelFocusOpen(false);
    setWorkspaceMode(workspaceMode === 'issue-lightbox' ? 'issue-lightbox' : 'page-production');
    pageSectionRefs.current[pageNumber]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  const saveCurrentComic = () => {
    const timestamp = new Date().toISOString();
    const project = createGuidedComicProject(currentProjectSnapshot, {
      projectId: currentProject?.projectId,
      createdAt: currentProject?.createdAt ?? timestamp,
      updatedAt: timestamp,
    });
    const nextLibrary = upsertGuidedComicProject(
      projectLibrary ?? {
        version: 1,
        activeProjectId: project.projectId,
        updatedAt: timestamp,
        projects: [],
      },
      project,
      true,
    );
    setProjectLibrary(nextLibrary);
    setActiveProjectId(project.projectId);
    setProjectLibraryStatus(`Saved ${getGuidedComicProjectDisplayName(project)}.`);
  };
  const openSaveAsDialog = () => {
    setComicProjectMetadataDialog({
      mode: 'save-as',
      form: {
        seriesTitle: setupForm.seriesTitle || currentProject?.seriesTitle || 'Untitled guided comic',
        issueTitle: setupForm.issueTitle || currentProject?.issueTitle || '',
        issueNumber: setupForm.issueNumber || currentProject?.issueNumber || '1',
      },
    });
  };
  const openRenameDialog = () => {
    setComicProjectMetadataDialog({
      mode: 'rename',
      form: {
        seriesTitle: currentProject?.seriesTitle || setupForm.seriesTitle || 'Untitled guided comic',
        issueTitle: currentProject?.issueTitle || setupForm.issueTitle || '',
        issueNumber: currentProject?.issueNumber || setupForm.issueNumber || '1',
      },
    });
  };
  const updateComicProjectMetadataField = (field: keyof ComicProjectMetadataForm, value: string) => {
    setComicProjectMetadataDialog((dialog) =>
      dialog
        ? {
            ...dialog,
            form: {
              ...dialog.form,
              [field]: value,
            },
          }
        : dialog,
    );
  };
  const submitComicProjectMetadataDialog = () => {
    if (!comicProjectMetadataDialog) return;

    const timestamp = new Date().toISOString();
    const metadata = {
      seriesTitle: comicProjectMetadataDialog.form.seriesTitle.trim() || 'Untitled guided comic',
      issueTitle: comicProjectMetadataDialog.form.issueTitle.trim(),
      issueNumber: comicProjectMetadataDialog.form.issueNumber.trim() || '1',
    };

    if (comicProjectMetadataDialog.mode === 'save-as') {
      const snapshot: GuidedComicProjectSnapshot = {
        ...currentProjectSnapshot,
        setupForm: {
          ...currentProjectSnapshot.setupForm,
          ...metadata,
        },
      };
      const project = createGuidedComicProject(snapshot, {
        createdAt: timestamp,
        updatedAt: timestamp,
      });
      const nextLibrary = upsertGuidedComicProject(
        projectLibrary ?? {
          version: 1,
          activeProjectId: project.projectId,
          updatedAt: timestamp,
          projects: [],
        },
        project,
        true,
      );
      setProjectLibrary(nextLibrary);
      setActiveProjectId(project.projectId);
      applyGuidedComicProjectSnapshot(project.snapshot, project.updatedAt);
      setComicProjectMetadataDialog(null);
      setProjectLibraryStatus(`Saved new comic ${getGuidedComicProjectDisplayName(project)}.`);
      return;
    }

    if (!projectLibrary || !currentProject) {
      const snapshot: GuidedComicProjectSnapshot = {
        ...currentProjectSnapshot,
        setupForm: {
          ...currentProjectSnapshot.setupForm,
          ...metadata,
        },
      };
      const project = createGuidedComicProject(snapshot, {
        createdAt: timestamp,
        updatedAt: timestamp,
      });
      const nextLibrary = upsertGuidedComicProject(
        projectLibrary ?? {
          version: 1,
          activeProjectId: project.projectId,
          updatedAt: timestamp,
          projects: [],
        },
        project,
        true,
      );
      setProjectLibrary(nextLibrary);
      setActiveProjectId(project.projectId);
      applyGuidedComicProjectSnapshot(project.snapshot, project.updatedAt);
      setComicProjectMetadataDialog(null);
      setProjectLibraryStatus(`Saved ${getGuidedComicProjectDisplayName(project)}.`);
      return;
    }

    const renamedLibrary = renameGuidedComicProject(projectLibrary, currentProject.projectId, {
      ...metadata,
      updatedAt: timestamp,
    });
    const renamedProject = renamedLibrary.projects.find((project) => project.projectId === currentProject.projectId);
    if (renamedProject) {
      const snapshot: GuidedComicProjectSnapshot = {
        ...renamedProject.snapshot,
        setupForm: {
          ...renamedProject.snapshot.setupForm,
          seriesTitle: renamedProject.seriesTitle,
          issueTitle: renamedProject.issueTitle,
          issueNumber: renamedProject.issueNumber,
        },
      };
      const nextProject: GuidedComicProject = {
        ...renamedProject,
        snapshot,
      };
      const nextLibrary = upsertGuidedComicProject(renamedLibrary, nextProject, true);
      setProjectLibrary(nextLibrary);
      applyGuidedComicProjectSnapshot(snapshot, nextProject.updatedAt);
      setComicProjectMetadataDialog(null);
      setProjectLibraryStatus(`Renamed to ${getGuidedComicProjectDisplayName(nextProject)}.`);
    }
  };
  const duplicateCurrentComic = () => {
    const timestamp = new Date().toISOString();
    const baseProject = createGuidedComicProject(currentProjectSnapshot, {
      projectId: currentProject?.projectId,
      createdAt: currentProject?.createdAt ?? timestamp,
      updatedAt: timestamp,
    });
    const duplicatedProject = duplicateGuidedComicProject(baseProject, {
      createdAt: timestamp,
      updatedAt: timestamp,
    });
    const nextLibrary = upsertGuidedComicProject(
      projectLibrary ?? {
        version: 1,
        activeProjectId: duplicatedProject.projectId,
        updatedAt: timestamp,
        projects: [],
      },
      duplicatedProject,
      true,
    );
    setProjectLibrary(nextLibrary);
    setActiveProjectId(duplicatedProject.projectId);
    applyGuidedComicProjectSnapshot(duplicatedProject.snapshot, duplicatedProject.updatedAt);
    setProjectLibraryStatus(`Duplicated ${getGuidedComicProjectDisplayName(duplicatedProject)}.`);
  };
  const startNewComic = () => {
    const confirmed = window.confirm(
      hasUnsavedProjectChanges
        ? 'Start a new guided comic? Unsaved changes in the current comic will stay in the recovery draft, but they will not be saved to the Comic Library.'
        : 'Start a new guided comic?',
    );
    if (!confirmed) return false;

    setActiveProjectId(null);
    applyGuidedComicProjectSnapshot(buildEmptyGuidedComicProjectSnapshot(), null);
    setProjectLibraryStatus('Started a new unsaved guided comic.');
    return true;
  };
  const switchCurrentComic = (projectId: string) => {
    if (!projectLibrary) return false;
    if (projectId === activeProjectId) return true;
    const project = projectLibrary.projects.find((candidate) => candidate.projectId === projectId);
    if (!project) return false;
    if (hasUnsavedProjectChanges) {
      const confirmed = window.confirm(
        'Switch comics without saving current changes to the Comic Library? The recovery draft will still keep the latest browser state.',
      );
      if (!confirmed) return false;
    }
    setActiveProjectId(project.projectId);
    setProjectLibrary({
      ...projectLibrary,
      activeProjectId: project.projectId,
      updatedAt: new Date().toISOString(),
    });
    applyGuidedComicProjectSnapshot(project.snapshot, project.updatedAt);
    setProjectLibraryStatus(`Loaded ${getGuidedComicProjectDisplayName(project)}.`);
    return true;
  };
  const openLibrarySeriesFocus = (seriesKey: string) => {
    setSelectedSeriesKey(seriesKey);
    setLibraryStage('series-focus');
  };
  const openLibraryIssueGallery = (seriesKey = selectedSeriesGroup?.seriesKey) => {
    if (seriesKey) setSelectedSeriesKey(seriesKey);
    setLibraryStage('issue-gallery');
  };
  const openLibraryIssueWorkspace = (projectId: string) => {
    if (switchCurrentComic(projectId)) {
      setWorkspaceMode('issue-cover');
      setProductionPanelFocusOpen(false);
      setLibraryStage('issue-workspace');
    }
  };
  const startLibraryNewSeries = () => {
    if (!startNewComic()) return;
    setSelectedSeriesKey(null);
    setWorkspaceMode('story-prep');
    setLibraryStage('issue-workspace');
  };
  const startLibraryNewIssue = () => {
    if (!selectedSeriesGroup) return;
    const snapshot: GuidedComicProjectSnapshot = {
      ...buildEmptyGuidedComicProjectSnapshot(),
      setupForm: {
        ...DEFAULT_SETUP_FORM,
        seriesTitle: selectedSeriesGroup.seriesTitle,
        issueNumber: getGuidedComicNextIssueNumber(selectedSeriesGroup.projects),
      },
    };

    setActiveProjectId(null);
    applyGuidedComicProjectSnapshot(snapshot, null);
    setWorkspaceMode('story-prep');
    setProjectLibraryStatus(`Started a new ${selectedSeriesGroup.seriesTitle} issue.`);
    setLibraryStage('issue-workspace');
  };
  const updateLibraryEntryLayout = (value: unknown) => {
    const entryLayout = normalizeGuidedComicLibraryEntryLayout(value);
    const nextPreferences = {
      ...libraryPreferences,
      entryLayout,
    };
    setLibraryPreferences(nextPreferences);
    writeGuidedComicLibraryPreferences(nextPreferences);

    if (entryLayout === 'last-series' && selectedSeriesGroup) {
      setLibraryStage('series-focus');
      return;
    }

    setLibraryStage('series-gallery');
  };
  const updateLivingArchiveBackgroundEnabled = (enabled: boolean) => {
    const nextPreferences = {
      ...libraryPreferences,
      livingArchiveBackgroundEnabled: livingArchiveUnlocked ? enabled : false,
    };
    setLibraryPreferences(nextPreferences);
    writeGuidedComicLibraryPreferences(nextPreferences);
  };
  const updateLibrarySeriesCoverProject = (seriesKey: string, projectId: string) => {
    const nextPreferences = {
      ...libraryPreferences,
      seriesCoverProjectIds: {
        ...libraryPreferences.seriesCoverProjectIds,
        [seriesKey]: projectId,
      },
    };
    setLibraryPreferences(nextPreferences);
    writeGuidedComicLibraryPreferences(nextPreferences);
    setProjectLibraryStatus('Series cover updated.');
  };
  const applyGuidedLibraryDeletion = (
    nextLibrary: GuidedComicProjectLibrary,
    deletedActiveProject: boolean,
    message: string,
  ) => {
    const savedLibrary = nextLibrary.projects.length > 0 ? nextLibrary : null;
    const nextProject = savedLibrary?.projects.find((project) => project.projectId === savedLibrary.activeProjectId) ?? null;
    setProjectLibrary(savedLibrary);
    setActiveProjectId(nextProject?.projectId ?? null);
    if (!libraryQaFixtureName) writeGuidedComicProjectLibrary(savedLibrary);
    if (deletedActiveProject || !nextProject) {
      applyGuidedComicProjectSnapshot(nextProject?.snapshot ?? buildEmptyGuidedComicProjectSnapshot(), nextProject?.updatedAt ?? null);
    }
    setProjectLibraryStatus(message);
  };
  const deleteLibraryIssue = (project: GuidedComicProject, nextStage: GuidedComicLibraryStage = libraryStage) => {
    if (!projectLibrary) return;
    const confirmed = window.confirm(`Delete Guided issue "${getGuidedComicProjectDisplayName(project)}" from this browser?`);
    if (!confirmed) return;

    const nextLibrary = deleteGuidedComicProject(projectLibrary, project.projectId);
    const deletedActiveProject = activeProjectId === project.projectId;
    applyGuidedLibraryDeletion(
      nextLibrary,
      deletedActiveProject,
      `Deleted Guided issue ${getGuidedComicProjectDisplayName(project)}.`,
    );

    const remainingGroups = getGuidedComicLibrarySeriesGroups(
      nextLibrary.projects,
      libraryPreferences.seriesCoverProjectIds,
    );
    const sameSeriesStillExists = remainingGroups.some((group) => group.seriesKey === selectedSeriesKey);
    setLibraryStage(sameSeriesStillExists ? nextStage : 'series-gallery');
    if (!sameSeriesStillExists) setSelectedSeriesKey(remainingGroups[0]?.seriesKey ?? null);
  };
  const deleteLibrarySeries = (seriesGroup: GuidedComicSeriesGroup | null = selectedSeriesGroup) => {
    if (!projectLibrary || !seriesGroup) return;
    const confirmed = window.confirm(
      `Delete Guided series "${seriesGroup.seriesTitle}" and all ${seriesGroup.projects.length} issue${
        seriesGroup.projects.length === 1 ? '' : 's'
      } from this browser?`,
    );
    if (!confirmed) return;

    const deletedProjectIds = new Set(seriesGroup.projects.map((project) => project.projectId));
    const nextProjects = projectLibrary.projects.filter((project) => !deletedProjectIds.has(project.projectId));
    const activeProjectWasDeleted = Boolean(activeProjectId && deletedProjectIds.has(activeProjectId));
    const nextActiveProjectId =
      activeProjectWasDeleted || !nextProjects.some((project) => project.projectId === projectLibrary.activeProjectId)
        ? nextProjects[0]?.projectId ?? null
        : projectLibrary.activeProjectId;
    const nextLibrary: GuidedComicProjectLibrary = {
      ...projectLibrary,
      activeProjectId: nextActiveProjectId,
      updatedAt: new Date().toISOString(),
      projects: nextProjects,
    };
    applyGuidedLibraryDeletion(
      nextLibrary,
      activeProjectWasDeleted,
      `Deleted Guided series ${seriesGroup.seriesTitle}.`,
    );

    const nextGroups = getGuidedComicLibrarySeriesGroups(nextProjects, libraryPreferences.seriesCoverProjectIds);
    setSelectedSeriesKey(nextGroups[0]?.seriesKey ?? null);
    setLibraryStage('series-gallery');
  };
  const deleteCurrentComic = () => {
    if (!projectLibrary || !currentProject) return;
    deleteLibraryIssue(currentProject, 'series-gallery');
  };
  const updateSetupField = <K extends keyof SetupFormState>(field: K, value: SetupFormState[K]) => {
    setSetupForm((current) => ({ ...current, [field]: value }));
  };
  const updateStoryField = (field: keyof StoryFormState, value: string) => {
    setStoryForm((current) => ({ ...current, [field]: value }));
  };
  const updateOutlineBeat = (beatId: OutlineBeatId, updates: Partial<Pick<OutlineBeat, 'title' | 'description'>>) => {
    setOutlineBeats((current) => current.map((beat) => (beat.id === beatId ? { ...beat, ...updates } : beat)));
  };
  const applyWriterFoundationToEmptyLocalFields = (
    foundation: ReturnType<typeof mapWriterIssueToGuidedStoryFoundation>,
  ) => {
    setSetupForm((current) => ({
      ...current,
      seriesTitle: current.seriesTitle || foundation.seriesTitle,
      issueTitle: current.issueTitle || foundation.issueTitle,
      issueNumber: current.issueNumber || foundation.issueNumber,
      targetPageCount: current.targetPageCount || foundation.targetPageCount,
      genre: current.genre || foundation.genre,
      tone: current.tone || foundation.tone,
      premise: current.premise || foundation.premise,
    }));
    setStoryForm((current) => ({
      premise: current.premise || foundation.premise,
      mainCharacters: current.mainCharacters || foundation.characters,
      conflict: current.conflict || foundation.conflict,
      setting: current.setting || foundation.setting,
      endingGoal: current.endingGoal || foundation.endingGoal,
    }));
  };
  const buildCurrentWriterIssueDraft = () =>
    createWriterIssueDraftFromGuidedStoryFoundation({
      writerIssueId,
      seriesTitle: setupForm.seriesTitle,
      issueTitle: setupForm.issueTitle,
      issueNumber: setupForm.issueNumber,
      targetPageCount: setupForm.targetPageCount,
      genre: setupForm.genre,
      tone: setupForm.tone,
      premise: storyForm.premise || setupForm.premise,
      characters: storyForm.mainCharacters,
      setting: storyForm.setting,
      conflict: storyForm.conflict,
      endingGoal: storyForm.endingGoal,
    });
  const linkWriterIssueRow = (issue: WriterIssueRow, seriesTitle: string, message: string) => {
    setWriterIssueId(issue.id);
    setWriterBridgeSelectedIssueId(issue.id);
    applyWriterFoundationToEmptyLocalFields(mapWriterIssueToGuidedStoryFoundation(issue));
    setWriterBridgeError(null);
    setWriterBridgeMessage(message || `Linked ${seriesTitle} #${issue.issue_number}.`);
  };
  const loadWriterBridgeOptions = async (preferredIssueId = writerIssueId ?? writerBridgeSelectedIssueId) => {
    setWriterBridgeError(null);
    if (!isSupabaseConfigured()) {
      setWriterBridgeError('Supabase is not configured. Continue locally, or configure Writers Workshop persistence first.');
      return;
    }
    setWriterBridgeBusyAction('load');
    const seriesRows = await listWriterSeries();
    const issueGroups = await Promise.all(
      seriesRows.map(async (series) => ({
        series,
        issues: await listWriterIssues(series.id),
      })),
    );
    const issueRows = issueGroups.flatMap((group) => group.issues);
    setWriterBridgeSeries(seriesRows);
    setWriterBridgeIssues(issueRows);
    const nextIssueId =
      preferredIssueId && issueRows.some((issue) => issue.id === preferredIssueId)
        ? preferredIssueId
        : issueRows[0]?.id ?? '';
    setWriterBridgeSelectedIssueId(nextIssueId);
    setWriterBridgeSelectedSeriesId(
      seriesRows.find((series) => series.id === issueRows.find((issue) => issue.id === nextIssueId)?.series_id)?.id ??
        seriesRows[0]?.id ??
        '',
    );
    setWriterBridgeBusyAction(null);
    setWriterBridgeMessage(
      issueRows.length > 0
        ? `Loaded ${issueRows.length} Writer issue${issueRows.length === 1 ? '' : 's'} for linking.`
        : 'No Writer issues found yet. You can create one from this Guided story foundation.',
    );
  };
  const linkSelectedWriterIssue = () => {
    const issueOption = selectedWriterBridgeIssue;
    if (!issueOption) {
      setWriterBridgeError('Select a Writer issue first, or create one from this story foundation.');
      return;
    }
    linkWriterIssueRow(
      issueOption.issue,
      issueOption.seriesTitle,
      `Linked ${issueOption.seriesTitle} #${issueOption.issue.issue_number}. No page or panel beats were imported yet.`,
    );
  };
  const deleteSelectedWriterIssue = async () => {
    const issueOption = selectedWriterBridgeIssue;
    if (!issueOption) {
      setWriterBridgeError('Select a Writer issue before deleting.');
      return;
    }

    const confirmed = window.confirm(
      `Delete Writer issue #${issueOption.issue.issue_number}${
        issueOption.issue.title ? `: ${issueOption.issue.title}` : ''
      }? This also removes its saved pages, beats, dialogue, outlines, and shot plans.`,
    );
    if (!confirmed) return;

    setWriterBridgeBusyAction('delete');
    setWriterBridgeError(null);
    const ok = await deleteWriterIssue(issueOption.issue.id);
    if (!ok) {
      setWriterBridgeBusyAction(null);
      setWriterBridgeError('Could not delete the Writer issue. Confirm you are signed in and own this Writer series.');
      return;
    }

    const nextIssues = writerBridgeIssues.filter((issue) => issue.id !== issueOption.issue.id);
    setWriterBridgeIssues(nextIssues);
    if (writerIssueId === issueOption.issue.id) {
      setWriterIssueId(null);
    }
    const nextIssueId =
      nextIssues.find((issue) => issue.series_id === issueOption.issue.series_id)?.id ?? nextIssues[0]?.id ?? '';
    setWriterBridgeSelectedIssueId(nextIssueId);
    setWriterBridgeBusyAction(null);
    await loadWriterBridgeOptions(nextIssueId);
    setWriterBridgeMessage(`Deleted Writer issue #${issueOption.issue.issue_number}.`);
  };
  const createLinkedWriterIssueFromGuidedStory = async () => {
    setWriterBridgeError(null);
    if (!isSupabaseConfigured()) {
      setWriterBridgeError('Supabase is not configured. Continue locally, or configure Writers Workshop persistence first.');
      return;
    }
    setWriterBridgeBusyAction('create');
    const draft = buildCurrentWriterIssueDraft();
    let seriesRow = writerBridgeSeries.find((series) => series.id === writerBridgeSelectedSeriesId) ?? null;

    if (!seriesRow) {
      seriesRow = await createWriterSeries({ title: draft.notes.guidedComic.seriesTitle || draft.title });
      if (seriesRow) {
        await updateWriterSeries(seriesRow.id, {
          logline: draft.notes.guidedComic.storyFoundation.premise || null,
          genre: draft.notes.guidedComic.genre || null,
          tone: draft.notes.guidedComic.tone || null,
        });
      }
    }

    if (!seriesRow) {
      setWriterBridgeBusyAction(null);
      setWriterBridgeError('Could not create a Writer series. Check Writers Workshop persistence and permissions.');
      return;
    }

    const issueNumber =
      draft.issueNumber ??
      Math.max(0, ...writerBridgeIssues.filter((issue) => issue.series_id === seriesRow.id).map((issue) => issue.issue_number)) + 1;
    const existingLocalIssue = writerBridgeIssues.find(
      (issue) => issue.series_id === seriesRow.id && issue.issue_number === issueNumber,
    );
    if (existingLocalIssue) {
      await updateWriterIssue(existingLocalIssue.id, {
        title: draft.title || existingLocalIssue.title,
        synopsis: draft.synopsis || existingLocalIssue.synopsis,
        notes: {
          ...existingLocalIssue.notes,
          ...draft.notes,
        },
      });
      if (draft.notes.guidedComic.targetPageCount) {
        await ensureWriterPagesToCount(existingLocalIssue.id, draft.notes.guidedComic.targetPageCount);
      }
      setWriterBridgeBusyAction(null);
      linkWriterIssueRow(
        existingLocalIssue,
        seriesRow.title || 'Untitled series',
        `Linked existing Writer issue #${existingLocalIssue.issue_number}; that issue number already existed for this series.`,
      );
      await loadWriterBridgeOptions(existingLocalIssue.id);
      return;
    }
    const issue = await createWriterIssue({
      series_id: seriesRow.id,
      issue_number: issueNumber,
      title: draft.title,
    });
    if (!issue) {
      const refreshedIssues = await listWriterIssues(seriesRow.id);
      const existingIssue = refreshedIssues.find((row) => row.issue_number === issueNumber);
      if (existingIssue) {
        setWriterBridgeIssues((current) => [
          ...current.filter((row) => row.series_id !== seriesRow.id),
          ...refreshedIssues,
        ]);
        setWriterBridgeBusyAction(null);
        linkWriterIssueRow(
          existingIssue,
          seriesRow.title || 'Untitled series',
          `Linked existing Writer issue #${existingIssue.issue_number}; the create request found that issue already exists.`,
        );
        await loadWriterBridgeOptions(existingIssue.id);
        return;
      }
      setWriterBridgeBusyAction(null);
      setWriterBridgeError(
        `Could not create Writer issue #${issueNumber}. Confirm you are signed in with access to this Writer series, or pick an existing issue / unused issue number.`,
      );
      return;
    }

    await updateWriterIssue(issue.id, {
      title: draft.title,
      synopsis: draft.synopsis || null,
      notes: {
        ...issue.notes,
        ...draft.notes,
      },
    });
    if (draft.notes.guidedComic.targetPageCount) {
      await ensureWriterPagesToCount(issue.id, draft.notes.guidedComic.targetPageCount);
    }
    setWriterIssueId(issue.id);
    setWriterBridgeSelectedIssueId(issue.id);
    setWriterBridgeBusyAction(null);
    setWriterBridgeMessage(`Created and linked Writer issue #${issue.issue_number}.`);
    await loadWriterBridgeOptions(issue.id);
  };
  const importLatestLinkedWriterIssue = async () => {
    const issueId = writerIssueId ?? writerBridgeSelectedIssueId;
    if (!issueId) {
      setWriterBridgeError('Link or select a Writer issue before importing.');
      return;
    }
    setWriterBridgeError(null);
    if (!isSupabaseConfigured()) {
      setWriterBridgeError('Supabase is not configured. Continue locally, or configure Writers Workshop persistence first.');
      return;
    }

    setWriterBridgeBusyAction('import');
    const [outlineRows, pageRows] = await Promise.all([
      listWriterOutlinesForIssue(issueId),
      listWriterPages(issueId),
    ]);
    const latestOutline = outlineRows[0];
    const parsedOutline = latestOutline ? issueOutlineSchema.safeParse(latestOutline.outline_json) : null;
    let nextPageCards: PageCard[] = pageCards;
    let importedOutline = false;

    if (parsedOutline?.success) {
      importedOutline = true;
      const outline = parsedOutline.data;
      setOutlineBeats(mapWriterOutlineToGuidedOutlineBeats(outline) as OutlineBeat[]);
      const outlineCards = mapWriterOutlineToGuidedPageCards(outline, {
        targetPageCount: targetPageCountFromInput(setupForm.targetPageCount),
        defaultPanelCount: pageCards[0]?.panelCount ?? 3,
      }) as PageCard[];
      nextPageCards = mergeWriterOutlineIntoGuidedPageCards(nextPageCards, outlineCards, {
        refreshImportedText: true,
      }) as PageCard[];
      const linkedIssue = writerBridgeIssues.find((issue) => issue.id === issueId);
      if (linkedIssue) {
        applyWriterFoundationToEmptyLocalFields(mapWriterIssueToGuidedStoryFoundation(linkedIssue, { outline }));
      }
    }

    nextPageCards = mergeWriterPagesIntoGuidedPageCards(nextPageCards, pageRows, {
      defaultPanelCount: pageCards[0]?.panelCount ?? 3,
      refreshImportedText: true,
    }) as PageCard[];
    const pageBeatStats = getWriterPageBeatImportStats(pageRows);
    const dialogueSeeds = mapWriterDialogueToGuidedDialogueSeeds(pageRows);
    setPageCards(nextPageCards);
    setWriterDialogueSeeds(Object.fromEntries(dialogueSeeds.map((seed) => [seed.pageNumber, seed])));
    setEditableDialogueSeeds((current) => {
      const next = { ...current };
      dialogueSeeds.forEach((seed) => {
        if (!next[seed.pageNumber]?.length) {
          next[seed.pageNumber] = createEditableDialogueSeedsFromWriterSeed(seed);
        }
      });
      return next;
    });
    setWriterIssueId(issueId);
    setWriterBridgeSelectedIssueId(issueId);
    setActivePageNumber(nextPageCards[0]?.pageNumber ?? null);
    setWriterBridgeBusyAction(null);
    const pageBeatStatus =
      pageBeatStats.panelBeatCount > 0
        ? `${pageBeatStats.panelBeatCount} panel beat${pageBeatStats.panelBeatCount === 1 ? '' : 's'} from ${
            pageBeatStats.pagesWithPanelBeats
          } page${pageBeatStats.pagesWithPanelBeats === 1 ? '' : 's'}`
        : '0 saved panel beats';
    const skippedBeatStatus =
      pageBeatStats.panelBeatCount === 0 && pageBeatStats.pageRows > 0
        ? ' Run Generate / update page beats, then import again.'
        : pageBeatStats.invalidPageNumbers.length > 0
          ? ` ${pageBeatStats.invalidPageNumbers.length} page${pageBeatStats.invalidPageNumbers.length === 1 ? '' : 's'} had unreadable beat JSON.`
          : '';
    setWriterBridgeMessage(
      `Imported ${importedOutline ? 'outline, ' : ''}${pageRows.length} Writer page${pageRows.length === 1 ? '' : 's'}, ${pageBeatStatus}, and ${dialogueSeeds.reduce(
        (total, seed) => total + seed.panelSeeds.length,
        0,
      )} dialogue seed${dialogueSeeds.length === 1 ? '' : 's'}.${skippedBeatStatus}`,
    );
  };
  const writerToolErrorMessage = (res: { error: string; details?: string }) =>
    res.details ? `${res.error}: ${res.details}` : res.error;
  const buildWriterOutlineSupplement = () =>
    [
      storyForm.premise.trim() ? `Guided premise: ${storyForm.premise.trim()}` : '',
      storyForm.mainCharacters.trim() ? `Characters: ${storyForm.mainCharacters.trim()}` : '',
      storyForm.setting.trim() ? `Setting: ${storyForm.setting.trim()}` : '',
      storyForm.conflict.trim() ? `Conflict: ${storyForm.conflict.trim()}` : '',
      storyForm.endingGoal.trim() ? `Ending goal: ${storyForm.endingGoal.trim()}` : '',
      outlineBeats.some((beat) => beat.description.trim())
        ? `Current Guided outline beats:\n${outlineBeats
            .map((beat) => `${beat.title}: ${beat.description.trim() || '(empty)'}`)
            .join('\n')}`
        : '',
    ]
      .filter(Boolean)
      .join('\n\n');
  const runGuidedWriterToolAction = async (action: GuidedWriterToolAction) => {
    const issueId = writerIssueId ?? writerBridgeSelectedIssueId;
    if (!issueId) {
      setWriterBridgeError('Link or select a Writer issue before running Writers Workshop tools.');
      return;
    }
    if (!isSupabaseConfigured()) {
      setWriterBridgeError('Supabase is not configured. Continue locally, or configure Writers Workshop persistence first.');
      return;
    }

    setWriterBridgeError(null);
    setWriterBridgeBusyAction(action);
    const targetPageCount = targetPageCountFromInput(setupForm.targetPageCount);

    if (action === 'page-beats') {
      const ensured = await ensureWriterPagesToCount(issueId, targetPageCount);
      if (!ensured.ok) {
        setWriterBridgeBusyAction(null);
        setWriterBridgeError('Could not prepare Writer page rows before generating page beats.');
        return;
      }
      const offsets = getGuidedWriterPageBeatBatchOffsets(targetPageCount, WRITER_PAGE_BEATS_ISSUE_MAX);
      for (const batchOffset of offsets) {
        const res = await invokeWriterTools(
          buildGuidedWriterToolRequest('page-beats', {
            issueId,
            batchLimit: WRITER_PAGE_BEATS_ISSUE_MAX,
            batchOffset,
          }),
        );
        if (!res.success) {
          setWriterBridgeBusyAction(null);
          setWriterBridgeError(writerToolErrorMessage(res));
          return;
        }
      }
      await importLatestLinkedWriterIssue();
      setWriterBridgeMessage(`Generated Writer page beats in ${offsets.length} batch${offsets.length === 1 ? '' : 'es'} and imported them into Guided pages.`);
      return;
    }

    if (action === 'dialogue') {
      const ensured = await ensureWriterPagesToCount(issueId, targetPageCount);
      if (!ensured.ok) {
        setWriterBridgeBusyAction(null);
        setWriterBridgeError('Could not prepare Writer page rows before drafting dialogue.');
        return;
      }
      const pages = await listWriterPages(issueId);
      const targetPageNumber = activePageNumber ?? pageCards[0]?.pageNumber ?? 1;
      const targetPage = pages.find((page) => page.page_number === targetPageNumber) ?? pages[0];
      if (!targetPage) {
        setWriterBridgeBusyAction(null);
        setWriterBridgeError('No Writer page is available for dialogue drafting.');
        return;
      }
      setEditableDialogueSeeds((current) => {
        const next = { ...current };
        delete next[targetPage.page_number];
        return next;
      });
      setPromotedBalloonSeeds((current) => {
        const next = { ...current };
        delete next[targetPage.page_number];
        return next;
      });
      const res = await invokeWriterTools(
        buildGuidedWriterToolRequest('dialogue', {
          issueId,
          pageId: targetPage.id,
        }),
      );
      if (!res.success) {
        setWriterBridgeBusyAction(null);
        setWriterBridgeError(writerToolErrorMessage(res));
        return;
      }
      await importLatestLinkedWriterIssue();
      setWriterBridgeMessage(`Drafted Writer dialogue for page ${targetPage.page_number} and imported dialogue seeds.`);
      return;
    }

    const res = await invokeWriterTools(
      buildGuidedWriterToolRequest(action, {
        issueId,
        targetPageCount,
        outlineSupplement: action === 'outline' ? buildWriterOutlineSupplement() : undefined,
      }),
    );
    if (!res.success) {
      setWriterBridgeBusyAction(null);
      setWriterBridgeError(writerToolErrorMessage(res));
      return;
    }

    if (action === 'outline') {
      await importLatestLinkedWriterIssue();
      setWriterBridgeMessage('Generated a Writer outline and imported accepted structure into Guided Comics.');
      return;
    }

    setWriterBridgeBusyAction(null);
    setWriterBridgeMessage('Ran Writers Workshop pacing review for the linked issue.');
  };
  const openLinkedWriterIssue = () => {
    const issueId = writerIssueId ?? writerBridgeSelectedIssueId;
    if (!issueId) {
      setWriterBridgeError('Link or select a Writer issue before opening Writers Workshop.');
      return;
    }
    setWriterBridgeBusyAction('open');
    requestWriterIssueOpen(issueId);
    onNavigatePortal('writer');
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
    setPageCards((current) =>
      current.map((page) => {
        if (page.pageNumber !== pageNumber) return page;
        const nextPage = { ...page, ...updates };
        if (updates.panelCount !== undefined) {
          nextPage.panelCount = String(getGuidedComicActivePanelCount(nextPage));
          nextPage.panelBeats = getGuidedComicExistingPanelBeats(nextPage);
        }
        return nextPage;
      }),
    );
  };
  const updatePagePanelCount = (pageNumber: number, panelCount: string) => {
    setPageCards((current) =>
      current.map((page) => {
        if (page.pageNumber !== pageNumber) return page;
        const nextPage = {
          ...page,
          panelCount,
        };
        nextPage.panelCount = String(getGuidedComicActivePanelCount(nextPage));
        nextPage.panelBeats = getGuidedComicExistingPanelBeats(nextPage);
        setPageLayoutGeometry((layouts) => ({
          ...layouts,
          [pageNumber]: syncGuidedComicLayoutGeometry(
            nextPage,
            layouts[pageNumber],
            pageLayoutTemplates[pageNumber] ?? 'auto',
            guidedLayoutSettings,
          ),
        }));
        return nextPage;
      }),
    );
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
  const requestPropVaultReference = (name: string) => {
    requestVaultSelection({ type: 'prop', name });
  };
  const requestNpcVaultReference = () => {
    const name = npcReferenceName.trim();
    requestVaultSelection({ type: 'npc', name: name || 'NPC reference' });
  };
  const updateCharacterPrep = <K extends keyof CharacterPrepState>(
    name: string,
    key: K,
    value: CharacterPrepState[K],
  ) => {
    setCharacterPrep((current) => ({
      ...current,
      [name]: {
        ...DEFAULT_CHARACTER_PREP,
        ...(current[name] ?? {}),
        [key]: value,
      },
    }));
  };
  const updateLocationPrep = <K extends keyof LocationPrepState>(
    name: string,
    key: K,
    value: LocationPrepState[K],
  ) => {
    setLocationPrep((current) => ({
      ...current,
      [name]: {
        ...DEFAULT_LOCATION_PREP,
        ...(current[name] ?? {}),
        [key]: value,
      },
    }));
  };
  const updatePropPrep = <K extends keyof PropPrepState>(name: string, key: K, value: PropPrepState[K]) => {
    setPropPrep((current) => ({
      ...current,
      [name]: {
        ...DEFAULT_PROP_PREP,
        ...(current[name] ?? { name }),
        name,
        [key]: value,
      },
    }));
  };
  const addPropPrepItem = () => {
    const name = newPropName.trim();
    if (!name) return;
    setPropPrep((current) => ({
      ...current,
      [name]: {
        ...DEFAULT_PROP_PREP,
        ...(current[name] ?? {}),
        name,
      },
    }));
    setNewPropName('');
  };
  const removePropReference = (name: string, referenceIndex: number) => {
    setPropPrep((current) => {
      const item = current[name];
      if (!item) return current;
      return {
        ...current,
        [name]: {
          ...item,
          references: item.references.filter((_, index) => index !== referenceIndex),
        },
      };
    });
  };
  const requestPrepUpload = (type: 'character' | 'location' | 'prop', name: string) => {
    setPendingPrepUpload({ type, name });
    prepUploadInputRef.current?.click();
  };
  const handlePrepReferenceUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    const target = pendingPrepUpload;
    event.target.value = '';
    setPendingPrepUpload(null);
    if (!file || !target || !file.type.startsWith('image/')) return;

    const reader = new FileReader();
    reader.onload = () => {
      const imageUrl = typeof reader.result === 'string' ? reader.result : '';
      if (!imageUrl) return;
      const reference: ReferenceImage = {
        imageUrl,
        displayName: file.name || `${target.name} reference`,
        sourceLabel: file.name || 'Uploaded reference',
      };
      if (target.type === 'character') {
        setCharacterReferences((current) => ({
          ...current,
          [target.name]: [...(current[target.name] ?? []), reference],
        }));
      } else if (target.type === 'location') {
        setLocationReferences((current) => ({
          ...current,
          [target.name]: [...(current[target.name] ?? []), reference],
        }));
      } else {
        setPropPrep((current) => ({
          ...current,
          [target.name]: {
            ...DEFAULT_PROP_PREP,
            ...(current[target.name] ?? { name: target.name }),
            name: target.name,
            references: [...(current[target.name]?.references ?? []), reference],
          },
        }));
      }
    };
    reader.readAsDataURL(file);
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
    setPageLayoutGeometry((current) =>
      Object.fromEntries(
        Object.entries(current).map(([pageNumber, geometry]) => [
          pageNumber,
          geometry.map((panel) => {
            if (panel.panelId !== panelId) return panel;
            const nextPanel = { ...panel };
            delete nextPanel.imageUrl;
            delete nextPanel.imageId;
            return nextPanel;
          }),
        ]),
      ) as Record<number, GuidedComicPanelGeometry[]>,
    );
    setPanelArtStatuses((current) => ({ ...current, [panelId]: 'needs-art' }));
  };
  const requestPanelArtVaultImageForPanel = (targetPanel: PanelArtQueueItem | null = selectedPanel) => {
    if (!targetPanel) return;
    requestVaultSelection({
      type: 'panel-art',
      name: targetPanel.id,
      pageNumber: targetPanel.pageNumber,
      panelNumber: targetPanel.panelNumber,
    });
  };
  const requestPanelArtVaultImage = () => requestPanelArtVaultImageForPanel();
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
  const readIssueCoverFile = (file: File, source: 'upload' | 'paste') => {
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = () => {
      const imageUrl = typeof reader.result === 'string' ? reader.result : '';
      if (!imageUrl) return;
      setIssueCoverImage({
        imageUrl,
        source,
        sourceLabel: file.name || (source === 'paste' ? 'Pasted cover image' : 'Uploaded cover image'),
        returnedAt: new Date().toISOString(),
      });
      setCoverPasteMessage(source === 'paste' ? 'Pasted cover image assigned to this issue.' : 'Cover image assigned.');
    };
    reader.readAsDataURL(file);
  };
  const handlePanelArtUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    if (file) readPanelArtFile(file, 'upload');
    event.currentTarget.value = '';
  };
  const handleIssueCoverUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    if (file) readIssueCoverFile(file, 'upload');
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
  const focusCoverPasteTarget = () => {
    setCoverPasteMessage('Paste a cover image now with Command+V or Ctrl+V.');
    coverPasteTargetRef.current?.focus();
  };
  const handleIssueCoverPaste = (event: React.ClipboardEvent<HTMLDivElement>) => {
    const imageFile = Array.from(event.clipboardData.files).find((file) => file.type.startsWith('image/'));
    if (!imageFile) {
      setCoverPasteMessage('Clipboard did not include an image file.');
      return;
    }
    event.preventDefault();
    readIssueCoverFile(imageFile, 'paste');
  };
  const useFirstPanelArtAsIssueCover = () => {
    const firstPanelImage =
      (selectedProductionPanel?.imageUrl && selectedProductionPanel.imageUrl
        ? panelArtImages[selectedProductionPanel.panelId]
        : null) ?? Object.values(panelArtImages).find((image) => image.imageUrl.trim());
    if (!firstPanelImage) {
      setCoverPasteMessage('No panel art is available yet.');
      return;
    }
    setIssueCoverImage({
      ...firstPanelImage,
      sourceLabel: firstPanelImage.sourceLabel || 'Panel art cover source',
      returnedAt: new Date().toISOString(),
    });
    setCoverPasteMessage('Used existing panel art as the issue cover image.');
  };
  const updatePageLayoutTemplate = (pageNumber: number, templateId: LayoutTemplateId) => {
    setPageLayoutTemplates((current) => ({ ...current, [pageNumber]: templateId }));
    setPageLayoutIntents((current) => {
      const next = { ...current };
      delete next[pageNumber];
      return next;
    });
    const page = pageCards.find((card) => card.pageNumber === pageNumber);
    if (!page) return;
    setPageLayoutGeometry((current) => ({
      ...current,
      [pageNumber]: createGuidedComicStarterLayoutWithExistingMetadata(
        page,
        templateId,
        current[pageNumber],
        guidedLayoutSettings,
      ),
    }));
  };
  const regeneratePageStarterLayout = (page: PageCard) => {
    const templateId = pageLayoutTemplates[page.pageNumber] ?? 'auto';
    updatePageLayoutTemplate(page.pageNumber, templateId);
    setPrimaryActionMessage(`Regenerated page ${page.pageNumber} starter layout without changing panel count or assigned art.`);
  };
  const applySafeMarginsToPageLayout = (page: PageCard) => {
    const templateId = pageLayoutTemplates[page.pageNumber] ?? 'auto';
    setPageLayoutGeometry((current) => {
      const syncedGeometry = syncGuidedComicLayoutGeometry(page, current[page.pageNumber], templateId, guidedLayoutSettings);
      return {
        ...current,
        [page.pageNumber]: syncedGeometry.map((panel) => getGuidedComicSafeMarginPanelGeometry(panel)),
      };
    });
    setPrimaryActionMessage(`Applied the safe margin guide to page ${page.pageNumber}.`);
  };
  const updateLayoutPanelFraming = useCallback((
    pageNumber: number,
    panelId: string,
    updates: Partial<Pick<GuidedComicPanelGeometry, 'imageFit' | 'imageFocusX' | 'imageFocusY' | 'imageZoom'>>,
  ) => {
    setPageLayoutGeometry((current) => ({
      ...current,
      [pageNumber]: (current[pageNumber] ?? []).map((panel) =>
        panel.panelId === panelId
          ? {
              ...panel,
              ...updates,
              imageFocusX:
                updates.imageFocusX === undefined
                  ? panel.imageFocusX
                  : Math.min(1, Math.max(0, updates.imageFocusX)),
              imageFocusY:
                updates.imageFocusY === undefined
                  ? panel.imageFocusY
                  : Math.min(1, Math.max(0, updates.imageFocusY)),
              imageZoom:
                updates.imageZoom === undefined
                  ? panel.imageZoom
                  : Math.min(3, Math.max(1, updates.imageZoom)),
            }
          : panel,
      ),
    }));
  }, []);
  const startImageFramingDrag = (
    event: React.PointerEvent,
    pageNumber: number,
    panel: GuidedComicPanelGeometry,
  ) => {
    if (!panel.imageUrl || panel.imageFit === 'stretch') return;
    const frameRect = event.currentTarget.getBoundingClientRect();
    event.preventDefault();
    event.stopPropagation();
    setActiveImageFramingDrag({
      pageNumber,
      panelId: panel.panelId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      frameWidth: frameRect.width,
      frameHeight: frameRect.height,
      startFocusX: panel.imageFocusX ?? 0.5,
      startFocusY: panel.imageFocusY ?? 0.5,
    });
  };
  const startLayoutPanelEdit = (
    event: React.PointerEvent,
    pageNumber: number,
    panel: GuidedComicPanelGeometry,
    mode: ActiveLayoutEdit['mode'],
    handle?: LayoutResizeHandle,
  ) => {
    const canvasRect = layoutCanvasRefs.current[pageNumber]?.getBoundingClientRect();
    const page = pageCards.find((card) => card.pageNumber === pageNumber);
    if (!canvasRect || !page) return;
    if (panel.locked) return;
    event.preventDefault();
    event.stopPropagation();
    setActivePageNumber(pageNumber);
    setSelectedPanelId(panel.panelId);
    setActiveLayoutEdit({
      pageNumber,
      panelId: panel.panelId,
      mode,
      handle,
      startClientX: event.clientX,
      startClientY: event.clientY,
      canvasWidth: canvasRect.width,
      canvasHeight: canvasRect.height,
      startPanel: panel,
      startGeometry: syncGuidedComicLayoutGeometry(
        page,
        pageLayoutGeometry[pageNumber],
        pageLayoutTemplates[pageNumber] ?? 'auto',
        guidedLayoutSettings,
      ),
    });
  };
  useEffect(() => {
    if (!activeLayoutEdit) return;

    const handlePointerMove = (event: PointerEvent) => {
      const dx = (event.clientX - activeLayoutEdit.startClientX) / activeLayoutEdit.canvasWidth;
      const dy = (event.clientY - activeLayoutEdit.startClientY) / activeLayoutEdit.canvasHeight;
      const { startPanel } = activeLayoutEdit;
      let nextPanel: GuidedComicPanelGeometry;

      if (activeLayoutEdit.mode === 'move') {
        nextPanel = moveGuidedComicPanelGeometry(
          startPanel,
          { x: dx, y: dy },
          activeLayoutEdit.startGeometry,
          guidedLayoutSettings,
        );
      } else {
        const handle = activeLayoutEdit.handle ?? 'se';
        nextPanel = resizeGuidedComicPanelGeometry(
          startPanel,
          handle,
          { x: dx, y: dy },
          activeLayoutEdit.startGeometry,
          guidedLayoutSettings,
        );
      }

      setPageLayoutGeometry((current) => ({
        ...current,
        [activeLayoutEdit.pageNumber]: (current[activeLayoutEdit.pageNumber] ?? activeLayoutEdit.startGeometry).map((panel) =>
          panel.panelId === activeLayoutEdit.panelId ? nextPanel : panel,
        ),
      }));
    };
    const handlePointerUp = () => setActiveLayoutEdit(null);

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp, { once: true });
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [activeLayoutEdit, guidedLayoutSettings]);
  useEffect(() => {
    if (!activeImageFramingDrag) return;

    const handlePointerMove = (event: PointerEvent) => {
      const dx = (event.clientX - activeImageFramingDrag.startClientX) / activeImageFramingDrag.frameWidth;
      const dy = (event.clientY - activeImageFramingDrag.startClientY) / activeImageFramingDrag.frameHeight;
      updateLayoutPanelFraming(activeImageFramingDrag.pageNumber, activeImageFramingDrag.panelId, {
        imageFocusX: activeImageFramingDrag.startFocusX - dx,
        imageFocusY: activeImageFramingDrag.startFocusY - dy,
      });
    };
    const handlePointerUp = () => setActiveImageFramingDrag(null);

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp, { once: true });
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [activeImageFramingDrag, updateLayoutPanelFraming]);
  const openBlankAdvancedStudio = () => {
    const confirmed = window.confirm('Open a blank Advanced Comics Studio workspace? Save this guided comic first if you want the latest guided changes in the library.');
    if (!confirmed) return;
    onOpenAdvancedStudio();
  };
  const buildVisualMetadataForPage = (page: PageCard, layoutTemplate: LayoutTemplateId) =>
    buildGuidedComicVisualPageMetadata({
      page,
      layoutPanels: getGuidedComicLayoutPanels(page, layoutTemplate),
      dialogueSeed: writerDialogueSeeds[page.pageNumber],
      editableDialogueSeeds: editableDialogueSeeds[page.pageNumber],
      npcNames: npcReferenceNames,
    });
  const openPageInAdvancedStudio = (page: PageCard) => {
    const confirmed = window.confirm(`Send page ${page.pageNumber} to Advanced Comics Studio? This will open the advanced editor with the current guided layout handoff.`);
    if (!confirmed) return;

    const layoutTemplate = pageLayoutTemplates[page.pageNumber] ?? 'auto';
    const layoutIntent = pageLayoutIntents[page.pageNumber];
    const layoutPanels = getGuidedComicLayoutPanels(page, layoutTemplate);
    const visualStoryMetadata = buildVisualMetadataForPage(page, layoutTemplate);
    const visualStoryMetadataWithPrep = {
      ...visualStoryMetadata,
      panels: visualStoryMetadata.panels.map((panel) => {
        const panelQueueItem = panelArtQueue.find(
          (item) => item.pageNumber === page.pageNumber && item.panelNumber === panel.panelNumber,
        );
        const prepContext = buildGuidedProductionPrepContext({
          characterNames: panelQueueItem?.characters ?? splitListText(page.keyCharacters),
          locationName: panelQueueItem?.location || page.keyLocation.trim(),
          characterPrep,
          locationPrep,
          propPrep,
          artDirection,
        });
        return prepContext
          ? {
              ...panel,
              visualPrompt: `${panel.visualPrompt} Production prep continuity: ${prepContext}`,
            }
          : panel;
      }),
    };
    const layoutGeometry = syncGuidedComicLayoutGeometry(
      page,
      pageLayoutGeometry[page.pageNumber],
      layoutTemplate,
      guidedLayoutSettings,
    );
    const orderedPanelIds = [...layoutGeometry].sort((a, b) => a.order - b.order).map((panel) => panel.panelId);
    const handoffPanelArtImages = orderedPanelIds.reduce<Record<string, GuidedComicLayoutPanelImage>>((images, panelId) => {
      const image = panelArtImages[panelId];
      const geometry = layoutGeometry.find((panel) => panel.panelId === panelId);
      if (!image) return images;
      images[panelId] = {
        panelId,
        imageId: image.imageId ?? geometry?.imageId,
        imageUrl: image.imageUrl,
        prompt: image.prompt,
        returnedAt: image.returnedAt,
        source: image.source,
      };
      return images;
    }, {});

    requestLayoutHandoff({
      pageId: `guided-page-${page.pageNumber}`,
      pageNumber: page.pageNumber,
      layoutTemplate,
      ...(layoutIntent && { layoutIntent }),
      panelCount: layoutPanels.length,
      orderedPanelIds,
      normalizedPanelRects: layoutGeometry.map((panel) => ({
        panelId: panel.panelId,
        order: panel.order,
        rect: {
          x: panel.x,
          y: panel.y,
          width: panel.w,
          height: panel.h,
        },
      })),
      panelGeometry: layoutGeometry,
      panelArtImages: handoffPanelArtImages,
      panelShapeDefaults: {
        shapeType: 'rect',
        isVisible: true,
        isLocked: false,
      },
      panelBeats: orderedPanelIds.map((panelId, index) => ({
        panelId,
        panelNumber: index + 1,
        beatText: layoutPanels.find((panel) => panel.panelId === panelId)?.beatText ?? '',
      })),
      visualStoryMetadata: visualStoryMetadataWithPrep,
      balloonSeeds: promotedBalloonSeeds[page.pageNumber] ?? [],
    });
    onOpenAdvancedStudio();
  };
  const clearGuidedDraft = () => {
    const confirmed = window.confirm(
      'Clear the saved recovery draft from this browser and reset the current guided flow? Saved Comic Library projects will remain available.',
    );
    if (!confirmed) return;

    skipNextDraftSaveRef.current = true;
    removeGuidedComicDraft();
    setActiveProjectId(null);
    setActiveIndex(0);
    setWriterIssueId(null);
    setSetupForm(DEFAULT_SETUP_FORM);
    setStoryForm(DEFAULT_STORY_FORM);
    setArtDirection(DEFAULT_ART_DIRECTION);
    setOutlineBeats(cloneInitialOutlineBeats());
    setPageCards([]);
    setCharacterReferences({});
    setLocationReferences({});
    setNpcReferences({});
    setCharacterPrep({});
    setLocationPrep({});
    setPropPrep({});
    setNewPropName('');
    setNpcReferenceName('');
    setSelectedPanelId(null);
    setPanelArtStatuses({});
    setPanelArtImages({});
    setPageLayoutTemplates({});
    setPageLayoutIntents({});
    setPageLayoutGeometry({});
    setWriterDialogueSeeds({});
    setEditableDialogueSeeds({});
    setPromotedBalloonSeeds({});
    setWriterBridgeSelectedIssueId('');
    setDraftSavedAt(null);
    setProjectLibraryStatus('Cleared the recovery draft. Saved library comics were kept.');
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
  const prepCharacterNames = useMemo(
    () => uniquePageCardTerms([...storyCharacters, ...pageCharacters, ...Object.keys(characterPrep)]),
    [characterPrep, pageCharacters, storyCharacters],
  );
  const prepLocationNames = useMemo(
    () => uniquePageCardTerms([...storyLocations, ...pageLocations, ...Object.keys(locationPrep)]),
    [locationPrep, pageLocations, storyLocations],
  );
  const prepPropNames = useMemo(() => Object.keys(propPrep), [propPrep]);
  const readyPrepCharacterCount = useMemo(
    () =>
      prepCharacterNames.filter(
        (name) => (characterReferences[name] ?? []).length > 0 && Boolean(characterPrep[name]?.ready),
      ).length,
    [characterPrep, characterReferences, prepCharacterNames],
  );
  const readyPrepLocationCount = useMemo(
    () =>
      prepLocationNames.filter(
        (name) => (locationReferences[name] ?? []).length > 0 && Boolean(locationPrep[name]?.ready),
      ).length,
    [locationPrep, locationReferences, prepLocationNames],
  );
  const readyPrepPropCount = useMemo(
    () =>
      prepPropNames.filter(
        (name) => (propPrep[name]?.references ?? []).length > 0 && Boolean(propPrep[name]?.ready),
      ).length,
    [prepPropNames, propPrep],
  );
  const productionPrepReadyCount = readyPrepCharacterCount + readyPrepLocationCount + readyPrepPropCount;
  const productionPrepTotalCount = prepCharacterNames.length + prepLocationNames.length + prepPropNames.length;
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
    const props = mapReferencesForImageshop(
      Object.fromEntries(Object.entries(propPrep).map(([name, prep]) => [name, prep.references])),
      'asset',
    );
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
      props,
      pageSummary: pageSummary || undefined,
      productionPrepContext: buildGuidedProductionPrepContext({
        characterNames: prepCharacterNames,
        characterPrep,
        locationPrep,
        propPrep,
        artDirection,
      }),
    });
  }, [
    artDirection,
    characterReferences,
    characterPrep,
    locationReferences,
    locationPrep,
    npcReferences,
    pageCards,
    prepCharacterNames,
    propPrep,
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
  const selectedPanelVisualMetadata = useMemo(() => {
    if (!selectedPanel) return null;
    const page = pageCards.find((candidate) => candidate.pageNumber === selectedPanel.pageNumber);
    if (!page) return null;
    const layoutTemplate = pageLayoutTemplates[page.pageNumber] ?? 'auto';
    const visualStoryMetadata = buildGuidedComicVisualPageMetadata({
      page,
      layoutPanels: getGuidedComicLayoutPanels(page, layoutTemplate),
      dialogueSeed: writerDialogueSeeds[page.pageNumber],
      editableDialogueSeeds: editableDialogueSeeds[page.pageNumber],
      npcNames: npcReferenceNames,
    });
    return (
      visualStoryMetadata.panels.find((panel) => panel.panelNumber === selectedPanel.panelNumber) ?? null
    );
  }, [editableDialogueSeeds, npcReferenceNames, pageCards, pageLayoutTemplates, selectedPanel, writerDialogueSeeds]);
  const selectedPanelDialogueSeeds = useMemo(() => {
    if (!selectedPanel) return [];
    return (editableDialogueSeeds[selectedPanel.pageNumber] ?? [])
      .filter((seed) => seed.panelNumber === selectedPanel.panelNumber)
      .sort((a, b) => a.order - b.order);
  }, [editableDialogueSeeds, selectedPanel]);
  const selectedPageDialogueDensity = useMemo(() => {
    if (!selectedPanel) return null;
    return analyzeGuidedDialogueSeedDensity(editableDialogueSeeds[selectedPanel.pageNumber] ?? []);
  }, [editableDialogueSeeds, selectedPanel]);
  const selectedPanelDialogueDensity =
    selectedPanel && selectedPageDialogueDensity
      ? selectedPageDialogueDensity.panelSummaries.find((summary) => summary.panelNumber === selectedPanel.panelNumber) ?? null
      : null;
  const selectedPagePromotedBalloonSeedCount = selectedPanel
    ? promotedBalloonSeeds[selectedPanel.pageNumber]?.length ?? 0
    : 0;
  const selectedDialogueIndicators = Array.from(
    new Set([...(selectedPanelDialogueDensity?.indicators ?? []), ...(selectedPageDialogueDensity?.pageIndicators ?? [])]),
  );
  const updateDialogueSeedText = (pageNumber: number, seedId: string, text: string) => {
    setEditableDialogueSeeds((current) => ({
      ...current,
      [pageNumber]: updateEditableDialogueSeedText(current[pageNumber] ?? [], seedId, text),
    }));
    setPromotedBalloonSeeds((current) => {
      const next = { ...current };
      delete next[pageNumber];
      return next;
    });
  };
  const updateDialogueSeedStatus = (pageNumber: number, seedId: string, status: GuidedComicDialogueSeedStatus) => {
    setEditableDialogueSeeds((current) => ({
      ...current,
      [pageNumber]: setEditableDialogueSeedStatus(current[pageNumber] ?? [], seedId, status),
    }));
    setPromotedBalloonSeeds((current) => {
      const next = { ...current };
      delete next[pageNumber];
      return next;
    });
  };
  const addManualDialogueSeedForSelectedPanel = () => {
    if (!selectedPanel) return;
    const existing = editableDialogueSeeds[selectedPanel.pageNumber] ?? [];
    const order =
      Math.max(0, ...existing.filter((seed) => seed.panelNumber === selectedPanel.panelNumber).map((seed) => seed.order)) + 1;
    const id = `manual-page-${selectedPanel.pageNumber}-panel-${selectedPanel.panelNumber}-line-${Date.now()}`;
    setEditableDialogueSeeds((current) => ({
      ...current,
      [selectedPanel.pageNumber]: [
        ...(current[selectedPanel.pageNumber] ?? []),
        {
          id,
          pageNumber: selectedPanel.pageNumber,
          panelNumber: selectedPanel.panelNumber,
          order,
          kind: 'dialogue',
          text: '',
          originalText: '',
          beatText: selectedPanel.beatText,
          status: 'edited',
          source: 'manual',
        },
      ],
    }));
  };
  const promoteSelectedPageDialogueSeeds = () => {
    if (!selectedPanel) return;
    const page = pageCards.find((card) => card.pageNumber === selectedPanel.pageNumber);
    const layoutTemplate = page ? pageLayoutTemplates[page.pageNumber] ?? 'auto' : 'auto';
    const layoutPanels = page ? getGuidedComicLayoutPanels(page, layoutTemplate) : [];
    const panelIdFor = (panelNumber: number) => layoutPanels.find((panel) => panel.panelNumber === panelNumber)?.panelId;
    const balloonSeeds = promoteAcceptedDialogueToBalloonSeeds(editableDialogueSeeds[selectedPanel.pageNumber] ?? [], {
      panelIdFor,
    });
    setPromotedBalloonSeeds((current) => ({ ...current, [selectedPanel.pageNumber]: balloonSeeds }));
    setPrimaryActionMessage(
      balloonSeeds.length > 0
        ? `Promoted ${balloonSeeds.length} accepted dialogue seed${balloonSeeds.length === 1 ? '' : 's'} for page ${selectedPanel.pageNumber}.`
        : `No accepted dialogue seeds are ready to promote on page ${selectedPanel.pageNumber}.`,
    );
  };
  const selectedPanelEffectiveId = selectedPanel?.id ?? selectedPanelId;
  const selectedPanelPageNumber = selectedPanel?.pageNumber ?? null;
  const selectedPanelStatus = selectedPanel
    ? panelArtStatuses[selectedPanel.id] ?? 'needs-art'
    : 'needs-art';
  const selectedPanelArtImage = selectedPanel ? panelArtImages[selectedPanel.id] : null;
  const selectedPanelQueueIndex = selectedPanel
    ? panelArtQueue.findIndex((panel) => panel.id === selectedPanel.id)
    : -1;
  const selectedPagePanels = selectedPanel
    ? panelArtQueue.filter((panel) => panel.pageNumber === selectedPanel.pageNumber)
    : [];
  const selectedPagePanelIndex = selectedPanel
    ? selectedPagePanels.findIndex((panel) => panel.id === selectedPanel.id)
    : -1;
  const selectedPagePanelStatuses = selectedPagePanels.map((panel) => panelArtStatuses[panel.id] ?? 'needs-art');
  const selectedPageApprovedCount = selectedPagePanelStatuses.filter((status) => status === 'approved').length;
  const selectedPageReadyCount = selectedPagePanelStatuses.filter((status) => status === 'ready').length;
  const selectedPageNeedsArtCount = selectedPagePanelStatuses.filter((status) => status === 'needs-art').length;
  const selectedPageArtSummary = selectedPanel
    ? `${selectedPageApprovedCount} approved / ${selectedPageReadyCount} ready / ${selectedPageNeedsArtCount} needs art`
    : 'No panel selected';
  const selectedLayoutPage =
    pageCards.find((page) => page.pageNumber === (activePageNumber ?? selectedPanelPageNumber)) ??
    pageCards[0] ??
    null;
  const selectedLayoutTemplateId = selectedLayoutPage
    ? pageLayoutTemplates[selectedLayoutPage.pageNumber] ?? 'auto'
    : 'auto';
  const selectedLayoutGeometry = selectedLayoutPage
    ? syncGuidedComicLayoutGeometry(
        selectedLayoutPage,
        pageLayoutGeometry[selectedLayoutPage.pageNumber],
        selectedLayoutTemplateId,
        guidedLayoutSettings,
      )
    : [];
  const selectedLayoutPanelId =
    selectedPanel && selectedPanel.pageNumber === selectedLayoutPage?.pageNumber
      ? selectedPanel.id
      : selectedLayoutGeometry[0]?.panelId;
  const selectedLayoutPanel =
    selectedLayoutGeometry.find((panel) => panel.panelId === selectedLayoutPanelId) ??
    selectedLayoutGeometry[0] ??
    null;
  const selectedLayoutPanelImage = selectedLayoutPanel ? panelArtImages[selectedLayoutPanel.panelId] : undefined;
  const selectedLayoutPanelNumber = selectedLayoutPanel ? selectedLayoutPanel.order + 1 : 0;
  const selectedImageFit = selectedLayoutPanel?.imageFit ?? 'cover';
  const selectedImageFocusX = selectedLayoutPanel?.imageFocusX ?? 0.5;
  const selectedImageFocusY = selectedLayoutPanel?.imageFocusY ?? 0.5;
  const selectedImageZoom = selectedLayoutPanel?.imageZoom ?? 1;
  const selectedProductionPage = selectedLayoutPage;
  const selectedProductionPanels = selectedProductionPage
    ? getGuidedProductionPagePanels(selectedProductionPage, {
        layoutTemplateId: selectedLayoutTemplateId,
        panelArtImages,
        panelArtStatuses,
        writerDialogueSeed: writerDialogueSeeds[selectedProductionPage.pageNumber],
        editableDialogueSeeds: editableDialogueSeeds[selectedProductionPage.pageNumber],
        characterReferences,
        locationReferences,
        npcReferences,
        npcNames: npcReferenceNames,
      })
    : [];
  const selectedProductionPanel =
    selectedProductionPanels.find((panel) => panel.panelId === selectedPanelId) ?? selectedProductionPanels[0] ?? null;
  const selectedProductionPanelGeometry =
    selectedProductionPanel
      ? selectedLayoutGeometry.find((panel) => panel.panelId === selectedProductionPanel.panelId) ?? selectedLayoutPanel
      : selectedLayoutPanel;
  const selectedProductionPageIndex = selectedProductionPage
    ? pageCards.findIndex((page) => page.pageNumber === selectedProductionPage.pageNumber)
    : -1;
  const selectedProductionPagePanelIndex = selectedProductionPanel
    ? selectedProductionPanels.findIndex((panel) => panel.panelId === selectedProductionPanel.panelId)
    : -1;
  const selectedProductionVisualMetadata = selectedProductionPage
    ? buildVisualMetadataForPage(selectedProductionPage, selectedLayoutTemplateId)
    : null;
  const selectedProductionPanelMetadata =
    selectedProductionVisualMetadata?.panels.find((panel) => panel.panelNumber === selectedProductionPanel?.panelNumber) ??
    null;
  const selectedProductionMissingReferences = selectedProductionPage
    ? getGuidedProductionMissingReferences(selectedProductionPage, {
        characterReferences,
        locationReferences,
        npcReferences,
        npcNames: npcReferenceNames,
      })
    : [];
  const selectedProductionDialogueLines = selectedProductionPanels
    .map((panel) => panel.dialogueText.trim())
    .filter(Boolean);
  const selectedProductionBeatSummary = selectedProductionPanels
    .map((panel) => getGuidedProductionCustomBeatText(panel))
    .filter(Boolean)
    .join(' / ');
  const selectedProductionReferenceTargets = selectedProductionPage
    ? [
        ...splitListText(selectedProductionPage.keyCharacters),
        ...splitListText(selectedProductionPage.keyLocation),
        ...npcReferenceNames,
      ]
    : [];
  const selectedProductionReferenceSummary =
    selectedProductionMissingReferences.length > 0
      ? `Needs: ${selectedProductionMissingReferences.join(', ')}`
      : selectedProductionReferenceTargets.length > 0
        ? `Ready: ${selectedProductionReferenceTargets.join(', ')}`
        : '';
  const selectedProductionContextItems = [
    selectedProductionBeatSummary
      ? {
          label: 'Beats',
          source: 'Made in Pages or Panel Focus',
          usedBy: 'Used by layout and Advanced Studio handoff',
          value: selectedProductionBeatSummary,
        }
      : null,
    selectedProductionDialogueLines.length > 0
      ? {
          label: 'Dialogue',
          source: 'Made from dialogue seeds',
          usedBy: 'Used by balloon prep and panel focus',
          value: selectedProductionDialogueLines.slice(0, 3).join('\n'),
        }
      : null,
    selectedProductionReferenceSummary
      ? {
          label: 'References',
          source: 'Made in Visual Prep',
          usedBy: 'Used by Imageshop and page handoff',
          value: selectedProductionReferenceSummary,
        }
      : null,
  ].filter((item): item is { label: string; source: string; usedBy: string; value: string } => Boolean(item));
  const hasSelectedProductionPageContext = selectedProductionContextItems.length > 0;
  const selectedProductionPrepContext = selectedPanel
    ? buildGuidedProductionPrepContext({
        characterNames: selectedPanel.characters,
        locationName: selectedPanel.location,
        characterPrep,
        locationPrep,
        propPrep,
        artDirection,
      })
    : '';
  const selectedProductionPanelReferenceChips = selectedProductionPanel
    ? [
        ...(selectedProductionPanelMetadata?.referenceNeeds.characters ?? selectedPanel?.characters ?? []).map((name) => ({
          key: `character-${name}`,
          label: name,
          className: 'border-amber-300/25 bg-amber-300/10 text-amber-100',
        })),
        ...(selectedProductionPanelMetadata?.referenceNeeds.locations ?? (selectedPanel?.location ? [selectedPanel.location] : [])).map((name) => ({
          key: `location-${name}`,
          label: name,
          className: 'border-sky-300/25 bg-sky-300/10 text-sky-100',
        })),
        ...(selectedProductionPanelMetadata?.referenceNeeds.npcs ?? npcReferenceNames).map((name) => ({
          key: `npc-${name}`,
          label: name,
          className: 'border-fuchsia-300/25 bg-fuchsia-300/10 text-fuchsia-100',
        })),
      ]
    : [];
  const selectProductionPage = (pageNumber: number) => {
    setActivePageNumber(pageNumber);
    const firstPanel = panelArtQueue.find((panel) => panel.pageNumber === pageNumber);
    if (firstPanel) setSelectedPanelId(firstPanel.id);
    setProductionPanelFocusOpen(false);
    setWorkspaceMode('page-production');
    setActiveIndex(STEPS.findIndex((step) => step.id === 'art'));
  };
  const openIssueCoverWorkspace = () => {
    setProductionPanelFocusOpen(false);
    setWorkspaceMode('issue-cover');
    setActiveIndex(STEPS.findIndex((step) => step.id === 'art'));
  };
  const selectProductionPageByOffset = (offset: number) => {
    if (selectedProductionPageIndex < 0) return;
    const nextPage = pageCards[selectedProductionPageIndex + offset];
    if (nextPage) selectProductionPage(nextPage.pageNumber);
  };
  const selectProductionPanelOnPage = (pageNumber: number, panelId: string) => {
    setActivePageNumber(pageNumber);
    setSelectedPanelId(panelId);
    setProductionPanelFocusOpen(false);
    setWorkspaceMode('page-production');
    setActiveIndex(STEPS.findIndex((step) => step.id === 'art'));
  };
  const selectProductionPanel = (pageNumber: number, panelId: string) => {
    setActivePageNumber(pageNumber);
    setSelectedPanelId(panelId);
    setProductionPanelFocusOpen(true);
    setWorkspaceMode('panel-focus');
    setActiveIndex(STEPS.findIndex((step) => step.id === 'art'));
  };
  const adjustSelectedLayoutPanel = (page: PageCard, adjustment: 'bigger' | 'wider') => {
    const templateId = pageLayoutTemplates[page.pageNumber] ?? 'auto';
    const syncedGeometry = syncGuidedComicLayoutGeometry(
      page,
      pageLayoutGeometry[page.pageNumber],
      templateId,
      guidedLayoutSettings,
    );
    const targetPanel =
      syncedGeometry.find((panel) => panel.panelId === selectedLayoutPanel?.panelId) ??
      syncedGeometry[0];
    if (!targetPanel || targetPanel.locked) return;

    const widthDelta = adjustment === 'bigger' ? 0.08 : 0.1;
    const heightDelta = adjustment === 'bigger' ? 0.08 : 0;
    const resizedPanel = {
      ...targetPanel,
      x: targetPanel.x - widthDelta / 2,
      y: targetPanel.y - heightDelta / 2,
      w: targetPanel.w + widthDelta,
      h: targetPanel.h + heightDelta,
    };
    const nextPanel = getSnappedGuidedComicPanelGeometry(resizedPanel, syncedGeometry, guidedLayoutSettings);

    setActivePageNumber(page.pageNumber);
    setSelectedPanelId(targetPanel.panelId);
    setPageLayoutGeometry((current) => ({
      ...current,
      [page.pageNumber]: (current[page.pageNumber] ?? syncedGeometry).map((panel) =>
        panel.panelId === targetPanel.panelId ? nextPanel : panel,
      ),
    }));
    setPrimaryActionMessage(
      adjustment === 'bigger'
        ? `Made page ${page.pageNumber}, panel ${targetPanel.order + 1} bigger.`
        : `Made page ${page.pageNumber}, panel ${targetPanel.order + 1} wider.`,
    );
  };
  const selectPanelByOffset = (offset: number) => {
    if (selectedPanelQueueIndex < 0) return;
    const nextPanel = panelArtQueue[selectedPanelQueueIndex + offset];
    if (nextPanel) setSelectedPanelId(nextPanel.id);
  };
  const selectProductionPagePanelByOffset = (offset: number) => {
    if (!selectedProductionPage || selectedProductionPagePanelIndex < 0) return;
    const nextPanel = selectedProductionPanels[selectedProductionPagePanelIndex + offset];
    if (!nextPanel) return;
    selectProductionPanel(selectedProductionPage.pageNumber, nextPanel.panelId);
  };
  const guidedAiDraft: GuidedComicAiDraft = {
    currentStep: activeStep.id,
    setupForm,
    storyForm,
    artDirection,
    outlineBeats,
    pageCards,
    characterReferences,
    locationReferences,
    npcReferences,
    panelArtStatuses,
    panelArtImages,
    pageLayoutTemplates,
    pageLayoutIntents,
    pageLayoutGeometry,
    selectedPageNumber: activePageNumber ?? selectedPanelPageNumber ?? pageCards[0]?.pageNumber ?? null,
    selectedPanelId: selectedPanelEffectiveId,
  };
  const outlineDraftExists = hasGuidedComicOutlineDraft(outlineBeats);
  const guidedAiContext = buildGuidedComicAiContext(guidedAiDraft);
  const guidedPacingChecks = getGuidedComicPacingChecks(guidedAiContext);
  const guidedAiActions = GUIDED_COMIC_AI_ACTIONS_BY_STEP[activeStep.id];
  const runGuidedComicAiAction = async (action: GuidedComicAssistAction, forceSelectedOnly = false) => {
      const actionOption = GUIDED_COMIC_AI_ACTIONS_BY_STEP[activeStep.id].find((option) => option.action === action);
      setGuidedAiError(null);
      if (!isSupabaseConfigured()) {
        setGuidedAiError('Supabase is not configured. Guided AI uses the same signed-in writer-tools path as Writers’ Workshop.');
        return;
      }
      setGuidedAiLoadingAction(action);
      const selectedOnly =
        forceSelectedOnly ||
        action === 'regenerate_selected_page' ||
        action === 'strengthen_panel_prompt' ||
        action === 'suggest_shot_direction';
      const shouldSendPacingChecks =
        outlineDraftExists &&
        (action === 'review_readiness' || action === 'find_export_gaps' || action === 'suggest_layout_pacing');
      const res = await invokeWriterTools({
        mode: 'guided_comic_assist',
        action,
        selectedPageNumber: guidedAiContext.selectedPage?.pageNumber,
        selectedPanelId: guidedAiContext.selectedPanel?.id ?? selectedPanelEffectiveId ?? undefined,
        context: {
          ...guidedAiContext,
          ...(shouldSendPacingChecks ? { pacingChecks: guidedPacingChecks } : {}),
        },
      });
      setGuidedAiLoadingAction(null);

      if (!res.success) {
        setGuidedAiError([res.error, res.details].filter(Boolean).join(' · '));
        return;
      }

      const parsed = guidedComicAssistResultSchema.safeParse(res.data);
      if (!parsed.success) {
        setGuidedAiError('Guided AI returned unexpected JSON.');
        return;
      }

      setGuidedAiPreview({
        action,
        label: actionOption?.label ?? action.replace(/_/g, ' '),
        result: parsed.data,
        selectedOnly,
      });
  };
  const applyGuidedAiPreview = (mode: 'empty-only' | 'replace-confirmed') => {
    if (!guidedAiPreview) return;
    if (
      mode === 'replace-confirmed' &&
      !window.confirm('Replace existing guided comic text with this AI preview? This will update only guided draft fields, not images or exports.')
    ) {
      return;
    }
    const nextDraft = applyGuidedComicAiResult(guidedAiDraft, guidedAiPreview.result, {
      mode,
      selectedOnly: guidedAiPreview.selectedOnly,
      selectedPageNumber: guidedAiContext.selectedPage?.pageNumber ?? activePageNumber,
    });
    setSetupForm((current) => ({ ...current, ...nextDraft.setupForm }));
    setStoryForm(nextDraft.storyForm);
    setArtDirection(nextDraft.artDirection);
    setOutlineBeats(nextDraft.outlineBeats as OutlineBeat[]);
    setPageCards(nextDraft.pageCards as PageCard[]);
    setPageLayoutTemplates(nextDraft.pageLayoutTemplates as Record<number, LayoutTemplateId>);
    setPageLayoutIntents(nextDraft.pageLayoutIntents as Record<number, GuidedComicLayoutIntent>);
    setPageLayoutGeometry(nextDraft.pageLayoutGeometry as Record<number, GuidedComicPanelGeometry[]>);
    setGuidedAiAcceptedNotes({
      pacingNotes: guidedAiPreview.result.pacingNotes,
      referenceNeeds: guidedAiPreview.result.referenceNeeds,
      dialogueNotes: guidedAiPreview.result.dialogueNotes,
      narrationNotes: guidedAiPreview.result.narrationNotes,
    });
    setGuidedAiPreview(null);
  };
  const openImageshopWithPanel = (targetPanel: PanelArtQueueItem | null = selectedPanel) => {
    if (!targetPanel) return;

    const page = pageCards.find((card) => card.pageNumber === targetPanel.pageNumber);
    const layoutTemplate = page ? pageLayoutTemplates[page.pageNumber] ?? 'auto' : 'auto';
    const layoutPanel = page
      ? getGuidedComicLayoutPanels(page, layoutTemplate).find(
          (panel) => panel.panelNumber === targetPanel.panelNumber,
        )
      : null;
    const characters = mapReferencesForImageshop(characterReferences, 'character');
    const locations = mapReferencesForImageshop(locationReferences, 'asset');
    const npcs = mapReferencesForImageshop(npcReferences, 'npc');
    const props = mapReferencesForImageshop(
      Object.fromEntries(Object.entries(propPrep).map(([name, prep]) => [name, prep.references])),
      'asset',
    );
    const visualStoryMetadata = page ? buildVisualMetadataForPage(page, layoutTemplate) : null;
    const visualPanelMetadata = visualStoryMetadata?.panels.find(
      (panel) => panel.panelNumber === targetPanel.panelNumber,
    );

    requestGuidedComicHandoff({
      source: 'guided-comic',
      currentStep: 'art',
      returnTarget: 'guided-comic-art',
      sourceLabel: `Guided Comic Flow · Page ${targetPanel.pageNumber}, Panel ${targetPanel.panelNumber}`,
      panelId: targetPanel.id,
      pageNumber: targetPanel.pageNumber,
      panelNumber: targetPanel.panelNumber,
      panelBeat: targetPanel.beatText,
      visualPrompt: visualPanelMetadata?.visualPrompt,
      dialogueContext: visualPanelMetadata?.dialogueText || undefined,
      referenceNeeds: visualPanelMetadata?.referenceNeeds,
      panelLayout: layoutPanel
        ? {
            templateId: layoutTemplate,
            intent: layoutPanel.intent,
            columnSpan: layoutPanel.columnSpan,
            rowSpan: layoutPanel.rowSpan,
          }
        : undefined,
      pageSummary: page?.summary.trim() || undefined,
      pageKeyCharacters: targetPanel.characters,
      pageKeyLocation: targetPanel.location || undefined,
      artDirection,
      characters,
      locations,
      npcs,
      props,
      productionPrepContext: buildGuidedProductionPrepContext({
        characterNames: targetPanel.characters,
        locationName: targetPanel.location,
        characterPrep,
        locationPrep,
        propPrep,
        artDirection,
      }),
    });
  };
  const openImageshopWithSelectedPanel = () => openImageshopWithPanel();
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
          <div className="mt-2 grid max-h-40 grid-cols-5 gap-1 overflow-y-auto pr-1 custom-scrollbar">
            {pageCards.map((page) => {
              const selected = page.pageNumber === activePageNumber;
              return (
                <button
                  key={page.pageNumber}
                  type="button"
                  onClick={() => jumpToPage(page.pageNumber)}
                  className="flex h-8 min-w-0 items-center justify-center rounded-lg border text-xs font-black transition hover:border-amber-300/55 hover:bg-amber-300/10"
                  style={{
                    background: selected ? 'rgba(252,246,186,0.14)' : 'rgba(255,255,255,0.04)',
                    borderColor: selected ? `${ACCENT_GOLD_SOLID}99` : 'rgba(255,255,255,0.12)',
                    color: selected ? ACCENT_GOLD_LIGHT : 'rgba(255,255,255,0.76)',
                  }}
                  aria-label={`Page ${page.pageNumber}`}
                  aria-current={selected ? 'location' : undefined}
                >
                  {getGuidedPageNavigatorButtonLabel(page.pageNumber)}
                </button>
              );
            })}
          </div>
        ) : null}
	      </section>
	    ) : null;
  const productionPrepWorkspace =
    pageCards.length > 0 || prepCharacterNames.length > 0 || prepLocationNames.length > 0 ? (
      <section className="rounded-2xl border border-cyan-300/20 bg-black/30 p-4 shadow-xl backdrop-blur-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-100/70">Comic Production Prep</p>
            <h2 className="mt-1 text-2xl font-black text-white">Prepare visual continuity before production</h2>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-white/58">
              Writers Workshop creates the story. Production Prep gets the recurring visual language ready before page and panel work begins.
            </p>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/25 px-4 py-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/42">Visual continuity prepared</p>
            <p className="mt-1 text-2xl font-black text-cyan-100">
              {productionPrepReadyCount}/{Math.max(1, productionPrepTotalCount)}
            </p>
            <p className="mt-1 text-xs text-white/45">ready for production</p>
          </div>
        </div>

        <input
          ref={prepUploadInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handlePrepReferenceUpload}
        />

        <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] 2xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)_340px]">
          <div className="min-w-0 rounded-xl border border-white/10 bg-white/[0.055] p-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/45">Character Prep</p>
                <p className="mt-1 text-xs text-white/45">
                  Reference coverage {readyPrepCharacterCount}/{Math.max(1, prepCharacterNames.length)}
                </p>
              </div>
              <button
                type="button"
                onClick={openImageshopWithGuidedReferences}
                className="rounded-lg border border-cyan-300/30 bg-cyan-300/10 px-2.5 py-1.5 text-[11px] font-black text-cyan-100 transition hover:bg-cyan-300/15"
              >
                Imageshop refs
              </button>
            </div>
            <div className="mt-3 grid max-h-[38rem] gap-3 overflow-y-auto pr-1 custom-scrollbar">
              {prepCharacterNames.length > 0 ? (
                prepCharacterNames.map((name) => {
                  const prep = { ...DEFAULT_CHARACTER_PREP, ...(characterPrep[name] ?? {}) };
                  return (
                    <article key={name} className="rounded-xl border border-white/10 bg-black/25 p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="text-sm font-black text-white">{name}</h3>
                          <p className="mt-1 text-[11px] text-white/42">
                            {(characterReferences[name] ?? []).length} reference{(characterReferences[name] ?? []).length === 1 ? '' : 's'}
                          </p>
                        </div>
                        <label className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-100">
                          <input
                            type="checkbox"
                            checked={prep.ready}
                            onChange={(event) => updateCharacterPrep(name, 'ready', event.target.checked)}
                            className="rounded border-emerald-300/50 bg-black/40"
                          />
                          Ready
                        </label>
                      </div>
                      <div className="mt-3 grid gap-2">
                        <input
                          value={prep.roleSummary}
                          onChange={(event) => updateCharacterPrep(name, 'roleSummary', event.target.value)}
                          placeholder="Role summary"
                          className="rounded-lg border border-white/12 bg-black/30 px-3 py-2 text-xs text-white outline-none focus:border-cyan-300/60"
                        />
                        <textarea
                          value={prep.visualDescription}
                          onChange={(event) => updateCharacterPrep(name, 'visualDescription', event.target.value)}
                          placeholder="Visual description"
                          rows={2}
                          className="min-h-[4rem] resize-y rounded-lg border border-white/12 bg-black/30 px-3 py-2 text-xs leading-relaxed text-white outline-none focus:border-cyan-300/60"
                        />
                        <div className="grid gap-2 sm:grid-cols-2">
                          <textarea
                            value={prep.costumeNotes}
                            onChange={(event) => updateCharacterPrep(name, 'costumeNotes', event.target.value)}
                            placeholder="Costume notes"
                            rows={2}
                            className="min-h-[3.5rem] resize-y rounded-lg border border-white/12 bg-black/30 px-3 py-2 text-xs leading-relaxed text-white outline-none focus:border-cyan-300/60"
                          />
                          <textarea
                            value={prep.continuityNotes}
                            onChange={(event) => updateCharacterPrep(name, 'continuityNotes', event.target.value)}
                            placeholder="Continuity notes"
                            rows={2}
                            className="min-h-[3.5rem] resize-y rounded-lg border border-white/12 bg-black/30 px-3 py-2 text-xs leading-relaxed text-white outline-none focus:border-cyan-300/60"
                          />
                        </div>
                        <div className="grid gap-2 sm:grid-cols-2">
                          <input
                            value={prep.expressionsMoods}
                            onChange={(event) => updateCharacterPrep(name, 'expressionsMoods', event.target.value)}
                            placeholder="Expressions / moods"
                            className="rounded-lg border border-white/12 bg-black/30 px-3 py-2 text-xs text-white outline-none focus:border-cyan-300/60"
                          />
                          <input
                            value={prep.visualTags}
                            onChange={(event) => updateCharacterPrep(name, 'visualTags', event.target.value)}
                            placeholder="Visual tags"
                            className="rounded-lg border border-white/12 bg-black/30 px-3 py-2 text-xs text-white outline-none focus:border-cyan-300/60"
                          />
                        </div>
                      </div>
                      <div className="mt-3">
                        <ReferenceThumbnailStrip
                          references={characterReferences[name] ?? []}
                          emptyLabel="No character references selected."
                          onRemove={(index) => removeCharacterReference(name, index)}
                        />
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button type="button" onClick={() => requestPrepUpload('character', name)} className="rounded-lg border border-white/15 bg-white/10 px-2.5 py-1.5 text-[11px] font-bold text-white/78">Upload ref</button>
                        <button type="button" onClick={() => requestCharacterVaultReference(name)} className="rounded-lg border border-white/15 bg-white/10 px-2.5 py-1.5 text-[11px] font-bold text-white/78">Assign from Vault</button>
                        <button type="button" onClick={openImageshopWithGuidedReferences} className="rounded-lg border border-white/15 bg-white/10 px-2.5 py-1.5 text-[11px] font-bold text-white/78">Open in Imageshop</button>
                        <button
                          type="button"
                          onClick={() => {
                            updateCharacterPrep(name, 'roleSummary', prep.roleSummary || `Recurring character in ${setupForm.issueTitle || setupForm.seriesTitle || 'this comic'}.`);
                            updateCharacterPrep(name, 'visualDescription', prep.visualDescription || `Define ${name}'s silhouette, face, hair, build, and signature visual features for consistent panel art.`);
                          }}
                          className="rounded-lg border border-cyan-300/25 bg-cyan-300/10 px-2.5 py-1.5 text-[11px] font-bold text-cyan-100"
                        >
                          Regenerate guidance
                        </button>
                      </div>
                    </article>
                  );
                })
              ) : (
                <p className="rounded-lg border border-dashed border-white/15 bg-black/20 p-3 text-xs text-white/45">
                  Import or draft page characters to start character prep.
                </p>
              )}
            </div>
          </div>

          <div className="min-w-0 rounded-xl border border-white/10 bg-white/[0.055] p-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/45">Location + Environment Prep</p>
                <p className="mt-1 text-xs text-white/45">
                  Reference coverage {readyPrepLocationCount}/{Math.max(1, prepLocationNames.length)}
                </p>
              </div>
              <button
                type="button"
                onClick={openImageshopWithGuidedReferences}
                className="rounded-lg border border-cyan-300/30 bg-cyan-300/10 px-2.5 py-1.5 text-[11px] font-black text-cyan-100 transition hover:bg-cyan-300/15"
              >
                Concept refs
              </button>
            </div>
            <div className="mt-3 grid max-h-[38rem] gap-3 overflow-y-auto pr-1 custom-scrollbar">
              {prepLocationNames.length > 0 ? (
                prepLocationNames.map((name) => {
                  const prep = { ...DEFAULT_LOCATION_PREP, ...(locationPrep[name] ?? {}) };
                  return (
                    <article key={name} className="rounded-xl border border-white/10 bg-black/25 p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="text-sm font-black text-white">{name}</h3>
                          <p className="mt-1 text-[11px] text-white/42">
                            {(locationReferences[name] ?? []).length} reference{(locationReferences[name] ?? []).length === 1 ? '' : 's'}
                          </p>
                        </div>
                        <label className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-100">
                          <input
                            type="checkbox"
                            checked={prep.ready}
                            onChange={(event) => updateLocationPrep(name, 'ready', event.target.checked)}
                            className="rounded border-emerald-300/50 bg-black/40"
                          />
                          Ready
                        </label>
                      </div>
                      <div className="mt-3 grid gap-2">
                        <textarea
                          value={prep.settingSummary}
                          onChange={(event) => updateLocationPrep(name, 'settingSummary', event.target.value)}
                          placeholder="Setting summary"
                          rows={2}
                          className="min-h-[3.5rem] resize-y rounded-lg border border-white/12 bg-black/30 px-3 py-2 text-xs leading-relaxed text-white outline-none focus:border-cyan-300/60"
                        />
                        <div className="grid gap-2 sm:grid-cols-2">
                          <input
                            value={prep.moodTone}
                            onChange={(event) => updateLocationPrep(name, 'moodTone', event.target.value)}
                            placeholder="Mood / tone"
                            className="rounded-lg border border-white/12 bg-black/30 px-3 py-2 text-xs text-white outline-none focus:border-cyan-300/60"
                          />
                          <input
                            value={prep.lightingNotes}
                            onChange={(event) => updateLocationPrep(name, 'lightingNotes', event.target.value)}
                            placeholder="Lighting / time of day"
                            className="rounded-lg border border-white/12 bg-black/30 px-3 py-2 text-xs text-white outline-none focus:border-cyan-300/60"
                          />
                        </div>
                        <textarea
                          value={prep.environmentNotes}
                          onChange={(event) => updateLocationPrep(name, 'environmentNotes', event.target.value)}
                          placeholder="Architecture / environment notes"
                          rows={2}
                          className="min-h-[3.5rem] resize-y rounded-lg border border-white/12 bg-black/30 px-3 py-2 text-xs leading-relaxed text-white outline-none focus:border-cyan-300/60"
                        />
                        <input
                          value={prep.visualMotifs}
                          onChange={(event) => updateLocationPrep(name, 'visualMotifs', event.target.value)}
                          placeholder="Recurring visual motifs"
                          className="rounded-lg border border-white/12 bg-black/30 px-3 py-2 text-xs text-white outline-none focus:border-cyan-300/60"
                        />
                      </div>
                      <div className="mt-3">
                        <ReferenceThumbnailStrip
                          references={locationReferences[name] ?? []}
                          emptyLabel="No environment references selected."
                          onRemove={(index) => removeLocationReference(name, index)}
                        />
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button type="button" onClick={() => requestPrepUpload('location', name)} className="rounded-lg border border-white/15 bg-white/10 px-2.5 py-1.5 text-[11px] font-bold text-white/78">Upload ref</button>
                        <button type="button" onClick={() => requestLocationVaultReference(name)} className="rounded-lg border border-white/15 bg-white/10 px-2.5 py-1.5 text-[11px] font-bold text-white/78">Assign asset</button>
                        <button type="button" onClick={openImageshopWithGuidedReferences} className="rounded-lg border border-white/15 bg-white/10 px-2.5 py-1.5 text-[11px] font-bold text-white/78">Generate concepts</button>
                        <button
                          type="button"
                          onClick={() => {
                            updateLocationPrep(name, 'settingSummary', prep.settingSummary || `Prepare ${name} as a reusable production environment.`);
                            updateLocationPrep(name, 'environmentNotes', prep.environmentNotes || `Define architecture, scale, landmark shapes, and recurring background details for ${name}.`);
                          }}
                          className="rounded-lg border border-cyan-300/25 bg-cyan-300/10 px-2.5 py-1.5 text-[11px] font-bold text-cyan-100"
                        >
                          Regenerate guidance
                        </button>
                      </div>
                    </article>
                  );
                })
              ) : (
                <p className="rounded-lg border border-dashed border-white/15 bg-black/20 p-3 text-xs text-white/45">
                  Import or draft page locations to start environment prep.
                </p>
              )}
            </div>
          </div>

          <div className="grid min-w-0 gap-4 xl:col-span-2 2xl:col-span-1">
            <div className="rounded-xl border border-white/10 bg-white/[0.055] p-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/45">Visual Style Direction</p>
              <div className="mt-3 grid gap-2">
                <input value={artDirection.artStyle} onChange={(event) => updateArtDirectionField('artStyle', event.target.value)} placeholder="Overall art style" className="rounded-lg border border-white/12 bg-black/30 px-3 py-2 text-xs text-white outline-none focus:border-cyan-300/60" />
                <input value={artDirection.renderingStyle} onChange={(event) => updateArtDirectionField('renderingStyle', event.target.value)} placeholder="Rendering style" className="rounded-lg border border-white/12 bg-black/30 px-3 py-2 text-xs text-white outline-none focus:border-cyan-300/60" />
                <input value={artDirection.colorMood} onChange={(event) => updateArtDirectionField('colorMood', event.target.value)} placeholder="Color / mood direction" className="rounded-lg border border-white/12 bg-black/30 px-3 py-2 text-xs text-white outline-none focus:border-cyan-300/60" />
                <input value={artDirection.lighting} onChange={(event) => updateArtDirectionField('lighting', event.target.value)} placeholder="Cinematic tone / lighting" className="rounded-lg border border-white/12 bg-black/30 px-3 py-2 text-xs text-white outline-none focus:border-cyan-300/60" />
                <textarea value={artDirection.continuityNotes} onChange={(event) => updateArtDirectionField('continuityNotes', event.target.value)} placeholder="Panel density, pacing style, continuity rules" rows={3} className="min-h-[5rem] resize-y rounded-lg border border-white/12 bg-black/30 px-3 py-2 text-xs leading-relaxed text-white outline-none focus:border-cyan-300/60" />
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/[0.055] p-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/45">Prop / Asset Continuity</p>
                  <p className="mt-1 text-xs text-white/45">
                    Reference coverage {readyPrepPropCount}/{Math.max(1, prepPropNames.length)}
                  </p>
                </div>
              </div>
              <div className="mt-3 flex gap-2">
                <input
                  value={newPropName}
                  onChange={(event) => setNewPropName(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      addPropPrepItem();
                    }
                  }}
                  placeholder="Add recurring prop or asset"
                  className="min-w-0 flex-1 rounded-lg border border-white/12 bg-black/30 px-3 py-2 text-xs text-white outline-none focus:border-cyan-300/60"
                />
                <button type="button" onClick={addPropPrepItem} className="rounded-lg border border-cyan-300/30 bg-cyan-300/10 px-3 py-2 text-xs font-black text-cyan-100">Add</button>
              </div>
              <div className="mt-3 grid max-h-[24rem] gap-3 overflow-y-auto pr-1 custom-scrollbar">
                {prepPropNames.length > 0 ? (
                  prepPropNames.map((name) => {
                    const prep = { ...DEFAULT_PROP_PREP, ...(propPrep[name] ?? { name }) };
                    return (
                      <article key={name} className="rounded-xl border border-white/10 bg-black/25 p-3">
                        <div className="flex items-start justify-between gap-3">
                          <h3 className="text-sm font-black text-white">{name}</h3>
                          <label className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-100">
                            <input type="checkbox" checked={prep.ready} onChange={(event) => updatePropPrep(name, 'ready', event.target.checked)} className="rounded border-emerald-300/50 bg-black/40" />
                            Ready
                          </label>
                        </div>
                        <div className="mt-3 grid gap-2">
                          <textarea value={prep.continuityNotes} onChange={(event) => updatePropPrep(name, 'continuityNotes', event.target.value)} placeholder="Continuity notes" rows={2} className="min-h-[3.5rem] resize-y rounded-lg border border-white/12 bg-black/30 px-3 py-2 text-xs leading-relaxed text-white outline-none focus:border-cyan-300/60" />
                          <input value={prep.styleNotes} onChange={(event) => updatePropPrep(name, 'styleNotes', event.target.value)} placeholder="Style notes" className="rounded-lg border border-white/12 bg-black/30 px-3 py-2 text-xs text-white outline-none focus:border-cyan-300/60" />
                          <input value={prep.reuseTracking} onChange={(event) => updatePropPrep(name, 'reuseTracking', event.target.value)} placeholder="Reuse tracking" className="rounded-lg border border-white/12 bg-black/30 px-3 py-2 text-xs text-white outline-none focus:border-cyan-300/60" />
                        </div>
                        <div className="mt-3">
                          <ReferenceThumbnailStrip
                            references={prep.references}
                            emptyLabel="No prop references selected."
                            onRemove={(index) => removePropReference(name, index)}
                          />
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <button type="button" onClick={() => requestPrepUpload('prop', name)} className="rounded-lg border border-white/15 bg-white/10 px-2.5 py-1.5 text-[11px] font-bold text-white/78">Upload ref</button>
                          <button type="button" onClick={() => requestPropVaultReference(name)} className="rounded-lg border border-white/15 bg-white/10 px-2.5 py-1.5 text-[11px] font-bold text-white/78">Assign vault asset</button>
                          <button type="button" onClick={openImageshopWithGuidedReferences} className="rounded-lg border border-white/15 bg-white/10 px-2.5 py-1.5 text-[11px] font-bold text-white/78">Generate concept</button>
                        </div>
                      </article>
                    );
                  })
                ) : (
                  <p className="rounded-lg border border-dashed border-white/15 bg-black/20 p-3 text-xs text-white/45">
                    Add recurring objects, symbols, uniforms, weapons, devices, or vehicles to track visual reuse.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>
    ) : null;

  const selectedProductionPageStatus =
    selectedProductionPage
      ? getGuidedProductionPageStatus(selectedProductionPage, {
          layoutTemplateId: pageLayoutTemplates[selectedProductionPage.pageNumber],
          panelArtImages,
          panelArtStatuses,
          writerDialogueSeed: writerDialogueSeeds[selectedProductionPage.pageNumber],
          editableDialogueSeeds: editableDialogueSeeds[selectedProductionPage.pageNumber],
          characterReferences,
          locationReferences,
          npcReferences,
          npcNames: npcReferenceNames,
        })
      : null;

  const creativeBreadcrumb = (
    <nav className="flex flex-wrap items-center gap-2 text-[11px] font-black uppercase tracking-[0.14em]" aria-label="Guided comic focus">
      <button
        type="button"
        onClick={openIssueLightbox}
        className={`rounded-full border px-3 py-1.5 transition ${
          workspaceMode === 'issue-lightbox'
            ? 'border-amber-200/55 bg-amber-300/[0.18] text-amber-50'
            : 'border-white/10 bg-white/[0.055] text-white/48 hover:bg-white/10'
        }`}
      >
        Issue
      </button>
      <span className="text-white/25">/</span>
      <button
        type="button"
        onClick={openIssueCoverWorkspace}
        className={`rounded-full border px-3 py-1.5 transition ${
          workspaceMode === 'issue-cover'
            ? 'border-amber-200/55 bg-amber-300/[0.18] text-amber-50'
            : 'border-white/10 bg-white/[0.055] text-white/48 hover:bg-white/10'
        }`}
      >
        Cover
      </button>
      <span className="text-white/25">/</span>
      <button
        type="button"
        onClick={() => openPageProduction()}
        className={`rounded-full border px-3 py-1.5 transition ${
          workspaceMode === 'page-production'
            ? 'border-amber-200/55 bg-amber-300/[0.18] text-amber-50'
            : 'border-white/10 bg-white/[0.055] text-white/48 hover:bg-white/10'
        }`}
      >
        Page {selectedProductionPage?.pageNumber ?? activePageNumber ?? 1}
      </button>
      <span className="text-white/25">/</span>
      <button
        type="button"
        onClick={() => {
          if (selectedProductionPage && selectedProductionPanel) {
            selectProductionPanel(selectedProductionPage.pageNumber, selectedProductionPanel.panelId);
          }
        }}
        disabled={!selectedProductionPage || !selectedProductionPanel}
        className={`rounded-full border px-3 py-1.5 transition disabled:cursor-not-allowed disabled:opacity-40 ${
          workspaceMode === 'panel-focus'
            ? 'border-amber-200/55 bg-amber-300/[0.18] text-amber-50'
            : 'border-white/10 bg-white/[0.055] text-white/48 hover:bg-white/10'
        }`}
      >
        Panel {selectedProductionPanel?.panelNumber ?? '-'}
      </button>
    </nav>
  );

  const focusReentryStrip =
    pageCards.length > 0 ? (
      <section className="rounded-2xl border border-amber-300/18 bg-black/35 p-3 shadow-xl backdrop-blur-sm lg:p-4" aria-label="Guided Comics focus re-entry">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: ACCENT_GOLD_LIGHT }}>
              Continue in focus mode
            </p>
            <p className="mt-1 text-sm leading-relaxed text-white/58">
              Page {selectedProductionPage?.pageNumber ?? activePageNumber ?? 1}
              {selectedProductionPanel ? ` / Panel ${selectedProductionPanel.panelNumber}` : ''} is ready for the production workspace.
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:min-w-[34rem] xl:grid-cols-4">
            <button
              type="button"
              onClick={openIssueLightbox}
              className="rounded-xl border border-white/12 bg-white/[0.055] px-3 py-3 text-left transition hover:border-amber-300/45 hover:bg-amber-300/10"
            >
              <span className="block text-[10px] font-black uppercase tracking-[0.16em] text-white/42">Overview</span>
              <span className="mt-1 block text-sm font-black text-white">Issue Lightbox</span>
            </button>
            <button
              type="button"
              onClick={openIssueCoverWorkspace}
              className="rounded-xl border border-white/12 bg-white/[0.055] px-3 py-3 text-left transition hover:border-amber-300/45 hover:bg-amber-300/10"
            >
              <span className="block text-[10px] font-black uppercase tracking-[0.16em] text-white/42">Setup</span>
              <span className="mt-1 block text-sm font-black text-white">Issue Cover</span>
            </button>
            <button
              type="button"
              onClick={() => openPageProduction(selectedProductionPage?.pageNumber ?? activePageNumber ?? undefined)}
              className="rounded-xl border px-3 py-3 text-left transition hover:scale-[1.01] active:scale-[0.99] motion-reduce:hover:scale-100"
              style={{ borderColor: `${ACCENT_GOLD_SOLID}88`, background: ACCENT_GOLD_GRADIENT, color: TEXT_ON_GOLD }}
            >
              <span className="block text-[10px] font-black uppercase tracking-[0.16em] opacity-70">Create</span>
              <span className="mt-1 block text-sm font-black">Page Production</span>
            </button>
            <button
              type="button"
              onClick={() => {
                if (selectedProductionPage && selectedProductionPanel) {
                  selectProductionPanel(selectedProductionPage.pageNumber, selectedProductionPanel.panelId);
                }
              }}
              disabled={!selectedProductionPage || !selectedProductionPanel}
              className="rounded-xl border border-white/12 bg-white/[0.055] px-3 py-3 text-left transition hover:border-amber-300/45 hover:bg-amber-300/10 disabled:cursor-not-allowed disabled:opacity-45"
            >
              <span className="block text-[10px] font-black uppercase tracking-[0.16em] text-white/42">Detail</span>
              <span className="mt-1 block text-sm font-black text-white">Panel Focus</span>
            </button>
          </div>
        </div>
      </section>
    ) : null;

  const issueCoverWorkspace =
    pageCards.length > 0 ? (
      <section className="guided-focus-surface min-w-0 overflow-hidden border border-amber-300/20 bg-[#05070d] p-4 shadow-2xl backdrop-blur-md lg:p-5">
        <input
          ref={coverUploadInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleIssueCoverUpload}
        />

        <div className="flex flex-col gap-4 border-b border-white/10 pb-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            {creativeBreadcrumb}
            <p className="mt-4 text-[10px] font-black uppercase tracking-[0.2em] text-amber-100/55">
              Issue properties / cover workspace
            </p>
            <h2 className="mt-2 text-2xl font-black text-white md:text-4xl">
              {setupForm.issueTitle.trim() || `${setupForm.seriesTitle.trim() || 'Untitled series'} #${setupForm.issueNumber || 1}`}
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-white/58">
              Set the issue shell, cover art, references, and Writer page-beat import before moving into page production.
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            <button
              type="button"
              onClick={() => openPageProduction(selectedProductionPage?.pageNumber)}
              className="rounded-md border px-3 py-2 text-xs font-black transition hover:scale-[1.01] active:scale-[0.99] motion-reduce:hover:scale-100"
              style={{ borderColor: `${ACCENT_GOLD_SOLID}88`, background: ACCENT_GOLD_GRADIENT, color: TEXT_ON_GOLD }}
            >
              Page Workspace
            </button>
            <button
              type="button"
              onClick={() => {
                if (selectedProductionPage && selectedProductionPanel) {
                  selectProductionPanel(selectedProductionPage.pageNumber, selectedProductionPanel.panelId);
                }
              }}
              disabled={!selectedProductionPage || !selectedProductionPanel}
              className="rounded-md border border-white/15 bg-white/10 px-3 py-2 text-xs font-bold text-white/80 transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-45"
            >
              Panel Workspace
            </button>
            <button
              type="button"
              onClick={() => {
                if (selectedProductionPage) openPageInAdvancedStudio(selectedProductionPage);
              }}
              disabled={!selectedProductionPage}
              className="rounded-md border border-amber-300/30 bg-amber-300/10 px-3 py-2 text-xs font-bold text-amber-50 transition hover:bg-amber-300/15 disabled:cursor-not-allowed disabled:opacity-45"
            >
              Advanced Studio
            </button>
          </div>
        </div>

        <div className="mt-5 grid min-w-0 gap-5 xl:grid-cols-[minmax(260px,0.86fr)_minmax(360px,auto)_minmax(260px,0.86fr)] xl:items-start">
          <div className="grid content-start gap-4">
            <div className="border border-white/10 bg-black/25 p-3">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/45">Issue setup</p>
              <div className="mt-3 grid gap-3">
                <label className="grid min-w-0 gap-1 text-[10px] font-bold uppercase tracking-[0.14em] text-white/45">
                  Series
                  <input
                    value={setupForm.seriesTitle}
                    onChange={(event) => updateSetupField('seriesTitle', event.target.value)}
                    className="w-full rounded-md border border-white/15 bg-black/40 px-3 py-2 text-sm font-bold normal-case tracking-normal text-white outline-none focus:border-amber-300/70"
                  />
                </label>
                <div className="grid gap-3">
                  <label className="grid min-w-0 gap-1 text-[10px] font-bold uppercase tracking-[0.14em] text-white/45">
                    Issue title
                    <input
                      value={setupForm.issueTitle}
                      onChange={(event) => updateSetupField('issueTitle', event.target.value)}
                      className="w-full rounded-md border border-white/15 bg-black/40 px-3 py-2 text-sm font-bold normal-case tracking-normal text-white outline-none focus:border-amber-300/70"
                    />
                  </label>
                  <label className="grid min-w-0 gap-1 text-[10px] font-bold uppercase tracking-[0.14em] text-white/45">
                    Issue number
                    <input
                      value={setupForm.issueNumber}
                      onChange={(event) => updateSetupField('issueNumber', event.target.value)}
                      className="w-full rounded-md border border-white/15 bg-black/40 px-3 py-2 text-sm font-bold normal-case tracking-normal text-white outline-none focus:border-amber-300/70"
                    />
                  </label>
                </div>
                <div className="grid gap-3">
                  <label className="grid min-w-0 gap-1 text-[10px] font-bold uppercase tracking-[0.14em] text-white/45">
                    Pages
                    <input
                      value={setupForm.targetPageCount}
                      onChange={(event) => updateSetupField('targetPageCount', event.target.value)}
                      className="w-full rounded-md border border-white/15 bg-black/40 px-3 py-2 text-sm font-bold normal-case tracking-normal text-white outline-none focus:border-amber-300/70"
                    />
                  </label>
                  <label className="grid min-w-0 gap-1 text-[10px] font-bold uppercase tracking-[0.14em] text-white/45">
                    Genre
                    <select
                      value={setupForm.genre}
                      onChange={(event) => updateSetupField('genre', event.target.value)}
                      className="w-full rounded-md border border-white/15 bg-black/40 px-3 py-2 text-sm font-bold normal-case tracking-normal text-white outline-none focus:border-amber-300/70"
                    >
                      {GENRE_OPTIONS.map((genre) => (
                        <option key={genre} value={genre}>
                          {genre}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="grid gap-1 text-[10px] font-bold uppercase tracking-[0.14em] text-white/45">
                    Tone
                    <select
                      value={setupForm.tone}
                      onChange={(event) => updateSetupField('tone', event.target.value)}
                      className="w-full rounded-md border border-white/15 bg-black/40 px-3 py-2 text-sm font-bold normal-case tracking-normal text-white outline-none focus:border-amber-300/70"
                    >
                      {TONE_OPTIONS.map((tone) => (
                        <option key={tone} value={tone}>
                          {tone}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </div>
            </div>

            <div className="border border-cyan-300/18 bg-cyan-300/[0.06] p-3">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-100/65">
                Writers' Workshop sync
              </p>
              <p className="mt-2 text-xs leading-relaxed text-white/55">
                Page beats imported here become Guided page cards and panel beats; local edits remain available in Page and Panel workspaces.
              </p>
              <div className="mt-3 grid gap-2">
                <button
                  type="button"
                  onClick={() => void loadWriterBridgeOptions()}
                  disabled={writerBridgeBusyAction !== null}
                  className="rounded-md border border-white/15 bg-white/10 px-3 py-2 text-xs font-bold text-white/78 transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-45"
                >
                  Load / choose Writer issue
                </button>
                {writerBridgeIssueOptions.length > 0 ? (
                  <label className="grid gap-1 text-[10px] font-bold uppercase tracking-[0.14em] text-white/45">
                    Existing Writer issue
                    <select
                      value={writerBridgeSelectedIssueId}
                      onChange={(event) => {
                        const issueId = event.target.value;
                        setWriterBridgeSelectedIssueId(issueId);
                        const issue = writerBridgeIssues.find((row) => row.id === issueId);
                        if (issue) setWriterBridgeSelectedSeriesId(issue.series_id);
                      }}
                      className="w-full rounded-md border border-white/15 bg-black/40 px-3 py-2 text-xs font-bold normal-case tracking-normal text-white outline-none focus:border-cyan-200/70"
                    >
                      <option value="">Select issue to link or delete</option>
                      {writerBridgeIssueOptions.map((option) => (
                        <option key={option.issue.id} value={option.issue.id}>
                          {option.seriesTitle} #{option.issue.issue_number}
                          {option.issue.title ? `: ${option.issue.title}` : ''}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : null}
                <button
                  type="button"
                  onClick={linkSelectedWriterIssue}
                  disabled={writerBridgeBusyAction !== null || !selectedWriterBridgeIssue}
                  className="rounded-md border border-white/15 bg-white/10 px-3 py-2 text-xs font-bold text-white/78 transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-45"
                >
                  Link selected Writer issue
                </button>
                <button
                  type="button"
                  onClick={() => void createLinkedWriterIssueFromGuidedStory()}
                  disabled={writerBridgeBusyAction !== null}
                  className="rounded-md border border-emerald-200/25 bg-emerald-300/10 px-3 py-2 text-xs font-bold text-emerald-50 transition hover:bg-emerald-300/15 disabled:cursor-not-allowed disabled:opacity-45"
                >
                  Create missing Writer issue
                </button>
                <button
                  type="button"
                  onClick={importLatestLinkedWriterIssue}
                  disabled={writerBridgeBusyAction !== null || (!writerIssueId && !writerBridgeSelectedIssueId)}
                  className="rounded-md border border-white/15 bg-white/10 px-3 py-2 text-xs font-bold text-white/78 transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-45"
                >
                  Import latest page beats
                </button>
                <button
                  type="button"
                  onClick={() => runGuidedWriterToolAction('page-beats')}
                  disabled={writerBridgeBusyAction !== null || (!writerIssueId && !writerBridgeSelectedIssueId)}
                  className="rounded-md border border-cyan-200/25 bg-cyan-300/10 px-3 py-2 text-xs font-bold text-cyan-50 transition hover:bg-cyan-300/15 disabled:cursor-not-allowed disabled:opacity-45"
                >
                  Generate / update page beats
                </button>
                <button
                  type="button"
                  onClick={() => void deleteSelectedWriterIssue()}
                  disabled={writerBridgeBusyAction !== null || !selectedWriterBridgeIssue}
                  className="inline-flex items-center justify-center gap-2 rounded-md border border-rose-200/25 bg-rose-500/10 px-3 py-2 text-xs font-bold text-rose-100 transition hover:bg-rose-500/15 disabled:cursor-not-allowed disabled:opacity-45"
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden />
                  Delete selected Writer issue
                </button>
              </div>
              {writerBridgeMessage ? <p className="mt-3 text-xs leading-relaxed text-cyan-50/70">{writerBridgeMessage}</p> : null}
              {writerBridgeError ? <p className="mt-3 text-xs leading-relaxed text-rose-100/80">{writerBridgeError}</p> : null}
            </div>
          </div>

          <div
            ref={coverPasteTargetRef}
            tabIndex={0}
            onPaste={handleIssueCoverPaste}
            className="outline-none focus:ring-2 focus:ring-amber-200/70"
          >
            <div className="relative mx-auto aspect-[2/3] h-[min(66vh,720px)] min-h-[30rem] w-auto max-w-full overflow-hidden border border-amber-200/50 bg-[#101018] shadow-[0_34px_120px_rgba(0,0,0,0.72)]">
              {issueCoverImage?.imageUrl ? (
                <VaultImageWithFallback
                  src={issueCoverImage.imageUrl}
                  alt={`${setupForm.seriesTitle || 'Comic'} issue cover`}
                  frameClassName="h-full w-full"
                  imgClassName="h-full w-full object-cover"
                />
              ) : (
                <div
                  className="flex h-full flex-col justify-between p-6"
                  style={{ background: getGuidedComicPlaceholderCoverBackground(`${setupForm.seriesTitle}-${setupForm.issueNumber}`) }}
                >
                  <span className="w-fit border border-black/20 bg-white/70 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-[#2a1b0d]">
                    Cover design
                  </span>
                  <div>
                    <p className="text-4xl font-black leading-none text-white drop-shadow md:text-5xl">
                      {setupForm.seriesTitle.trim() || 'Untitled Series'}
                    </p>
                    <p className="mt-3 max-w-sm text-base font-black uppercase tracking-[0.18em] text-amber-50/85">
                      {setupForm.issueTitle.trim() || `Issue #${setupForm.issueNumber || 1}`}
                    </p>
                  </div>
                  <span className="w-fit border border-white/20 bg-black/45 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-white/75">
                    Upload, paste, or use panel art
                  </span>
                </div>
              )}
              <div className="absolute inset-x-3 bottom-3 border border-white/12 bg-black/70 p-2 shadow-2xl backdrop-blur-md">
                <p className="mb-2 text-[9px] font-black uppercase tracking-[0.18em] text-amber-50/68">Cover source</p>
                <div className="grid gap-2 sm:grid-cols-2 2xl:grid-cols-5">
                  <button
                    type="button"
                    onClick={openImageshopWithGuidedReferences}
                    className="rounded-md border px-3 py-2 text-xs font-black transition hover:scale-[1.01] active:scale-[0.99] motion-reduce:hover:scale-100"
                    style={{ borderColor: `${ACCENT_GOLD_SOLID}88`, background: ACCENT_GOLD_GRADIENT, color: TEXT_ON_GOLD }}
                  >
                    Imageshop
                  </button>
                  <button
                    type="button"
                    onClick={() => requestVaultSelection({ type: 'cover', name: 'Issue cover' })}
                    className="rounded-md border border-white/15 bg-white/10 px-3 py-2 text-xs font-bold text-white/78 transition hover:bg-white/15"
                  >
                    Vault
                  </button>
                  <button
                    type="button"
                    onClick={() => coverUploadInputRef.current?.click()}
                    className="rounded-md border border-white/15 bg-white/10 px-3 py-2 text-xs font-bold text-white/78 transition hover:bg-white/15"
                  >
                    Upload
                  </button>
                  <button
                    type="button"
                    onClick={focusCoverPasteTarget}
                    className="rounded-md border border-white/15 bg-white/10 px-3 py-2 text-xs font-bold text-white/78 transition hover:bg-white/15"
                  >
                    Paste
                  </button>
                  <button
                    type="button"
                    onClick={useFirstPanelArtAsIssueCover}
                    className="rounded-md border border-white/15 bg-white/10 px-3 py-2 text-xs font-bold text-white/78 transition hover:bg-white/15"
                  >
                    Panel art
                  </button>
                </div>
              </div>
            </div>
            {coverPasteMessage ? <p className="mt-2 text-xs leading-relaxed text-amber-50/72">{coverPasteMessage}</p> : null}
          </div>

          <aside className="grid content-start gap-3">
            <div className="border border-amber-300/20 bg-amber-300/[0.06] p-3">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-100/70">
                Production readiness
              </p>
              <div className="mt-3 grid gap-2 text-sm font-bold text-white/82">
                <div className="flex items-center justify-between gap-3 border border-white/10 bg-black/20 px-3 py-2">
                  <span>Cover art</span>
                  <span className="text-xs uppercase tracking-[0.14em] text-white/50">
                    {issueCoverImage?.imageUrl ? 'ready' : 'needed'}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3 border border-white/10 bg-black/20 px-3 py-2">
                  <span>Pages</span>
                  <span className="text-xs uppercase tracking-[0.14em] text-white/50">
                    {pageCards.length}/{targetPageCountFromInput(setupForm.targetPageCount)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3 border border-white/10 bg-black/20 px-3 py-2">
                  <span>References</span>
                  <span className="text-xs uppercase tracking-[0.14em] text-white/50">
                    {readyVisualReferences}/{Math.max(1, totalVisualReferences)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3 border border-white/10 bg-black/20 px-3 py-2">
                  <span>Writer link</span>
                  <span className="text-xs uppercase tracking-[0.14em] text-white/50">
                    {writerIssueId ? 'linked' : 'local'}
                  </span>
                </div>
              </div>
            </div>
            <div className="border border-white/10 bg-black/25 p-3">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/45">Cover direction</p>
              <label className="mt-3 grid gap-1 text-[10px] font-bold uppercase tracking-[0.14em] text-white/45">
                Art style
                <textarea
                  value={artDirection.artStyle}
                  onChange={(event) => updateArtDirectionField('artStyle', event.target.value)}
                  rows={3}
                  className="rounded-md border border-white/15 bg-black/40 px-3 py-2 text-sm font-medium normal-case leading-relaxed tracking-normal text-white outline-none focus:border-amber-300/70"
                  placeholder="Cover rendering style, genre language, logo treatment notes"
                />
              </label>
              <label className="mt-3 grid gap-1 text-[10px] font-bold uppercase tracking-[0.14em] text-white/45">
                Continuity notes
                <textarea
                  value={artDirection.continuityNotes}
                  onChange={(event) => updateArtDirectionField('continuityNotes', event.target.value)}
                  rows={4}
                  className="rounded-md border border-white/15 bg-black/40 px-3 py-2 text-sm font-medium normal-case leading-relaxed tracking-normal text-white outline-none focus:border-amber-300/70"
                  placeholder="Series logo, issue logo, character/reference locks, motifs"
                />
              </label>
            </div>
          </aside>
        </div>
      </section>
    ) : null;

  const issueLightboxWorkspace =
    pageCards.length > 0 ? (
      <section className="guided-focus-surface min-w-0 overflow-hidden rounded-2xl border border-amber-300/20 bg-black/35 p-4 shadow-2xl backdrop-blur-md lg:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            {creativeBreadcrumb}
            <h2 className="mt-3 text-2xl font-black text-white md:text-4xl">Issue Lightbox</h2>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-white/58">
              Re-enter the comic from the page, not a dashboard. Choose a page, then move into production or the last active panel.
            </p>
          </div>
          <label className="flex w-full max-w-xs flex-col gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-white/45">
            Reopen preference
            <select
              value={reopenPreference}
              onChange={(event) => setReopenPreference(normalizeGuidedComicReopenPreference(event.target.value))}
              className="rounded-xl border border-white/15 bg-black/45 px-3 py-2 text-xs font-bold normal-case tracking-normal text-white outline-none focus:border-amber-300/70"
            >
              {(Object.keys(GUIDED_COMIC_REOPEN_PREFERENCE_LABELS) as GuidedComicReopenPreference[]).map((preference) => (
                <option key={preference} value={preference}>
                  {GUIDED_COMIC_REOPEN_PREFERENCE_LABELS[preference]}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-6 grid min-w-0 gap-5 xl:grid-cols-[112px_minmax(0,1fr)_300px]">
          <aside className="grid max-h-[34rem] content-start gap-2 overflow-y-auto pr-1 custom-scrollbar" aria-label="Issue page rail">
            {pageCards.map((page) => {
              const selected = page.pageNumber === selectedProductionPage?.pageNumber;
              return (
                <button
                  key={page.pageNumber}
                  type="button"
                  onClick={() => {
                    setActivePageNumber(page.pageNumber);
                    const firstPanel = panelArtQueue.find((panel) => panel.pageNumber === page.pageNumber);
                    if (firstPanel) setSelectedPanelId(firstPanel.id);
                    setWorkspaceMode('issue-lightbox');
                    setProductionPanelFocusOpen(false);
                  }}
                  className="flex h-16 items-center justify-center rounded-xl border text-lg font-black transition hover:border-amber-300/55 hover:bg-amber-300/10"
                  style={{
                    borderColor: selected ? `${ACCENT_GOLD_SOLID}bb` : 'rgba(255,255,255,0.12)',
                    background: selected ? 'rgba(252,211,77,0.14)' : 'rgba(255,255,255,0.045)',
                    color: selected ? ACCENT_GOLD_LIGHT : 'rgba(255,255,255,0.62)',
                  }}
                  aria-current={selected ? 'page' : undefined}
                >
                  {page.pageNumber}
                </button>
              );
            })}
          </aside>

          <div className="guided-comic-stage relative flex min-h-[34rem] items-center justify-center rounded-2xl border border-white/10 p-5">
            <div
              className="pointer-events-none absolute inset-0 opacity-80"
              style={{
                background:
                  'radial-gradient(circle at 50% 45%, rgba(252,246,186,0.16), transparent 34%), radial-gradient(circle at 50% 50%, rgba(56,189,248,0.09), transparent 52%)',
              }}
              aria-hidden
            />
            {selectedProductionPage ? (
              <button
                type="button"
                onClick={() => openPageProduction(selectedProductionPage.pageNumber)}
                className="relative aspect-[2/3] w-full max-w-[min(62vw,430px)] overflow-hidden rounded-xl border border-amber-200/55 bg-[#100e16] shadow-2xl transition duration-500 hover:scale-[1.015] hover:border-amber-100 focus:outline-none focus:ring-2 focus:ring-amber-200/70 motion-reduce:transition-none motion-reduce:hover:scale-100"
                aria-label={`Open page ${selectedProductionPage.pageNumber} in production`}
              >
                {selectedLayoutGeometry.map((panel) => {
                  const productionPanel =
                    selectedProductionPanels.find((candidate) => candidate.panelId === panel.panelId) ??
                    selectedProductionPanels[panel.order];
                  return (
                    <span
                      key={panel.panelId}
                      className="absolute overflow-hidden rounded-md border bg-amber-300/[0.055] text-left shadow-lg"
                      style={{
                        left: `${panel.x * 100}%`,
                        top: `${panel.y * 100}%`,
                        width: `${panel.w * 100}%`,
                        height: `${panel.h * 100}%`,
                        borderColor: 'rgba(252,211,77,0.52)',
                      }}
                    >
                      {productionPanel?.imageUrl ? (
                        <VaultImageWithFallback
                          src={productionPanel.imageUrl}
                          alt={`Page ${selectedProductionPage.pageNumber}, panel ${panel.order + 1}`}
                          frameClassName="h-full w-full overflow-hidden"
                          imgClassName="h-full w-full"
                          imgStyle={{
                            objectFit:
                              panel.imageFit === 'stretch'
                                ? 'fill'
                                : panel.imageFit === 'contain'
                                  ? 'contain'
                                  : 'cover',
                            objectPosition: `${(panel.imageFocusX ?? 0.5) * 100}% ${(panel.imageFocusY ?? 0.5) * 100}%`,
                            transform: (panel.imageZoom ?? 1) > 1 ? `scale(${panel.imageZoom})` : undefined,
                            transformOrigin: `${(panel.imageFocusX ?? 0.5) * 100}% ${(panel.imageFocusY ?? 0.5) * 100}%`,
                          }}
                        />
                      ) : (
                        <span className="flex h-full min-h-[5rem] flex-col justify-between bg-black/25 p-2">
                          <span className="text-[10px] font-black uppercase tracking-[0.14em] text-amber-100/72">
                            Panel {panel.order + 1}
                          </span>
                          <span className="line-clamp-3 text-[11px] leading-snug text-white/68">
                            {productionPanel?.beatText || 'Panel beat needed'}
                          </span>
                        </span>
                      )}
                    </span>
                  );
                })}
              </button>
            ) : (
              <p className="relative text-sm text-white/50">Choose or create a page to enter production.</p>
            )}
          </div>

          <aside className="self-center rounded-2xl border border-white/10 bg-black/35 p-4 shadow-xl">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: ACCENT_GOLD_LIGHT }}>
              Current page
            </p>
            <h3 className="mt-2 text-2xl font-black text-white">Page {selectedProductionPage?.pageNumber ?? '-'}</h3>
            <p className="mt-2 line-clamp-4 text-sm leading-relaxed text-white/60">
              {selectedProductionPage?.summary.trim() || 'No page summary yet. Open the page to shape the beats.'}
            </p>
            <div className="mt-4 grid gap-2">
              <div className="rounded-xl border border-white/10 bg-white/[0.055] p-3">
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/40">Production signal</p>
                <p className="mt-1 text-sm font-black text-white">
                  {selectedProductionPageStatus ? guidedProductionStatusLabel(selectedProductionPageStatus) : 'No page selected'}
                </p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/[0.055] p-3">
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/40">Panel momentum</p>
                <p className="mt-1 text-sm font-black text-white">
                  {selectedProductionPanels.length} panel{selectedProductionPanels.length === 1 ? '' : 's'} ready to craft
                </p>
              </div>
              {selectedProductionMissingReferences.length > 0 ? (
                <div className="rounded-xl border border-cyan-300/20 bg-cyan-300/10 p-3">
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-cyan-100/65">Missing refs</p>
                  <p className="mt-1 line-clamp-3 text-xs leading-relaxed text-cyan-50/75">
                    {selectedProductionMissingReferences.join(', ')}
                  </p>
                </div>
              ) : null}
            </div>
            <div className="mt-4 grid gap-2">
              <button
                type="button"
                onClick={() => openPageProduction(selectedProductionPage?.pageNumber)}
                className="rounded-xl border px-4 py-3 text-sm font-black transition hover:scale-[1.01] active:scale-[0.99] motion-reduce:hover:scale-100"
                style={{ borderColor: `${ACCENT_GOLD_SOLID}88`, background: ACCENT_GOLD_GRADIENT, color: TEXT_ON_GOLD }}
              >
                Enter Page Production
              </button>
              {selectedProductionPage && selectedProductionPanel ? (
                <button
                  type="button"
                  onClick={() => selectProductionPanel(selectedProductionPage.pageNumber, selectedProductionPanel.panelId)}
                  className="rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-sm font-bold text-white/80 transition hover:bg-white/15"
                >
                  Resume Panel {selectedProductionPanel.panelNumber}
                </button>
              ) : null}
            </div>
          </aside>
        </div>
      </section>
    ) : null;

  const productionWorkspace =
    pageCards.length > 0 ? (
      <section className="guided-focus-surface min-w-0 overflow-hidden border border-amber-300/18 bg-[#060811] p-3 shadow-2xl backdrop-blur-sm lg:p-4">
        <input
          ref={panelUploadInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handlePanelArtUpload}
        />

        <div className="flex flex-col gap-3 border-b border-white/10 pb-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/42">
              Issue / Page {selectedProductionPage?.pageNumber ?? '-'} / Panel {selectedProductionPanel?.panelNumber ?? '-'}
            </p>
            <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <h2 className="text-2xl font-black text-white">
                Page {selectedProductionPage?.pageNumber ?? '-'}
              </h2>
              <p className="max-w-3xl truncate text-sm font-medium text-white/58">
                {selectedProductionPage?.summary.trim() || 'Select or draft a page summary in the existing Pages step.'}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => selectProductionPageByOffset(-1)}
              disabled={selectedProductionPageIndex <= 0}
              className="rounded-md border border-white/12 bg-white/[0.055] px-2.5 py-1.5 text-xs font-bold text-white/70 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-35"
            >
              Previous page
            </button>
            <label className="flex items-center gap-2 rounded-md border border-white/12 bg-black/25 px-2.5 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-white/45">
              Page
              <select
                value={selectedProductionPage?.pageNumber ?? ''}
                onChange={(event) => selectProductionPage(Number(event.target.value))}
                className="bg-transparent text-xs font-black normal-case tracking-normal text-white outline-none"
              >
                {pageCards.map((page) => (
                  <option key={page.pageNumber} value={page.pageNumber}>
                    {page.pageNumber} of {pageCards.length}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              onClick={() => selectProductionPageByOffset(1)}
              disabled={selectedProductionPageIndex < 0 || selectedProductionPageIndex >= pageCards.length - 1}
              className="rounded-md border border-white/12 bg-white/[0.055] px-2.5 py-1.5 text-xs font-bold text-white/70 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-35"
            >
              Next page
            </button>
            {selectedProductionPage ? (
              <button
                type="button"
                onClick={() => openPageInAdvancedStudio(selectedProductionPage)}
                className="inline-flex items-center justify-center gap-2 rounded-md border border-amber-300/35 bg-amber-300/10 px-3 py-1.5 text-xs font-black text-amber-100 transition hover:bg-amber-300/20"
              >
                <MonitorUp className="h-4 w-4" aria-hidden />
                Advanced Studio
              </button>
            ) : null}
          </div>
        </div>

        {selectedProductionPage ? (
          <>
            {hasSelectedProductionPageContext ? (
              <details className="mt-3 border-l-2 border-amber-200/28 bg-black/10 px-3 py-2">
                <summary className="cursor-pointer text-[10px] font-black uppercase tracking-[0.16em] text-white/48">
                  Page context sources
                </summary>
                <div className="mt-2 grid gap-2 md:grid-cols-3">
                  {selectedProductionContextItems.map((item) => (
                    <div key={item.label} className="border-t border-white/10 pt-2">
                      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-amber-100/58">{item.label}</p>
                        <p className="text-[10px] font-bold text-white/36">{item.source}</p>
                      </div>
                      <p className="mt-1 line-clamp-3 whitespace-pre-wrap text-xs leading-relaxed text-white/64">{item.value}</p>
                      <p className="mt-1 text-[10px] font-bold text-sky-100/42">{item.usedBy}</p>
                    </div>
                  ))}
                </div>
              </details>
            ) : null}

            <div className="guided-comic-stage relative mt-4 grid min-w-0 gap-4 overflow-hidden border border-amber-200/18 bg-[#070b16] p-4 lg:p-5 xl:grid-cols-[minmax(220px,0.78fr)_minmax(360px,auto)_minmax(220px,0.78fr)] xl:items-stretch">
              <div
                className="pointer-events-none absolute inset-0 opacity-80"
                aria-hidden
                style={{
                  background:
                    'radial-gradient(circle at 50% 12%, rgba(56,189,248,0.18), transparent 34%), radial-gradient(circle at 50% 62%, rgba(252,211,77,0.09), transparent 44%), linear-gradient(180deg, rgba(255,255,255,0.035), rgba(0,0,0,0.22))',
                }}
              />
              <span className="pointer-events-none absolute left-4 top-3 text-[10px] font-black uppercase tracking-[0.2em] text-white/24">
                Page backcloth
              </span>

              <div className="relative z-10 order-2 grid content-start gap-3 xl:order-1 xl:max-h-[calc(100vh-18rem)] xl:overflow-y-auto xl:pr-1">
                <div className="border border-white/10 bg-black/25 p-3">
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/45">Page layout</p>
                  <label className="mt-3 flex flex-col gap-1 text-[10px] font-black uppercase tracking-[0.14em] text-white/45">
                    Layout preset
                    <select
                      value={selectedLayoutTemplateId}
                      onChange={(event) => updatePageLayoutTemplate(selectedProductionPage.pageNumber, event.target.value as LayoutTemplateId)}
                      className="rounded-md border border-white/15 bg-black/45 px-3 py-2 text-xs font-bold normal-case tracking-normal text-white outline-none focus:border-amber-300/70"
                    >
                      {LAYOUT_TEMPLATE_OPTIONS.map((option) => (
                        <option key={option.id} value={option.id}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <div className="mt-3 grid gap-2">
                    <button
                      type="button"
                      onClick={() => adjustSelectedLayoutPanel(selectedProductionPage, 'bigger')}
                      className="rounded-md border border-amber-300/30 bg-amber-300/10 px-3 py-2 text-xs font-black text-amber-50 transition hover:bg-amber-300/15"
                    >
                      Make selected bigger
                    </button>
                    <button
                      type="button"
                      onClick={() => adjustSelectedLayoutPanel(selectedProductionPage, 'wider')}
                      className="rounded-md border border-amber-300/30 bg-amber-300/10 px-3 py-2 text-xs font-black text-amber-50 transition hover:bg-amber-300/15"
                    >
                      Make selected wider
                    </button>
                    <button
                      type="button"
                      onClick={() => applySafeMarginsToPageLayout(selectedProductionPage)}
                      className="rounded-md border border-white/15 bg-white/10 px-3 py-2 text-xs font-bold text-white/72 transition hover:bg-white/15"
                    >
                      Apply safe margins
                    </button>
                  </div>
                </div>
                <p className="border-l-2 border-amber-200/28 bg-black/10 px-3 py-2 text-xs leading-relaxed text-white/42">
                  Imported Writer beats are shown in the editable fields below. Visual Prep references stay separate, then travel with the selected panel when it opens in Imageshop.
                </p>
                <div className="border border-white/10 bg-black/25 p-3">
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/45">Writer-imported beats</p>
                  <label className="mt-3 block text-[10px] font-bold uppercase tracking-[0.14em] text-white/45">
                    Page beat
                    <textarea
                      value={selectedProductionPage.summary}
                      onChange={(event) =>
                        updatePageCard(selectedProductionPage.pageNumber, {
                          summary: event.target.value,
                        })
                      }
                      rows={4}
                      className="mt-2 min-h-[7rem] w-full resize-y rounded-md border border-white/15 bg-black/35 px-3 py-2 text-xs font-medium normal-case leading-relaxed tracking-normal text-white outline-none focus:border-amber-300/70"
                      placeholder="Writer page beat or one-line hook"
                    />
                  </label>
                  <div className="mt-3 grid gap-2">
                    {getGuidedComicExistingPanelBeats(selectedProductionPage).map((beat, panelIndex) => (
                      <label
                        key={`${selectedProductionPage.pageNumber}-writer-panel-beat-${panelIndex}`}
                        className="block text-[10px] font-bold uppercase tracking-[0.14em] text-white/45"
                      >
                        Panel {panelIndex + 1} beat
                        <textarea
                          value={beat}
                          onChange={(event) =>
                            updatePagePanelBeat(selectedProductionPage.pageNumber, panelIndex, event.target.value)
                          }
                          rows={3}
                          className="mt-1 min-h-[5.5rem] w-full resize-y rounded-md border border-white/15 bg-black/35 px-3 py-2 text-xs font-medium normal-case leading-relaxed tracking-normal text-white outline-none focus:border-amber-300/70"
                          placeholder={`Writer beat for panel ${panelIndex + 1}`}
                        />
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <div
                ref={(node) => {
                  layoutCanvasRefs.current[selectedProductionPage.pageNumber] = node;
                }}
                className="relative z-10 order-1 mx-auto aspect-[2/3] h-[min(70vh,720px)] min-h-[30rem] w-auto max-w-full overflow-hidden rounded-md border border-amber-200/45 bg-[#100e16] shadow-[0_32px_120px_rgba(0,0,0,0.72)] xl:order-2 xl:h-[calc(100vh-18rem)] xl:min-h-[32rem]"
                style={{
                  backgroundImage:
                    'linear-gradient(90deg, rgba(252,211,77,0.06) 1px, transparent 1px), linear-gradient(180deg, rgba(252,211,77,0.06) 1px, transparent 1px)',
                  backgroundSize: '10% 10%',
                }}
              >
                {selectedLayoutGeometry.map((panel) => {
                  const productionPanel =
                    selectedProductionPanels.find((candidate) => candidate.panelId === panel.panelId) ??
                    selectedProductionPanels[panel.order];
                  const selected = productionPanel?.panelId === selectedProductionPanel?.panelId;
                  return (
                    <div
                      key={panel.panelId}
                      role="button"
                      tabIndex={0}
                      onClick={() => selectProductionPanelOnPage(selectedProductionPage.pageNumber, panel.panelId)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          selectProductionPanelOnPage(selectedProductionPage.pageNumber, panel.panelId);
                        }
                      }}
                      onPointerDown={(event) => {
                        if (!shouldStartGuidedPanelMoveDrag(event.target)) return;
                        startLayoutPanelEdit(event, selectedProductionPage.pageNumber, panel, 'move');
                      }}
                      className="absolute min-h-0 overflow-hidden rounded-md border bg-amber-300/[0.055] text-left shadow-lg transition duration-300 hover:border-amber-200 hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-amber-200/60 motion-reduce:transition-none"
                      style={{
                        left: `${panel.x * 100}%`,
                        top: `${panel.y * 100}%`,
                        width: `${panel.w * 100}%`,
                        height: `${panel.h * 100}%`,
                        borderColor: selected ? ACCENT_GOLD_SOLID : 'rgba(252,211,77,0.52)',
                        cursor: panel.locked ? 'default' : 'move',
                        touchAction: 'none',
                        boxShadow: selected
                          ? '0 0 0 2px rgba(252,246,186,0.25), 0 18px 40px rgba(0,0,0,0.35)'
                          : '0 0 0 1px rgba(0,0,0,0.32), 0 12px 30px rgba(0,0,0,0.28)',
                      }}
                      aria-label={`Select page ${selectedProductionPage.pageNumber}, panel ${panel.order + 1}`}
                    >
                      {productionPanel?.imageUrl ? (
                        <VaultImageWithFallback
                          src={productionPanel.imageUrl}
                          alt={`Page ${selectedProductionPage.pageNumber}, panel ${panel.order + 1}`}
                          frameClassName="h-full w-full overflow-hidden"
                          imgClassName="h-full w-full"
                          imgStyle={{
                            objectFit:
                              panel.imageFit === 'stretch'
                                ? 'fill'
                                : panel.imageFit === 'contain'
                                  ? 'contain'
                                  : 'cover',
                            objectPosition: `${(panel.imageFocusX ?? 0.5) * 100}% ${(panel.imageFocusY ?? 0.5) * 100}%`,
                            transform: (panel.imageZoom ?? 1) > 1 ? `scale(${panel.imageZoom})` : undefined,
                            transformOrigin: `${(panel.imageFocusX ?? 0.5) * 100}% ${(panel.imageFocusY ?? 0.5) * 100}%`,
                          }}
                        />
                      ) : (
                        <span className="flex h-full min-h-[5rem] flex-col justify-between bg-black/20 p-2">
                          <span className="text-[10px] font-black uppercase tracking-[0.14em] text-amber-100/72">
                            Panel {panel.order + 1}
                          </span>
                          <span className="line-clamp-5 text-[11px] leading-snug text-white/72">
                            {productionPanel?.beatText || 'Panel beat needed'}
                          </span>
                          {selectedProductionPanelMetadata && selected ? (
                            <span className="line-clamp-2 text-[9px] font-bold uppercase tracking-[0.12em] text-sky-100/46">
                              {selectedProductionPanelReferenceChips.length > 0
                                ? selectedProductionPanelReferenceChips.map((chip) => chip.label).join(' / ')
                                : 'No references requested yet'}
                            </span>
                          ) : null}
                          <span className="text-[9px] font-bold uppercase tracking-[0.12em] text-amber-100/42">
                            {productionPanel?.layoutIntent ?? 'normal'}
                          </span>
                        </span>
                      )}
                      <span className="absolute right-2 top-2 rounded-full border border-amber-200/45 bg-black/65 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.12em] text-amber-50">
                        Panel {panel.order + 1}
                      </span>
                      <span
                        className={[
                          'absolute left-2 top-2 h-2.5 w-2.5 rounded-full border',
                          productionPanel?.status && productionPanel.status !== 'needs-art'
                            ? 'border-emerald-300/35 bg-emerald-400/20 text-emerald-100'
                            : 'border-white/15 bg-black/55 text-white/65',
                        ].join(' ')}
                        aria-hidden
                      />
                      {selected ? (
                        <>
                          <div className="absolute inset-x-2 bottom-2 flex flex-wrap gap-1.5">
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                if (productionPanel) {
                                  selectProductionPanelOnPage(selectedProductionPage.pageNumber, productionPanel.panelId);
                                  openImageshopWithPanel(
                                    panelArtQueue.find((queuePanel) => queuePanel.id === productionPanel.panelId) ?? null,
                                  );
                                }
                              }}
                              className="rounded border border-amber-200/40 bg-black/70 px-2 py-1 text-[10px] font-black text-amber-50 transition hover:bg-amber-300/20"
                            >
                              Imageshop
                            </button>
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                if (productionPanel) {
                                  selectProductionPanelOnPage(selectedProductionPage.pageNumber, productionPanel.panelId);
                                  panelUploadInputRef.current?.click();
                                }
                              }}
                              className="rounded border border-white/18 bg-black/70 px-2 py-1 text-[10px] font-bold text-white/72 transition hover:bg-white/10"
                            >
                              Upload
                            </button>
                          </div>
                          {(['nw', 'ne', 'sw', 'se'] as LayoutResizeHandle[]).map((handle) => (
                            <button
                              key={handle}
                              type="button"
                              aria-label={`Resize panel ${panel.order + 1} ${handle}`}
                              onClick={(event) => event.stopPropagation()}
                              onPointerDown={(event) => startLayoutPanelEdit(event, selectedProductionPage.pageNumber, panel, 'resize', handle)}
                              className={[
                                'absolute h-3 w-3 rounded-full border border-black/50 bg-amber-200 shadow-sm',
                                handle.includes('n') ? 'top-1' : 'bottom-1',
                                handle.includes('w') ? 'left-1' : 'right-1',
                              ].join(' ')}
                              style={{
                                cursor: handle === 'nw' || handle === 'se' ? 'nwse-resize' : 'nesw-resize',
                              }}
                            />
                          ))}
                        </>
                      ) : null}
                    </div>
                  );
                })}
              </div>

              <div className="relative z-10 order-3 grid content-start gap-3 xl:max-h-[calc(100vh-18rem)] xl:overflow-y-auto xl:pl-1">
                <div className="border border-amber-300/20 bg-amber-300/[0.06] p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-amber-100/70">Selected panel</p>
                      <p className="mt-1 text-sm font-black text-white">
                        Panel {selectedProductionPanel?.panelNumber ?? 1}
                      </p>
                    </div>
                    <span className="border border-white/10 bg-black/30 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-white/52">
                      {selectedProductionPanel?.layoutIntent ?? 'normal'}
                    </span>
                  </div>
                  <p className="mt-3 text-xs leading-relaxed text-white/58">
                    {selectedProductionPanel?.beatText || 'Select a panel on the page to edit its production moment.'}
                  </p>
                </div>

                <div className="grid gap-2 border border-white/10 bg-black/25 p-3">
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/45">Panel actions</p>
                  <button
                    type="button"
                    onClick={() =>
                      selectedProductionPanel
                        ? selectProductionPanel(selectedProductionPage.pageNumber, selectedProductionPanel.panelId)
                        : undefined
                    }
                    className="rounded-md border border-white/15 bg-white/10 px-3 py-2 text-xs font-bold text-white/78 transition hover:bg-white/15"
                  >
                    Focus panel
                  </button>
                  <button
                    type="button"
                    onClick={() => openImageshopWithPanel(selectedPanel)}
                    className="inline-flex items-center justify-center gap-2 rounded-md border px-3 py-2 text-xs font-black transition hover:scale-[1.01] active:scale-[0.99] motion-reduce:hover:scale-100"
                    style={{ borderColor: `${ACCENT_GOLD_SOLID}88`, background: ACCENT_GOLD_GRADIENT, color: TEXT_ON_GOLD }}
                  >
                    <ImagePlus className="h-3.5 w-3.5" aria-hidden />
                    Imageshop
                  </button>
                  <button
                    type="button"
                    onClick={() => requestPanelArtVaultImageForPanel(selectedPanel)}
                    className="rounded-md border border-white/15 bg-white/10 px-3 py-2 text-xs font-bold text-white/78 transition hover:bg-white/15"
                  >
                    Vault
                  </button>
                  <button
                    type="button"
                    onClick={() => panelUploadInputRef.current?.click()}
                    className="rounded-md border border-white/15 bg-white/10 px-3 py-2 text-xs font-bold text-white/78 transition hover:bg-white/15"
                  >
                    Upload
                  </button>
                </div>
              </div>
            </div>
          </>
        ) : (
          <p className="mt-4 rounded-lg border border-white/10 bg-black/25 p-3 text-sm text-white/50">
            Build page cards first to use the production workspace.
          </p>
        )}
      </section>
    ) : null;

  const panelFocusWorkspace =
    selectedProductionPage && selectedProductionPanel ? (
      <section className="guided-focus-surface flex min-w-0 flex-col overflow-hidden border border-amber-200/30 bg-[#05060c] p-4 shadow-2xl backdrop-blur-md lg:p-5">
        <div className="flex flex-col gap-3 border-b border-white/10 pb-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/42">
              Issue / Page {selectedProductionPage.pageNumber} / Panel {selectedProductionPanel.panelNumber}
            </p>
            <h2 className="mt-2 text-2xl font-black text-white md:text-3xl">
              Page {selectedProductionPage.pageNumber}, Panel {selectedProductionPanel.panelNumber}
            </h2>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] font-bold uppercase tracking-[0.14em] text-white/42">
              <span className="border border-white/10 bg-white/[0.055] px-2 py-1">
                Moment {selectedProductionPagePanelIndex + 1}/{selectedProductionPanels.length}
              </span>
              <span className="border border-white/10 bg-white/[0.055] px-2 py-1">
                {panelArtStatusLabel(selectedPanelStatus)}
              </span>
              <span className="border border-white/10 bg-white/[0.055] px-2 py-1">
                {selectedProductionPanel.layoutIntent}
              </span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => openPageProduction(selectedProductionPage.pageNumber)}
              className="inline-flex items-center justify-center gap-2 rounded-md border border-white/15 bg-white/10 px-3 py-2 text-xs font-bold text-white/80 transition hover:bg-white/15"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden />
              Return to page
            </button>
            <button
              type="button"
              onClick={openIssueLightbox}
              className="inline-flex items-center justify-center gap-2 rounded-md border border-white/15 bg-white/10 px-3 py-2 text-xs font-bold text-white/80 transition hover:bg-white/15"
            >
              Pull back to issue
            </button>
          </div>
        </div>

        <input
          ref={panelUploadInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handlePanelArtUpload}
        />

        <div className="mt-4 grid min-w-0 flex-1 gap-4 xl:grid-cols-[minmax(240px,0.82fr)_minmax(360px,58vh)_minmax(240px,0.82fr)] xl:items-stretch">
          <div className="order-2 grid content-start gap-3 xl:order-1 xl:max-h-[calc(100vh-14rem)] xl:overflow-y-auto xl:pr-1">
            <div
              ref={panelPasteTargetRef}
              tabIndex={0}
              onPaste={handlePanelArtPaste}
              className="border border-white/10 bg-black/25 p-3 outline-none focus:border-amber-300/55 focus:bg-amber-300/10"
            >
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/45">Panel image</p>
              <div className="mt-3 grid gap-2">
                <button
                  type="button"
                  onClick={openImageshopWithSelectedPanel}
                  className="inline-flex items-center justify-center gap-2 rounded-md border px-3 py-2 text-xs font-black transition hover:scale-[1.01] active:scale-[0.99] motion-reduce:hover:scale-100"
                  style={{ borderColor: `${ACCENT_GOLD_SOLID}88`, background: ACCENT_GOLD_GRADIENT, color: TEXT_ON_GOLD }}
                >
                  <ImagePlus className="h-3.5 w-3.5" aria-hidden />
                  Imageshop
                </button>
                <button
                  type="button"
                  onClick={requestPanelArtVaultImage}
                  className="inline-flex items-center justify-center gap-2 rounded-md border border-white/15 bg-white/10 px-3 py-2 text-xs font-bold text-white/80 transition hover:bg-white/15"
                >
                  <BookOpenText className="h-3.5 w-3.5" aria-hidden />
                  Vault
                </button>
                <button
                  type="button"
                  onClick={() => panelUploadInputRef.current?.click()}
                  className="inline-flex items-center justify-center gap-2 rounded-md border border-white/15 bg-white/10 px-3 py-2 text-xs font-bold text-white/80 transition hover:bg-white/15"
                >
                  <Upload className="h-3.5 w-3.5" aria-hidden />
                  Upload
                </button>
                <button
                  type="button"
                  onClick={focusPanelPasteTarget}
                  className="inline-flex items-center justify-center gap-2 rounded-md border border-white/15 bg-white/10 px-3 py-2 text-xs font-bold text-white/80 transition hover:bg-white/15"
                >
                  <Clipboard className="h-3.5 w-3.5" aria-hidden />
                  Paste
                </button>
              </div>
              {panelPasteMessage ? <p className="mt-2 text-xs text-amber-50/70">{panelPasteMessage}</p> : null}
              {selectedProductionPanelGeometry ? (
                <div className="mt-4 border-t border-white/10 pt-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/45">Image framing</p>
                    <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-white/35">
                      drag art to reframe
                    </span>
                  </div>
                  <div className="mt-2 grid grid-cols-3 gap-2">
                    {(['cover', 'contain', 'stretch'] as GuidedComicImageFit[]).map((fit) => {
                      const selected = (selectedProductionPanelGeometry.imageFit ?? 'cover') === fit;
                      return (
                        <button
                          key={fit}
                          type="button"
                          disabled={!selectedProductionPanel.imageUrl}
                          onClick={() =>
                            updateLayoutPanelFraming(selectedProductionPage.pageNumber, selectedProductionPanelGeometry.panelId, {
                              imageFit: fit,
                            })
                          }
                          className="rounded-md border px-2 py-1.5 text-[11px] font-black capitalize transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-45"
                          style={{
                            borderColor: selected ? `${ACCENT_GOLD_SOLID}dd` : 'rgba(255,255,255,0.14)',
                            background: selected ? ACCENT_GOLD_GRADIENT : 'rgba(255,255,255,0.07)',
                            color: selected ? TEXT_ON_GOLD : 'rgba(255,255,255,0.76)',
                          }}
                        >
                          {fit}
                        </button>
                      );
                    })}
                  </div>
                  <label className="mt-3 flex flex-col gap-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-white/45">
                    Zoom
                    <input
                      type="range"
                      min="1"
                      max="3"
                      step="0.05"
                      value={selectedProductionPanelGeometry.imageZoom ?? 1}
                      disabled={!selectedProductionPanel.imageUrl || selectedProductionPanelGeometry.imageFit === 'stretch'}
                      onChange={(event) =>
                        updateLayoutPanelFraming(selectedProductionPage.pageNumber, selectedProductionPanelGeometry.panelId, {
                          imageZoom: Number(event.target.value),
                        })
                      }
                      className="w-full accent-amber-300 disabled:opacity-45"
                    />
                  </label>
                  <div className="mt-3 grid grid-cols-3 gap-1">
                    {[
                      [0, 0],
                      [0.5, 0],
                      [1, 0],
                      [0, 0.5],
                      [0.5, 0.5],
                      [1, 0.5],
                      [0, 1],
                      [0.5, 1],
                      [1, 1],
                    ].map(([focusX, focusY]) => {
                      const selected =
                        Math.abs((selectedProductionPanelGeometry.imageFocusX ?? 0.5) - focusX) < 0.01 &&
                        Math.abs((selectedProductionPanelGeometry.imageFocusY ?? 0.5) - focusY) < 0.01;
                      return (
                        <button
                          key={`${focusX}-${focusY}`}
                          type="button"
                          aria-label={`Focus image ${focusX * 100}% ${focusY * 100}%`}
                          disabled={!selectedProductionPanel.imageUrl || selectedProductionPanelGeometry.imageFit === 'stretch'}
                          onClick={() =>
                            updateLayoutPanelFraming(selectedProductionPage.pageNumber, selectedProductionPanelGeometry.panelId, {
                              imageFocusX: focusX,
                              imageFocusY: focusY,
                            })
                          }
                          className="flex aspect-square items-center justify-center rounded-md border transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-45"
                          style={{
                            borderColor: selected ? `${ACCENT_GOLD_SOLID}` : 'rgba(255,255,255,0.14)',
                            background: selected ? 'rgba(252,246,186,0.18)' : 'rgba(255,255,255,0.06)',
                          }}
                        >
                          <span
                            className="h-2 w-2 rounded-full"
                            style={{ background: selected ? ACCENT_GOLD_LIGHT : 'rgba(255,255,255,0.45)' }}
                          />
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </div>

            <label className="block text-[10px] font-bold uppercase tracking-[0.16em] text-white/45">
              Page / panel beat
              <textarea
                value={selectedProductionPanel.beatText}
                onChange={(event) =>
                  updatePagePanelBeat(
                    selectedProductionPage.pageNumber,
                    selectedProductionPanel.panelNumber - 1,
                    event.target.value,
                  )
                }
                rows={6}
                className="mt-2 min-h-[10rem] w-full resize-y rounded-md border border-white/15 bg-black/35 px-3 py-2 text-sm font-medium normal-case leading-relaxed tracking-normal text-white outline-none focus:border-amber-300/70"
              />
              <span className="mt-2 block text-xs font-medium normal-case leading-relaxed tracking-normal text-white/42">
                Writer imports fill page and panel beats here. References are assigned in Visual Prep and are included when this panel opens in Imageshop.
              </span>
            </label>

            <details className="border border-white/10 bg-black/25 p-3" open>
              <summary className="cursor-pointer text-[10px] font-bold uppercase tracking-[0.16em] text-white/45">
                Dialogue
              </summary>
              <div className="mt-3 grid gap-2">
                <button
                  type="button"
                  onClick={addManualDialogueSeedForSelectedPanel}
                  className="w-fit rounded-md border border-white/15 bg-white/10 px-2.5 py-1.5 text-[11px] font-bold text-white/72 transition hover:bg-white/15"
                >
                  Add local seed
                </button>
                {selectedPanelDialogueSeeds.length > 0 ? (
                  selectedPanelDialogueSeeds.map((seed) => (
                    <label key={seed.id} className="block text-[10px] font-bold uppercase tracking-[0.12em] text-white/40">
                      {seed.kind === 'narration' ? 'Narration' : 'Dialogue'} · {seed.status}
                      <textarea
                        value={seed.text}
                        onChange={(event) => updateDialogueSeedText(seed.pageNumber, seed.id, event.target.value)}
                        rows={2}
                        className="mt-1 min-h-[4rem] w-full resize-y rounded-md border border-white/15 bg-black/35 px-3 py-2 text-sm font-medium normal-case leading-relaxed tracking-normal text-white outline-none focus:border-amber-300/70"
                      />
                    </label>
                  ))
                ) : (
                  <p className="text-xs leading-relaxed text-white/48">No dialogue seed is staged for this panel yet.</p>
                )}
              </div>
            </details>
          </div>

          <div className="guided-comic-stage relative order-1 overflow-hidden border border-amber-200/24 bg-[#071022] p-4 shadow-2xl xl:order-2 xl:h-[calc(100vh-14rem)] xl:min-h-[34rem]">
            <div
              className="pointer-events-none absolute inset-0"
              style={{
                background:
                  'radial-gradient(circle at 50% 46%, rgba(252,246,186,0.14), transparent 36%), radial-gradient(circle at 50% 50%, rgba(0,0,0,0.25), transparent 60%)',
              }}
              aria-hidden
            />
            <div className="relative mx-auto flex min-h-[30rem] items-center justify-center xl:h-full xl:min-h-0">
              <div
                onPointerDown={(event) => {
                  if (selectedProductionPanelGeometry) {
                    startImageFramingDrag(event, selectedProductionPage.pageNumber, selectedProductionPanelGeometry);
                  }
                }}
                className={[
                  'guided-panel-cinema-frame relative aspect-[2/3] h-[min(62vh,620px)] min-h-[28rem] w-auto max-w-full overflow-hidden rounded-md border border-amber-200/55 bg-black/35 shadow-[0_38px_140px_rgba(0,0,0,0.78)] transition duration-500 motion-reduce:transition-none xl:h-full xl:min-h-0',
                  selectedProductionPanel.imageUrl && selectedProductionPanelGeometry?.imageFit !== 'stretch'
                    ? 'cursor-grab active:cursor-grabbing'
                    : '',
                ].join(' ')}
              >
                {selectedProductionPanel.imageUrl ? (
                  <VaultImageWithFallback
                    src={selectedProductionPanel.imageUrl}
                    alt={`Assigned art for page ${selectedProductionPage.pageNumber}, panel ${selectedProductionPanel.panelNumber}`}
                    frameClassName="h-full w-full"
                    imgClassName="h-full w-full select-none"
                    imgStyle={{
                      objectFit:
                        selectedProductionPanelGeometry?.imageFit === 'stretch'
                          ? 'fill'
                          : selectedProductionPanelGeometry?.imageFit === 'contain'
                            ? 'contain'
                            : 'cover',
                      objectPosition: `${(selectedProductionPanelGeometry?.imageFocusX ?? 0.5) * 100}% ${(selectedProductionPanelGeometry?.imageFocusY ?? 0.5) * 100}%`,
                      transform:
                        (selectedProductionPanelGeometry?.imageZoom ?? 1) > 1
                          ? `scale(${selectedProductionPanelGeometry?.imageZoom})`
                          : undefined,
                      transformOrigin: `${(selectedProductionPanelGeometry?.imageFocusX ?? 0.5) * 100}% ${(selectedProductionPanelGeometry?.imageFocusY ?? 0.5) * 100}%`,
                    }}
                  />
                ) : (
                  <div
                    className="flex h-full flex-col justify-between p-6"
                    style={{
                      backgroundImage:
                        'linear-gradient(90deg, rgba(252,211,77,0.07) 1px, transparent 1px), linear-gradient(180deg, rgba(252,211,77,0.07) 1px, transparent 1px)',
                      backgroundSize: '10% 10%',
                    }}
                  >
                    <span className="w-fit rounded-full border border-amber-200/45 bg-black/55 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-amber-50">
                      Panel {selectedProductionPanel.panelNumber}
                    </span>
                    <p className="max-w-2xl text-2xl font-black leading-tight text-white md:text-4xl">
                      {selectedProductionPanel.beatText || 'Add the beat that makes this moment land.'}
                    </p>
                    <span className="w-fit rounded-full border border-white/15 bg-black/55 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-white/55">
                      {selectedProductionPanel.layoutIntent}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="order-3 grid content-start gap-3 xl:max-h-[calc(100vh-14rem)] xl:overflow-y-auto xl:pl-1">
            <div className="grid gap-2 border border-amber-300/20 bg-amber-300/[0.06] p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-amber-100/70">Panel momentum</p>
                <span className="text-xs font-black text-white">
                  {selectedProductionPagePanelIndex + 1}/{selectedProductionPanels.length}
                </span>
              </div>
              <div className="mt-3 grid gap-2">
                <button
                  type="button"
                  onClick={() => selectProductionPagePanelByOffset(-1)}
                  disabled={selectedProductionPagePanelIndex <= 0}
                  className="inline-flex items-center justify-center gap-2 rounded-md border border-white/15 bg-white/10 px-3 py-2 text-xs font-bold text-white/78 transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronLeft className="h-3.5 w-3.5" aria-hidden />
                  Previous panel
                </button>
                <button
                  type="button"
                  onClick={() => selectProductionPagePanelByOffset(1)}
                  disabled={selectedProductionPagePanelIndex >= selectedProductionPanels.length - 1}
                  className="inline-flex items-center justify-center gap-2 rounded-md border px-3 py-2 text-xs font-black transition hover:scale-[1.01] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40 motion-reduce:hover:scale-100"
                  style={{ borderColor: `${ACCENT_GOLD_SOLID}88`, background: ACCENT_GOLD_GRADIENT, color: TEXT_ON_GOLD }}
                >
                  Next panel
                  <ChevronRight className="h-3.5 w-3.5" aria-hidden />
                </button>
              </div>
              <div className="grid gap-2 sm:grid-cols-3 xl:grid-cols-1">
                {(['ready', 'approved', 'needs-art'] as PanelArtStatus[]).map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => updatePanelArtStatus(selectedProductionPanel.panelId, status)}
                    className="rounded-md border px-3 py-2 text-xs font-black transition hover:brightness-110 active:scale-[0.99]"
                    style={panelArtStatusButtonStyle(status, selectedPanelStatus)}
                  >
                    {status === 'ready' ? 'Ready' : status === 'approved' ? 'Approve' : 'Revise'}
                  </button>
                ))}
              </div>
            </div>

            <details className="border border-white/10 bg-black/25 p-3" open>
              <summary className="cursor-pointer text-[10px] font-bold uppercase tracking-[0.16em] text-white/45">
                Reference and style context
              </summary>
              <div className="mt-3 grid gap-3 text-xs leading-relaxed text-white/58">
                <div className="flex flex-wrap gap-1.5">
                  {selectedProductionPanelReferenceChips.map((chip) => (
                    <span key={chip.key} className={`border px-2 py-1 text-[11px] ${chip.className}`}>
                      {chip.label}
                    </span>
                  ))}
                </div>
                <p>
                  <span className="font-bold text-white/72">Visual prompt:</span>{' '}
                  {selectedProductionPanelMetadata?.visualPrompt || 'No visual prompt generated for this panel yet.'}
                </p>
                <p>
                  <span className="font-bold text-white/72">Look:</span>{' '}
                  {[artDirection.artStyle, artDirection.renderingStyle, artDirection.colorMood, artDirection.lighting]
                    .map((value) => value.trim())
                    .filter(Boolean)
                    .join(' / ') || 'Use the current Visual Prep art direction.'}
                </p>
                {selectedProductionPrepContext ? (
                  <p className="whitespace-pre-wrap">
                    <span className="font-bold text-white/72">Prepared context:</span> {selectedProductionPrepContext}
                  </p>
                ) : null}
              </div>
            </details>
          </div>
        </div>
      </section>
    ) : null;

  const isIssueWorkspaceOpen = libraryStage === 'issue-workspace';
  const comicLibraryReturnStrip = isIssueWorkspaceOpen ? (
    <nav
      aria-label="Comic Library return navigation"
      className="sticky top-0 z-20 flex min-h-9 items-center justify-between gap-3 border-b border-amber-100/12 bg-[#071022]/72 px-3 py-1.5 text-[11px] backdrop-blur"
    >
      <div className="flex min-w-0 items-center gap-2 overflow-hidden whitespace-nowrap">
        <span className="shrink-0 font-black uppercase tracking-[0.18em] text-amber-100/45">Cover Table</span>
        {selectedSeriesGroup ? (
          <>
            <span className="text-white/22" aria-hidden>
              /
            </span>
            <span className="truncate font-bold text-white/58">{selectedSeriesGroup.seriesTitle}</span>
          </>
        ) : null}
        <span className="text-white/22" aria-hidden>
          /
        </span>
        <span className="truncate font-black text-white/78">{currentComicDisplayName}</span>
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        <button
          type="button"
          onClick={saveCurrentComic}
          className="inline-flex items-center gap-1 rounded-md border border-amber-200/30 bg-amber-200/10 px-2 py-1 text-[11px] font-black text-amber-50 transition hover:border-amber-200/65 hover:bg-amber-200/16 focus:outline-none focus:ring-2 focus:ring-amber-200/50 motion-reduce:transition-none"
        >
          <Save className="h-3.5 w-3.5" aria-hidden />
          Save
        </button>
        <span
          className={`hidden rounded-md border px-2 py-1 text-[10px] font-black uppercase tracking-[0.12em] sm:inline-flex ${
            hasUnsavedProjectChanges
              ? 'border-amber-200/28 bg-amber-200/10 text-amber-50/72'
              : 'border-emerald-200/22 bg-emerald-200/10 text-emerald-50/70'
          }`}
        >
          {hasUnsavedProjectChanges ? 'Unsaved' : 'Saved'}
        </span>
        <button
          type="button"
          onClick={() => setLibraryStage('series-gallery')}
          className="px-2 py-1 text-[11px] font-black text-white/52 underline decoration-white/15 underline-offset-4 transition hover:text-white hover:decoration-amber-200/60 focus:outline-none focus:ring-2 focus:ring-amber-200/50 motion-reduce:transition-none"
        >
          All Series
        </button>
        {selectedSeriesGroup ? (
          <button
            type="button"
            onClick={() => setLibraryStage('issue-gallery')}
            className="px-2 py-1 text-[11px] font-black text-white/52 underline decoration-white/15 underline-offset-4 transition hover:text-white hover:decoration-amber-200/60 focus:outline-none focus:ring-2 focus:ring-amber-200/50 motion-reduce:transition-none"
          >
            Choose Issue
          </button>
        ) : null}
      </div>
    </nav>
  ) : null;
  const libraryEntryView =
    libraryStage !== 'issue-workspace' ? (
      <section
        className="guided-library-desk relative min-h-[calc(100vh-3rem)] overflow-hidden bg-[#091635] shadow-2xl"
      >
        {livingArchiveEnabled ? (
          <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(251,191,36,0.18),transparent_32%),radial-gradient(circle_at_82%_20%,rgba(56,189,248,0.14),transparent_30%),linear-gradient(135deg,rgba(10,20,48,0.96),rgba(7,13,30,0.82))]" />
            {livingArchiveCoverUrls.length > 0 ? (
              <div className="guided-library-living-archive-collage absolute inset-x-[-10%] top-4 hidden h-72 sm:block">
                {[0, 1].map((railIndex) => (
                  <div
                    key={railIndex}
                    className={`guided-library-living-archive-rail guided-library-living-archive-rail--${railIndex + 1}`}
                  >
                    {[...livingArchiveCoverUrls, ...livingArchiveCoverUrls].map((coverImageUrl, index) => (
                      <img
                        key={`${railIndex}-${coverImageUrl}-${index}`}
                        src={coverImageUrl}
                        alt=""
                        className="guided-library-living-archive-cover"
                        style={{
                          transform: `translateY(${index % 2 === 0 ? '14px' : '-10px'}) rotate(${
                            index % 3 === 0 ? '-5deg' : index % 3 === 1 ? '3deg' : '6deg'
                          })`,
                        }}
                      />
                    ))}
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
        <div className="relative z-10 grid gap-7 p-4 sm:p-5 lg:p-7">
          <div className="flex flex-col gap-4 border-b border-amber-100/10 pb-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-amber-100/62">Comic Library</p>
              <h1 className="mt-1 text-2xl font-black leading-tight text-white md:text-4xl">Cover Table</h1>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-sky-50/58">
                Series covers stay on the desk. Open one, choose an issue, then move into production.
              </p>
              {libraryQaFixtureName ? (
                <p className="mt-2 max-w-2xl text-xs font-bold text-amber-100/64">
                  Local QA fixture: {libraryQaFixtureName}. Real saved comics are not overwritten.
                </p>
              ) : null}
            </div>
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:min-w-[18rem]">
              <label className="flex w-full items-center justify-between gap-3 border border-amber-200/14 bg-black/20 px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-amber-100/52 shadow-[0_12px_30px_rgba(0,0,0,0.2)] transition focus-within:border-amber-200/65 focus-within:ring-2 focus-within:ring-amber-200/40 motion-reduce:transition-none">
                <span>Library View</span>
                <select
                  value={libraryPreferences.entryLayout}
                  onChange={(event) => updateLibraryEntryLayout(event.target.value)}
                  className="min-w-36 border-0 bg-transparent text-right text-xs font-bold normal-case tracking-normal text-white outline-none transition focus:text-amber-50 motion-reduce:transition-none"
                >
                  {GUIDED_COMIC_LIBRARY_ENTRY_LAYOUT_OPTIONS.map((entryLayout) => (
                    <option key={entryLayout} value={entryLayout}>
                      {GUIDED_COMIC_LIBRARY_ENTRY_LAYOUT_LABELS[entryLayout]}
                    </option>
                  ))}
                </select>
              </label>
              {livingArchiveUnlocked ? (
                <button
                  type="button"
                  aria-pressed={livingArchiveEnabled}
                  onClick={() => updateLivingArchiveBackgroundEnabled(!livingArchiveEnabled)}
                  className="flex items-center justify-between gap-3 border border-sky-200/18 bg-sky-200/[0.08] px-3 py-2 text-left text-[10px] font-black uppercase tracking-[0.16em] text-sky-50/64 shadow-[0_12px_30px_rgba(0,0,0,0.16)] transition hover:border-amber-200/45 hover:bg-amber-200/10 focus:outline-none focus:ring-2 focus:ring-amber-200/50 motion-reduce:transition-none"
                >
                  <span className="inline-flex items-center gap-2">
                    <Sparkles className="h-3.5 w-3.5 text-amber-200/80" aria-hidden />
                    Living Archive
                  </span>
                  <span className="text-xs normal-case tracking-normal text-white">
                    {livingArchiveEnabled ? 'Background on' : 'Background off'}
                  </span>
                </button>
              ) : (
                <div className="border border-white/10 bg-black/16 px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-white/38">
                  Living Archive locked - {completedLibraryIssueCount}/{GUIDED_COMIC_LIVING_ARCHIVE_UNLOCK_COUNT} complete
                </div>
              )}
            </div>
          </div>

          {libraryPreferences.entryLayout === 'hybrid-shelf' && recentLibraryProjects.length > 0 ? (
            <div className="grid gap-3">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-100/52">Recent issue stack</p>
              <div className="flex min-w-0 gap-3 overflow-x-auto pb-2">
                {recentLibraryProjects.map((project, index) => {
                  const coverImageUrl = getGuidedComicProjectCoverImageUrl(project);
                  const projectDisplayName = getGuidedComicProjectDisplayName(project);
                  return (
                    <article key={project.projectId} className="group grid w-28 shrink-0 gap-2 text-left">
                      <button
                        type="button"
                        onClick={() => openLibraryIssueWorkspace(project.projectId)}
                        className="grid gap-2 text-left outline-none"
                      >
                        <span
                          className="guided-library-cover guided-library-cover-motion relative block aspect-[2/3] overflow-hidden border border-amber-200/28 bg-[#11265b] shadow-[0_16px_26px_rgba(0,0,0,0.42)] transition duration-200 group-hover:border-amber-200/55 group-hover:shadow-[0_20px_34px_rgba(0,0,0,0.54)] group-focus-visible:ring-2 group-focus-visible:ring-amber-200 motion-reduce:transition-none"
                          style={getGuidedComicCoverMotionStyle(
                            `rotateZ(${index % 2 === 0 ? '-1deg' : '1deg'}) rotateX(1.5deg) translateY(${index % 2 === 0 ? '2px' : '-1px'})`,
                            `rotateZ(${index % 2 === 0 ? '-0.4deg' : '0.4deg'}) rotateX(0deg) translateY(-7px) translateZ(18px)`,
                          )}
                        >
                          {coverImageUrl ? (
                            <VaultImageWithFallback
                              src={coverImageUrl}
                              alt={`${projectDisplayName} cover`}
                              frameClassName="h-full w-full overflow-hidden bg-black/35"
                              imgClassName="h-full w-full object-cover"
                            />
                          ) : (
                            <span
                              className="flex h-full w-full flex-col justify-between p-2"
                              style={{ background: getGuidedComicPlaceholderCoverBackground(project.projectId) }}
                            >
                              <span className="text-[9px] font-black uppercase tracking-[0.14em] text-white/74">
                                Issue {project.issueNumber || project.snapshot.setupForm.issueNumber || '?'}
                              </span>
                              <span className="text-xs font-black leading-none text-white">{project.issueTitle || 'Untitled issue'}</span>
                            </span>
                          )}
                          <span className="absolute inset-y-0 left-0 w-1.5 bg-white/[0.14]" />
                        </span>
                        <span className="truncate text-[11px] font-black text-white/74">{project.issueTitle || projectDisplayName}</span>
                      </button>
                      <button
                        type="button"
                        aria-label={getGuidedComicDeleteIssueLabel(projectDisplayName)}
                        onClick={() => deleteLibraryIssue(project, 'series-gallery')}
                        className="inline-flex items-center justify-center gap-1 rounded border border-rose-200/20 bg-rose-500/10 px-2 py-1 text-[9px] font-black uppercase tracking-[0.1em] text-rose-100/74 transition hover:bg-rose-500/15 hover:text-rose-50 motion-reduce:transition-none"
                      >
                        <Trash2 className="h-3 w-3" aria-hidden />
                        Delete
                      </button>
                    </article>
                  );
                })}
              </div>
            </div>
          ) : null}

          {libraryStage === 'series-gallery' ? (
            <div className="guided-library-stage guided-library-stage--series-gallery grid gap-6">
              <div className="grid grid-cols-[repeat(auto-fit,minmax(8.5rem,1fr))] gap-x-5 gap-y-7 sm:grid-cols-[repeat(auto-fit,minmax(10rem,1fr))] lg:grid-cols-[repeat(auto-fit,minmax(11rem,1fr))]">
                {librarySeriesGroups.map((group, index) => (
                  <article key={group.seriesKey} className="group min-w-0 text-left" style={{ perspective: '900px' }}>
                    <button
                      type="button"
                      onClick={() => openLibrarySeriesFocus(group.seriesKey)}
                      className="block w-full text-left outline-none"
                    >
                      <span
                        className="guided-library-cover guided-library-cover-motion relative block aspect-[2/3] overflow-hidden border border-amber-200/35 bg-[#11265b] shadow-[0_24px_42px_rgba(0,0,0,0.46)] transition duration-200 group-hover:border-amber-100/70 group-hover:shadow-[0_30px_52px_rgba(0,0,0,0.58)] group-focus-visible:ring-2 group-focus-visible:ring-amber-200 motion-reduce:transition-none"
                        style={getGuidedComicCoverMotionStyle(
                          `rotateZ(${index % 2 === 0 ? '-1.8deg' : '1.5deg'}) rotateX(2deg) translateY(${index % 3 === 0 ? '6px' : '0'})`,
                          `rotateZ(${index % 2 === 0 ? '-0.7deg' : '0.7deg'}) rotateX(0deg) translateY(-9px) translateZ(22px)`,
                        )}
                      >
                        {group.coverImageUrl ? (
                          <VaultImageWithFallback
                            src={group.coverImageUrl}
                            alt={`${group.seriesTitle} cover`}
                            frameClassName="h-full w-full overflow-hidden bg-black/35"
                            imgClassName="h-full w-full object-cover"
                          />
                          ) : (
                          <span
                            className="flex h-full w-full flex-col justify-between p-3"
                            style={{ background: getGuidedComicPlaceholderCoverBackground(group.seriesKey) }}
                          >
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/76">Series</span>
                            <span className="text-lg font-black leading-none text-white drop-shadow">{group.seriesTitle}</span>
                            <span className="text-[10px] font-black uppercase tracking-[0.16em] text-white/68">
                              {group.projects.length} issue{group.projects.length === 1 ? '' : 's'}
                            </span>
                          </span>
                        )}
                        <span className="absolute inset-y-0 left-0 w-2 bg-white/[0.14]" />
                      </span>
                      <span className="mt-3 block truncate text-sm font-black text-white">{group.seriesTitle}</span>
                      <span className="mt-1 block text-xs font-bold text-amber-100/52">
                        {group.projects.length} issue{group.projects.length === 1 ? '' : 's'}
                      </span>
                    </button>
                    <button
                      type="button"
                      aria-label={getGuidedComicDeleteSeriesLabel(group.seriesTitle)}
                      onClick={() => deleteLibrarySeries(group)}
                      className="mt-2 inline-flex w-full items-center justify-center gap-1.5 border border-rose-200/20 bg-rose-500/10 px-2 py-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-rose-100/72 transition hover:bg-rose-500/15 hover:text-rose-50 motion-reduce:transition-none"
                    >
                      <Trash2 className="h-3 w-3" aria-hidden />
                      Delete Series
                    </button>
                  </article>
                ))}

                <button
                  type="button"
                  onClick={startLibraryNewSeries}
                  className="group min-w-0 text-left outline-none"
                  style={{ perspective: '900px' }}
                >
                  <span
                    className="guided-library-cover guided-library-cover-motion guided-library-blank-cover relative flex aspect-[2/3] flex-col justify-between overflow-hidden border border-dashed border-amber-200/45 p-3 text-[#24180e] shadow-[0_22px_38px_rgba(0,0,0,0.4)] transition duration-200 group-hover:border-amber-200/75 group-hover:shadow-[0_28px_46px_rgba(0,0,0,0.52)] group-focus-visible:ring-2 group-focus-visible:ring-amber-200 motion-reduce:transition-none"
                    style={getGuidedComicCoverMotionStyle(
                      'rotateZ(1.2deg) rotateX(2deg) translateY(4px)',
                      'rotateZ(0.4deg) rotateX(0deg) translateY(-9px) translateZ(22px)',
                    )}
                  >
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#604421]">Blank cover</span>
                    <span className="text-2xl font-black leading-none">Start New Series</span>
                    <span className="inline-flex h-10 w-10 items-center justify-center border border-[#604421]/35 bg-white/30 text-[#604421]">
                      <FilePlus className="h-5 w-5" aria-hidden />
                    </span>
                  </span>
                  <span className="mt-3 block text-sm font-black text-white">Start New Series</span>
                  <span className="mt-1 block text-xs font-bold text-amber-100/52">Blank guided comic</span>
                </button>
              </div>
            </div>
          ) : null}

          {libraryStage === 'series-focus' && selectedSeriesGroup ? (
            <div className="guided-library-stage guided-library-stage--series-focus grid gap-6 lg:grid-cols-[minmax(220px,360px)_minmax(0,1fr)]">
              <div className="max-w-[340px]" style={{ perspective: '1000px' }}>
                <div
                  className="guided-library-cover guided-library-cover-motion guided-library-cover-motion--hero relative aspect-[2/3] overflow-hidden border border-amber-200/40 bg-[#10265b] shadow-[0_34px_70px_rgba(0,0,0,0.62)]"
                  style={getGuidedComicCoverMotionStyle(
                    'rotateZ(-1deg) rotateX(2deg) translateY(0)',
                    'rotateZ(-0.35deg) rotateX(0deg) translateY(-6px) translateZ(18px)',
                  )}
                >
                  {selectedSeriesGroup.coverImageUrl ? (
                    <VaultImageWithFallback
                      src={selectedSeriesGroup.coverImageUrl}
                      alt={`${selectedSeriesGroup.seriesTitle} cover`}
                      frameClassName="h-full w-full overflow-hidden bg-black/35"
                      imgClassName="h-full w-full object-cover"
                    />
                  ) : (
                    <div
                      className="flex h-full w-full flex-col justify-between p-5"
                      style={{ background: getGuidedComicPlaceholderCoverBackground(selectedSeriesGroup.seriesKey) }}
                    >
                      <p className="text-xs font-black uppercase tracking-[0.22em] text-white/76">Selected series</p>
                      <p className="text-4xl font-black leading-none text-white drop-shadow">{selectedSeriesGroup.seriesTitle}</p>
                      <p className="text-xs font-black uppercase tracking-[0.18em] text-white/70">Guided Comics</p>
                    </div>
                  )}
                  <span className="absolute inset-y-0 left-0 w-3 bg-white/[0.14]" />
                </div>
              </div>
              <div className="grid content-center gap-5 pl-0 lg:border-l lg:border-amber-200/14 lg:pl-6">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-amber-100/58">Series Focus</p>
                  <h2 className="mt-2 text-3xl font-black leading-tight text-white md:text-5xl">
                    {selectedSeriesGroup.seriesTitle}
                  </h2>
                  <p className="mt-3 max-w-3xl text-sm leading-relaxed text-sky-50/62">
                    {selectedSeriesGroup.premise || 'No premise saved yet.'}
                  </p>
                </div>
                <div className="grid gap-2 border-l-2 border-amber-200/35 pl-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/42">Studio notes</p>
                  <p className="text-sm font-bold text-white/78">
                    {selectedSeriesGroup.projects.length} issue{selectedSeriesGroup.projects.length === 1 ? '' : 's'} in this series
                  </p>
                  <p className="text-sm font-bold text-white/62">
                    Current issue:{' '}
                    <span className="text-white/88">
                      {selectedSeriesGroup.lastUpdatedProject
                        ? getGuidedComicProjectDisplayName(selectedSeriesGroup.lastUpdatedProject)
                        : 'No issue yet'}
                    </span>
                  </p>
                  <p className="text-sm font-bold text-white/62">
                    Series cover:{' '}
                    <span className="text-white/88">
                      {selectedSeriesGroup.coverProject
                        ? getGuidedComicProjectDisplayName(selectedSeriesGroup.coverProject)
                        : 'No cover issue yet'}
                    </span>
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      selectedSeriesGroup.lastUpdatedProject
                        ? openLibraryIssueWorkspace(selectedSeriesGroup.lastUpdatedProject.projectId)
                        : undefined
                    }
                    disabled={!selectedSeriesGroup.lastUpdatedProject}
                    className="inline-flex items-center justify-center gap-2 border px-5 py-3 text-sm font-black shadow-xl transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-45 motion-reduce:transition-none"
                    style={{ borderColor: `${ACCENT_GOLD_SOLID}88`, background: ACCENT_GOLD_GRADIENT, color: TEXT_ON_GOLD }}
                  >
                    <BookOpenText className="h-4 w-4" aria-hidden />
                    Open Current Issue
                  </button>
                  <button
                    type="button"
                    onClick={() => openLibraryIssueGallery(selectedSeriesGroup.seriesKey)}
                    className="px-3 py-2 text-xs font-black text-white/74 underline decoration-amber-200/30 underline-offset-4 transition hover:text-white hover:decoration-amber-200/70 motion-reduce:transition-none"
                  >
                    Choose Issue
                  </button>
                  <button
                    type="button"
                    onClick={() => setLibraryStage('series-gallery')}
                    className="px-3 py-2 text-xs font-black text-white/60 underline decoration-white/20 underline-offset-4 transition hover:text-white hover:decoration-white/50 motion-reduce:transition-none"
                  >
                    All Series
                  </button>
                  <button
                    type="button"
                    aria-label={getGuidedComicDeleteSeriesLabel(selectedSeriesGroup.seriesTitle)}
                    onClick={() => deleteLibrarySeries()}
                    className="inline-flex items-center justify-center gap-2 border border-rose-200/25 bg-rose-500/10 px-3 py-2 text-xs font-black text-rose-100 transition hover:bg-rose-500/15 motion-reduce:transition-none"
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden />
                    Delete Series
                  </button>
                </div>
              </div>
            </div>
          ) : null}

          {libraryStage === 'issue-gallery' && selectedSeriesGroup ? (
            <div className="guided-library-stage guided-library-stage--issue-gallery grid gap-5">
              <div className="flex flex-col gap-3 border-b border-amber-200/12 pb-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-amber-100/58">Issue Gallery</p>
                  <h2 className="mt-1 text-3xl font-black text-white">{selectedSeriesGroup.seriesTitle}</h2>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setLibraryStage('series-focus')}
                    className="border border-white/15 bg-black/20 px-3 py-2 text-xs font-black text-white/70 transition hover:bg-white/10 motion-reduce:transition-none"
                  >
                    Back to Series
                  </button>
                  <button
                    type="button"
                    aria-label={getGuidedComicDeleteSeriesLabel(selectedSeriesGroup.seriesTitle)}
                    onClick={() => deleteLibrarySeries()}
                    className="inline-flex items-center justify-center gap-2 border border-rose-200/25 bg-rose-500/10 px-3 py-2 text-xs font-black text-rose-100 transition hover:bg-rose-500/15 motion-reduce:transition-none"
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden />
                    Delete Series
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-[repeat(auto-fit,minmax(8.25rem,1fr))] gap-x-5 gap-y-7 sm:grid-cols-[repeat(auto-fit,minmax(9.5rem,1fr))] lg:grid-cols-[repeat(auto-fit,minmax(10rem,1fr))]">
                {selectedSeriesGroup.projects.map((project, index) => {
                  const coverImageUrl = getGuidedComicProjectCoverImageUrl(project);
                  const isSeriesCover = selectedSeriesGroup.coverProject?.projectId === project.projectId;
                  const isCurrentIssue = selectedSeriesGroup.lastUpdatedProject?.projectId === project.projectId;
                  return (
                    <article
                      key={project.projectId}
                      className="group min-w-0 text-left"
                    >
                      <button
                        type="button"
                        onClick={() => openLibraryIssueWorkspace(project.projectId)}
                        className="group/issue block w-full text-left outline-none"
                        style={{ perspective: '800px' }}
                      >
                        <span
                          className="guided-library-cover guided-library-cover-motion relative block aspect-[2/3] overflow-hidden border border-amber-200/30 bg-[#11265b] shadow-[0_20px_34px_rgba(0,0,0,0.44)] transition duration-200 group-hover/issue:border-amber-100/65 group-hover/issue:shadow-[0_25px_42px_rgba(0,0,0,0.55)] group-focus-visible/issue:ring-2 group-focus-visible/issue:ring-amber-200 motion-reduce:transition-none"
                          style={getGuidedComicCoverMotionStyle(
                            `rotateZ(${index % 2 === 0 ? '-1.1deg' : '1deg'}) rotateX(1.5deg) translateY(${index % 4 === 0 ? '5px' : '0'})`,
                            `rotateZ(${index % 2 === 0 ? '-0.3deg' : '0.3deg'}) rotateX(0deg) translateY(-8px) translateZ(20px)`,
                          )}
                        >
                          {coverImageUrl ? (
                            <VaultImageWithFallback
                              src={coverImageUrl}
                              alt={`${getGuidedComicProjectDisplayName(project)} cover`}
                              frameClassName="h-full w-full overflow-hidden bg-black/35"
                              imgClassName="h-full w-full object-cover"
                            />
                          ) : (
                            <span
                              className="flex h-full w-full flex-col justify-between p-3"
                              style={{ background: getGuidedComicPlaceholderCoverBackground(project.projectId) }}
                            >
                              <span className="text-[10px] font-black uppercase tracking-[0.18em] text-white/74">
                                Issue {project.issueNumber || project.snapshot.setupForm.issueNumber || '?'}
                              </span>
                              <span className="text-lg font-black leading-none text-white">
                                {project.issueTitle || 'Untitled issue'}
                              </span>
                              <span className="text-[10px] font-black uppercase tracking-[0.16em] text-white/64">
                                {selectedSeriesGroup.seriesTitle}
                              </span>
                            </span>
                          )}
                          <span className="absolute inset-y-0 left-0 w-2 bg-white/[0.14]" />
                          {isCurrentIssue ? (
                            <span className="absolute left-2 top-2 z-10 border border-sky-100/45 bg-black/55 px-2 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-sky-50 shadow-lg">
                              Current issue
                            </span>
                          ) : null}
                          {isSeriesCover ? (
                            <span className="absolute bottom-2 right-2 z-10 border border-amber-200/55 bg-black/55 px-2 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-amber-100 shadow-lg">
                              Series cover
                            </span>
                          ) : null}
                        </span>
                        <span className="mt-3 block truncate text-sm font-black text-white">
                          {getGuidedComicProjectDisplayName(project)}
                        </span>
                        <span className="mt-1 block text-[11px] font-bold text-sky-50/45">
                          {formatGuidedComicLibraryUpdatedAt(project.updatedAt)}
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => updateLibrarySeriesCoverProject(selectedSeriesGroup.seriesKey, project.projectId)}
                        disabled={isSeriesCover}
                        className="mt-2 inline-flex w-full items-center justify-center border border-amber-200/18 bg-black/18 px-2 py-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-amber-100/62 transition hover:border-amber-200/45 hover:bg-amber-200/10 hover:text-amber-50 disabled:cursor-default disabled:border-amber-200/35 disabled:bg-amber-200/10 disabled:text-amber-100 motion-reduce:transition-none"
                      >
                        {isSeriesCover ? 'Current series cover' : 'Use as series cover'}
                      </button>
                      <button
                        type="button"
                        aria-label={getGuidedComicDeleteIssueLabel(getGuidedComicProjectDisplayName(project))}
                        onClick={() => deleteLibraryIssue(project, 'issue-gallery')}
                        className="mt-2 inline-flex w-full items-center justify-center gap-1.5 border border-rose-200/20 bg-rose-500/10 px-2 py-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-rose-100/72 transition hover:bg-rose-500/15 hover:text-rose-50 motion-reduce:transition-none"
                      >
                        <Trash2 className="h-3 w-3" aria-hidden />
                        Delete Issue
                      </button>
                    </article>
                  );
                })}

                <button
                  type="button"
                  onClick={startLibraryNewIssue}
                  className="group min-w-0 text-left outline-none"
                  style={{ perspective: '800px' }}
                >
                  <span
                    className="guided-library-cover guided-library-cover-motion guided-library-blank-cover relative flex aspect-[2/3] flex-col justify-between overflow-hidden border border-dashed border-amber-200/45 p-3 text-[#24180e] shadow-[0_20px_34px_rgba(0,0,0,0.4)] transition duration-200 group-hover:border-amber-200/75 group-hover:shadow-[0_25px_42px_rgba(0,0,0,0.52)] group-focus-visible:ring-2 group-focus-visible:ring-amber-200 motion-reduce:transition-none"
                    style={getGuidedComicCoverMotionStyle(
                      'rotateZ(1deg) rotateX(1.5deg) translateY(4px)',
                      'rotateZ(0.25deg) rotateX(0deg) translateY(-8px) translateZ(20px)',
                    )}
                  >
                    <span className="text-[10px] font-black uppercase tracking-[0.18em] text-[#604421]">Blank issue</span>
                    <span className="text-2xl font-black leading-none">Start New Issue</span>
                    <span className="text-xs font-black text-[#604421]/75">#{getGuidedComicNextIssueNumber(selectedSeriesGroup.projects)}</span>
                  </span>
                  <span className="mt-3 block text-sm font-black text-white">Start New Issue</span>
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </section>
    ) : null;

	  return (
    <div
      className="min-h-full w-full overflow-y-auto custom-scrollbar text-white"
      style={{ background: PRIMARY_BG }}
    >
      <div className="flex w-full max-w-none flex-col gap-6 px-5 py-6 lg:px-8">
        {libraryEntryView}
        {comicLibraryReturnStrip}

        <header
          className={isIssueWorkspaceOpen && workspaceMode === 'story-prep' ? 'overflow-hidden rounded-2xl border shadow-2xl' : 'hidden'}
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
          className="hidden"
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
                  onClick={() => moveToStepIndex(index)}
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
            <div className="flex items-start gap-2">
              <BookMarked className="mt-0.5 h-4 w-4 shrink-0" style={{ color: ACCENT_GOLD_LIGHT }} aria-hidden />
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: ACCENT_GOLD_LIGHT }}>
                  Current comic
                </p>
                <p className="mt-1 truncate text-xs font-black text-white">{currentComicDisplayName}</p>
                <p className="mt-1 text-[11px] font-bold text-white/45">
                  {currentProject ? `Updated ${new Date(currentProject.updatedAt).toLocaleString()}` : 'Unsaved local comic'}
                </p>
              </div>
            </div>
            <span
              className={`mt-2 inline-flex rounded-full border px-2.5 py-1 text-[11px] font-bold ${
                hasUnsavedProjectChanges
                  ? 'border-amber-300/30 bg-amber-300/10 text-amber-100'
                  : 'border-emerald-300/25 bg-emerald-300/10 text-emerald-100'
              }`}
            >
              {hasUnsavedProjectChanges ? 'Unsaved library changes' : 'Saved to library'}
            </span>
            <label className="mt-3 flex flex-col gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-white/45">
              Comic Library
              {hasSavedLibraryProjects ? (
                <select
                  value={activeProjectId ?? ''}
                  onChange={(event) => switchCurrentComic(event.target.value)}
                  className="w-full min-w-0 truncate rounded-lg border border-white/15 bg-black/35 px-2 py-2 text-xs font-bold normal-case tracking-normal text-white outline-none"
                >
                  <option value="" disabled={Boolean(activeProjectId)}>
                    Unsaved local comic
                  </option>
                  {projectLibrary?.projects.map((project) => (
                    <option key={project.projectId} value={project.projectId}>
                      {getGuidedComicProjectDisplayName(project)}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="rounded-lg border border-amber-300/25 bg-amber-300/[0.08] px-2.5 py-2 text-xs font-bold normal-case tracking-normal text-amber-50">
                  Current recovery draft is open. Save it to add it to the Comic Library.
                </div>
              )}
            </label>
            {!hasSavedLibraryProjects ? (
              <button
                type="button"
                onClick={saveCurrentComic}
                className="mt-2 inline-flex w-full items-center justify-center gap-1.5 rounded-lg border px-2 py-2 text-[11px] font-black transition hover:scale-[1.01] active:scale-[0.99]"
                style={{ borderColor: `${ACCENT_GOLD_SOLID}88`, background: ACCENT_GOLD_GRADIENT, color: TEXT_ON_GOLD }}
              >
                <Save className="h-3.5 w-3.5" aria-hidden />
                Save local comic to library
              </button>
            ) : null}
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Tooltip content="Save current guided state to this comic">
                <button
                  type="button"
                  onClick={saveCurrentComic}
                  className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-2 py-2 text-[11px] font-bold text-white/80 transition hover:bg-white/10"
                >
                  <Save className="h-3.5 w-3.5" aria-hidden />
                  Save
                </button>
              </Tooltip>
              <Tooltip content="Save the current guided state as a new comic">
                <button
                  type="button"
                  onClick={openSaveAsDialog}
                  className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-2 py-2 text-[11px] font-bold text-white/80 transition hover:bg-white/10"
                >
                  <FolderOpen className="h-3.5 w-3.5" aria-hidden />
                  Save as
                </button>
              </Tooltip>
              <Tooltip content="Rename the saved comic">
                <button
                  type="button"
                  onClick={openRenameDialog}
                  className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-2 py-2 text-[11px] font-bold text-white/80 transition hover:bg-white/10"
                >
                  <Edit3 className="h-3.5 w-3.5" aria-hidden />
                  Rename
                </button>
              </Tooltip>
              <Tooltip content="Duplicate the current comic into a new library entry">
                <button
                  type="button"
                  onClick={duplicateCurrentComic}
                  className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-2 py-2 text-[11px] font-bold text-white/80 transition hover:bg-white/10"
                >
                  <Copy className="h-3.5 w-3.5" aria-hidden />
                  Duplicate
                </button>
              </Tooltip>
              <Tooltip content="Start a new unsaved guided comic">
                <button
                  type="button"
                  onClick={startNewComic}
                  className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-2 py-2 text-[11px] font-bold text-white/80 transition hover:bg-white/10"
                >
                  <FilePlus className="h-3.5 w-3.5" aria-hidden />
                  New
                </button>
              </Tooltip>
              <Tooltip content="Delete this comic from the local library">
                <button
                  type="button"
                  onClick={deleteCurrentComic}
                  disabled={!currentProject}
                  className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-rose-300/20 bg-rose-500/10 px-2 py-2 text-[11px] font-bold text-rose-100 transition hover:bg-rose-500/15 disabled:cursor-not-allowed disabled:opacity-45"
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden />
                  Delete
                </button>
              </Tooltip>
            </div>
            {projectLibraryStatus ? (
              <p className="mt-2 rounded-lg border border-emerald-300/20 bg-emerald-300/10 px-2 py-1.5 text-[11px] font-bold text-emerald-100">
                {projectLibraryStatus}
              </p>
            ) : null}
          </div>
          <div className="mt-3 rounded-xl border border-white/10 bg-white/[0.06] p-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: ACCENT_GOLD_LIGHT }}>
              Recovery draft
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
                onClick={openBlankAdvancedStudio}
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
          className={
            isIssueWorkspaceOpen && workspaceMode === 'story-prep'
              ? 'grid gap-2 rounded-2xl border border-white/10 bg-black/30 p-2 shadow-xl backdrop-blur-sm md:grid-cols-7 xl:hidden'
              : 'hidden'
          }
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
                onClick={() => moveToStepIndex(index)}
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

        <div
          className={
            isIssueWorkspaceOpen && workspaceMode === 'story-prep'
              ? 'grid gap-3 rounded-2xl border border-white/10 bg-black/30 p-3 shadow-xl backdrop-blur-sm xl:hidden'
              : 'hidden'
          }
        >
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: ACCENT_GOLD_LIGHT }}>
                Current comic
              </p>
              <p className="mt-1 truncate text-sm font-black text-white">{currentComicDisplayName}</p>
              <p className="mt-1 text-xs font-bold text-white/45">
                {hasUnsavedProjectChanges ? 'Unsaved library changes' : 'Saved to Comic Library'} ·{' '}
                {draftSavedAt ? 'Recovery draft saved' : 'Recovery draft not saved'}
              </p>
            </div>
            {hasSavedLibraryProjects ? (
              <select
                value={activeProjectId ?? ''}
                onChange={(event) => switchCurrentComic(event.target.value)}
                className="min-w-0 rounded-xl border border-white/15 bg-black/35 px-3 py-2 text-xs font-bold text-white outline-none md:w-64"
              >
                <option value="" disabled={Boolean(activeProjectId)}>
                  Unsaved local comic
                </option>
                {projectLibrary?.projects.map((project) => (
                  <option key={project.projectId} value={project.projectId}>
                    {getGuidedComicProjectDisplayName(project)}
                  </option>
                ))}
              </select>
            ) : (
              <div className="min-w-0 rounded-xl border border-amber-300/25 bg-amber-300/[0.08] px-3 py-2 text-xs font-bold text-amber-50 md:w-64">
                Current recovery draft is open. Save it to add it to the Comic Library.
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
            {!hasSavedLibraryProjects ? (
              <button
                type="button"
                onClick={saveCurrentComic}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl border px-2 py-2 text-[11px] font-black transition hover:scale-[1.01] active:scale-[0.99] sm:col-span-2"
                style={{ borderColor: `${ACCENT_GOLD_SOLID}88`, background: ACCENT_GOLD_GRADIENT, color: TEXT_ON_GOLD }}
              >
                <Save className="h-3.5 w-3.5" aria-hidden />
                Save local comic to library
              </button>
            ) : null}
            <button
              type="button"
              onClick={saveCurrentComic}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-2 py-2 text-[11px] font-bold text-white/80 transition hover:bg-white/10"
            >
              <Save className="h-3.5 w-3.5" aria-hidden />
              Save
            </button>
            <button
              type="button"
              onClick={openSaveAsDialog}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-2 py-2 text-[11px] font-bold text-white/80 transition hover:bg-white/10"
            >
              <FolderOpen className="h-3.5 w-3.5" aria-hidden />
              Save as
            </button>
            <button
              type="button"
              onClick={openRenameDialog}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-2 py-2 text-[11px] font-bold text-white/80 transition hover:bg-white/10"
            >
              <Edit3 className="h-3.5 w-3.5" aria-hidden />
              Rename
            </button>
            <button
              type="button"
              onClick={duplicateCurrentComic}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-2 py-2 text-[11px] font-bold text-white/80 transition hover:bg-white/10"
            >
              <Copy className="h-3.5 w-3.5" aria-hidden />
              Duplicate
            </button>
            <button
              type="button"
              onClick={startNewComic}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-2 py-2 text-[11px] font-bold text-white/80 transition hover:bg-white/10"
            >
              <FilePlus className="h-3.5 w-3.5" aria-hidden />
              New
            </button>
            <button
              type="button"
              onClick={deleteCurrentComic}
              disabled={!currentProject}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-rose-300/20 bg-rose-500/10 px-2 py-2 text-[11px] font-bold text-rose-100 transition hover:bg-rose-500/15 disabled:cursor-not-allowed disabled:opacity-45"
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden />
              Delete
            </button>
            <button
              type="button"
              onClick={clearGuidedDraft}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-2 py-2 text-[11px] font-bold text-white/70 transition hover:bg-white/10"
            >
              <RefreshCw className="h-3.5 w-3.5" aria-hidden />
              Clear draft
            </button>
          </div>
          {projectLibraryStatus ? (
            <p className="rounded-lg border border-emerald-300/20 bg-emerald-300/10 px-3 py-2 text-xs font-bold text-emerald-100">
              {projectLibraryStatus}
            </p>
          ) : null}
	        </div>

        {isIssueWorkspaceOpen && workspaceMode === 'story-prep' ? focusReentryStrip : null}
        {isIssueWorkspaceOpen && workspaceMode === 'story-prep' ? productionPrepWorkspace : null}
        {isIssueWorkspaceOpen && workspaceMode === 'issue-lightbox' ? issueLightboxWorkspace : null}
        {isIssueWorkspaceOpen && workspaceMode === 'issue-cover' ? issueCoverWorkspace : null}
        {isIssueWorkspaceOpen && workspaceMode === 'page-production' ? productionWorkspace : null}
        {isIssueWorkspaceOpen && workspaceMode === 'panel-focus' ? panelFocusWorkspace : null}

        {isIssueWorkspaceOpen && workspaceMode === 'story-prep' ? (
	        <main className="grid min-w-0 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_300px] xl:grid-cols-[minmax(0,1fr)_320px]">
          <section className="min-w-0 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.07] p-5 shadow-xl backdrop-blur-md lg:p-7">
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

            <div className="mt-6 min-w-0 overflow-hidden rounded-xl border border-dashed border-white/20 bg-black/25 p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white/90">{activeStep.actionLabel}</p>
                  <p className="mt-1 text-xs leading-relaxed text-white/55">
                    {isSetupStep
                      ? 'Complete the local brief, then continue into Story. Your draft is saved locally in this browser.'
                      : isStoryStep
                        ? 'Shape the story locally here, or preview AI suggestions before accepting them into the draft.'
                        : isPagesStep
                          ? 'Edit local page cards or preview AI page and panel beat suggestions.'
                          : isVisualPrepStep
                            ? 'Use Image Vault to attach real references to character and location rows. Advanced Imageshop still handles image generation.'
                          : isArtStep
                              ? 'Preview prompt and camera suggestions, then use Advanced Imageshop to generate actual images.'
                              : isLayoutStep
                                ? 'Choose page layout templates locally, with optional AI layout pacing suggestions.'
                                : isExportStep
                                  ? 'Review the local comic plan. AI can find story, reference, art, and layout gaps before export.'
                      : 'Preview AI suggestions before applying them; no accepted change is written silently.'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handlePrimaryStepAction}
                  className="inline-flex shrink-0 items-center justify-center rounded-lg px-4 py-2 text-xs font-black transition hover:scale-[1.01] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-70"
                  style={{ background: ACCENT_GOLD_GRADIENT, color: TEXT_ON_GOLD }}
                >
                  {activeStep.actionLabel}
                </button>
              </div>
              {primaryActionMessage ? (
                <p className="mt-3 rounded-lg border border-amber-300/25 bg-amber-300/10 px-3 py-2 text-xs font-bold text-amber-50">
                  {primaryActionMessage}
                </p>
              ) : null}
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

              <section className="mt-4 rounded-xl border border-sky-300/20 bg-sky-300/10 p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-sky-100/70">
                      {isStoryStep ? 'Phase 1 co-writer' : 'AI writing assist'}
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-sky-50/75">
                      {isStoryStep
                        ? 'Expand the intake fields first. Structure review stays separate until an outline exists.'
                        : 'Uses Writers’ Workshop writer-tools. Results open as a preview and never overwrite text until accepted.'}
                    </p>
                  </div>
                  <span className="inline-flex shrink-0 rounded-full border border-sky-200/25 bg-black/20 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-sky-50/75">
                    Preview first
                  </span>
                </div>
                <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                  {guidedAiActions.map((option) => {
                    const loading = guidedAiLoadingAction === option.action;
                    return (
                      <Tooltip key={option.action} content={option.description}>
                        <GuidedProgressButton
                          type="button"
                          isLoading={loading}
                          loadingLabel="Thinking..."
                          idleLabel={option.label}
                          icon={<Sparkles className="h-3.5 w-3.5" aria-hidden />}
                          disabled={Boolean(guidedAiLoadingAction)}
                          onClick={() => void runGuidedComicAiAction(option.action)}
                          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-sky-200/20 bg-black/25 px-3 py-2 text-xs font-black text-sky-50 transition hover:bg-sky-200/10 disabled:cursor-not-allowed disabled:opacity-45"
                        />
                      </Tooltip>
                    );
                  })}
                </div>
                {guidedAiError ? (
                  <p className="mt-3 rounded-lg border border-rose-300/25 bg-rose-500/10 px-3 py-2 text-xs font-bold text-rose-100">
                    {guidedAiError}
                  </p>
                ) : null}
              </section>

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

                  <section className="rounded-xl border border-amber-300/20 bg-amber-300/[0.055] p-4">
                    <div className="flex flex-col gap-1">
                      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-amber-100/70">
                        Page layout defaults
                      </p>
                      <p className="text-xs leading-relaxed text-white/55">
                        Starter layouts use these defaults. Existing hand-edited panels stay as you placed them.
                      </p>
                    </div>
                    <div className="mt-4 grid gap-4 lg:grid-cols-2">
                      <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/45">Page edge</p>
                        <div className="mt-3 grid grid-cols-2 gap-2">
                          {[
                            { id: 'safe', label: 'Safe margins' },
                            { id: 'full-bleed', label: 'Full bleed' },
                          ].map((option) => {
                            const selected = setupForm.layoutMarginMode === option.id;
                            return (
                              <button
                                key={option.id}
                                type="button"
                                onClick={() => updateSetupField('layoutMarginMode', option.id as GuidedComicLayoutMarginMode)}
                                className="rounded-lg border px-3 py-2 text-xs font-black transition hover:brightness-110"
                                style={{
                                  borderColor: selected ? `${ACCENT_GOLD_SOLID}dd` : 'rgba(255,255,255,0.14)',
                                  background: selected ? ACCENT_GOLD_GRADIENT : 'rgba(255,255,255,0.07)',
                                  color: selected ? TEXT_ON_GOLD : 'rgba(255,255,255,0.76)',
                                }}
                              >
                                {option.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                      <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/45">Panel dividers</p>
                        <div className="mt-3 grid grid-cols-2 gap-2">
                          {[
                            { id: 'standard', label: 'Standard gutters' },
                            { id: 'thin', label: 'Thin dividers' },
                          ].map((option) => {
                            const selected = setupForm.layoutGutterMode === option.id;
                            return (
                              <button
                                key={option.id}
                                type="button"
                                onClick={() => updateSetupField('layoutGutterMode', option.id as GuidedComicLayoutGutterMode)}
                                className="rounded-lg border px-3 py-2 text-xs font-black transition hover:brightness-110"
                                style={{
                                  borderColor: selected ? `${ACCENT_GOLD_SOLID}dd` : 'rgba(255,255,255,0.14)',
                                  background: selected ? ACCENT_GOLD_GRADIENT : 'rgba(255,255,255,0.07)',
                                  color: selected ? TEXT_ON_GOLD : 'rgba(255,255,255,0.76)',
                                }}
                              >
                                {option.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </section>

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
                <div className="mt-5 grid min-w-0 gap-4">
                  <section className="min-w-0 overflow-hidden rounded-xl border border-amber-300/20 bg-amber-300/[0.055] p-4">
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-amber-100/70">
                      Phase 1 - {GUIDED_STORY_PHASE_COPY.intakeTitle}
                    </p>
                    <h3 className="mt-1 text-lg font-black text-white">Rough intent first</h3>
                    <p className="mt-2 text-xs leading-relaxed text-white/62">
                      {GUIDED_STORY_PHASE_COPY.intakeGoal}
                    </p>
                  </section>

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

                  <section className="min-w-0 overflow-hidden rounded-xl border border-sky-300/20 bg-sky-300/[0.08] p-4">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0">
                        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-sky-100/70">
                          Phase 2 - {GUIDED_STORY_PHASE_COPY.outlineTitle}
                        </p>
                        <h3 className="mt-1 text-lg font-black text-white">Create the structure after intake</h3>
                        <p className="mt-2 text-xs leading-relaxed text-white/62">
                          {GUIDED_STORY_PHASE_COPY.outlineGoal}
                        </p>
                      </div>
                      <GuidedProgressButton
                        type="button"
                        isLoading={guidedAiLoadingAction === 'generate_issue_outline'}
                        loadingLabel="Thinking..."
                        idleLabel="Generate issue outline"
                        icon={<Sparkles className="h-3.5 w-3.5" aria-hidden />}
                        disabled={Boolean(guidedAiLoadingAction)}
                        onClick={() => void runGuidedComicAiAction('generate_issue_outline')}
                        className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-sky-200/20 bg-black/25 px-3 py-2 text-center text-xs font-black leading-snug text-sky-50 transition hover:bg-sky-200/10 disabled:cursor-not-allowed disabled:opacity-45"
                      />
                    </div>
                    <div className="mt-4 grid gap-3">
                      {outlineBeats.map((beat) => (
                        <div key={beat.id} className="rounded-lg border border-white/10 bg-black/20 p-3">
                          <label className="flex flex-col gap-1.5 text-xs font-bold uppercase tracking-[0.14em] text-white/55">
                            {beat.title}
                            <textarea
                              value={beat.description}
                              onChange={(event) => updateOutlineBeat(beat.id, { description: event.target.value })}
                              rows={3}
                              placeholder={`Draft the ${beat.title.toLowerCase()} here, or generate an outline from the intake fields.`}
                              className="min-h-[5.5rem] resize-y rounded-lg border border-white/15 bg-black/35 px-3 py-2.5 text-sm font-medium normal-case leading-relaxed tracking-normal text-white outline-none placeholder:text-white/30 focus:border-sky-300/70"
                            />
                          </label>
                        </div>
                      ))}
                    </div>
                  </section>

                  <section className="min-w-0 overflow-hidden rounded-xl border border-emerald-300/20 bg-emerald-300/[0.075] p-4">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0">
                        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-100/70">
                          Phase 3 - Writers Workshop bridge
                        </p>
                        <h3 className="mt-1 text-lg font-black text-white">Use deeper writing tools when you want them</h3>
                        <p className="mt-2 text-xs leading-relaxed text-white/62">
                          {GUIDED_WRITERS_WORKSHOP_BRIDGE_COPY.summary}
                        </p>
                      </div>
                      <span className="inline-flex shrink-0 rounded-full border border-emerald-200/25 bg-black/20 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-emerald-50/75">
                        {writerIssueId ? 'Linked' : 'Optional'}
                      </span>
                    </div>

                    <div className="mt-4 grid min-w-0 gap-2 sm:grid-cols-2 xl:grid-cols-4">
                      <button
                        type="button"
                        onClick={() => {
                          setWriterBridgeExpanded(false);
                          setWriterBridgeError(null);
                          setWriterBridgeMessage('Continuing locally. Writers Workshop remains available whenever you want it.');
                        }}
                        className="inline-flex min-h-11 min-w-0 items-center justify-center rounded-lg border border-white/15 bg-black/20 px-3 py-2 text-center text-xs font-black leading-snug text-white/75 transition hover:bg-white/10"
                      >
                        {GUIDED_WRITERS_WORKSHOP_BRIDGE_ACTIONS.continueLocal}
                      </button>
                      <GuidedProgressButton
                        type="button"
                        isLoading={writerBridgeBusyAction === 'load'}
                        loadingLabel="Loading..."
                        idleLabel={GUIDED_WRITERS_WORKSHOP_BRIDGE_ACTIONS.useWorkshop}
                        icon={<BookOpenText className="h-3.5 w-3.5" aria-hidden />}
                        disabled={Boolean(writerBridgeBusyAction)}
                        onClick={() => {
                          setWriterBridgeExpanded(true);
                          void loadWriterBridgeOptions();
                        }}
                        className="inline-flex min-h-11 min-w-0 items-center justify-center gap-2 rounded-lg border border-emerald-200/20 bg-black/25 px-3 py-2 text-center text-xs font-black leading-snug text-emerald-50 transition hover:bg-emerald-200/10 disabled:cursor-not-allowed disabled:opacity-45"
                      />
                      <GuidedProgressButton
                        type="button"
                        isLoading={writerBridgeBusyAction === 'import'}
                        loadingLabel="Importing..."
                        idleLabel={GUIDED_WRITERS_WORKSHOP_BRIDGE_ACTIONS.importLatest}
                        icon={<RefreshCw className="h-3.5 w-3.5" aria-hidden />}
                        disabled={Boolean(writerBridgeBusyAction) || !(writerIssueId || writerBridgeSelectedIssueId)}
                        onClick={() => void importLatestLinkedWriterIssue()}
                        className="inline-flex min-h-11 min-w-0 items-center justify-center gap-2 rounded-lg border border-emerald-200/20 bg-black/25 px-3 py-2 text-center text-xs font-black leading-snug text-emerald-50 transition hover:bg-emerald-200/10 disabled:cursor-not-allowed disabled:opacity-45"
                      />
                      <button
                        type="button"
                        disabled={Boolean(writerBridgeBusyAction) || !(writerIssueId || writerBridgeSelectedIssueId)}
                        onClick={openLinkedWriterIssue}
                        className="inline-flex min-h-11 min-w-0 items-center justify-center gap-2 rounded-lg border border-emerald-200/20 bg-black/25 px-3 py-2 text-center text-xs font-black leading-snug text-emerald-50 transition hover:bg-emerald-200/10 disabled:cursor-not-allowed disabled:opacity-45"
                      >
                        <BookMarked className="h-3.5 w-3.5" aria-hidden />
                        {GUIDED_WRITERS_WORKSHOP_BRIDGE_ACTIONS.openLinked}
                      </button>
                    </div>

                    {writerBridgeExpanded ? (
                      <div className="mt-4 grid min-w-0 gap-3 overflow-hidden rounded-xl border border-white/10 bg-black/20 p-3">
                        <div className="grid min-w-0 gap-3 lg:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
                          <label className="flex min-w-0 flex-col gap-1.5 text-xs font-bold uppercase tracking-[0.14em] text-white/55">
                            Writer series
                            <select
                              value={writerBridgeSelectedSeriesId}
                              onChange={(event) => {
                                const nextSeriesId = event.target.value;
                                setWriterBridgeSelectedSeriesId(nextSeriesId);
                                setWriterBridgeSelectedIssueId(
                                  writerBridgeIssues.find((issue) => issue.series_id === nextSeriesId)?.id ?? '',
                                );
                              }}
                              className="w-full min-w-0 truncate rounded-lg border border-white/15 bg-black/35 px-3 py-2.5 text-sm font-medium normal-case tracking-normal text-white outline-none focus:border-emerald-300/70"
                            >
                              <option value="">New guided series</option>
                              {writerBridgeSeries.map((series) => (
                                <option key={series.id} value={series.id}>
                                  {series.title || 'Untitled series'}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label className="flex min-w-0 flex-col gap-1.5 text-xs font-bold uppercase tracking-[0.14em] text-white/55">
                            Writer issue
                            <select
                              value={writerBridgeSelectedIssueId}
                              onChange={(event) => setWriterBridgeSelectedIssueId(event.target.value)}
                              className="w-full min-w-0 truncate rounded-lg border border-white/15 bg-black/35 px-3 py-2.5 text-sm font-medium normal-case tracking-normal text-white outline-none focus:border-emerald-300/70"
                            >
                              <option value="">Select existing issue</option>
                              {writerBridgeIssueOptions
                                .filter((option) => !writerBridgeSelectedSeriesId || option.issue.series_id === writerBridgeSelectedSeriesId)
                                .map((option) => (
                                  <option key={option.issue.id} value={option.issue.id}>
                                    {option.seriesTitle} #{option.issue.issue_number}
                                    {option.issue.title ? `: ${option.issue.title}` : ''}
                                  </option>
                                ))}
                            </select>
                          </label>
                          <div className="flex min-w-0 flex-col justify-end gap-2 sm:flex-row lg:col-span-2 lg:flex-row xl:col-span-1 xl:flex-col">
                            <button
                              type="button"
                              disabled={Boolean(writerBridgeBusyAction) || !selectedWriterBridgeIssue}
                              onClick={linkSelectedWriterIssue}
                              className="inline-flex min-h-10 min-w-0 items-center justify-center rounded-lg border border-white/15 bg-white/[0.07] px-3 py-2 text-center text-xs font-black leading-snug text-white/78 transition hover:bg-white/12 disabled:cursor-not-allowed disabled:opacity-45"
                            >
                              {GUIDED_WRITERS_WORKSHOP_BRIDGE_ACTIONS.linkSelected}
                            </button>
                            <GuidedProgressButton
                              type="button"
                              isLoading={writerBridgeBusyAction === 'create'}
                              loadingLabel="Creating..."
                              idleLabel="Create and link issue"
                              disabled={Boolean(writerBridgeBusyAction)}
                              onClick={() => void createLinkedWriterIssueFromGuidedStory()}
                              className="inline-flex min-h-10 min-w-0 items-center justify-center rounded-lg border border-emerald-200/20 bg-emerald-200/10 px-3 py-2 text-center text-xs font-black leading-snug text-emerald-50 transition hover:bg-emerald-200/15 disabled:cursor-not-allowed disabled:opacity-45"
                            />
                            <GuidedProgressButton
                              type="button"
                              isLoading={writerBridgeBusyAction === 'delete'}
                              loadingLabel="Deleting..."
                              idleLabel="Delete selected issue"
                              icon={<Trash2 className="h-3.5 w-3.5" aria-hidden />}
                              disabled={Boolean(writerBridgeBusyAction) || !selectedWriterBridgeIssue}
                              onClick={() => void deleteSelectedWriterIssue()}
                              className="inline-flex min-h-10 min-w-0 items-center justify-center gap-2 rounded-lg border border-rose-200/25 bg-rose-500/10 px-3 py-2 text-center text-xs font-black leading-snug text-rose-100 transition hover:bg-rose-500/15 disabled:cursor-not-allowed disabled:opacity-45"
                            />
                          </div>
                        </div>
                        <p className="min-w-0 break-words text-[11px] leading-relaxed text-white/48">
                          {linkedWriterBridgeIssue
                            ? `Linked target: ${linkedWriterBridgeIssue.seriesTitle} #${linkedWriterBridgeIssue.issue.issue_number}${
                                linkedWriterBridgeIssue.issue.title ? `: ${linkedWriterBridgeIssue.issue.title}` : ''
                              }.`
                            : 'No Writer issue is linked. Local Guided Comics still works normally.'}
                        </p>
                      </div>
                    ) : null}

                    {writerIssueId ? (
                      <div className="mt-4 min-w-0 overflow-hidden rounded-xl border border-emerald-200/20 bg-emerald-300/[0.08] p-3">
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                          <div className="min-w-0">
                            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-100/70">
                              {GUIDED_WRITERS_WORKSHOP_BRIDGE_COPY.linkedNextStepTitle}
                            </p>
                            <p className="mt-1 text-xs leading-relaxed text-emerald-50/78">
                              {GUIDED_WRITERS_WORKSHOP_BRIDGE_COPY.linkedNextStepBody}
                            </p>
                          </div>
                          <span className="inline-flex shrink-0 rounded-full border border-emerald-200/25 bg-black/25 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-emerald-50/75">
                            Connected only
                          </span>
                        </div>
                        <div className="mt-3 grid min-w-0 gap-2 md:grid-cols-3">
                          <Tooltip content={GUIDED_WRITERS_WORKSHOP_BRIDGE_COPY.importHelp}>
                            <GuidedProgressButton
                              type="button"
                              isLoading={writerBridgeBusyAction === 'import'}
                              loadingLabel="Importing..."
                              idleLabel={GUIDED_WRITERS_WORKSHOP_BRIDGE_ACTIONS.importLatest}
                              icon={<RefreshCw className="h-3.5 w-3.5" aria-hidden />}
                              disabled={Boolean(writerBridgeBusyAction)}
                              onClick={() => void importLatestLinkedWriterIssue()}
                              className="inline-flex min-h-11 min-w-0 items-center justify-center gap-2 rounded-lg border border-emerald-200/25 bg-black/25 px-3 py-2 text-center text-xs font-black leading-snug text-emerald-50 transition hover:bg-emerald-200/10 disabled:cursor-not-allowed disabled:opacity-45"
                            />
                          </Tooltip>
                          <Tooltip content={GUIDED_WRITERS_WORKSHOP_BRIDGE_COPY.generateHelp}>
                            <GuidedProgressButton
                              type="button"
                              isLoading={writerBridgeBusyAction === 'page-beats'}
                              loadingLabel="Generating..."
                              idleLabel={GUIDED_WRITERS_WORKSHOP_BRIDGE_ACTIONS.generateMissingPageBeats}
                              icon={<Sparkles className="h-3.5 w-3.5" aria-hidden />}
                              disabled={Boolean(writerBridgeBusyAction)}
                              onClick={() => void runGuidedWriterToolAction('page-beats')}
                              className="inline-flex min-h-11 min-w-0 items-center justify-center gap-2 rounded-lg border border-sky-200/20 bg-black/25 px-3 py-2 text-center text-xs font-black leading-snug text-sky-50 transition hover:bg-sky-200/10 disabled:cursor-not-allowed disabled:opacity-45"
                            />
                          </Tooltip>
                          <button
                            type="button"
                            disabled={Boolean(writerBridgeBusyAction)}
                            onClick={openLinkedWriterIssue}
                            className="inline-flex min-h-11 min-w-0 items-center justify-center gap-2 rounded-lg border border-white/15 bg-black/20 px-3 py-2 text-center text-xs font-black leading-snug text-white/78 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-45"
                          >
                            <BookMarked className="h-3.5 w-3.5" aria-hidden />
                            {GUIDED_WRITERS_WORKSHOP_BRIDGE_ACTIONS.openLinked}
                          </button>
                        </div>
                      </div>
                    ) : null}

                    <div className="mt-4 min-w-0 overflow-hidden rounded-xl border border-sky-200/15 bg-sky-200/[0.06] p-3">
                      <div className="flex flex-col gap-1">
                        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-sky-100/70">
                          Phase 4 - Writer tools inside Guided Comics
                        </p>
                        <p className="text-xs leading-relaxed text-white/58">
                          Run the same Writers Workshop modes directly, then import the accepted structure back into Guided pages.
                        </p>
                      </div>
                      <div className="mt-3 grid min-w-0 gap-2 sm:grid-cols-2 xl:grid-cols-4">
                        {GUIDED_WRITERS_WORKSHOP_TOOL_ACTIONS.map((toolAction) => {
                          const loading = writerBridgeBusyAction === toolAction.action;
                          return (
                            <Tooltip key={toolAction.action} content={toolAction.description}>
                              <GuidedProgressButton
                                type="button"
                                isLoading={loading}
                                loadingLabel={
                                  toolAction.action === 'pacing'
                                    ? 'Reviewing...'
                                    : toolAction.action === 'dialogue'
                                      ? 'Drafting...'
                                      : 'Generating...'
                                }
                                idleLabel={toolAction.label}
                                icon={<Sparkles className="h-3.5 w-3.5" aria-hidden />}
                                disabled={Boolean(writerBridgeBusyAction) || !(writerIssueId || writerBridgeSelectedIssueId)}
                                onClick={() => void runGuidedWriterToolAction(toolAction.action)}
                                className="inline-flex min-h-11 min-w-0 items-center justify-center gap-2 rounded-lg border border-sky-200/20 bg-black/25 px-3 py-2 text-center text-xs font-black leading-snug text-sky-50 transition hover:bg-sky-200/10 disabled:cursor-not-allowed disabled:opacity-45"
                              />
                            </Tooltip>
                          );
                        })}
                      </div>
                    </div>

                    {writerDialogueSeedCount > 0 ? (
                      <p className="mt-3 rounded-lg border border-emerald-200/20 bg-black/20 px-3 py-2 text-xs font-semibold text-emerald-50/78">
                        Imported dialogue seeds are attached to {Object.keys(writerDialogueSeeds).length} page
                        {Object.keys(writerDialogueSeeds).length === 1 ? '' : 's'} for later lettering and Advanced Studio work.
                      </p>
                    ) : null}
                    {writerBridgeMessage ? (
                      <p className="mt-3 rounded-lg border border-emerald-200/20 bg-emerald-300/10 px-3 py-2 text-xs font-bold text-emerald-50">
                        {writerBridgeMessage}
                      </p>
                    ) : null}
                    {writerBridgeError ? (
                      <p className="mt-3 rounded-lg border border-rose-300/25 bg-rose-500/10 px-3 py-2 text-xs font-bold text-rose-100">
                        {writerBridgeError}
                      </p>
                    ) : null}
                  </section>
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
                              onChange={(event) => updatePagePanelCount(page.pageNumber, event.target.value)}
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
                            <div key={character} className={GUIDED_VISUAL_REFERENCE_ROW_CLASS}>
                              <div className="min-w-0">
                                <p className={GUIDED_VISUAL_REFERENCE_NAME_CLASS}>{displayName}</p>
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
                                emptyLabel={GUIDED_VISUAL_REFERENCE_EMPTY_LABELS.character}
                                onRemove={(referenceIndex) => removeCharacterReference(character, referenceIndex)}
                              />
                              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
                                <button
                                  type="button"
                                  onClick={() => requestCharacterVaultReference(character)}
                                  className="rounded-lg border px-3 py-2 text-xs font-black transition hover:scale-[1.01] active:scale-[0.99]"
                                  style={{ borderColor: `${ACCENT_GOLD_SOLID}88`, background: ACCENT_GOLD_GRADIENT, color: TEXT_ON_GOLD }}
                                >
                                  {GUIDED_VISUAL_REFERENCE_ACTION_LABEL}
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
                            <div key={location} className={GUIDED_VISUAL_REFERENCE_ROW_CLASS}>
                              <div className="min-w-0">
                                <p className={GUIDED_VISUAL_REFERENCE_NAME_CLASS}>{displayName}</p>
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
                                emptyLabel={GUIDED_VISUAL_REFERENCE_EMPTY_LABELS.location}
                                onRemove={(referenceIndex) => removeLocationReference(location, referenceIndex)}
                              />
                              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
                                <button
                                  type="button"
                                  onClick={() => requestLocationVaultReference(location)}
                                  className="rounded-lg border px-3 py-2 text-xs font-black transition hover:scale-[1.01] active:scale-[0.99]"
                                  style={{ borderColor: `${ACCENT_GOLD_SOLID}88`, background: ACCENT_GOLD_GRADIENT, color: TEXT_ON_GOLD }}
                                >
                                  {GUIDED_VISUAL_REFERENCE_ACTION_LABEL}
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
                              <div key={npcName} className={GUIDED_VISUAL_REFERENCE_ROW_CLASS}>
                                <div className="min-w-0">
                                  <p className={GUIDED_VISUAL_REFERENCE_NAME_CLASS}>
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
                                  emptyLabel={GUIDED_VISUAL_REFERENCE_EMPTY_LABELS.npc}
                                  onRemove={(referenceIndex) => removeNpcReference(npcName, referenceIndex)}
                                />
                                <button
                                  type="button"
                                  onClick={() => requestVaultSelection({ type: 'npc', name: npcName })}
                                  className="rounded-lg border px-3 py-2 text-xs font-black transition hover:scale-[1.01] active:scale-[0.99]"
                                  style={{ borderColor: `${ACCENT_GOLD_SOLID}88`, background: ACCENT_GOLD_GRADIENT, color: TEXT_ON_GOLD }}
                                >
                                  {GUIDED_VISUAL_REFERENCE_ACTION_LABEL}
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
                <div className="mt-5 grid gap-4 xl:grid-cols-[420px_minmax(0,1fr)]">
                  <div className="rounded-xl border border-amber-300/25 bg-amber-300/10 p-4 text-sm leading-relaxed text-amber-50 xl:col-span-2">
                    Assign finished art directly from Image Vault, upload or paste a local image, or generate a new
                    version in Imageshop. Assigned images are saved in this guided draft and appear in Layout.
                  </div>
                  <section className="rounded-xl border border-amber-300/15 bg-black/20 p-4">
                    <div className="flex items-end justify-between gap-3">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/45">
                          Panel Art Queue
                        </p>
                        <h3 className="mt-1 text-lg font-black text-white">Pages and panels</h3>
                      </div>
                      <span className="text-xs text-white/50">{panelArtQueue.length} panels</span>
                    </div>
                    <div className="mt-4 max-h-[40rem] space-y-2 overflow-y-auto pr-1 custom-scrollbar">
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
                                background: selected ? 'rgba(252,246,186,0.16)' : 'rgba(0,0,0,0.28)',
                                borderColor: selected ? `${ACCENT_GOLD_SOLID}bb` : 'rgba(252,211,77,0.14)',
                                boxShadow: selected ? '0 0 0 1px rgba(252,211,77,0.18) inset' : 'none',
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

                  <section className="rounded-xl border border-amber-300/15 bg-white/[0.045] p-4">
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
                              <VaultImageWithFallback
                                src={selectedPanelArtImage.imageUrl}
                                alt={`Assigned art for page ${selectedPanel.pageNumber}, panel ${selectedPanel.panelNumber}`}
                                frameClassName="min-h-[12rem] w-full"
                                imgClassName="max-h-[28rem] w-full object-contain"
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

                        {selectedPanelVisualMetadata ? (
                          <div className="mt-4 rounded-xl border border-amber-300/20 bg-amber-300/[0.07] p-4">
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                              <div>
                                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-amber-100/70">
                                  Visual storytelling bridge
                                </p>
                                <p className="mt-1 text-sm font-semibold leading-relaxed text-amber-50/85">
                                  Beats, dialogue, references, and layout intent feed the Imageshop prompt and Advanced Studio handoff.
                                </p>
                              </div>
                              <span className="shrink-0 rounded-full border border-amber-200/35 bg-black/25 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-amber-50">
                                {selectedPanelVisualMetadata.layoutIntent}
                              </span>
                            </div>
                            <p className="mt-3 whitespace-pre-wrap rounded-lg border border-white/10 bg-black/25 p-3 text-xs leading-relaxed text-white/72">
                              {selectedPanelVisualMetadata.visualPrompt}
                            </p>
                            {selectedPanelVisualMetadata.dialogueText ? (
                              <p className="mt-2 whitespace-pre-wrap rounded-lg border border-white/10 bg-black/20 p-3 text-xs leading-relaxed text-white/62">
                                Dialogue seed: {selectedPanelVisualMetadata.dialogueText}
                              </p>
                            ) : null}
                            <div className="mt-3 rounded-lg border border-white/10 bg-black/20 p-3">
                              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                <div>
                                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/45">
                                    Editable dialogue seeds
                                  </p>
                                  <p className="mt-1 text-xs leading-relaxed text-white/58">
                                    Accept only the lines you want to prepare for Advanced Studio. Balloons are not placed here.
                                  </p>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                  <button
                                    type="button"
                                    onClick={addManualDialogueSeedForSelectedPanel}
                                    className="rounded-lg border border-white/15 bg-white/10 px-2.5 py-1.5 text-[11px] font-bold text-white/75 transition hover:bg-white/15"
                                  >
                                    Add local seed
                                  </button>
                                  <button
                                    type="button"
                                    disabled={!writerIssueId && !writerBridgeSelectedIssueId}
                                    onClick={() => {
                                      if (selectedPanel) setActivePageNumber(selectedPanel.pageNumber);
                                      void runGuidedWriterToolAction('dialogue');
                                    }}
                                    className="rounded-lg border border-white/15 bg-white/10 px-2.5 py-1.5 text-[11px] font-bold text-white/75 transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-40"
                                  >
                                    Regenerate page dialogue
                                  </button>
                                </div>
                              </div>
                              {selectedDialogueIndicators.length ? (
                                <div className="mt-3 flex flex-wrap gap-2">
                                  {selectedDialogueIndicators.map((indicator) => (
                                    <span
                                      key={indicator}
                                      className="rounded-full border border-amber-200/25 bg-amber-300/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-amber-50/78"
                                    >
                                      {indicator}
                                    </span>
                                  ))}
                                </div>
                              ) : null}
                              {selectedPanelDialogueSeeds.length > 0 ? (
                                <div className="mt-3 grid gap-3">
                                  {selectedPanelDialogueSeeds.map((seed) => (
                                    <div key={seed.id} className="rounded-lg border border-white/10 bg-black/25 p-3">
                                      <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/45">
                                          {seed.kind === 'narration' ? 'Narration' : 'Dialogue'}
                                          {seed.speaker ? ` · ${seed.speaker}` : ''} · {seed.source}
                                        </p>
                                        <span className="rounded-full border border-white/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-white/60">
                                          {seed.status}
                                        </span>
                                      </div>
                                      <textarea
                                        value={seed.text}
                                        onChange={(event) => updateDialogueSeedText(seed.pageNumber, seed.id, event.target.value)}
                                        rows={2}
                                        className="min-h-[4.5rem] w-full resize-y rounded-lg border border-white/15 bg-black/35 px-3 py-2 text-sm font-medium leading-relaxed text-white outline-none focus:border-amber-300/70"
                                      />
                                      <div className="mt-2 flex flex-wrap gap-2">
                                        {(['accepted', 'rejected', 'generated'] as GuidedComicDialogueSeedStatus[]).map((status) => (
                                          <button
                                            key={status}
                                            type="button"
                                            onClick={() => updateDialogueSeedStatus(seed.pageNumber, seed.id, status)}
                                            className="rounded-lg border border-white/15 bg-white/10 px-2.5 py-1.5 text-[11px] font-bold text-white/72 transition hover:bg-white/15"
                                          >
                                            {status === 'accepted' ? 'Accept' : status === 'rejected' ? 'Reject' : 'Keep staging'}
                                          </button>
                                        ))}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="mt-3 rounded-lg border border-white/10 bg-black/25 p-3 text-xs leading-relaxed text-white/50">
                                  No dialogue seeds are staged for this panel yet. Add a local seed, or regenerate page dialogue from a linked Writer issue.
                                </p>
                              )}
                              <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                <p className="text-xs leading-relaxed text-white/55">
                                  {selectedPagePromotedBalloonSeedCount} accepted seed{selectedPagePromotedBalloonSeedCount === 1 ? '' : 's'} promoted for this page.
                                </p>
                                <button
                                  type="button"
                                  onClick={promoteSelectedPageDialogueSeeds}
                                  className="rounded-lg border border-amber-300/30 bg-amber-300/10 px-3 py-2 text-xs font-black text-amber-100 transition hover:bg-amber-300/15"
                                >
                                  Promote to Advanced Studio Balloon Seeds
                                </button>
                              </div>
                            </div>
                          </div>
                        ) : null}

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

                        <div className="mt-5 rounded-xl border border-amber-300/20 bg-amber-300/[0.06] p-3">
                          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-amber-100/70">
                              Panel review status
                            </p>
                            <span className="text-xs font-black text-white">
                              Current: {panelArtStatusLabel(selectedPanelStatus)}
                            </span>
                          </div>
                          <div className="mt-3 grid gap-2 sm:grid-cols-3">
                            {(['ready', 'approved', 'needs-art'] as PanelArtStatus[]).map((status) => (
                              <button
                                key={status}
                                type="button"
                                onClick={() => updatePanelArtStatus(selectedPanel.id, status)}
                                className="rounded-lg border px-3 py-2.5 text-xs font-black transition hover:brightness-110 active:scale-[0.99]"
                                style={panelArtStatusButtonStyle(status, selectedPanelStatus)}
                              >
                                {status === 'ready' ? 'Mark ready' : status === 'approved' ? 'Approve panel' : 'Needs revision'}
                              </button>
                            ))}
                          </div>
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
                  <section className="rounded-xl border border-white/10 bg-white/[0.06] p-4">
                    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/45">
                          Guided layout levels
                        </p>
                        <h3 className="mt-1 text-lg font-black text-white">{GUIDED_LAYOUT_DISCLOSURE_COPY.start}</h3>
                        <p className="mt-2 text-sm leading-relaxed text-white/68">
                          Guided Flow is the accessible creative path. Advanced Studio is the power-user refinement path.
                          Both share the same comic engine.
                        </p>
                      </div>
                      <div className="flex rounded-lg border border-white/10 bg-black/25 p-1">
                        {GUIDED_LAYOUT_DISCLOSURE_LEVELS.slice(0, 2).map((level) => {
                          const mode = level.id as GuidedLayoutDisclosureMode;
                          const selected = layoutDisclosureMode === level.id;
                          return (
                            <button
                              key={level.id}
                              type="button"
                              onClick={() => setLayoutDisclosureMode(mode)}
                              className="rounded-md px-3 py-2 text-xs font-black transition"
                              style={
                                selected
                                  ? { background: ACCENT_GOLD_GRADIENT, color: TEXT_ON_GOLD }
                                  : { color: 'rgba(255,255,255,0.68)' }
                              }
                            >
                              {level.id === 'simple' ? 'Simple' : 'Edit'}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    <div className="mt-4 grid gap-3 lg:grid-cols-3">
                      {GUIDED_LAYOUT_DISCLOSURE_LEVELS.map((level) => {
                        const active =
                          (level.id === 'simple' && layoutDisclosureMode === 'simple') ||
                          (level.id === 'edit' && layoutDisclosureMode === 'edit') ||
                          level.id === 'advanced';
                        return (
                          <div
                            key={level.id}
                            className="rounded-lg border p-3"
                            style={{
                              borderColor: active ? 'rgba(252,211,77,0.35)' : 'rgba(255,255,255,0.1)',
                              background: active ? 'rgba(252,211,77,0.07)' : 'rgba(0,0,0,0.18)',
                            }}
                          >
                            <p className="text-xs font-black text-white">{level.label}</p>
                            <p className="mt-1 text-xs leading-relaxed text-white/62">{level.summary}</p>
                            <p className="mt-2 text-[10px] font-bold uppercase tracking-[0.14em] text-amber-100/62">
                              {level.controls.slice(0, 4).join(' · ')}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                    <p className="mt-3 rounded-lg border border-amber-300/20 bg-amber-300/[0.07] px-3 py-2 text-xs font-bold leading-relaxed text-amber-50/75">
                      {GUIDED_LAYOUT_DISCLOSURE_COPY.advanced}
                    </p>
                  </section>
                  {pageCards.length > 0 ? (
                    pageCards.map((page) => {
                      const templateId = pageLayoutTemplates[page.pageNumber] ?? 'auto';
                      const layoutPanels = getGuidedComicLayoutPanels(page, templateId);
                      const layoutGeometry = syncGuidedComicLayoutGeometry(
                        page,
                        pageLayoutGeometry[page.pageNumber],
                        templateId,
                        guidedLayoutSettings,
                      );
                      return (
                      <article
                        key={page.pageNumber}
                        data-guided-page-number={page.pageNumber}
                        ref={(node) => {
                          pageSectionRefs.current[page.pageNumber] = node;
                        }}
                        className="rounded-xl border border-white/10 bg-white/[0.06] p-4"
                      >
                        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_160px_220px] lg:items-start">
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
                            Panel count
                            <select
                              value={String(getGuidedComicActivePanelCount(page))}
                              onChange={(event) => updatePagePanelCount(page.pageNumber, event.target.value)}
                              className="rounded-lg border border-white/15 bg-black/35 px-3 py-2.5 text-sm font-medium normal-case tracking-normal text-white outline-none focus:border-amber-300/70"
                            >
                              {[1, 2, 3, 4, 5, 6, 7, 8].map((count) => (
                                <option key={count} value={count}>
                                  {count} panel{count === 1 ? '' : 's'}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label className="flex flex-col gap-1.5 text-xs font-bold uppercase tracking-[0.14em] text-white/55">
                            Starter preset
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

                        <div className="mt-4 grid gap-4">
                          <div className="rounded-xl border border-amber-300/20 bg-amber-300/[0.045] p-3">
                            <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/45">
                                {layoutDisclosureMode === 'simple' ? 'Simple layout controls' : 'Editable layout canvas'}
                              </p>
                              <div className="flex flex-wrap gap-2">
                                {layoutDisclosureMode === 'simple' && (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => adjustSelectedLayoutPanel(page, 'bigger')}
                                      className="rounded-lg border border-amber-300/30 bg-amber-300/10 px-2.5 py-1.5 text-[11px] font-bold text-amber-50 transition hover:bg-amber-300/15"
                                    >
                                      Make selected panel bigger
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => adjustSelectedLayoutPanel(page, 'wider')}
                                      className="rounded-lg border border-amber-300/30 bg-amber-300/10 px-2.5 py-1.5 text-[11px] font-bold text-amber-50 transition hover:bg-amber-300/15"
                                    >
                                      Make selected panel wider
                                    </button>
                                  </>
                                )}
                                <button
                                  type="button"
                                  onClick={() => applySafeMarginsToPageLayout(page)}
                                  className="rounded-lg border border-amber-300/30 bg-amber-300/10 px-2.5 py-1.5 text-[11px] font-bold text-amber-50 transition hover:bg-amber-300/15"
                                >
                                  Apply safe margins
                                </button>
                                {layoutDisclosureMode === 'simple' && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      updatePageLayoutTemplate(page.pageNumber, templateId);
                                      setPrimaryActionMessage(`Reset page ${page.pageNumber} layout to the selected starter.`);
                                    }}
                                    className="rounded-lg border border-white/15 bg-white/10 px-2.5 py-1.5 text-[11px] font-bold text-white/70 transition hover:bg-white/15"
                                  >
                                    Reset layout
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => regeneratePageStarterLayout(page)}
                                  className="rounded-lg border border-white/15 bg-white/10 px-2.5 py-1.5 text-[11px] font-bold text-white/70 transition hover:bg-white/15"
                                >
                                  {layoutDisclosureMode === 'simple' ? 'Regenerate layout' : 'Reset starter layout'}
                                </button>
                              </div>
                            </div>
                            <p className="mb-3 text-xs leading-relaxed text-amber-50/65">
                              {layoutDisclosureMode === 'simple'
                                ? 'Choose a panel count and starter layout first. Select a panel, then use the quick buttons to adjust it without needing precision editing.'
                                : 'Drag rectangular panels, resize them from the corner handles, and snap them to page margins or gutters.'}{' '}
                              Advanced Studio receives the rectangles as edited.
                            </p>
                            <div
                              ref={(node) => {
                                layoutCanvasRefs.current[page.pageNumber] = node;
                              }}
                              className="relative aspect-[2/3] overflow-hidden rounded-lg border border-amber-300/25 bg-[#100e16]"
                              style={{
                                backgroundImage:
                                  'linear-gradient(90deg, rgba(252,211,77,0.06) 1px, transparent 1px), linear-gradient(180deg, rgba(252,211,77,0.06) 1px, transparent 1px)',
                                backgroundSize: '10% 10%',
                              }}
                            >
                              <div
                                className="pointer-events-none absolute z-20 rounded border border-dashed border-amber-100/45"
                                style={{ inset: `${NORMALIZED_LAYOUT_MARGIN * 100}%` }}
                                aria-hidden
                              />
                              <span
                                className="pointer-events-none absolute left-[5%] top-[5%] z-20 rounded bg-black/55 px-2 py-1 text-[9px] font-bold uppercase tracking-[0.14em] text-amber-50/75"
                                aria-hidden
                              >
                                Safe margin
                              </span>
                              {layoutGeometry.map((panel) => {
                                const panelNumber = panel.order + 1;
                                const panelPlan = layoutPanels.find((candidate) => candidate.panelId === panel.panelId) ?? layoutPanels[panel.order];
                                const panelId = panel.panelId;
                                const panelImage = panelArtImages[panelId];
                                const selected = selectedLayoutPanel?.panelId === panelId || activeLayoutEdit?.panelId === panelId;
                                return (
                                  <div
                                    key={panelId}
                                    role="button"
                                    tabIndex={0}
                                    aria-label={`Select page ${page.pageNumber}, panel ${panelNumber}`}
                                    onClick={() => {
                                      setActivePageNumber(page.pageNumber);
                                      setSelectedPanelId(panelId);
                                    }}
                                    onPointerDown={(event) => {
                                      if (layoutDisclosureMode === 'edit' && shouldStartGuidedPanelMoveDrag(event.target)) {
                                        startLayoutPanelEdit(event, page.pageNumber, panel, 'move');
                                      }
                                    }}
                                    className="absolute min-h-0 overflow-hidden rounded-md border bg-amber-300/[0.055] shadow-lg transition"
                                    style={{
                                      left: `${panel.x * 100}%`,
                                      top: `${panel.y * 100}%`,
                                      width: `${panel.w * 100}%`,
                                      height: `${panel.h * 100}%`,
                                      borderColor: selected ? `${ACCENT_GOLD_SOLID}` : 'rgba(252,211,77,0.52)',
                                      cursor: panel.locked ? 'default' : layoutDisclosureMode === 'edit' ? 'move' : 'pointer',
                                      touchAction: layoutDisclosureMode === 'edit' ? 'none' : undefined,
                                      boxShadow: selected
                                        ? '0 0 0 2px rgba(252,246,186,0.28), 0 18px 40px rgba(0,0,0,0.34)'
                                        : '0 0 0 1px rgba(0,0,0,0.32), 0 12px 30px rgba(0,0,0,0.28)',
                                    }}
                                  >
                                    {panelImage ? (
                                      <VaultImageWithFallback
                                        src={panelImage.imageUrl}
                                        alt={`Page ${page.pageNumber}, panel ${panelNumber}`}
                                        frameClassName="h-full w-full overflow-hidden"
                                        imgClassName="h-full w-full"
                                        imgStyle={{
                                          objectFit:
                                            panel.imageFit === 'stretch'
                                              ? 'fill'
                                              : panel.imageFit === 'contain'
                                                ? 'contain'
                                                : 'cover',
                                          objectPosition: `${(panel.imageFocusX ?? 0.5) * 100}% ${(panel.imageFocusY ?? 0.5) * 100}%`,
                                          transform: (panel.imageZoom ?? 1) > 1 ? `scale(${panel.imageZoom})` : undefined,
                                          transformOrigin: `${(panel.imageFocusX ?? 0.5) * 100}% ${(panel.imageFocusY ?? 0.5) * 100}%`,
                                        }}
                                      />
                                    ) : (
                                      <div className="flex h-full min-h-[5rem] flex-col justify-between bg-black/20 p-2">
                                        <span className="text-[10px] font-black uppercase tracking-[0.14em] text-amber-100/65">
                                          Panel {panelNumber}
                                        </span>
                                        <p className="line-clamp-3 text-[11px] leading-snug text-white/68">
                                          {panelPlan?.beatText || 'Panel art placeholder'}
                                        </p>
                                        <span className="text-[9px] font-bold uppercase tracking-[0.12em] text-amber-100/42">
                                          {panelPlan?.intent === 'feature'
                                            ? 'Feature beat'
                                            : panelPlan?.intent === 'wide'
                                              ? 'Wide beat'
                                              : panelPlan?.intent === 'tall'
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
                                    <span className="absolute right-2 top-2 rounded-full border border-amber-200/45 bg-black/65 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.12em] text-amber-50">
                                      Panel {panelNumber}
                                    </span>
                                    {layoutDisclosureMode === 'edit' &&
                                      (['nw', 'ne', 'sw', 'se'] as LayoutResizeHandle[]).map((handle) => (
                                        <button
                                          key={handle}
                                          type="button"
                                          aria-label={`Resize panel ${panelNumber} ${handle}`}
                                          onPointerDown={(event) => startLayoutPanelEdit(event, page.pageNumber, panel, 'resize', handle)}
                                          className={[
                                            'absolute h-3 w-3 rounded-full border border-black/50 bg-amber-200 shadow-sm',
                                            handle.includes('n') ? 'top-1' : 'bottom-1',
                                            handle.includes('w') ? 'left-1' : 'right-1',
                                          ].join(' ')}
                                          style={{
                                            cursor:
                                              handle === 'nw' || handle === 'se'
                                                ? 'nwse-resize'
                                                : 'nesw-resize',
                                          }}
                                        />
                                      ))}
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          <div className="grid gap-3">
                            <div className="grid gap-3 md:grid-cols-2">
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
                            <div className="rounded-lg border border-amber-300/20 bg-amber-300/[0.07] p-3">
                              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-amber-100/70">
                                Page {page.pageNumber} handoff
                              </p>
                              <button
                                type="button"
                                onClick={() => openPageInAdvancedStudio(page)}
                                className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-amber-300/35 bg-amber-300/15 px-4 py-2.5 text-sm font-black text-amber-100 transition hover:border-amber-200/55 hover:bg-amber-300/20"
                              >
                                <MonitorUp className="h-4 w-4" aria-hidden="true" />
                                {ADVANCED_STUDIO_ACTION_LABELS.sendPage}
                              </button>
                            </div>
                          </div>
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
                        [
                          'Layout defaults',
                          `${setupForm.layoutMarginMode === 'safe' ? 'Safe margins' : 'Full bleed'} / ${
                            setupForm.layoutGutterMode === 'standard' ? 'Standard gutters' : 'Thin dividers'
                          }`,
                        ],
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

          <aside className="min-w-0 overflow-hidden rounded-2xl border border-white/10 bg-black/30 p-5 shadow-xl backdrop-blur-sm lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto custom-scrollbar">
            <section className="mb-5 min-w-0 overflow-hidden rounded-xl border border-white/10 bg-white/[0.06] p-4">
              {isArtStep ? (
                <>
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: ACCENT_GOLD_LIGHT }}>
                    Panel menu
                  </p>
                  <h3 className="mt-2 text-lg font-black text-white">
                    {selectedPanel ? `Page ${selectedPanel.pageNumber} controls` : 'Art workspace'}
                  </h3>
                  {selectedPanel ? (
                    <>
                      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                        <div className="rounded-lg border border-amber-300/20 bg-amber-300/[0.07] px-2 py-2">
                          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-amber-100/60">Current</p>
                          <p className="mt-1 text-lg font-black text-white">{selectedPanel.panelNumber} / {selectedPagePanels.length}</p>
                        </div>
                        <div className="rounded-lg border border-emerald-300/20 bg-emerald-300/[0.07] px-2 py-2">
                          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-emerald-100/60">Approved</p>
                          <p className="mt-1 text-lg font-black text-white">{selectedPagePanels.filter((panel) => (panelArtStatuses[panel.id] ?? 'needs-art') === 'approved').length}</p>
                        </div>
                        <div className="rounded-lg border border-white/10 bg-white/[0.06] px-2 py-2">
                          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/45">Queued</p>
                          <p className="mt-1 text-lg font-black text-white">{panelArtQueue.length}</p>
                        </div>
                      </div>
                      <div className="mt-3 max-h-44 space-y-2 overflow-y-auto pr-1 custom-scrollbar">
                        {selectedPagePanels.map((panel) => {
                          const active = selectedPanel.id === panel.id;
                          const status = panelArtStatuses[panel.id] ?? 'needs-art';
                          return (
                            <button
                              key={panel.id}
                              type="button"
                              onClick={() => setSelectedPanelId(panel.id)}
                              className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left text-xs font-bold transition hover:bg-white/10"
                              style={{
                                borderColor: active ? `${ACCENT_GOLD_SOLID}aa` : 'rgba(255,255,255,0.12)',
                                background: active ? 'rgba(252,246,186,0.13)' : 'rgba(0,0,0,0.22)',
                                color: active ? ACCENT_GOLD_LIGHT : 'rgba(255,255,255,0.72)',
                              }}
                            >
                              <span>Panel {panel.panelNumber}</span>
                              <span className="text-[10px] uppercase tracking-[0.12em]">
                                {panelArtStatusLabel(status)}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                      <div className="mt-4 rounded-xl border border-amber-300/25 bg-[#181a22]/95 p-3 shadow-lg">
                        <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: ACCENT_GOLD_LIGHT }}>
                          Active panel workspace
                        </p>
                        <h4 className="mt-1 text-lg font-black text-white">
                          Page {selectedPanel.pageNumber}, Panel {selectedPanel.panelNumber}
                        </h4>
                        <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-white/60">
                          {selectedPanel.beatText || 'Choose a page panel from the queue to assign art and update its review status.'}
                        </p>
                        <div className="mt-3 grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => selectPanelByOffset(-1)}
                            disabled={selectedPanelQueueIndex <= 0}
                            className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-white/15 bg-white/10 px-3 py-2 text-xs font-bold text-white/80 transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            <ChevronLeft className="h-3.5 w-3.5" aria-hidden />
                            Previous
                          </button>
                          <button
                            type="button"
                            onClick={() => selectPanelByOffset(1)}
                            disabled={selectedPanelQueueIndex < 0 || selectedPanelQueueIndex >= panelArtQueue.length - 1}
                            className="inline-flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-black transition hover:scale-[1.01] active:scale-[0.99] disabled:cursor-not-allowed disabled:scale-100 disabled:opacity-40"
                            style={{ borderColor: `${ACCENT_GOLD_SOLID}88`, background: ACCENT_GOLD_GRADIENT, color: TEXT_ON_GOLD }}
                          >
                            Next
                            <ChevronRight className="h-3.5 w-3.5" aria-hidden />
                          </button>
                        </div>
                        <div className="mt-3 grid gap-2">
                          {(['ready', 'approved', 'needs-art'] as PanelArtStatus[]).map((status) => (
                            <button
                              key={status}
                              type="button"
                              onClick={() => updatePanelArtStatus(selectedPanel.id, status)}
                              className="rounded-lg border px-3 py-2 text-xs font-black transition hover:brightness-110 active:scale-[0.99]"
                              style={panelArtStatusButtonStyle(status, selectedPanelStatus)}
                            >
                              {status === 'ready' ? 'Mark ready' : status === 'approved' ? 'Approve panel' : 'Needs revision'}
                            </button>
                          ))}
                        </div>
                        <p className="mt-3 text-xs font-bold text-white/55">
                          Panel {selectedPagePanelIndex + 1} of {selectedPagePanels.length} on this page · {panelArtStatusLabel(selectedPanelStatus)}
                        </p>
                      </div>
                    </>
                  ) : (
                    <p className="mt-3 text-xs leading-relaxed text-white/55">
                      Build page cards first to create panel-specific art controls here.
                    </p>
                  )}
                </>
              ) : (
                <>
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: ACCENT_GOLD_LIGHT }}>
                    {isStoryStep && !outlineDraftExists ? 'Story intake' : 'Narrative signals detected'}
                  </p>
                  <h3 className="mt-2 text-lg font-black text-white">
                    {isStoryStep && !outlineDraftExists
                      ? GUIDED_STORY_PHASE_COPY.assistantInactiveTitle
                      : GUIDED_STORY_PHASE_COPY.assistantTitle}
                  </h3>
                  {isStoryStep && !outlineDraftExists ? (
                    <div className="mt-3 rounded-lg border border-white/10 bg-black/20 px-3 py-3">
                      <p className="text-xs leading-relaxed text-white/58">
                        {GUIDED_STORY_PHASE_COPY.assistantInactiveDetail}
                      </p>
                    </div>
                  ) : (
                    <div className="mt-3 space-y-2">
                      {guidedPacingChecks.slice(0, 6).map((check) => (
                        <div key={check.id} className="flex items-start justify-between gap-3 rounded-lg border border-white/10 bg-black/20 px-3 py-2">
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-white/75">{check.label}</p>
                            <p className="mt-0.5 text-[11px] leading-snug text-white/45">{check.detail}</p>
                          </div>
                          <span
                            className="shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em]"
                            style={{
                              borderColor: check.status === 'ready' ? `${ACCENT_GOLD_SOLID}88` : 'rgba(255,255,255,0.18)',
                              color: check.status === 'ready' ? ACCENT_GOLD_LIGHT : 'rgba(255,255,255,0.58)',
                            }}
                          >
                            {check.status === 'ready' ? 'Detected' : 'Develop'}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                  {guidedAiAcceptedNotes?.pacingNotes?.length ? (
                    <div className="mt-3 rounded-lg border border-sky-300/20 bg-sky-300/10 p-3">
                      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-sky-100/65">
                        Optional pacing notes
                      </p>
                      <ul className="mt-2 space-y-1 text-xs leading-relaxed text-sky-50/75">
                        {guidedAiAcceptedNotes.pacingNotes.slice(0, 4).map((note, index) => (
                          <li key={`${note}-${index}`}>{note}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </>
              )}
            </section>
            {isStoryStep ? (
              <>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: ACCENT_GOLD_LIGHT }}>
                  Story preview
                </p>
                <h3 className="mt-2 text-lg font-black text-white">Live outline seed</h3>
                <div className="mt-4 space-y-3">
                  <div className="rounded-xl border border-white/10 bg-white/[0.06] p-3">
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/45">Working logline</p>
                    <p className="mt-2 break-words text-xs leading-relaxed text-white/75">{workingLogline}</p>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-white/[0.06] p-3">
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/45">Issue summary</p>
                    <p className="mt-2 whitespace-pre-wrap break-words text-xs leading-relaxed text-white/75">{issueSummary}</p>
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
            ) : isArtStep ? (
              <>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: ACCENT_GOLD_LIGHT }}>
                  Page art review
                </p>
                <h3 className="mt-2 text-lg font-black text-white">Panel progress</h3>
                <div className="mt-4 grid gap-3">
                  <div className="rounded-xl border border-white/10 bg-white/[0.06] p-3">
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/45">Total queue</p>
                    <p className="mt-1 text-2xl font-black text-white">{panelArtQueue.length}</p>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-white/[0.06] p-3">
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/45">Selected page</p>
                    <p className="mt-1 text-sm font-bold text-white/80">{selectedPageArtSummary}</p>
                  </div>
                </div>
                <p className="mt-4 text-xs leading-relaxed text-white/55">
                  The bottom Next button moves to Layout. Use the panel menu above to move between panels while staying in Art.
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
                  This checklist only reads local page cards, panel art statuses, and editable layout geometry.
                </p>
                <section className="mt-5 rounded-xl border border-amber-300/20 bg-amber-300/[0.06] p-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between 2xl:flex-col">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: ACCENT_GOLD_LIGHT }}>
                        Panel image framing
                      </p>
                      <h4 className="mt-1 text-base font-black text-white">
                        {selectedLayoutPage && selectedLayoutPanel
                          ? `Page ${selectedLayoutPage.pageNumber}, Panel ${selectedLayoutPanelNumber}`
                          : 'Select a layout panel'}
                      </h4>
                    </div>
                    <span className="w-fit rounded-full border border-white/10 bg-white/[0.07] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-white/55">
                      {selectedLayoutPanelImage ? 'Image assigned' : selectedLayoutPanel ? 'Needs art' : 'No panel'}
                    </span>
                  </div>
                  {selectedLayoutPage && selectedLayoutPanel ? (
                    <>
                      <p className="mt-3 text-xs leading-relaxed text-white/55">
                        Follows the visible page on the left. Click a panel to adjust a different image frame.
                      </p>
                      <div className="mt-4 grid gap-4">
                        <div className="min-w-0">
                          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/45">
                            Fit
                          </p>
                          <div className="mt-2 grid grid-cols-3 gap-2">
                            {(['cover', 'contain', 'stretch'] as GuidedComicImageFit[]).map((fit) => {
                              const selected = selectedImageFit === fit;
                              return (
                                <button
                                  key={fit}
                                  type="button"
                                  disabled={!selectedLayoutPanelImage}
                                  onClick={() =>
                                    updateLayoutPanelFraming(selectedLayoutPage.pageNumber, selectedLayoutPanel.panelId, {
                                      imageFit: fit,
                                    })
                                  }
                                  className="rounded-lg border px-3 py-2 text-xs font-black capitalize transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-45"
                                  style={{
                                    borderColor: selected ? `${ACCENT_GOLD_SOLID}dd` : 'rgba(255,255,255,0.14)',
                                    background: selected ? ACCENT_GOLD_GRADIENT : 'rgba(255,255,255,0.07)',
                                    color: selected ? TEXT_ON_GOLD : 'rgba(255,255,255,0.76)',
                                  }}
                                >
                                  {fit}
                                </button>
                              );
                            })}
                          </div>
                          <label className="mt-3 flex flex-col gap-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-white/45">
                            Zoom
                            <input
                              type="range"
                              min="1"
                              max="2"
                              step="0.05"
                              value={selectedImageZoom}
                              disabled={!selectedLayoutPanelImage || selectedImageFit === 'stretch'}
                              onChange={(event) =>
                                updateLayoutPanelFraming(selectedLayoutPage.pageNumber, selectedLayoutPanel.panelId, {
                                  imageZoom: Number(event.target.value),
                                })
                              }
                              className="w-full accent-amber-300 disabled:opacity-45"
                            />
                          </label>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/45">
                            Focus
                          </p>
                          <div className="mt-2 grid max-w-36 grid-cols-3 gap-1">
                            {[
                              [0, 0],
                              [0.5, 0],
                              [1, 0],
                              [0, 0.5],
                              [0.5, 0.5],
                              [1, 0.5],
                              [0, 1],
                              [0.5, 1],
                              [1, 1],
                            ].map(([focusX, focusY]) => {
                              const selected =
                                Math.abs(selectedImageFocusX - focusX) < 0.01 &&
                                Math.abs(selectedImageFocusY - focusY) < 0.01;
                              return (
                                <button
                                  key={`${focusX}-${focusY}`}
                                  type="button"
                                  aria-label={`Focus ${focusX * 100}% ${focusY * 100}%`}
                                  disabled={!selectedLayoutPanelImage || selectedImageFit === 'stretch'}
                                  onClick={() =>
                                    updateLayoutPanelFraming(selectedLayoutPage.pageNumber, selectedLayoutPanel.panelId, {
                                      imageFocusX: focusX,
                                      imageFocusY: focusY,
                                    })
                                  }
                                  className="flex aspect-square items-center justify-center rounded-md border transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-45"
                                  style={{
                                    borderColor: selected ? `${ACCENT_GOLD_SOLID}` : 'rgba(255,255,255,0.14)',
                                    background: selected ? 'rgba(252,246,186,0.18)' : 'rgba(255,255,255,0.06)',
                                  }}
                                >
                                  <span
                                    className="h-2 w-2 rounded-full"
                                    style={{ background: selected ? ACCENT_GOLD_LIGHT : 'rgba(255,255,255,0.45)' }}
                                  />
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </>
                  ) : (
                    <p className="mt-3 text-xs leading-relaxed text-white/55">
                      Build page cards first, then select a panel on the layout canvas.
                    </p>
                  )}
                </section>
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
        ) : null}
        {comicProjectMetadataDialog ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-6 backdrop-blur-sm">
            <form
              onSubmit={(event) => {
                event.preventDefault();
                submitComicProjectMetadataDialog();
              }}
              className="w-full max-w-lg rounded-2xl border border-white/15 bg-[#101529] p-5 shadow-2xl"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: ACCENT_GOLD_LIGHT }}>
                    Comic Library
                  </p>
                  <h3 className="mt-2 text-xl font-black text-white">
                    {comicProjectMetadataDialog.mode === 'save-as' ? 'Save as new comic' : 'Rename comic'}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-white/60">
                    {comicProjectMetadataDialog.mode === 'save-as'
                      ? 'Create a separate saved library entry from the current guided draft.'
                      : 'Update this comic’s library name and issue details.'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setComicProjectMetadataDialog(null)}
                  className="rounded-lg border border-white/15 bg-white/10 px-3 py-2 text-xs font-bold text-white/70 transition hover:bg-white/15"
                >
                  Close
                </button>
              </div>

              <div className="mt-5 grid gap-4">
                <label className="flex flex-col gap-1.5 text-xs font-bold uppercase tracking-[0.14em] text-white/55">
                  Comic / series title
                  <input
                    type="text"
                    value={comicProjectMetadataDialog.form.seriesTitle}
                    onChange={(event) => updateComicProjectMetadataField('seriesTitle', event.target.value)}
                    className="rounded-lg border border-white/15 bg-black/35 px-3 py-2.5 text-sm font-medium normal-case tracking-normal text-white outline-none placeholder:text-white/30 focus:border-amber-300/70"
                    autoFocus
                  />
                </label>
                <label className="flex flex-col gap-1.5 text-xs font-bold uppercase tracking-[0.14em] text-white/55">
                  Issue title
                  <input
                    type="text"
                    value={comicProjectMetadataDialog.form.issueTitle}
                    onChange={(event) => updateComicProjectMetadataField('issueTitle', event.target.value)}
                    className="rounded-lg border border-white/15 bg-black/35 px-3 py-2.5 text-sm font-medium normal-case tracking-normal text-white outline-none placeholder:text-white/30 focus:border-amber-300/70"
                  />
                </label>
                <label className="flex flex-col gap-1.5 text-xs font-bold uppercase tracking-[0.14em] text-white/55">
                  Issue number
                  <input
                    type="text"
                    value={comicProjectMetadataDialog.form.issueNumber}
                    onChange={(event) => updateComicProjectMetadataField('issueNumber', event.target.value)}
                    className="rounded-lg border border-white/15 bg-black/35 px-3 py-2.5 text-sm font-medium normal-case tracking-normal text-white outline-none placeholder:text-white/30 focus:border-amber-300/70"
                  />
                </label>
              </div>

              <div className="mt-5 flex flex-col gap-2 border-t border-white/10 pt-4 sm:flex-row sm:items-center sm:justify-end">
                <button
                  type="button"
                  onClick={() => setComicProjectMetadataDialog(null)}
                  className="rounded-xl border border-white/15 bg-white/10 px-4 py-2.5 text-xs font-bold text-white/80 transition hover:bg-white/15"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl px-4 py-2.5 text-xs font-black shadow-lg transition hover:scale-[1.01] active:scale-[0.99]"
                  style={{ background: ACCENT_GOLD_GRADIENT, color: TEXT_ON_GOLD }}
                >
                  {comicProjectMetadataDialog.mode === 'save-as' ? 'Save new comic' : 'Rename comic'}
                </button>
              </div>
            </form>
          </div>
        ) : null}

        {guidedAiPreview ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-6 backdrop-blur-sm">
            <section className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-white/15 bg-[#101529] p-5 shadow-2xl custom-scrollbar">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: ACCENT_GOLD_LIGHT }}>
                    AI preview
                  </p>
                  <h3 className="mt-2 text-2xl font-black text-white">
                    {guidedAiPreview.result.title || guidedAiPreview.label}
                  </h3>
                  {guidedAiPreview.result.summary ? (
                    <p className="mt-2 text-sm leading-relaxed text-white/65">{guidedAiPreview.result.summary}</p>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={() => setGuidedAiPreview(null)}
                  className="rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-xs font-bold text-white/70 transition hover:bg-white/10"
                >
                  Reject
                </button>
              </div>

              <div className="mt-5 grid gap-4">
                {guidedAiPreview.result.suggestions?.length ? (
                  <div className="rounded-xl border border-white/10 bg-white/[0.06] p-4">
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/45">Suggestions</p>
                    <ul className="mt-2 space-y-1 text-sm leading-relaxed text-white/75">
                      {guidedAiPreview.result.suggestions.map((suggestion, index) => (
                        <li key={`${suggestion}-${index}`}>{suggestion}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {guidedAiPreview.result.replacements ? (
                  <div className="rounded-xl border border-white/10 bg-white/[0.06] p-4">
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/45">Field suggestions</p>
                    <pre className="mt-2 max-h-52 overflow-y-auto whitespace-pre-wrap rounded-lg border border-white/10 bg-black/30 p-3 text-xs leading-relaxed text-white/75 custom-scrollbar">
                      {JSON.stringify(guidedAiPreview.result.replacements, null, 2)}
                    </pre>
                  </div>
                ) : null}

                {guidedAiPreview.result.outlineBeats?.length ? (
                  <div className="rounded-xl border border-white/10 bg-white/[0.06] p-4">
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/45">Outline beats</p>
                    <div className="mt-2 space-y-2">
                      {guidedAiPreview.result.outlineBeats.map((beat, index) => (
                        <div key={`${beat.id ?? beat.title ?? 'beat'}-${index}`} className="rounded-lg border border-white/10 bg-black/25 p-3">
                          <p className="text-xs font-black text-white">{beat.title ?? beat.id ?? `Beat ${index + 1}`}</p>
                          <p className="mt-1 text-xs leading-relaxed text-white/65">{beat.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                {guidedAiPreview.result.pageUpdates?.length ? (
                  <div className="rounded-xl border border-white/10 bg-white/[0.06] p-4">
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/45">Page and panel updates</p>
                    <div className="mt-2 space-y-2">
                      {guidedAiPreview.result.pageUpdates.map((page) => (
                        <div key={page.pageNumber} className="rounded-lg border border-white/10 bg-black/25 p-3">
                          <p className="text-xs font-black text-white">Page {page.pageNumber}</p>
                          {page.summary ? <p className="mt-1 text-xs leading-relaxed text-white/65">{page.summary}</p> : null}
                          {page.panelBeats?.length ? (
                            <ul className="mt-2 space-y-1 text-xs leading-relaxed text-white/55">
                              {page.panelBeats.map((beat, index) => (
                                <li key={`${page.pageNumber}-${index}`}>Panel {index + 1}: {beat}</li>
                              ))}
                            </ul>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                {[
                  ['Pacing notes', guidedAiPreview.result.pacingNotes],
                  ['Reference needs', guidedAiPreview.result.referenceNeeds?.map((need) => `${need.type}: ${need.name}${need.reason ? ` — ${need.reason}` : ''}`)],
                  ['Dialogue notes', guidedAiPreview.result.dialogueNotes],
                  ['Narration notes', guidedAiPreview.result.narrationNotes],
                ].map(([title, items]) =>
                  Array.isArray(items) && items.length ? (
                    <div key={title as string} className="rounded-xl border border-white/10 bg-white/[0.06] p-4">
                      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/45">{title as string}</p>
                      <ul className="mt-2 space-y-1 text-sm leading-relaxed text-white/70">
                        {(items as string[]).map((item, index) => (
                          <li key={`${item}-${index}`}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null,
                )}
              </div>

              <div className="mt-5 flex flex-col gap-2 border-t border-white/10 pt-4 sm:flex-row sm:items-center sm:justify-end">
                <button
                  type="button"
                  onClick={() => applyGuidedAiPreview('empty-only')}
                  className="rounded-xl px-4 py-2.5 text-xs font-black shadow-lg transition hover:scale-[1.01] active:scale-[0.99]"
                  style={{ background: ACCENT_GOLD_GRADIENT, color: TEXT_ON_GOLD }}
                >
                  Apply to empty fields only
                </button>
                <button
                  type="button"
                  onClick={() => applyGuidedAiPreview('replace-confirmed')}
                  className="rounded-xl border border-white/15 bg-white/10 px-4 py-2.5 text-xs font-bold text-white/80 transition hover:bg-white/15"
                >
                  Replace with confirmation
                </button>
                <GuidedProgressButton
                  type="button"
                  onClick={() => void runGuidedComicAiAction(guidedAiPreview.action, true)}
                  disabled={Boolean(guidedAiLoadingAction)}
                  isLoading={Boolean(guidedAiLoadingAction)}
                  loadingLabel="Regenerating..."
                  idleLabel="Regenerate selected only"
                  className="rounded-xl border border-sky-300/25 bg-sky-300/10 px-4 py-2.5 text-xs font-bold text-sky-50 transition hover:bg-sky-300/15 disabled:opacity-45"
                />
              </div>
            </section>
          </div>
        ) : null}
      </div>
    </div>
  );
}
