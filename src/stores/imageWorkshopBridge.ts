import { create } from 'zustand';
import type { Portal } from '@/shared/portals';
import type { ImageWorkshopDraft } from '@/portals/storyline/imageWorkshopPlanning';
import type { ImageshopGenerationProvenance } from '@/portals/storyline/imageshopPagePanelQueue';
import type { ImageshopWriterImageMapExport } from '@/portals/storyline/imageshopWriterImport';

export type GuidedImageWorkshopReference = {
  name: string;
  displayName: string;
  imageUrl: string;
  referenceId?: string;
  sourceLabel?: string;
  sourceType?: 'character' | 'asset' | 'npc';
  profileName?: string;
  imageLabel?: string;
  castName?: string;
};

export type GuidedImageWorkshopAspectRatio = '9:16' | '1:1' | '21:9';
export type GuidedImageWorkshopLayoutIntent = 'feature' | 'wide' | 'tall' | 'normal';
export type GuidedImageWorkshopPanelLayout = {
  templateId?: 'auto' | 'three-panel' | 'three-panel-wide-top' | 'three-panel-wide-bottom' | 'four-panel' | 'six-panel-grid' | 'splash';
  intent?: GuidedImageWorkshopLayoutIntent;
  columnSpan?: number;
  rowSpan?: number;
  aspectRatioHint?: GuidedImageWorkshopAspectRatio;
};

export type GuidedImageWorkshopReferenceNeeds = {
  characters: string[];
  locations: string[];
  npcs: string[];
};

export type GuidedImageWorkshopHandoff = {
  source: 'guided-comic';
  currentStep: 'visual-prep' | 'art';
  returnTarget?: 'guided-comic-art';
  sourceLabel: string;
  characters: GuidedImageWorkshopReference[];
  locations: GuidedImageWorkshopReference[];
  npcs: GuidedImageWorkshopReference[];
  props?: GuidedImageWorkshopReference[];
  pageSummary?: string;
  panelId?: string;
  pageNumber?: number;
  panelNumber?: number;
  panelBeat?: string;
  visualPrompt?: string;
  dialogueContext?: string;
  referenceNeeds?: GuidedImageWorkshopReferenceNeeds;
  panelLayout?: GuidedImageWorkshopPanelLayout;
  pageKeyCharacters?: string[];
  pageKeyLocation?: string;
  artDirection?: {
    artStyle: string;
    defaultAspectRatio: string;
    renderingStyle: string;
    colorMood: string;
    lighting: string;
    continuityNotes: string;
    excludeTextFromImages: boolean;
  };
  productionPrepContext?: string;
};

const IMAGE_WORKSHOP_REFERENCE_SLOT_COUNT = 14;

export function getGuidedImageWorkshopPreload(handoff: GuidedImageWorkshopHandoff): {
  allReferences: GuidedImageWorkshopReference[];
  slotUrls: string[];
  overflowReferences: GuidedImageWorkshopReference[];
  context: 'character' | 'asset';
} {
  const allReferences = [
    ...handoff.characters,
    ...handoff.locations,
    ...handoff.npcs,
    ...(handoff.props ?? []),
  ].filter((reference) => reference.imageUrl.trim());
  const preloadedReferences = allReferences.slice(0, IMAGE_WORKSHOP_REFERENCE_SLOT_COUNT);
  return {
    allReferences,
    slotUrls: preloadedReferences.map((reference) => reference.imageUrl),
    overflowReferences: allReferences.slice(IMAGE_WORKSHOP_REFERENCE_SLOT_COUNT),
    context: handoff.characters.length > 0 ? 'character' : 'asset',
  };
}

function joinDisplayNames(references: GuidedImageWorkshopReference[]): string {
  const labels = references.map((reference) => reference.displayName.trim()).filter(Boolean);
  return labels.length > 0 ? labels.join(', ') : 'None selected';
}

function joinOptionalList(values: string[] | undefined): string {
  const labels = (values ?? []).map((value) => value.trim()).filter(Boolean);
  return labels.length > 0 ? labels.join(', ') : 'None specified';
}

function filterReferencesByActiveUrls(
  references: GuidedImageWorkshopReference[],
  activeReferenceUrls: string[],
): GuidedImageWorkshopReference[] {
  const activeUrls = new Set(activeReferenceUrls.map((url) => url.trim()).filter(Boolean));
  if (activeUrls.size === 0) return [];
  return references.filter((reference) => activeUrls.has(reference.imageUrl.trim()));
}

