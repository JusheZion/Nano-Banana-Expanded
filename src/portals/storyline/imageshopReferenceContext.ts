import {
  getGuidedImageWorkshopPreload,
  type GuidedImageWorkshopHandoff,
  type GuidedImageWorkshopReference,
} from '@/stores/imageWorkshopBridge';
import {
  getCurrentImageshopProductionVersion,
  type ImageshopProductionItem,
} from '@/stores/imageshopProductionStore';
import type {
  ImageshopPanelQueueItem,
  ImageshopReferenceChip,
  ImageshopReferenceLane,
} from '@/portals/storyline/imageshopPagePanelQueue';
import type {
  ProductionAssetMember,
  ProductionCastMember,
  ProductionSupportingRefMember,
} from '@/portals/storyline/storylineTypes';

export type ImageshopReferenceLaneGroup = {
  lane: ImageshopReferenceLane;
  label: string;
  chips: ImageshopReferenceChip[];
};

export type ImageshopReferenceContext = {
  chips: ImageshopReferenceChip[];
  lanes: ImageshopReferenceLaneGroup[];
  missingReferenceIds: string[];
  missingReferenceRoutes: ImageshopMissingReferenceRoute[];
};

export type ImageshopMissingReferenceRoute = {
  referenceId: string;
  destination: 'character-studio' | 'asset-studio' | 'supporting-reference';
  label: string;
};

type BuildImageshopReferenceContextInput = {
  panel: ImageshopPanelQueueItem | null;
  productionCast?: ProductionCastMember[];
  productionAssets?: ProductionAssetMember[];
  productionSupportingRefs?: ProductionSupportingRefMember[];
  guidedHandoff?: GuidedImageWorkshopHandoff | null;
  approvedProductionItems?: ImageshopProductionItem[];
};

const REFERENCE_LANE_ORDER: ImageshopReferenceLane[] = [
  'character-dna',
  'wardrobe',
  'environment',
  'props',
  'style',
  'lighting',
  'canon',
];

const REFERENCE_LANE_LABELS: Record<ImageshopReferenceLane, string> = {
  'character-dna': 'Character DNA',
  wardrobe: 'Wardrobe',
  environment: 'Environment',
  props: 'Props',
  style: 'Style',
  lighting: 'Lighting',
  canon: 'Canon',
};

export function getImageshopReferenceLaneLabel(lane: ImageshopReferenceLane): string {
  return REFERENCE_LANE_LABELS[lane];
}

function clean(value: string | null | undefined): string {
  return value?.trim() ?? '';
}

function normalize(value: string | null | undefined): string {
  return clean(value).toLowerCase();
}

function labelMatchesPanel(label: string, values: string[]): boolean {
  const normalizedLabel = normalize(label);
  if (!normalizedLabel) return false;
  return values.some((value) => {
    const normalizedValue = normalize(value);
    return Boolean(normalizedValue) && (normalizedLabel.includes(normalizedValue) || normalizedValue.includes(normalizedLabel));
  });
}

function chipKey(chip: ImageshopReferenceChip): string {
  return [
    chip.sourceType,
    chip.referenceId ?? '',
    chip.imageUrl ?? '',
    chip.lane,
    chip.label,
  ].join('|');
}

function addChip(
  chips: ImageshopReferenceChip[],
  seen: Set<string>,
  chip: ImageshopReferenceChip | null,
): void {
  if (!chip) return;
  const key = chipKey(chip);
  if (seen.has(key)) return;
  seen.add(key);
  chips.push(chip);
}

function hasReferenceId(panel: ImageshopPanelQueueItem, referenceId: string): boolean {
  return panel.referenceIds.some((id) => normalize(id) === normalize(referenceId));
}

function castMatchesPanel(panel: ImageshopPanelQueueItem, cast: ProductionCastMember): boolean {
  if (hasReferenceId(panel, cast.vaultCharacterId)) return true;
  return [
    cast.displayName,
    cast.castName ?? '',
    cast.profileName,
  ].some((label) => labelMatchesPanel(label, panel.characters));
}

function assetMatchesPanel(panel: ImageshopPanelQueueItem, asset: ProductionAssetMember): boolean {
  if (hasReferenceId(panel, asset.vaultAssetId)) return true;
  return [asset.assetName, asset.collectionName].some((label) => labelMatchesPanel(label, panel.locations));
}

function supportingRefMatchesPanel(panel: ImageshopPanelQueueItem, ref: ProductionSupportingRefMember): boolean {
  if (hasReferenceId(panel, ref.supportingRefId)) return true;
  return labelMatchesPanel(ref.label, panel.characters);
}

function assetLaneForPanel(panel: ImageshopPanelQueueItem, asset: ProductionAssetMember): ImageshopReferenceLane {
  return [asset.assetName, asset.collectionName].some((label) => labelMatchesPanel(label, panel.locations))
    ? 'environment'
    : 'props';
}

