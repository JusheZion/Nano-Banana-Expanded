/**
 * Serializable story bundle for Asset Vault (metadata_tags.story_sequence_v1).
 */
import type {
  DirectorSettings,
  ProductionAssetMember,
  ProductionCastMember,
  StoryBeat,
} from '@/portals/storyline/storylineTypes';

export const STORY_SEQUENCE_V1_KEY = 'story_sequence_v1' as const;
export const STORYLINE_ASSET_SOURCE = 'arcs_storyline_studio' as const;

export interface StoryBeatVaultV1 {
  id: string;
  kind: StoryBeat['kind'];
  text: string;
  durationSec: number;
  visualPrompt: string;
  camera: StoryBeat['camera'];
  tone: string;
  audio: StoryBeat['audio'];
  linkedVaultCharacterIds: string[];
  linkedVaultAssetIds: string[];
  tags: string[];
  /** Only stable URLs persisted in JSON */
  imageUrl?: string;
  interpolation: StoryBeat['interpolation'];
  seed: number | null;
  aspectRatio: StoryBeat['aspectRatio'];
}

export interface StorySequenceV1Payload {
  version: 1;
  title: string;
  rawStoryline: string;
  cleanedStoryline: string;
  beatIntervalSec: number;
  directorSettings: DirectorSettings;
  productionCast: ProductionCastMember[];
  productionAssets: ProductionAssetMember[];
  beats: StoryBeatVaultV1[];
  exportedAt: string;
}

export function compactBeatForVault(b: StoryBeat): StoryBeatVaultV1 {
  const url = b.imageUrl?.trim();
  const stableImage =
    url && (url.startsWith('http://') || url.startsWith('https://')) ? url : undefined;
  return {
    id: b.id,
    kind: b.kind,
    text: b.text,
    durationSec: b.durationSec,
    visualPrompt: b.visualPrompt,
    camera: b.camera,
    tone: b.tone,
    audio: b.audio,
    linkedVaultCharacterIds: b.linkedVaultCharacterIds,
    linkedVaultAssetIds: b.linkedVaultAssetIds,
    tags: b.tags,
    imageUrl: stableImage,
    interpolation: b.interpolation,
    seed: b.seed,
    aspectRatio: b.aspectRatio,
  };
}

export function buildStorySequenceV1Payload(args: {
  storyTitle: string;
  rawStoryline: string;
  cleanedStoryline: string;
  beatIntervalSec: number;
  directorSettings: DirectorSettings;
  productionCast: ProductionCastMember[];
  productionAssets: ProductionAssetMember[];
  beats: StoryBeat[];
}): StorySequenceV1Payload {
  return {
    version: 1,
    title: args.storyTitle,
    rawStoryline: args.rawStoryline,
    cleanedStoryline: args.cleanedStoryline,
    beatIntervalSec: args.beatIntervalSec,
    directorSettings: args.directorSettings,
    productionCast: args.productionCast,
    productionAssets: args.productionAssets,
    beats: args.beats.map(compactBeatForVault),
    exportedAt: new Date().toISOString(),
  };
}

/** First beat with any image URL (data URL ok for cover upload path). */
export function firstStoryCoverImageUrl(beats: StoryBeat[]): string | null {
  for (const b of beats) {
    const u = b.imageUrl?.trim();
    if (u) return u;
  }
  return null;
}
