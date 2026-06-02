import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import {
  BUILT_IN_IMAGESHOP_ART_STYLES,
  createDefaultImageshopContinuitySettings,
  createDefaultImageshopPageConfig,
  createDefaultImageshopPromptWorkspace,
  type ImageshopArtStyle,
  type ImageshopContinuitySettings,
  type ImageshopGenerationMode,
  type ImageshopPageConfig,
  type ImageshopPromptSectionKey,
  type ImageshopPromptWorkspace,
} from '@/portals/storyline/imageshopPromptComposer';
import type {
  ImageshopProductionBatch,
  ImageshopProductionBatchItem,
  ImageshopProductionSourceKind,
} from '@/portals/storyline/imageshopJsonSchemas';
import {
  addImageshopPanelReferenceChip as addPanelReferenceChipToQueue,
  clearImageshopPanelReferenceChips as clearPanelReferenceChipsInQueue,
  getImageshopQueueReadiness,
  replaceImageshopPanelReferenceChips as replacePanelReferenceChipsInQueue,
  restoreImageshopPanelReferenceChips as restorePanelReferenceChipsInQueue,
  updateImageshopPanelQueueItemStatus,
  type ImageshopIssueQueue,
  type ImageshopPanelGenerationStatus,
  type ImageshopPanelReferenceMutationResult,
  type ImageshopPanelReferenceUndo,
  type ImageshopQueueReadiness,
  type ImageshopReferenceChip,
} from '@/portals/storyline/imageshopPagePanelQueue';

export type ImageshopProductionStatus = 'draft' | 'generated' | 'refined' | 'approved' | 'published';
export type ImageshopProductionVersionKind = 'generated' | 'refined' | 'continuity-correction';

export type ImageshopProductionVersion = {
  id: string;
  kind: ImageshopProductionVersionKind;
  imageUrl: string;
  seed: number | null;
  prompt: string;
  createdAt: string;
};

export type ImageshopProductionItem = {
  id: string;
  batchId?: string;
  sourceId?: string;
  sourceKind: ImageshopProductionSourceKind | 'manual';
  label: string;
  prompt: string;
  promptSections: Partial<ImageshopPromptWorkspace>;
  pageConfig?: ImageshopPageConfig;
  status: ImageshopProductionStatus;
  versions: ImageshopProductionVersion[];
  createdAt: string;
  updatedAt: string;
};

export type ImageshopLayoutTemplate = {
  id: string;
  name: string;
  pageConfig: ImageshopPageConfig;
  createdAt: string;
};

type AddProductionItemInput = {
  batchId?: string;
  sourceId?: string;
  sourceKind: ImageshopProductionItem['sourceKind'];
  label: string;
  prompt: string;
  promptSections: Partial<ImageshopPromptWorkspace>;
  pageConfig?: ImageshopPageConfig;
};

type AddProductionVersionInput = Omit<ImageshopProductionVersion, 'id' | 'createdAt'>;
type ImageshopPageConfigUpdate = Partial<Omit<ImageshopPageConfig, 'panelStyle'>> & {
  panelStyle?: Partial<ImageshopPageConfig['panelStyle']>;
};

