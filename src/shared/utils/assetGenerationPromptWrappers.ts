/**
 * Shared strings for Asset Studio API prompts (generate / expand) so Character-style
 * wording never leaks into environment generation.
 */

import type { AspectRatioId } from '@/data/asset_studio_spec';

/**
 * Gemini image output dimensions follow the API `aspectRatio` parameter. Cinematic
 * "Wide-angle" implies horizontal framing; map it to 21:9 unless the user explicitly
 * chose square (1:1).
 */
export function getEffectiveGeminiAspectRatioForAsset(
  aspectRatio: AspectRatioId,
  cinematicAngle: string | undefined
): AspectRatioId {
  const angle = (cinematicAngle ?? '').trim().toLowerCase();
  if (angle === 'wide-angle') {
    if (aspectRatio === '1:1') return '1:1';
    return '21:9';
  }
  return aspectRatio;
}

/** Appended to tag-built prompts (not vault override). */
export const ASSET_SCENE_EMPTY_OF_FIGURES_CONSTRAINT =
  'Scene must contain no human figures and no living animals in frame. Artwork, statues, photographs, textiles, or patterns depicting people or animals are allowed only as set dressing consistent with the rest of the prompt.';

/**
 * When reference images are present, prefix the compiled prompt with style transfer
 * wording for environments (not characters).
 */
export function buildAssetPromptWithReferenceStyle(
  compiledPrompt: string,
  artStyleLabel: string
): string {
  return `Render the environment, architecture, and surfaces in ${artStyleLabel} style. Apply the style consistently across materials, lighting, and spatial read. ${compiledPrompt}`;
}
