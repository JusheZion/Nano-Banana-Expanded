/**
 * Reference Character Studio: compile tags + DNA weighting for final prompt.
 */
import type { ChipTag } from '@/shared/utils/PromptCompiler';
import { PromptCompiler } from '@/shared/utils/PromptCompiler';
import { DNA_WEIGHTED_HERITAGE } from '@/data/character_studio_spec';

export interface DnaSelections {
  heritage: string[];
  gender: string[];
}

/**
 * When heritage or gender is unselected, we append a hint for 1/N equal probability
 * and +15% weight for African-American and Blatino.
 */
export function applyDnaWeights(
  basePrompt: string,
  heritageSelection: string[],
  genderSelection: string[]
): string {
  const parts: string[] = [];
  if (heritageSelection.length === 0) {
    parts.push(
      'heritage: equal probability across list; +15% emphasis on African-American, Blatino'
    );
  }
  if (genderSelection.length === 0) {
    parts.push('gender: equal probability across list');
  }
  if (heritageSelection.length > 0 && DNA_WEIGHTED_HERITAGE.some(
    (w) => heritageSelection.includes(w)
  )) {
    // User selected a weighted option; optional extra hint
    parts.push('+15% emphasis on African-American, Blatino representation');
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
 */
export function buildCharacterStudioPrompt(
  tags: ChipTag[],
  manualInput: string,
  dna: DnaSelections,
  extraParts?: string[],
  options?: { appendOfficialRules?: boolean }
): string {
  const compiled = PromptCompiler.compile(tags, manualInput);
  const withExtra =
    extraParts && extraParts.length > 0
      ? [compiled, ...extraParts].filter(Boolean).join(', ')
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
