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

/**
 * Character slot ranges: identity (0–3), style (4–9), composition (10–13).
 * Asset slot ranges: site/exterior (0–3), interior (4–6), materials (7–10), light (11–13).
 */
const IDENTITY_SLOTS = { start: 0, end: 3 };
const STYLE_SLOTS = { start: 4, end: 9 };
const COMPOSITION_SLOTS = { start: 10, end: 13 };

const ASSET_SITE_SLOTS = { start: 0, end: 3 };
const ASSET_INTERIOR_SLOTS = { start: 4, end: 6 };
const ASSET_MATERIALS_SLOTS = { start: 7, end: 10 };
const ASSET_LIGHT_SLOTS = { start: 11, end: 13 };

function hasSlotInRange(
  referenceImageUrls: string[],
  range: { start: number; end: number }
): boolean {
  for (let i = range.start; i <= range.end && i < referenceImageUrls.length; i++) {
    if (referenceImageUrls[i]) return true;
  }
  return false;
}

export type SurgicalReferenceContext = 'character' | 'asset';

/**
 * Returns "Surgical Instructions" to append to the prompt based on which reference
 * slot groups are used. Call this when building the final API prompt.
 */
export function getSurgicalInstructionsFromReferenceSlots(
  referenceImageUrls: string[],
  context: SurgicalReferenceContext = 'character'
): string[] {
  if (context === 'asset') {
    return getAssetSurgicalInstructions(referenceImageUrls);
  }
  const instructions: string[] = [];
  if (hasSlotInRange(referenceImageUrls, IDENTITY_SLOTS)) {
    instructions.push(
      'Preserve face, body, skin tone, hair, and tattoos from Character DNA (identity) references—the same person.'
    );
  }
  if (hasSlotInRange(referenceImageUrls, STYLE_SLOTS)) {
    instructions.push(
      'Wardrobe DNA references: copy the full real-world outfit (shirt, pants, shoes, hat, bag, jewelry) onto that person. Same colors and pieces as in the refs—not an alternate fantasy or “inspired by” look unless the written prompt says otherwise.'
    );
  }
  if (hasSlotInRange(referenceImageUrls, COMPOSITION_SLOTS)) {
    instructions.push(
      'Match the lighting and atmospheric mood from the composition references.'
    );
  }
  return instructions;
}

function getAssetSurgicalInstructions(referenceImageUrls: string[]): string[] {
  const instructions: string[] = [];
  const hasSite = hasSlotInRange(referenceImageUrls, ASSET_SITE_SLOTS);
  const hasInterior = hasSlotInRange(referenceImageUrls, ASSET_INTERIOR_SLOTS);
  const hasMaterials = hasSlotInRange(referenceImageUrls, ASSET_MATERIALS_SLOTS);
  const hasLight = hasSlotInRange(referenceImageUrls, ASSET_LIGHT_SLOTS);

  if (hasSite && hasInterior) {
    instructions.push(
      'Site/exterior and interior references are both present: interior spaces, circulation, and décor must read as plausibly inside the same building or site as the exterior—consistent era, palette, and architectural language.'
    );
  } else if (hasSite || hasInterior) {
    instructions.push(
      'Keep materials, décor, and architectural style aligned with the spatial references and with the written tags.'
    );
  }
  if (hasMaterials && (hasSite || hasInterior)) {
    instructions.push(
      'Materials and finishes references must agree with the shell/interior spatial references—same palette and fixture language unless the prompt contradicts.'
    );
  } else if (hasMaterials && !hasSite && !hasInterior) {
    instructions.push(
      'Use materials and finishes references to lock surfaces and props; keep décor coherent with the text prompt.'
    );
  }
  if (hasLight && !hasSite && !hasInterior && !hasMaterials) {
    instructions.push(
      'Light and atmosphere references set mood and time of day only—do not invent unrelated architecture unless the written prompt asks for it.'
    );
  } else if (hasLight) {
    instructions.push(
      'Match lighting and atmospheric mood from the light/atmosphere references with the rest of the scene.'
    );
  }
  return instructions;
}