function guidedChip(
  reference: GuidedImageWorkshopReference,
  lane: ImageshopReferenceLane,
  index: number,
): ImageshopReferenceChip | null {
  const imageUrl = clean(reference.imageUrl);
  if (!imageUrl) return null;
  return {
    id: `guided-${reference.referenceId ?? reference.name}-${index + 1}`,
    label: clean(reference.displayName) || clean(reference.name) || `Guided reference ${index + 1}`,
    lane,
    sourceType: 'guided',
    referenceId: clean(reference.referenceId) || clean(reference.name) || undefined,
    imageUrl,
    signedUrlStatus: 'ready',
  };
}

function approvedProductionChip(item: ImageshopProductionItem): ImageshopReferenceChip | null {
  if (item.status !== 'approved' && item.status !== 'published') return null;
  const imageUrl = clean(getCurrentImageshopProductionVersion(item)?.imageUrl);
  if (!imageUrl) return null;
  return {
    id: `approved-output-${item.id}`,
    label: clean(item.label) || 'Approved Imageshop output',
    lane: 'lighting',
    sourceType: 'approved-output',
    referenceId: item.id,
    imageUrl,
    signedUrlStatus: 'ready',
  };
}

function routeMissingReference(referenceId: string): ImageshopMissingReferenceRoute {
  const normalized = normalize(referenceId);
  if (normalized.startsWith('char') || normalized.includes('character')) {
    return {
      referenceId,
      destination: 'character-studio',
      label: `Resolve ${referenceId} in Character Studio`,
    };
  }
  if (normalized.startsWith('npc') || normalized.includes('supporting')) {
    return {
      referenceId,
      destination: 'supporting-reference',
      label: `Create quick supporting reference for ${referenceId}`,
    };
  }
  return {
    referenceId,
    destination: 'asset-studio',
    label: `Resolve ${referenceId} in Asset Studio`,
  };
}

export function buildImageshopReferenceContext({
  panel,
  productionCast = [],
  productionAssets = [],
  productionSupportingRefs = [],
  guidedHandoff = null,
  approvedProductionItems = [],
}: BuildImageshopReferenceContextInput): ImageshopReferenceContext {
  const chips: ImageshopReferenceChip[] = [];
  const seen = new Set<string>();
  const referenceMode = panel?.referenceMode ?? 'auto';

  for (const chip of referenceMode === 'none' ? [] : panel?.referenceChips ?? []) {
    addChip(chips, seen, chip);
  }

  if (panel && referenceMode === 'auto') {
    for (const cast of productionCast.filter((item) => castMatchesPanel(panel, item))) {
      addChip(chips, seen, {
        id: `character-${cast.vaultCharacterId}`,
        label: cast.displayName,
        lane: 'character-dna',
        sourceType: 'character',
        referenceId: cast.vaultCharacterId,
        imageUrl: cast.imageUrl,
        signedUrlStatus: clean(cast.imageUrl) ? 'ready' : 'unknown',
      });
    }

    for (const asset of productionAssets.filter((item) => assetMatchesPanel(panel, item))) {
      addChip(chips, seen, {
        id: `asset-${asset.vaultAssetId}`,
        label: asset.assetName || asset.collectionName,
        lane: assetLaneForPanel(panel, asset),
        sourceType: 'asset',
        referenceId: asset.vaultAssetId,
        imageUrl: asset.imageUrl,
        signedUrlStatus: clean(asset.imageUrl) ? 'ready' : 'unknown',
      });
    }

    for (const ref of productionSupportingRefs.filter((item) => supportingRefMatchesPanel(panel, item))) {
      addChip(chips, seen, {
        id: `npc-${ref.supportingRefId}`,
        label: ref.label,
        lane: 'character-dna',
        sourceType: 'npc',
        referenceId: ref.supportingRefId,
        imageUrl: ref.imageUrl,
        signedUrlStatus: clean(ref.imageUrl) ? 'ready' : 'unknown',
      });
    }
  }

  if (guidedHandoff && referenceMode === 'auto') {
    const guidedReferences = getGuidedImageWorkshopPreload(guidedHandoff).allReferences;
    guidedReferences.forEach((reference, index) => {
      const lane: ImageshopReferenceLane =
        guidedHandoff.locations.includes(reference)
          ? 'environment'
          : (guidedHandoff.props ?? []).includes(reference)
            ? 'props'
            : 'character-dna';
      addChip(chips, seen, guidedChip(reference, lane, index));
    });
  }

  if (referenceMode === 'auto') {
    for (const item of approvedProductionItems) {
      addChip(chips, seen, approvedProductionChip(item));
    }
  }

  const resolvedReferenceIds = new Set(
    chips.flatMap((chip) => [chip.id, chip.referenceId].map(normalize).filter(Boolean)),
  );
  const missingReferenceIds =
    panel?.referenceIds.filter((referenceId) => !resolvedReferenceIds.has(normalize(referenceId))) ?? [];

  return {
    chips,
    lanes: REFERENCE_LANE_ORDER.map((lane) => ({
      lane,
      label: REFERENCE_LANE_LABELS[lane],
      chips: chips.filter((chip) => chip.lane === lane),
    })),
    missingReferenceIds,
    missingReferenceRoutes: missingReferenceIds.map(routeMissingReference),
  };
}