export function buildGuidedImageWorkshopPromptForActiveReferences(
  handoff: GuidedImageWorkshopHandoff,
  activeReferenceUrls: string[],
): string {
  return buildGuidedImageWorkshopPrompt({
    ...handoff,
    characters: filterReferencesByActiveUrls(handoff.characters, activeReferenceUrls),
    locations: filterReferencesByActiveUrls(handoff.locations, activeReferenceUrls),
    npcs: filterReferencesByActiveUrls(handoff.npcs, activeReferenceUrls),
    props: filterReferencesByActiveUrls(handoff.props ?? [], activeReferenceUrls),
  });
}

function formatReferenceNeeds(needs: GuidedImageWorkshopReferenceNeeds | undefined): string {
  if (!needs) return '';
  return [
    `characters - ${joinOptionalList(needs.characters)}`,
    `locations - ${joinOptionalList(needs.locations)}`,
    `NPCs - ${joinOptionalList(needs.npcs)}`,
  ].join('; ');
}

export function buildGuidedImageWorkshopPrompt(handoff: GuidedImageWorkshopHandoff): string {
  const panelBeat = handoff.panelBeat?.trim() || 'Create finished comic panel art for the selected panel.';
  const pageSummary = handoff.pageSummary?.trim() || 'No page summary provided.';
  const pageKeyLocation = handoff.pageKeyLocation?.trim() || 'None specified';
  const artDirection = handoff.artDirection;
  const panelLayout = handoff.panelLayout;
  const panelLabel =
    handoff.pageNumber != null && handoff.panelNumber != null
      ? `Page ${handoff.pageNumber}, Panel ${handoff.panelNumber}`
      : null;

  return [
    panelLabel ? `Panel: ${panelLabel}` : '',
    `Image objective: ${panelBeat}`,
    handoff.visualPrompt?.trim() ? `Visual storytelling prompt: ${handoff.visualPrompt.trim()}` : '',
    handoff.dialogueContext?.trim() ? `Dialogue context for final lettering: ${handoff.dialogueContext.trim()}` : '',
    handoff.referenceNeeds ? `Visual reference needs: ${formatReferenceNeeds(handoff.referenceNeeds)}` : '',
    `Page context: ${pageSummary}`,
    `Page key characters: ${joinOptionalList(handoff.pageKeyCharacters)}`,
    `Page key location: ${pageKeyLocation}`,
    `Character references: ${joinDisplayNames(handoff.characters)}`,
    `Location / asset references: ${joinDisplayNames(handoff.locations)}`,
    `NPC references: ${joinDisplayNames(handoff.npcs)}`,
    handoff.props?.length ? `Prop / asset references: ${joinDisplayNames(handoff.props)}` : '',
    handoff.productionPrepContext?.trim() ? `Production prep continuity: ${handoff.productionPrepContext.trim()}` : '',
    panelLayout?.intent ? `Panel layout intent: ${panelLayout.intent}` : '',
    panelLayout?.columnSpan || panelLayout?.rowSpan
      ? `Panel layout span: ${panelLayout.columnSpan ?? 1} columns x ${panelLayout.rowSpan ?? 1} rows`
      : '',
    artDirection?.artStyle.trim() ? `Art style: ${artDirection.artStyle.trim()}` : '',
    artDirection?.defaultAspectRatio.trim() ? `Preferred aspect: ${artDirection.defaultAspectRatio.trim()}` : '',
    artDirection?.renderingStyle.trim() ? `Rendering style: ${artDirection.renderingStyle.trim()}` : '',
    artDirection?.colorMood.trim() ? `Color mood: ${artDirection.colorMood.trim()}` : '',
    artDirection?.lighting.trim() ? `Lighting: ${artDirection.lighting.trim()}` : '',
    artDirection?.continuityNotes.trim() ? `Continuity notes: ${artDirection.continuityNotes.trim()}` : '',
    'Reference style lock: Match the active reference images for visual style, rendering treatment, palette, lighting, and design language. Use written art direction to clarify the references, not to drift into a different style.',
    'Do not include speech bubbles, captions, narration boxes, lettering, watermarks, or embedded text unless the user manually adds text to this prompt.',
    'Compose this as a polished comic-book panel with clear storytelling, consistent character design, readable action, and finished lighting.',
  ]
    .filter(Boolean)
    .join('\n');
}

