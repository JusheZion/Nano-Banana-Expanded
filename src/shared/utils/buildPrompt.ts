/**
 * Fuse [Color] [Material] [Tag] into prompt segments for wardrobe and asset modifiers.
 */

export type WardrobeModifierCategory =
  | 'tops'
  | 'bottoms'
  | 'outerwear'
  | 'accessories'
  | 'hats'
  | 'glasses';

export type AssetModifierCategory =
  | 'structure'
  | 'furniture'
  | 'atmospherics';

const DEFAULT_COLOR = '#888888';
const DEFAULT_MATERIAL = 'matte';

/**
 * Return a single modifier segment: "${color}, ${material}" with optional tag.
 */
export function fuseModifierSegment(
  color: string,
  material: string,
  tag?: string
): string {
  return `${color}, ${material}${tag ? ', ' + tag : ''}`;
}

/**
 * For each wardrobe category: if there is at least one selected tag in
 * wardrobeSelections[cat] or the modifier is non-default, push one segment.
 */
export function fuseWardrobeModifiers(
  wardrobeModifiers: Record<
    WardrobeModifierCategory,
    { color: string; material: 'matte' | 'gloss' | 'glow' }
  >,
  wardrobeSelections: Record<string, string[]>
): string[] {
  const categories: WardrobeModifierCategory[] = [
    'tops',
    'bottoms',
    'outerwear',
    'accessories',
    'hats',
    'glasses',
  ];
  const segments: string[] = [];
  for (const cat of categories) {
    const mod = wardrobeModifiers[cat] ?? { color: DEFAULT_COLOR, material: DEFAULT_MATERIAL as 'matte' };
    const selected = wardrobeSelections[cat] ?? [];
    const hasSelection = selected.length > 0;
    const tagPart =
      selected.length > 0 ? selected.join(', ') : undefined;
    const nonDefault =
      mod.color !== DEFAULT_COLOR || mod.material !== DEFAULT_MATERIAL;
    if (hasSelection || nonDefault) {
      segments.push(fuseModifierSegment(mod.color, mod.material, tagPart));
    }
  }
  return segments;
}

/** Map AssetModifierCategory to setDressing keys for tag lookup. */
const ASSET_CAT_TO_DRESSING: Record<
  AssetModifierCategory,
  { tagKey: string; tagKey2?: string }
> = {
  structure: { tagKey: 'roomType' },
  furniture: { tagKey: 'furniture' },
  atmospherics: { tagKey: 'lightingFixtures', tagKey2: 'surfaceTextures' },
};

/**
 * For each asset category: if there is a selection or non-default modifier,
 * emit one segment. structure→roomType, furniture→furniture,
 * atmospherics→lightingFixtures + surfaceTextures (joined).
 */
export function fuseAssetModifiers(
  assetModifiers: Record<
    AssetModifierCategory,
    { color: string; material: 'matte' | 'gloss' | 'glow' }
  >,
  setDressingSelections: Record<string, string[]>
): string[] {
  const categories: AssetModifierCategory[] = [
    'structure',
    'furniture',
    'atmospherics',
  ];
  const segments: string[] = [];
  for (const cat of categories) {
    const mod = assetModifiers[cat];
    const { tagKey, tagKey2 } = ASSET_CAT_TO_DRESSING[cat];
    const part1 = setDressingSelections[tagKey] ?? [];
    const part2 = tagKey2
      ? (setDressingSelections[tagKey2] ?? [])
      : [];
    const selected = [...part1, ...part2];
    const hasSelection = selected.length > 0;
    const tagPart =
      selected.length > 0 ? selected.join(', ') : undefined;
    const nonDefault =
      mod.color !== DEFAULT_COLOR || mod.material !== DEFAULT_MATERIAL;
    if (hasSelection || nonDefault) {
      segments.push(fuseModifierSegment(mod.color, mod.material, tagPart));
    }
  }
  return segments;
}
