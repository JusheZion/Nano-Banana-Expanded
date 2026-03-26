import type { ChipTag } from '@/shared/utils/PromptCompiler';
import {
  getSurgicalInstructionsFromReferenceSlots,
  type WardrobeModifierCategory,
} from '@/shared/utils/buildPrompt';
import { buildCharacterStudioPrompt } from '@/shared/utils/characterStudioPrompt';
import {
  ART_STYLE_FLAGSHIP,
  ART_STYLE_PERMANENT_TAG,
} from '@/data/character_studio_spec';

export interface BuildCharacterStudioPromptForApiArgs {
  tags: ChipTag[];
  vaultUnlocked: boolean;
  vaultPromptOverride: string;
  artStyleId: string;
  diversifyLikeness: boolean;
  currentLiveImageUrl: string | null;
  heritageSelection: string[];
  genderSelection: string[];
  physicalSelections: Record<string, string[]>;
  wardrobeSelections: Record<string, string[]>;
  wardrobeModifiers: Record<
    WardrobeModifierCategory,
    { color: string; material: 'matte' | 'gloss' | 'glow' }
  >;
  cinematic: Record<string, string>;
  facialExpressionSelection: string[];
  referenceImageUrls: string[];
}

/**
 * Build the exact prompt string + 14-slot reference URL list used for
 * Character Studio image generation.
 *
 * The goal is to keep "Prompt" tabs, "Reference Prompt" tab, and Generate
 * behavior perfectly aligned.
 */
export function buildCharacterStudioPromptForApi(
  args: BuildCharacterStudioPromptForApiArgs
): { promptForApi: string; refUrlsForApi: string[] } {
  const {
    tags,
    vaultUnlocked,
    vaultPromptOverride,
    artStyleId,
    diversifyLikeness,
    currentLiveImageUrl,
    heritageSelection,
    genderSelection,
    physicalSelections,
    wardrobeSelections,
    wardrobeModifiers,
    cinematic,
    facialExpressionSelection,
    referenceImageUrls,
  } = args;

  const artStyleLabel = artStyleId === 'flagship' ? ART_STYLE_FLAGSHIP : artStyleId;
  const hasReferenceImage = Boolean(currentLiveImageUrl);
  const dnaAndPhysicalDisabled = hasReferenceImage && !diversifyLikeness;

  // ---- compiled prompt (tags + selections) ----
  const dna = {
    heritage: heritageSelection,
    gender: genderSelection,
  };

  const extraParts: string[] = [
    artStyleLabel,
    ...(dnaAndPhysicalDisabled ? [] : heritageSelection),
    ...(dnaAndPhysicalDisabled ? [] : genderSelection),
    ...(dnaAndPhysicalDisabled ? [] : Object.values(physicalSelections).flat()),
    ...Object.values(wardrobeSelections).flat(),
    ...Object.values(cinematic).filter(Boolean),
  ].filter(Boolean);

  const compiledPromptBase =
    vaultUnlocked && vaultPromptOverride.trim()
      ? vaultPromptOverride
      : buildCharacterStudioPrompt(tags, '', dna, extraParts, {
          appendOfficialRules: true,
          wardrobeModifiers,
          wardrobeSelections,
        });

  const compiledPrompt =
    [compiledPromptBase, ART_STYLE_PERMANENT_TAG, ...facialExpressionSelection]
      .filter(Boolean)
      .join(', ');

  // ---- reference slots -> API 14-slot + prompt base rules ----
  const rawRefs = referenceImageUrls;
  const hasAnyRefSlot = rawRefs.some((u) => Boolean(u));

  const refUrls = hasAnyRefSlot
    ? Array.from({ length: 14 }, (_, i) => rawRefs[i] ?? '')
    : currentLiveImageUrl
      ? [currentLiveImageUrl]
      : [];

  const refUrlsForApi = Array.from(
    { length: 14 },
    (_, i) => refUrls[i] ?? ''
  );

  const hasApiRefs = refUrlsForApi.some(Boolean);
  const hasWardrobeDna = [4, 5, 6, 7, 8, 9].some((idx) => Boolean(refUrlsForApi[idx]));

  const basePrompt =
    hasApiRefs
      ? hasWardrobeDna
        ? `Art style ${artStyleLabel}: use it for lighting, palette, and illustration treatment. The person comes from Character DNA refs; their clothing, shoes, hat, bag, and accessories must match Wardrobe DNA reference images literally (same real-world garments), not a fantasy or “inspired” outfit. ${compiledPrompt}`
        : `Apply this art style to the entire image, including the subject (face, skin, hair, body). Do not keep the subject photorealistic—reinterpret the reference in the chosen style so the subject looks like a ${artStyleLabel}, not a photograph. Art style: ${artStyleLabel}. ${compiledPrompt}`
      : compiledPrompt;

  const paddedRefsForSurgical = Array.from(
    { length: 14 },
    (_, i) => rawRefs[i] ?? ''
  );

  const surgical = getSurgicalInstructionsFromReferenceSlots(
    hasAnyRefSlot ? paddedRefsForSurgical : refUrlsForApi
  );

  const promptForApi =
    surgical.length > 0 ? `${basePrompt}\n\n${surgical.join(' ')}` : basePrompt;

  return { promptForApi, refUrlsForApi: refUrlsForApi };
}