type ImageshopProductionState = {
  generationMode: ImageshopGenerationMode;
  promptWorkspace: ImageshopPromptWorkspace;
  selectedArtStyleId: string | null;
  savedArtStyles: ImageshopArtStyle[];
  continuity: ImageshopContinuitySettings;
  pageConfig: ImageshopPageConfig;
  savedLayoutTemplates: ImageshopLayoutTemplate[];
  importedBatches: ImageshopProductionBatch[];
  productionItems: ImageshopProductionItem[];
  selectedProductionItemId: string | null;
  dashboardStatusFilter: ImageshopProductionStatus | 'all';
  panelQueue: ImageshopIssueQueue | null;
  selectedPanelQueueItemId: string | null;
  panelQueueReadiness: ImageshopQueueReadiness;
  setGenerationMode: (mode: ImageshopGenerationMode) => void;
  updatePromptSection: (section: ImageshopPromptSectionKey, value: string) => void;
  replacePromptWorkspace: (workspace: Partial<ImageshopPromptWorkspace>) => void;
  selectArtStyle: (id: string | null) => void;
  saveArtStyle: (style: Omit<ImageshopArtStyle, 'id'> & { id?: string }) => ImageshopArtStyle;
  removeArtStyle: (id: string) => void;
  updateContinuity: (settings: Partial<ImageshopContinuitySettings>) => void;
  updatePageConfig: (config: ImageshopPageConfigUpdate) => void;
  saveLayoutTemplate: (name: string) => ImageshopLayoutTemplate;
  addProductionItem: (item: AddProductionItemInput) => ImageshopProductionItem;
  selectProductionItem: (id: string | null) => void;
  updateProductionItemStatus: (id: string, status: ImageshopProductionStatus) => void;
  addProductionVersion: (id: string, version: AddProductionVersionInput) => void;
  importBatch: (batch: ImageshopProductionBatch) => void;
  setDashboardStatusFilter: (filter: ImageshopProductionStatus | 'all') => void;
  setPanelQueue: (queue: ImageshopIssueQueue | null) => void;
  selectPanelQueueItem: (id: string | null) => void;
  updatePanelQueueItemStatus: (id: string, status: ImageshopPanelGenerationStatus) => void;
  addPanelQueueReferenceChip: (id: string, chip: ImageshopReferenceChip) => ImageshopPanelReferenceMutationResult;
  replacePanelQueueReferenceChips: (
    id: string,
    chips: ImageshopReferenceChip[],
    options: { confirmed: boolean },
  ) => ImageshopPanelReferenceMutationResult;
  clearPanelQueueReferenceChips: (
    id: string,
    options: { confirmed: boolean },
  ) => ImageshopPanelReferenceMutationResult;
  restorePanelQueueReferenceChips: (undo: ImageshopPanelReferenceUndo) => ImageshopPanelReferenceMutationResult;
  clearProductionItems: () => void;
};

const EMPTY_PANEL_QUEUE_READINESS: ImageshopQueueReadiness = {
  totalPanels: 0,
  readyPanels: 0,
  missingPromptPanels: [],
  generatedPanels: 0,
  approvedPanels: 0,
  failedPanels: 0,
  canonChipCount: 0,
  referenceChipCount: 0,
};

