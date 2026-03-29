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
  /** Gallery / session framing: slider in Reference Gallery (0 = neutral). */
  ageModifier?: number;
  /** Optional pose card title from the gallery — nudges pose intent in text only. */
  selectedPoseName?: string | null;
  /** True when a gallery pose with an image is selected (even if unnamed) — adds session framing. */
  selectedGalleryPoseActive?: boolean;
  /** Must match the aspect ratio sent to the image API so the text and canvas agree. */
  outputAspectRatio?: '9:16' | '1:1' | '21:9';
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
    ageModifier = 0,
    selectedPoseName = null,
    selectedGalleryPoseActive = false,
    outputAspectRatio = '9:16',
  } = args;

  const artStyleLabel = artStyleId === 'flagship' ? ART_STYLE_FLAGSHIP : artStyleId;
  const liveTrim = currentLiveImageUrl?.trim() ?? '';
  const hasReferenceImage = Boolean(liveTrim);
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

  const compiledPromptBase = vaultPromptOverride.trim()
    ? vaultPromptOverride.trim()
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
  /** Merge live preview when it is not already in the 14 slots (selected gallery pose, last gen, etc.). */
  let workingRefs = Array.from({ length: 14 }, (_, i) => referenceImageUrls[i] ?? '');
  if (liveTrim && !workingRefs.some((u) => u === liveTrim)) {
    const emptyIdx = workingRefs.findIndex((u) => !u);
    if (emptyIdx >= 0) {
      workingRefs[emptyIdx] = liveTrim;
    } else {
      workingRefs[0] = liveTrim;
    }
  }

  const refUrlsForApi = workingRefs;
  const hasApiRefs = refUrlsForApi.some(Boolean);
  const hasWardrobeDna = [4, 5, 6, 7, 8, 9].some((idx) => Boolean(refUrlsForApi[idx]));

  const basePrompt =
    hasApiRefs
      ? hasWardrobeDna
        ? `Art style ${artStyleLabel}: use it for lighting, palette, and illustration treatment. The person comes from Character DNA refs; their clothing, shoes, hat, bag, and accessories must match Wardrobe DNA reference images literally (same real-world garments), not a fantasy or “inspired” outfit. ${compiledPrompt}`
        : `Apply this art style to the entire image, including the subject (face, skin, hair, body). Do not keep the subject photorealistic—reinterpret the reference in the chosen style so the subject looks like a ${artStyleLabel}, not a photograph. Art style: ${artStyleLabel}. ${compiledPrompt}`
      : compiledPrompt;

  const surgical = getSurgicalInstructionsFromReferenceSlots(refUrlsForApi);

  let promptForApi =
    surgical.length > 0 ? `${basePrompt}\n\n${surgical.join(' ')}` : basePrompt;

  const sessionFraming: string[] = [];
  if (ageModifier !== 0) {
    sessionFraming.push(
      `Age direction: shift apparent age by ${ageModifier > 0 ? '+' : ''}${ageModifier} (gallery Age slider 0–100; 0 = neutral); keep face and identity consistent with reference images.`
    );
  } else {
    sessionFraming.push(`Age modifier: gallery slider at 0 (neutral — no deliberate age shift).`);
  }
  const aspectLabel =
    outputAspectRatio === '9:16'
      ? 'portrait 9:16'
      : outputAspectRatio === '1:1'
        ? 'square 1:1'
        : 'cinematic 21:9';
  sessionFraming.push(`Frame the shot for ${aspectLabel} composition.`);
  const poseTrim = selectedPoseName?.trim();
  if (poseTrim) {
    sessionFraming.push(
      `Active gallery pose label: "${poseTrim}" — use as pose or attitude guidance unless references contradict.`
    );
  } else if (selectedGalleryPoseActive) {
    sessionFraming.push(
      `Active gallery pose (unnamed): the live preview image is included in the reference set — match its pose, silhouette, and staging unless DNA/refs contradict.`
    );
  }
  if (sessionFraming.length > 0) {
    promptForApi = `${promptForApi}\n\nSession framing: ${sessionFraming.join(' ')}`;
  }

  return { promptForApi, refUrlsForApi: refUrlsForApi };
}