function aspectRatioFromArtDirection(value: string | undefined): GuidedImageWorkshopAspectRatio | null {
  const normalized = value?.trim().toLowerCase();
  if (!normalized) return null;
  if (normalized.includes('21:9') || normalized.includes('wide') || normalized.includes('cinematic')) return '21:9';
  if (normalized.includes('1:1') || normalized.includes('square')) return '1:1';
  if (normalized.includes('9:16') || normalized.includes('portrait') || normalized.includes('tall')) return '9:16';
  return null;
}

export function getGuidedImageWorkshopAspectRatio(
  handoff: GuidedImageWorkshopHandoff,
): GuidedImageWorkshopAspectRatio {
  const layout = handoff.panelLayout;
  if (layout?.aspectRatioHint) return layout.aspectRatioHint;
  if (layout?.intent === 'wide') return '21:9';
  if (layout?.intent === 'tall' || layout?.intent === 'feature') return '9:16';
  if (layout?.intent === 'normal') return '1:1';
  if (layout?.columnSpan && layout?.rowSpan) {
    if (layout.columnSpan > layout.rowSpan) return '21:9';
    if (layout.rowSpan > layout.columnSpan) return '9:16';
    return '1:1';
  }
  return aspectRatioFromArtDirection(handoff.artDirection?.defaultAspectRatio) ?? '9:16';
}

export type GuidedComicPanelImageReturn = {
  source: 'guided-comic';
  returnTarget: 'guided-comic-art';
  panelId?: string;
  pageNumber: number;
  panelNumber: number;
  imageUrl: string;
  seed?: number | null;
  prompt?: string;
  provenance?: ImageshopGenerationProvenance;
  returnedAt: string;
};

interface ImageWorkshopBridgeState {
  portalToOpen: Portal | null;
  draft: ImageWorkshopDraft | null;
  guidedHandoff: GuidedImageWorkshopHandoff | null;
  guidedPanelReturn: GuidedComicPanelImageReturn | null;
  writerImageMapReturn: ImageshopWriterImageMapExport | null;
  requestPortalOpen: (portal: Portal) => void;
  requestWriterHandoff: (draft: ImageWorkshopDraft) => void;
  requestGuidedComicHandoff: (handoff: GuidedImageWorkshopHandoff) => void;
  consumeGuidedComicHandoff: () => GuidedImageWorkshopHandoff | null;
  sendGuidedComicPanelImageBack: (payload: Omit<GuidedComicPanelImageReturn, 'source' | 'returnTarget' | 'returnedAt'>) => void;
  returnToGuidedComicFlow: () => void;
  consumeGuidedComicPanelImageReturn: () => GuidedComicPanelImageReturn | null;
  sendImageshopWriterImageMapBack: (payload: ImageshopWriterImageMapExport) => void;
  consumeImageshopWriterImageMapReturn: () => ImageshopWriterImageMapExport | null;
  clearPortalRequest: () => void;
  clearDraft: () => void;
}

export const useImageWorkshopBridge = create<ImageWorkshopBridgeState>((set, get) => ({
  portalToOpen: null,
  draft: null,
  guidedHandoff: null,
  guidedPanelReturn: null,
  writerImageMapReturn: null,
  requestPortalOpen: (portal) => set({ portalToOpen: portal }),
  requestWriterHandoff: (draft) => set({ draft, portalToOpen: 'lab' }),
  requestGuidedComicHandoff: (handoff) => set({ guidedHandoff: handoff, portalToOpen: 'lab' }),
  consumeGuidedComicHandoff: () => {
    const handoff = get().guidedHandoff;
    if (!handoff) return null;
    set({ guidedHandoff: null });
    return handoff;
  },
  sendGuidedComicPanelImageBack: (payload) =>
    set({
      guidedPanelReturn: {
        ...payload,
        source: 'guided-comic',
        returnTarget: 'guided-comic-art',
        returnedAt: new Date().toISOString(),
      },
      portalToOpen: 'comic',
    }),
  returnToGuidedComicFlow: () => set({ portalToOpen: 'comic' }),
  consumeGuidedComicPanelImageReturn: () => {
    const payload = get().guidedPanelReturn;
    if (!payload) return null;
    set({ guidedPanelReturn: null });
    return payload;
  },
  sendImageshopWriterImageMapBack: (payload) =>
    set({
      writerImageMapReturn: payload,
      portalToOpen: 'writer',
    }),
  consumeImageshopWriterImageMapReturn: () => {
    const payload = get().writerImageMapReturn;
    if (!payload) return null;
    set({ writerImageMapReturn: null });
    return payload;
  },
  clearPortalRequest: () => set({ portalToOpen: null }),
  clearDraft: () => set({ draft: null }),
}));
