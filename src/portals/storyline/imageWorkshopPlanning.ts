import type { VaultAssetAlbum } from '@/shared/api/arcsAssetVault';
import type { VaultCharacterAlbum } from '@/shared/api/arcsVault';
import type { WriterLoreCardRow } from '@/shared/api/arcsWriterRoom';
import type { PageBeatsJson } from '@/shared/writer/types';

export type ImageWorkshopEntityKind = 'character' | 'asset' | 'location' | 'reference';
export type ImageWorkshopRecurrence = 'recurring' | 'one_off';
export type ImageWorkshopAction =
  | 'match_existing'
  | 'quick_ref'
  | 'open_character_studio'
  | 'open_asset_studio';
export type ImageWorkshopGroup = 'matched' | 'quick_ref' | 'needs_studio';

export interface ImageWorkshopSourceContext {
  sourceLabel: string;
  issueTitle?: string;
  issueSynopsis?: string;
  pageNumber?: number | null;
  pageId?: string | null;
  issueId?: string | null;
  seriesId?: string | null;
  shotPlanId?: string | null;
}

export interface ImageWorkshopPrepItem {
  id: string;
  label: string;
  entityKind: ImageWorkshopEntityKind;
  recurrence: ImageWorkshopRecurrence;
  group: ImageWorkshopGroup;
  recommendedAction: ImageWorkshopAction;
  reason: string;
  sourceText: string;
  saveTarget: 'character' | 'asset' | 'supporting_reference';
  matchedCharacterId?: string;
  matchedAssetId?: string;
  matchedCharacterAlbum?: VaultCharacterAlbum;
  matchedAssetAlbum?: VaultAssetAlbum;
}

export interface ImageWorkshopDraft {
  source: ImageWorkshopSourceContext;
  moodboardPrompts: string[];
  items: ImageWorkshopPrepItem[];
}

interface BuildDraftOptions {
  source: ImageWorkshopSourceContext;
  pageBeats?: PageBeatsJson | null;
  scriptText?: string | null;
  loreCards: Array<
    Pick<WriterLoreCardRow, 'id' | 'title' | 'category' | 'body' | 'include_in_prompt'>
  >;
  characterAlbums: VaultCharacterAlbum[];
  assetAlbums: VaultAssetAlbum[];
}

