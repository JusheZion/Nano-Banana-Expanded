export type WriterProductionMedium = 'comic' | 'book' | 'screenplay' | 'video' | 'wiki';
export type WriterNarrativeScope =
  | 'single_issue'
  | 'multi_issue_arc'
  | 'book'
  | 'episode'
  | 'shared_universe';
export type WriterComicPanelDensity = 'sparse' | 'standard' | 'dense';
export type WriterCharacterConsistency = 'standard' | 'strict';

export type WriterProductionDefaults = {
  mediumType: WriterProductionMedium;
  narrativeScope: WriterNarrativeScope;
  comicPanelDensity: WriterComicPanelDensity;
  artStyle: string;
  characterConsistency: WriterCharacterConsistency;
  strictCanon: boolean;
  noVideoAssumptions: boolean;
  updatedAt?: string;
};

export type WriterProductionDefaultsPayload = {
  medium_type?: WriterProductionMedium;
  narrative_scope?: WriterNarrativeScope;
  comic_panel_density?: WriterComicPanelDensity;
  art_style?: string;
  character_consistency?: WriterCharacterConsistency;
  strict_canon?: boolean;
  no_video_assumptions?: boolean;
};

export const EMPTY_WRITER_PRODUCTION_DEFAULTS: WriterProductionDefaults = {
  mediumType: 'comic',
  narrativeScope: 'single_issue',
  comicPanelDensity: 'standard',
  artStyle: 'consistent comic-book line art',
  characterConsistency: 'strict',
  strictCanon: true,
  noVideoAssumptions: true,
};

const NOTES_KEY = 'production_defaults';
const MEDIUMS = new Set<WriterProductionMedium>(['comic', 'book', 'screenplay', 'video', 'wiki']);
const SCOPES = new Set<WriterNarrativeScope>([
  'single_issue',
  'multi_issue_arc',
  'book',
  'episode',
  'shared_universe',
]);
const PANEL_DENSITIES = new Set<WriterComicPanelDensity>(['sparse', 'standard', 'dense']);
const CHARACTER_CONSISTENCY = new Set<WriterCharacterConsistency>(['standard', 'strict']);

function readStringEnum<T extends string>(raw: unknown, allowed: Set<T>, fallback: T): T {
  return typeof raw === 'string' && allowed.has(raw as T) ? (raw as T) : fallback;
}

function readBoolean(raw: unknown, fallback: boolean): boolean {
  return typeof raw === 'boolean' ? raw : fallback;
}

function readString(raw: unknown, fallback: string): string {
  return typeof raw === 'string' ? raw : fallback;
}

function readRawProductionDefaults(notes: Record<string, unknown> | undefined): Record<string, unknown> {
  if (!notes || typeof notes !== 'object') return {};
  const raw = notes[NOTES_KEY];
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  return raw as Record<string, unknown>;
}

export function readProductionDefaultsFromNotes(
  notes: Record<string, unknown> | undefined,
): WriterProductionDefaults {
  const raw = readRawProductionDefaults(notes);
  return {
    mediumType: readStringEnum(raw.medium_type, MEDIUMS, EMPTY_WRITER_PRODUCTION_DEFAULTS.mediumType),
    narrativeScope: readStringEnum(raw.narrative_scope, SCOPES, EMPTY_WRITER_PRODUCTION_DEFAULTS.narrativeScope),
    comicPanelDensity: readStringEnum(
      raw.comic_panel_density,
      PANEL_DENSITIES,
      EMPTY_WRITER_PRODUCTION_DEFAULTS.comicPanelDensity,
    ),
    artStyle: readString(raw.art_style, EMPTY_WRITER_PRODUCTION_DEFAULTS.artStyle),
    characterConsistency: readStringEnum(
      raw.character_consistency,
      CHARACTER_CONSISTENCY,
      EMPTY_WRITER_PRODUCTION_DEFAULTS.characterConsistency,
    ),
    strictCanon: readBoolean(raw.strict_canon, EMPTY_WRITER_PRODUCTION_DEFAULTS.strictCanon),
    noVideoAssumptions: readBoolean(
      raw.no_video_assumptions,
      EMPTY_WRITER_PRODUCTION_DEFAULTS.noVideoAssumptions,
    ),
    updatedAt: typeof raw.updated_at === 'string' ? raw.updated_at : undefined,
  };
}

export function productionDefaultsToPayload(
  defaults: WriterProductionDefaults,
): WriterProductionDefaultsPayload {
  return {
    medium_type: defaults.mediumType,
    narrative_scope: defaults.narrativeScope,
    comic_panel_density: defaults.comicPanelDensity,
    art_style: defaults.artStyle,
    character_consistency: defaults.characterConsistency,
    strict_canon: defaults.strictCanon,
    no_video_assumptions: defaults.noVideoAssumptions,
  };
}

export function productionDefaultsToNotesJson(
  defaults: WriterProductionDefaults,
): Record<string, unknown> {
  return {
    [NOTES_KEY]: {
      ...productionDefaultsToPayload(defaults),
      updated_at: defaults.updatedAt ?? new Date().toISOString(),
    },
  };
}

export function mergeProductionDefaultsIntoNotes(
  existingNotes: Record<string, unknown>,
  defaults: WriterProductionDefaults,
): Record<string, unknown> {
  return {
    ...existingNotes,
    ...productionDefaultsToNotesJson(defaults),
  };
}

export function resolveProductionDefaults(
  seriesNotes: Record<string, unknown> | undefined,
  issueNotes: Record<string, unknown> | undefined,
): WriterProductionDefaults {
  const seriesRaw = readRawProductionDefaults(seriesNotes);
  const issueRaw = readRawProductionDefaults(issueNotes);
  return readProductionDefaultsFromNotes({
    [NOTES_KEY]: {
      ...seriesRaw,
      ...issueRaw,
    },
  });
}

export function buildProductionDefaultsPromptBlock(defaults: WriterProductionDefaults): string {
  const panelDensity =
    defaults.mediumType === 'comic'
      ? `Panel density: ${defaults.comicPanelDensity}`
      : `Panel density: ${defaults.comicPanelDensity} (only applies if generating comic pages)`;
  return [
    'Production defaults:',
    `Primary medium: ${defaults.mediumType}`,
    `Narrative scope: ${defaults.narrativeScope}`,
    panelDensity,
    `Art style: ${defaults.artStyle.trim() || EMPTY_WRITER_PRODUCTION_DEFAULTS.artStyle}`,
    `Character consistency: ${defaults.characterConsistency}`,
    `Strict canon: ${defaults.strictCanon ? 'yes' : 'no'}`,
    `No video assumptions: ${defaults.noVideoAssumptions ? 'yes' : 'no'}`,
    defaults.noVideoAssumptions && defaults.mediumType === 'comic'
      ? 'Do not translate the story into video, trailer, camera-shot, or animation language unless the active tool explicitly asks for visual planning.'
      : '',
    defaults.strictCanon
      ? 'Treat included lore, cast, locations, and author outline as hard continuity constraints.'
      : '',
  ]
    .filter(Boolean)
    .join('\n');
}
