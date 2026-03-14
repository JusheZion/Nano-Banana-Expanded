/**
 * Asset Reference Studio: compile tags + optional spatial/time modifiers for final prompt.
 */
import type { ChipTag } from '@/shared/utils/PromptCompiler';
import { PromptCompiler } from '@/shared/utils/PromptCompiler';

/**
 * Build final Asset Studio prompt: compile chips + manual input + extra parts.
 * When reference image is uploaded and diversifyStyle is false, caller may prefix
 * "absolute architectural reference, composition and style from image".
 * When diversifyStyle is true, "composition/layout from reference image, era and materials from tags".
 */
export function buildAssetStudioPrompt(
  tags: ChipTag[],
  manualInput: string,
  extraParts?: string[]
): string {
  const compiled = PromptCompiler.compile(tags, manualInput);
  if (extraParts && extraParts.length > 0) {
    return [compiled, ...extraParts].filter(Boolean).join(', ');
  }
  return compiled;
}
