/**
 * Reference Character Studio: compile tags + optional DNA hints for final prompt.
 */
import type { ChipTag } from '@/shared/utils/PromptCompiler';
import { PromptCompiler } from '@/shared/utils/PromptCompiler';
import {
  fuseWardrobeModifiers,
  type WardrobeModifierCategory,
} from '@/shared/utils/buildPrompt';

export interface DnaSelections {
  heritage: string[];
  gender: string[];
}

/**
 * When heritage or gender is unselected, append a neutral hint so the model
 * follows references and explicit user text only—no demographic invention.
 */
export function applyDnaWeights(
  basePrompt: string,
  heritageSelection: string[],
  genderSelection: string[]
): string {
  const parts: string[] = [];
  if (heritageSelection.length === 0) {
    parts.push(
      'heritage: use only explicit user tags, reference images, and written prompt—do not assume or invent unstated regional or ancestral details'
    );
  }
  if (genderSelection.length === 0) {
    parts.push(
      'gender presentation: use only explicit user selections, references, and written prompt'
    );
  }
  if (parts.length === 0) return basePrompt;
  return basePrompt
    ? `${basePrompt}, ${parts.join(', ')}`
    : parts.join(', ');
}

/** Strict rules for Official Reference generation (Master Build v4). */
const OFFICIAL_REFERENCE_RULES = [
  'head-to-toe, full body length',
  'one person, solo',
];

/**
 * Append official reference constraints to a prompt (full body, single subject).
 */
export function appendOfficialReferenceRules(prompt: string): string {
  const suffix = OFFICIAL_REFERENCE_RULES.join(', ');
  return prompt ? `${prompt}, ${suffix}` : suffix;
}

/**
 * Build final Character Studio prompt: compile chips + manual input, then apply DNA weights.
 * Optionally append official reference rules (full body, one person solo).
 * When wardrobeModifiers and wardrobeSelections are provided, fuse [Color] [Material] [Tag]
 * segments and append them to extra parts.
 */
export function buildCharacterStudioPrompt(
  tags: ChipTag[],
  manualInput: string,
  dna: DnaSelections,
  extraParts?: string[],
  options?: {
    appendOfficialRules?: boolean;
    wardrobeModifiers?: Record<
      WardrobeModifierCategory,
      { color: string; material: 'matte' | 'gloss' | 'glow' }
    >;
    wardrobeSelections?: Record<string, string[]>;
  }
): string {
  const compiled = PromptCompiler.compile(tags, manualInput);
  const modifierSegments =
    options?.wardrobeModifiers != null && options?.wardrobeSelections != null
      ? fuseWardrobeModifiers(options.wardrobeModifiers, options.wardrobeSelections)
      : [];
  const allParts = [...(extraParts ?? []), ...modifierSegments].filter(Boolean);
  const withExtra =
    allParts.length > 0
      ? [compiled, ...allParts].filter(Boolean).join(', ')
      : compiled;
  const withDna = applyDnaWeights(
    withExtra,
    dna.heritage,
    dna.gender
  );
  if (options?.appendOfficialRules) {
    return appendOfficialReferenceRules(withDna);
  }
  return withDna;
}