function normalize(value: string | null | undefined): string {
  return (value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ');
}

function includesNormalized(haystack: string, needle: string): boolean {
  const h = normalize(haystack);
  const n = normalize(needle);
  return Boolean(n) && h.includes(n);
}

function mapLoreCategoryToEntityKind(category: string): ImageWorkshopEntityKind {
  const norm = normalize(category);
  if (/(character|cast|hero|villain|npc|person|creature)/.test(norm)) return 'character';
  if (/(vehicle|prop|weapon|artifact|device|costume|asset)/.test(norm)) return 'asset';
  if (/(location|place|setting|environment|room|city|world)/.test(norm)) return 'location';
  return 'reference';
}

function mapRecurrence(card: Pick<WriterLoreCardRow, 'category' | 'include_in_prompt'>): ImageWorkshopRecurrence {
  const norm = normalize(card.category);
  if (!card.include_in_prompt && /(cameo|one off|oneoff|background|extra|npc)/.test(norm)) {
    return 'one_off';
  }
  return card.include_in_prompt ? 'recurring' : 'one_off';
}

function findCharacterAlbumMatch(
  label: string,
  albums: VaultCharacterAlbum[],
): VaultCharacterAlbum | undefined {
  const target = normalize(label);
  return albums.find((album) => {
    if (normalize(album.profileName) === target) return true;
    return album.items.some(
      (item) => normalize(item.cast_name) === target || normalize(item.name) === target,
    );
  });
}

function findAssetAlbumMatch(label: string, albums: VaultAssetAlbum[]): VaultAssetAlbum | undefined {
  const target = normalize(label);
  return albums.find((album) => {
    if (normalize(album.collectionName) === target) return true;
    return album.items.some(
      (item) => normalize(item.asset_name) === target || normalize(item.name) === target,
    );
  });
}

function chooseAction(args: {
  entityKind: ImageWorkshopEntityKind;
  recurrence: ImageWorkshopRecurrence;
  hasMatch: boolean;
}): ImageWorkshopAction {
  if (args.hasMatch) return 'match_existing';
  if (args.recurrence === 'one_off' || args.entityKind === 'reference') return 'quick_ref';
  if (args.entityKind === 'character') return 'open_character_studio';
  return 'open_asset_studio';
}

function groupForAction(action: ImageWorkshopAction): ImageWorkshopGroup {
  if (action === 'match_existing') return 'matched';
  if (action === 'quick_ref') return 'quick_ref';
  return 'needs_studio';
}

function saveTargetForItem(
  entityKind: ImageWorkshopEntityKind,
  action: ImageWorkshopAction,
): 'character' | 'asset' | 'supporting_reference' {
  if (action === 'quick_ref') return 'supporting_reference';
  return entityKind === 'character' ? 'character' : 'asset';
}

function collectMoodboardPrompts(
  source: ImageWorkshopSourceContext,
  pageBeats?: PageBeatsJson | null,
  scriptText?: string | null,
): string[] {
  const prompts = [
    source.issueSynopsis ?? '',
    pageBeats?.one_line_hook ?? '',
    ...(pageBeats?.panels ?? []).flatMap((panel) => [panel.action ?? '', panel.composition ?? '']),
    scriptText ?? '',
  ]
    .map((value) => value.trim())
    .filter(Boolean);

  return Array.from(new Set(prompts)).slice(0, 6);
}

export function buildImageWorkshopDraftFromWriterSelection(
  options: BuildDraftOptions,
): ImageWorkshopDraft {
  const contextBlob = [
    options.source.issueTitle ?? '',
    options.source.issueSynopsis ?? '',
    options.pageBeats?.one_line_hook ?? '',
    ...(options.pageBeats?.panels ?? []).flatMap((panel) => [
      panel.action ?? '',
      panel.composition ?? '',
      panel.dialogue_placeholder ?? '',
      panel.sfx ?? '',
    ]),
    options.scriptText ?? '',
  ]
    .filter(Boolean)
    .join('\n');

  const matchedLoreCards = options.loreCards.filter((card) =>
    includesNormalized(contextBlob, card.title),
  );

  const items: ImageWorkshopPrepItem[] = matchedLoreCards.map((card) => {
    const entityKind = mapLoreCategoryToEntityKind(card.category);
    const recurrence = mapRecurrence(card);
    const matchedCharacterAlbum =
      entityKind === 'character' ? findCharacterAlbumMatch(card.title, options.characterAlbums) : undefined;
    const matchedAssetAlbum =
      entityKind !== 'character' ? findAssetAlbumMatch(card.title, options.assetAlbums) : undefined;
    const action = chooseAction({
      entityKind,
      recurrence,
      hasMatch: Boolean(matchedCharacterAlbum || matchedAssetAlbum),
    });

    return {
      id: card.id,
      label: card.title,
      entityKind,
      recurrence,
      group: groupForAction(action),
      recommendedAction: action,
      reason: `${card.category || 'reference'} from Writers' Workshop context`,
      sourceText: card.body || card.title,
      saveTarget: saveTargetForItem(entityKind, action),
      matchedCharacterId: matchedCharacterAlbum?.coverId ?? matchedCharacterAlbum?.items[0]?.id,
      matchedAssetId: matchedAssetAlbum?.items[0]?.id,
      matchedCharacterAlbum,
      matchedAssetAlbum,
    };
  });

  if (items.length === 0) {
    const fallbackText =
      options.pageBeats?.one_line_hook?.trim() ||
      options.pageBeats?.panels?.[0]?.action?.trim() ||
      options.source.issueSynopsis?.trim() ||
      'Generate a general supporting location reference from the selected writer context.';
    items.push({
      id: `scene-ref-${options.source.pageId ?? options.source.issueId ?? 'context'}`,
      label: 'Scene reference',
      entityKind: 'location',
      recurrence: 'one_off',
      group: 'quick_ref',
      recommendedAction: 'quick_ref',
      reason: 'No explicit lore match was found, so Illustrator’s Imageshop should generate a quick supporting scene ref.',
      sourceText: fallbackText,
      saveTarget: 'supporting_reference',
    });
  }

  return {
    source: options.source,
    moodboardPrompts: collectMoodboardPrompts(options.source, options.pageBeats, options.scriptText),
    items,
  };
}
