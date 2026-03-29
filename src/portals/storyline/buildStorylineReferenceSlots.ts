import { REFERENCE_SLOT_COUNT } from '@/shared/constants/referenceSlots';
import type { ProductionAssetMember, ProductionCastMember } from '@/portals/storyline/storylineTypes';

/**
 * Pack linked cast + linked asset URLs into 14 reference slots.
 * Cast is ordered first for character consistency, then assets for environment/props.
 */
export function buildStorylineReferenceSlots(
  cast: ProductionCastMember[],
  assets: ProductionAssetMember[] = []
): string[] {
  // Gemini image API role labeling when `context: 'character'`:
  // - slots 0-3: identity
  // - slots 4-9: style/clothing
  // - slots 10-13: composition/background-setting
  // For Storyline beat generation, we treat:
  // - cast images as identity/style (slots 0-9)
  // - asset images as composition/background (slots 10-13)
  const out = Array.from({ length: REFERENCE_SLOT_COUNT }, () => '');
  const castUrls = cast.map((c) => c.imageUrl).filter(Boolean);
  const assetUrls = assets.map((a) => a.imageUrl).filter(Boolean);

  // Fill identity+style slots first.
  const identityStyleSlotCount = 10; // indices 0..9
  for (let i = 0; i < Math.min(castUrls.length, identityStyleSlotCount); i++) {
    out[i] = castUrls[i]!;
  }

  // Fill composition/background slots with assets first.
  const compositionSlotCount = 4; // indices 10..13
  const compositionStart = 10;
  for (let j = 0; j < Math.min(assetUrls.length, compositionSlotCount); j++) {
    out[compositionStart + j] = assetUrls[j]!;
  }

  // If composition slots are still empty, fill them with remaining cast.
  for (let k = 0; k < compositionSlotCount; k++) {
    const idx = compositionStart + k;
    if (out[idx]) continue;
    const castIdx = identityStyleSlotCount + k;
    if (castIdx < castUrls.length) out[idx] = castUrls[castIdx]!;
  }

  return out;
}
