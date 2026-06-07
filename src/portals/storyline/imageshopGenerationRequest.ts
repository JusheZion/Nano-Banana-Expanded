import type { OnyxModelId } from '@/shared/api/geminiImageApi';
import type { GuidedImageWorkshopReference } from '@/stores/imageWorkshopBridge';
import type { StoryBeatAspectRatio } from '@/portals/storyline/storylineTypes';
import type { ImageshopReferenceLane } from '@/portals/storyline/imageshopPagePanelQueue';
import {
  composeImageshopPrompt,
  type ImageshopArtStyle,
  type ImageshopContinuitySettings,
  type ImageshopGenerationMode,
  type ImageshopPageConfig,
  type ImageshopPromptWorkspace,
} from '@/portals/storyline/imageshopPromptComposer';
import {
  evaluateImageshopPromptPreflight,
  type ImageshopPromptPreflight,
} from '@/portals/storyline/imageshopPromptPreflight';
import {
  compileImageshopProviderReferences,
  type ImageshopCompiledProviderReference,
} from '@/portals/storyline/imageshopReferencePreparation';

export type ImageshopGenerationRequestReference = {
  id: string;
  label: string;
  lane: ImageshopReferenceLane;
  imageUrl: string;
  status?: 'unknown' | 'ready' | 'failed';
  sourceType?: GuidedImageWorkshopReference['sourceType'];
  sourceLabel?: string;
};

export type ImageshopGenerationRequestSource =
  | {
      kind: 'standalone';
    }
  | {
      kind: 'panel';
      queueItemId: string;
      pageNumber: number;
      panelNumber: number;
    };

export type ImageshopGenerationRequest = Readonly<{
  prompt: string;
  promptHash: string;
  modelId: OnyxModelId;
  aspectRatio: StoryBeatAspectRatio;
  context: 'character' | 'asset';
  workspace: Readonly<ImageshopPromptWorkspace>;
  references: readonly Readonly<ImageshopGenerationRequestReference>[];
  source: Readonly<ImageshopGenerationRequestSource>;
  provider: Readonly<{
    prompt: string;
    referenceImageUrls: readonly string[];
    references: readonly ImageshopCompiledProviderReference[];
  }>;
  provenance: Readonly<{
    prompt: string;
    promptSections: Readonly<ImageshopPromptWorkspace>;
  }>;
  preflight: Readonly<{
    canonConflictCount: number;
    missingReferenceCount: number;
  }>;
  recipe: Readonly<{
    mode: ImageshopGenerationMode;
    artStyle: ImageshopArtStyle | null;
    continuity: Readonly<ImageshopContinuitySettings>;
    pageConfig: Readonly<ImageshopPageConfig>;
  }>;
}>;

export function hashImageshopGenerationPrompt(prompt: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < prompt.length; index += 1) {
    hash ^= prompt.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return `fnv1a-${(hash >>> 0).toString(16).padStart(8, '0')}`;
}

export function compileImageshopGenerationRequest({
  mode,
  workspace,
  artStyle,
  continuity,
  pageConfig,
  references,
  modelId,
  aspectRatio,
  context,
  source,
  canonConflictCount = 0,
  missingReferenceCount = 0,
}: {
  mode: ImageshopGenerationMode;
  workspace: ImageshopPromptWorkspace;
  artStyle: ImageshopArtStyle | null;
  continuity: ImageshopContinuitySettings;
  pageConfig: ImageshopPageConfig;
  references: ImageshopGenerationRequestReference[];
  modelId: OnyxModelId;
  aspectRatio: StoryBeatAspectRatio;
  context: 'character' | 'asset';
  source: ImageshopGenerationRequestSource;
  canonConflictCount?: number;
  missingReferenceCount?: number;
}): ImageshopGenerationRequest {
  const frozenWorkspace = Object.freeze({ ...workspace });
  const frozenReferences = Object.freeze(
    references.map((reference) => Object.freeze({ ...reference })),
  );
  const compiledProviderReferences = compileImageshopProviderReferences(frozenReferences, {
    enforceMaximum: false,
  });
  const prompt = composeImageshopPrompt({
    mode,
    workspace: frozenWorkspace,
    artStyle,
    continuity,
    references: frozenReferences.map((reference) => ({
      name: reference.id,
      referenceId: reference.id,
      displayName: reference.label,
      imageUrl: reference.imageUrl,
      sourceType: reference.sourceType,
      sourceLabel: reference.sourceLabel,
    })),
    pageConfig,
  });
  const promptHash = hashImageshopGenerationPrompt(prompt);

  return Object.freeze({
    prompt,
    promptHash,
    modelId,
    aspectRatio,
    context,
    workspace: frozenWorkspace,
    references: frozenReferences,
    source: Object.freeze({ ...source }),
    provider: Object.freeze({
      prompt,
      referenceImageUrls: Object.freeze(
        compiledProviderReferences.map((reference) => reference.imageUrl.trim()).filter(Boolean),
      ),
      references: compiledProviderReferences,
    }),
    provenance: Object.freeze({
      prompt,
      promptSections: frozenWorkspace,
    }),
    preflight: Object.freeze({
      canonConflictCount,
      missingReferenceCount,
    }),
    recipe: Object.freeze({
      mode,
      artStyle: artStyle ? Object.freeze({ ...artStyle }) : null,
      continuity: Object.freeze({ ...continuity }),
      pageConfig: Object.freeze({
        ...pageConfig,
        panelStyle: Object.freeze({ ...pageConfig.panelStyle }),
      }),
    }),
  });
}

export function filterImageshopGenerationRequestReferences(
  request: ImageshopGenerationRequest,
  includedReferenceIds: readonly string[],
): ImageshopGenerationRequest {
  const included = new Set(includedReferenceIds);
  return compileImageshopGenerationRequest({
    mode: request.recipe.mode,
    workspace: request.workspace as ImageshopPromptWorkspace,
    artStyle: request.recipe.artStyle,
    continuity: request.recipe.continuity as ImageshopContinuitySettings,
    pageConfig: request.recipe.pageConfig as ImageshopPageConfig,
    references: request.references
      .filter((reference) => included.has(reference.id))
      .map((reference) => ({ ...reference })),
    modelId: request.modelId,
    aspectRatio: request.aspectRatio,
    context: request.context,
    source: request.source,
    canonConflictCount: request.preflight.canonConflictCount,
    missingReferenceCount: request.preflight.missingReferenceCount,
  });
}

export function evaluateImageshopGenerationRequest(
  request: ImageshopGenerationRequest,
): ImageshopPromptPreflight {
  return evaluateImageshopPromptPreflight({
    composedPrompt: request.prompt,
    workspace: request.workspace as ImageshopPromptWorkspace,
    references: request.references.map((reference) => ({
      label: reference.label,
      imageUrl: reference.imageUrl,
      signedUrlStatus: reference.status,
    })),
    canonConflictCount: request.preflight.canonConflictCount,
    missingReferenceCount: request.preflight.missingReferenceCount,
  });
}
