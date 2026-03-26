/**
 * Reference image slot categories and ranges for ARCS (14 slots total).
 * Character: Physicality 0–3, Hairstyle 4–6, Clothing 7–10, Aesthetic 11–13.
 * Asset: Site & exterior 0–3, Interior & spatial 4–6, Materials & finishes 7–10, Light & atmosphere 11–13.
 */
export const REFERENCE_SLOT_CATEGORIES = [
  { name: 'Physicality', start: 0, end: 3 }, // 4 slots
  { name: 'Hairstyle', start: 4, end: 6 }, // 3 slots
  { name: 'Clothing', start: 7, end: 10 }, // 4 slots
  { name: 'Aesthetic', start: 11, end: 13 }, // 3 slots
] as const;

/** Asset Reference Studio — setting/location reference groups (same 14 indices). */
export const REFERENCE_SLOT_CATEGORIES_ASSET = [
  { name: 'Site & exterior', start: 0, end: 3 }, // 4 slots
  { name: 'Interior & spatial', start: 4, end: 6 }, // 3 slots
  { name: 'Materials & finishes', start: 7, end: 10 }, // 4 slots
  { name: 'Light & atmosphere', start: 11, end: 13 }, // 3 slots
] as const;

export const REFERENCE_SLOT_COUNT = 14;

export type ReferenceSlotContext = 'character' | 'asset';

/**
 * DNA grouping for Character Studio UI and API role labeling:
 * Slots 1–4 (0–3): Character DNA (Identity/Face)
 * Slots 5–10 (4–9): Wardrobe DNA (Clothing/Accessories)
 * Slots 11–14 (10–13): Atmospheric DNA (Lighting/Vibe)
 */
export const REFERENCE_SLOT_DNA_GROUPS = [
  { id: 'identity', label: 'Character DNA', subtitle: 'Identity/Face', start: 0, end: 3 },
  { id: 'style', label: 'Wardrobe DNA', subtitle: 'Clothing/Accessories', start: 4, end: 9 },
  { id: 'composition', label: 'Background/Setting', subtitle: 'Lighting/Vibe', start: 10, end: 13 },
] as const;

/** Asset Studio reference panel — environment-focused groups (indices match slot ranges). */
export const REFERENCE_SLOT_GROUPS_ASSET = [
  {
    id: 'siteExterior',
    label: 'Site & exterior',
    subtitle: 'Shell, landscape, approach',
    start: 0,
    end: 3,
  },
  {
    id: 'interiorSpatial',
    label: 'Interior & spatial',
    subtitle: 'Rooms, layout, circulation',
    start: 4,
    end: 6,
  },
  {
    id: 'materialsFinishes',
    label: 'Materials & finishes',
    subtitle: 'Surfaces, fixtures, props',
    start: 7,
    end: 10,
  },
  {
    id: 'lightAtmosphere',
    label: 'Light & atmosphere',
    subtitle: 'Time, weather, mood',
    start: 11,
    end: 13,
  },
] as const;

export type ReferenceSlotRole = 'identity' | 'style' | 'composition';

/** API grouping for asset reference images (four bands). */
export type AssetReferenceSlotRole =
  | 'siteExterior'
  | 'interiorSpatial'
  | 'materialsFinishes'
  | 'lightAtmosphere';

export function getAssetSlotRole(index: number): AssetReferenceSlotRole {
  if (index >= 0 && index <= 3) return 'siteExterior';
  if (index >= 4 && index <= 6) return 'interiorSpatial';
  if (index >= 7 && index <= 10) return 'materialsFinishes';
  if (index >= 11 && index <= 13) return 'lightAtmosphere';
  return 'siteExterior';
}

/**
 * Returns the API role for the given slot index (0–13).
 * Character: identity | style | composition. Asset: four environment bands.
 */
export function getSlotRole(index: number, context?: 'character'): ReferenceSlotRole;
export function getSlotRole(index: number, context: 'asset'): AssetReferenceSlotRole;
export function getSlotRole(
  index: number,
  context: ReferenceSlotContext = 'character'
): ReferenceSlotRole | AssetReferenceSlotRole {
  if (context === 'asset') return getAssetSlotRole(index);
  if (index >= 0 && index <= 3) return 'identity';
  if (index >= 4 && index <= 9) return 'style';
  if (index >= 10 && index <= 13) return 'composition';
  return 'identity';
}

/**
 * Returns the DNA / environment group label for the given slot index.
 */
export function getSlotDnaGroupLabel(index: number, context: ReferenceSlotContext = 'character'): string {
  if (context === 'asset') {
    const group = REFERENCE_SLOT_GROUPS_ASSET.find((g) => index >= g.start && index <= g.end);
    return group ? group.label : 'Reference';
  }
  const group = REFERENCE_SLOT_DNA_GROUPS.find((g) => index >= g.start && index <= g.end);
  return group ? group.label : 'Reference';
}

/**
 * Returns a human-readable label for the given slot index (0–13).
 */
export function getSlotLabel(index: number, context?: 'character'): string;
export function getSlotLabel(index: number, context: 'asset'): string;
export function getSlotLabel(index: number, context: ReferenceSlotContext = 'character'): string {
  if (index < 0 || index >= REFERENCE_SLOT_COUNT) {
    return `Slot ${index}`;
  }
  const categories =
    context === 'asset' ? REFERENCE_SLOT_CATEGORIES_ASSET : REFERENCE_SLOT_CATEGORIES;
  const cat = categories.find((c) => index >= c.start && index <= c.end);
  if (!cat) return `Slot ${index}`;
  const oneBased = index - cat.start + 1;
  return `${cat.name} ${oneBased}`;
}