function createId(prefix: string): string {
  return globalThis.crypto?.randomUUID?.() ?? `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'style';
}

function createProductionItem(input: AddProductionItemInput): ImageshopProductionItem {
  const now = new Date().toISOString();
  return {
    id: createId('imageshop_item'),
    batchId: input.batchId,
    sourceId: input.sourceId,
    sourceKind: input.sourceKind,
    label: input.label,
    prompt: input.prompt,
    promptSections: input.promptSections,
    pageConfig: input.pageConfig,
    status: 'draft',
    versions: [],
    createdAt: now,
    updatedAt: now,
  };
}

function batchItemToProductionItem(batch: ImageshopProductionBatch, item: ImageshopProductionBatchItem): ImageshopProductionItem {
  return createProductionItem({
    batchId: batch.id,
    sourceId: item.sourceId,
    sourceKind: item.sourceKind,
    label: item.label,
    prompt: item.prompt,
    promptSections: item.promptSections,
    pageConfig: item.pageConfig,
  });
}

function requirePanelQueue(queue: ImageshopIssueQueue | null): ImageshopIssueQueue {
  if (!queue) throw new Error('Cannot edit Imageshop panel references without an active panel queue.');
  return queue;
}

export const useImageshopProductionStore = create<ImageshopProductionState>()(
  persist(
    (set) => ({
      generationMode: 'video-beats',
      promptWorkspace: createDefaultImageshopPromptWorkspace(),
      selectedArtStyleId: null,
      savedArtStyles: BUILT_IN_IMAGESHOP_ART_STYLES,
      continuity: createDefaultImageshopContinuitySettings(),
      pageConfig: createDefaultImageshopPageConfig(),
      savedLayoutTemplates: [],
      importedBatches: [],
      productionItems: [],
      selectedProductionItemId: null,
      dashboardStatusFilter: 'all',
      panelQueue: null,
      selectedPanelQueueItemId: null,
      panelQueueReadiness: EMPTY_PANEL_QUEUE_READINESS,

      setGenerationMode: (mode) => set({ generationMode: mode }),
      updatePromptSection: (section, value) =>
        set((state) => ({
          promptWorkspace: {
            ...state.promptWorkspace,
            [section]: value,
          },
        })),
      replacePromptWorkspace: (workspace) =>
        set((state) => ({
          promptWorkspace: {
            ...state.promptWorkspace,
            ...workspace,
          },
        })),
      selectArtStyle: (id) => set({ selectedArtStyleId: id }),
      saveArtStyle: (style) => {
        const saved: ImageshopArtStyle = {
          id: style.id ?? `custom-${slugify(style.name)}-${Date.now()}`,
          name: style.name,
          description: style.description,
          prompt: style.prompt,
        };

        set((state) => ({
          savedArtStyles: [saved, ...state.savedArtStyles.filter((item) => item.id !== saved.id)],
          selectedArtStyleId: saved.id,
        }));

        return saved;
      },
      removeArtStyle: (id) =>
        set((state) => ({
          savedArtStyles: state.savedArtStyles.filter((style) => style.id !== id || BUILT_IN_IMAGESHOP_ART_STYLES.some((builtIn) => builtIn.id === id)),
          selectedArtStyleId: state.selectedArtStyleId === id ? null : state.selectedArtStyleId,
        })),
      updateContinuity: (settings) =>
        set((state) => ({
          continuity: {
            ...state.continuity,
            ...settings,
            strength: settings.strength == null ? state.continuity.strength : Math.max(0, Math.min(100, settings.strength)),
          },
        })),
      updatePageConfig: (config) =>
        set((state) => ({
          pageConfig: {
            ...state.pageConfig,
            ...config,
            panelStyle: {
              ...state.pageConfig.panelStyle,
              ...(config.panelStyle ?? {}),
            },
          },
        })),
      saveLayoutTemplate: (name) => {
        const template: ImageshopLayoutTemplate = {
          id: `custom-layout-${slugify(name)}-${Date.now()}`,
          name: name.trim() || 'Custom Imageshop Layout',
          pageConfig: useImageshopProductionStore.getState().pageConfig,
          createdAt: new Date().toISOString(),
        };

        set((state) => ({
          savedLayoutTemplates: [template, ...state.savedLayoutTemplates],
          pageConfig: {
            ...state.pageConfig,
            layoutTemplateId: template.id,
          },
        }));

        return template;
      },
      addProductionItem: (item) => {
        const stored = createProductionItem(item);
        set((state) => ({
          productionItems: [stored, ...state.productionItems],
          selectedProductionItemId: stored.id,
        }));
        return stored;
      },
      selectProductionItem: (id) => set({ selectedProductionItemId: id }),
      updateProductionItemStatus: (id, status) =>
        set((state) => ({
          productionItems: state.productionItems.map((item) =>
            item.id === id ? { ...item, status, updatedAt: new Date().toISOString() } : item,
          ),
        })),
      addProductionVersion: (id, version) =>
        set((state) => ({
          productionItems: state.productionItems.map((item) =>
            item.id === id
              ? {
                  ...item,
                  status: version.kind === 'generated' ? 'generated' : 'refined',
                  versions: [
                    {
                      ...version,
                      id: createId('imageshop_version'),
                      createdAt: new Date().toISOString(),
                    },
                    ...item.versions,
                  ],
                  updatedAt: new Date().toISOString(),
                }
              : item,
          ),
          selectedProductionItemId: id,
        })),
      importBatch: (batch) =>
        set((state) => ({
          importedBatches: [batch, ...state.importedBatches.filter((item) => item.id !== batch.id)],
          savedArtStyles: [
            ...(batch.artStyles ?? []),
            ...state.savedArtStyles.filter(
              (style) => !(batch.artStyles ?? []).some((importedStyle) => importedStyle.id === style.id),
            ),
          ],
          selectedArtStyleId: batch.selectedArtStyleId ?? state.selectedArtStyleId,
          productionItems: [
            ...batch.items.map((item) => batchItemToProductionItem(batch, item)),
            ...state.productionItems,
          ],
          panelQueue: batch.panelQueue ?? state.panelQueue,
          selectedPanelQueueItemId:
            batch.panelQueue?.pages[0]?.panels[0]?.queueItemId ?? state.selectedPanelQueueItemId,
          panelQueueReadiness: batch.panelQueue
            ? getImageshopQueueReadiness(batch.panelQueue)
            : state.panelQueueReadiness,
        })),
      setDashboardStatusFilter: (filter) => set({ dashboardStatusFilter: filter }),
      setPanelQueue: (queue) =>
        set({
          panelQueue: queue,
          selectedPanelQueueItemId: queue?.pages[0]?.panels[0]?.queueItemId ?? null,
          panelQueueReadiness: getImageshopQueueReadiness(queue),
        }),
      selectPanelQueueItem: (id) => set({ selectedPanelQueueItemId: id }),
      updatePanelQueueItemStatus: (id, status) =>
        set((state) => {
          if (!state.panelQueue) return state;
          const panelQueue = updateImageshopPanelQueueItemStatus(state.panelQueue, id, status);
          return {
            panelQueue,
            selectedPanelQueueItemId: id,
            panelQueueReadiness: getImageshopQueueReadiness(panelQueue),
          };
        }),
      addPanelQueueReferenceChip: (id, chip) => {
        const result = addPanelReferenceChipToQueue(requirePanelQueue(useImageshopProductionStore.getState().panelQueue), id, chip);
        if (!result.blockedReason) {
          set({
            panelQueue: result.queue,
            selectedPanelQueueItemId: id,
            panelQueueReadiness: getImageshopQueueReadiness(result.queue),
          });
        }
        return result;
      },
      replacePanelQueueReferenceChips: (id, chips, options) => {
        const result = replacePanelReferenceChipsInQueue(
          requirePanelQueue(useImageshopProductionStore.getState().panelQueue),
          id,
          chips,
          options,
        );
        if (!result.blockedReason) {
          set({
            panelQueue: result.queue,
            selectedPanelQueueItemId: id,
            panelQueueReadiness: getImageshopQueueReadiness(result.queue),
          });
        }
        return result;
      },
      clearPanelQueueReferenceChips: (id, options) => {
        const result = clearPanelReferenceChipsInQueue(
          requirePanelQueue(useImageshopProductionStore.getState().panelQueue),
          id,
          options,
        );
        if (!result.blockedReason) {
          set({
            panelQueue: result.queue,
            selectedPanelQueueItemId: id,
            panelQueueReadiness: getImageshopQueueReadiness(result.queue),
          });
        }
        return result;
      },
      restorePanelQueueReferenceChips: (undo) => {
        const result = restorePanelReferenceChipsInQueue(
          requirePanelQueue(useImageshopProductionStore.getState().panelQueue),
          undo,
        );
        if (!result.blockedReason) {
          set({
            panelQueue: result.queue,
            selectedPanelQueueItemId: undo.queueItemId,
            panelQueueReadiness: getImageshopQueueReadiness(result.queue),
          });
        }
        return result;
      },
      clearProductionItems: () =>
        set({
          importedBatches: [],
          productionItems: [],
          selectedProductionItemId: null,
          panelQueue: null,
          selectedPanelQueueItemId: null,
          panelQueueReadiness: EMPTY_PANEL_QUEUE_READINESS,
        }),
    }),
    {
      name: 'arcs-imageshop-production-v1',
      storage: createJSONStorage(() => localStorage),
      version: 1,
    },
  ),
);
