import { create } from 'zustand';
import type { Portal } from '@/shared/portals';
import type { PromptCategory, PromptDraft, PromptSourcePortal } from '@/portals/prompt-library/lib/types';

export type PromptLibraryHandoff = {
  sourcePortal: PromptSourcePortal;
  sourceLabel: string;
  title: string;
  promptText: string;
  category?: PromptCategory;
  notes?: string;
  model?: string;
  tags?: string[];
  collections?: string[];
  characters?: string[];
  looks?: string[];
  scenes?: string[];
  sourceContext?: Record<string, unknown>;
  promptSections?: Record<string, unknown>;
};

export type PromptLibraryTarget = 'lab' | 'studio' | 'assets' | 'writer' | 'comic';

export type PromptLibraryUseRequest = {
  target: PromptLibraryTarget;
  promptText: string;
  title: string;
  sourcePromptId?: string;
  sourceLabel?: string;
  promptSections?: Record<string, unknown>;
};

interface PromptLibraryBridgeState {
  portalToOpen: Portal | null;
  inboundDraft: PromptLibraryHandoff | null;
  useRequest: PromptLibraryUseRequest | null;
  requestSavePrompt: (handoff: PromptLibraryHandoff) => void;
  consumeInboundDraft: () => PromptLibraryHandoff | null;
  requestUsePrompt: (request: PromptLibraryUseRequest) => void;
  consumeUseRequest: (target: PromptLibraryTarget) => PromptLibraryUseRequest | null;
  clearPortalRequest: () => void;
}

export function handoffToPromptDraft(handoff: PromptLibraryHandoff): PromptDraft {
  return {
    title: handoff.title,
    promptText: handoff.promptText,
    category: handoff.category ?? 'scene',
    notes: handoff.notes ?? '',
    model: handoff.model ?? 'arcs',
    status: 'active',
    isFavorite: false,
    tags: (handoff.tags ?? [handoff.sourcePortal]).join(', '),
    collections: (handoff.collections ?? ['ARCS handoffs']).join(', '),
    characters: (handoff.characters ?? []).join(', '),
    looks: (handoff.looks ?? []).join(', '),
    scenes: (handoff.scenes ?? []).join(', '),
    variables: '',
    sourcePortal: handoff.sourcePortal,
    sourceLabel: handoff.sourceLabel,
    sourceContext: handoff.sourceContext,
    promptSections: handoff.promptSections,
  };
}

export const usePromptLibraryBridge = create<PromptLibraryBridgeState>((set, get) => ({
  portalToOpen: null,
  inboundDraft: null,
  useRequest: null,
  requestSavePrompt: (handoff) => set({ inboundDraft: handoff, portalToOpen: 'prompts' }),
  consumeInboundDraft: () => {
    const draft = get().inboundDraft;
    if (!draft) return null;
    queueMicrotask(() => set({ inboundDraft: null }));
    return draft;
  },
  requestUsePrompt: (request) => set({ useRequest: request, portalToOpen: request.target }),
  consumeUseRequest: (target) => {
    const request = get().useRequest;
    if (!request || request.target !== target) return null;
    queueMicrotask(() => set({ useRequest: null }));
    return request;
  },
  clearPortalRequest: () => set({ portalToOpen: null }),
}));
