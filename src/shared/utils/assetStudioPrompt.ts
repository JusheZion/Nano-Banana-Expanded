/**
 * Asset Reference Studio: compile tags + optional spatial/time modifiers for final prompt.
 */
import type { ChipTag } from '@/shared/utils/PromptCompiler';
import { PromptCompiler } from '@/shared/utils/PromptCompiler';
import {
  fuseAssetModifiers,
  type AssetModifierCategory,
} from '@/shared/utils/buildPrompt';

/**
 * Build final Asset Studio prompt: compile chips + manual input + extra parts.
 * When assetModifiers and setDressingSelections are provided, fuse [Color] [Material] [Tag]
 * segments and append them to extra parts.
 * When reference image is uploaded and diversifyStyle is false, caller may prefix
 * "absolute architectural reference, composition and style from image".
 * When diversifyStyle is true, "composition/layout from reference image, era and materials from tags".
 */
export function buildAssetStudioPrompt(
  tags: ChipTag[],
  manualInput: string,
  extraParts?: string[],
  options?: {
    assetModifiers?: Record<
      AssetModifierCategory,
      { color: string; material: 'matte' | 'gloss' | 'glow' }
    >;
    setDressingSelections?: Record<string, string[]>;
  }
): string {
  const compiled = PromptCompiler.compile(tags, manualInput);
  const modifierSegments =
    options?.assetModifiers != null && options?.setDressingSelections != null
      ? fuseAssetModifiers(options.assetModifiers, options.setDressingSelections)
      : [];
  const allParts = [...(extraParts ?? []), ...modifierSegments].filter(Boolean);
  if (allParts.length > 0) {
    return [compiled, ...allParts].filter(Boolean).join(', ');
  }
  return compiled;
}
