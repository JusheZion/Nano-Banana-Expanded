export type StoryBeatKind = 'narrative' | 'broll';
export type StoryBeatAspectRatio = '9:16' | '1:1' | '21:9';

export type BeatGenerationStatus = 'idle' | 'pending' | 'error' | 'safety_blocked';

export interface StoryBeatCamera {
  shot: string;
  angle: string;
  movement: string;
}

export interface StoryBeatAudio {
  dialogue: string;
  sfx: string;
}

export interface StoryBeatInterpolation {
  startFrame: string;
  endFrame: string;
}

export interface StoryBeat {
  id: string;
  kind: StoryBeatKind;
  text: string;
  durationSec: number;
  visualPrompt: string;
  camera: StoryBeatCamera;
  tone: string;
  audio: StoryBeatAudio;
  /** Vault character row ids linked for references / consistency */
  linkedVaultCharacterIds: string[];
  /** Vault asset row ids linked for environment/props references */
  linkedVaultAssetIds: string[];
  /** Local NPC Vault generation ids linked for one-off reference likeness/continuity */
  linkedSupportingRefIds: string[];
  tags: string[];
  imageUrl: string | null;
  interpolation: StoryBeatInterpolation | null;
  generationStatus: BeatGenerationStatus;
  generationMessage: string | null;
  seed: number | null;
  aspectRatio: StoryBeatAspectRatio;
}

export interface ProductionCastMember {
  vaultCharacterId: string;
  profileName: string;
  castName: string | null;
  displayName: string;
  imageUrl: string;
  /** Short line for AI context from metadata_tags */
  tagSummary: string;
}

export interface ProductionAssetMember {
  vaultAssetId: string;
  collectionName: string;
  assetName: string;
  imageUrl: string;
}

export interface ProductionSupportingRefMember {
  supportingRefId: string;
  label: string;
  imageUrl: string;
  createdAt: number;
}

export interface DirectorSettings {
  highFashionTechwear: boolean;
  yugiOhComplexity: boolean;
  strictWardrobeLock: boolean;
}
