import { create } from 'zustand';

// Define types (aligned with implementation plan)
export interface Panel {
    id: string;
    type: 'panel';
    x: number;
    y: number;
    width: number;
    height: number;
    imageUrl?: string;
    prompt?: string;
}

export interface Bubble {
    id: string;
    type: 'bubble';
    x: number;
    y: number;
    content: string;
    style: 'speech' | 'thought' | 'whisper' | 'shout';
}

export interface ComicPage {
    id: string;
    panels: Panel[];
    bubbles: Bubble[];
    background: string; // usually white or off-white paper
}

interface ComicState {
    pages: ComicPage[];
    currentPageId: string | null;
    selectedElementId: string | null;
    mode: 'layout' | 'content' | 'lettering'; // Tool modes

    // Actions
    addPage: () => void;
    selectPage: (id: string) => void;
    addPanel: (pageId: string, panel: Omit<Panel, 'id' | 'type'>) => void;
    updatePanel: (pageId: string, panelId: string, updates: Partial<Panel>) => void;
    selectElement: (id: string | null) => void;
}

export const useComicStore = create<ComicState>((set) => ({
    pages: [
        {
            id: 'page-1',
            panels: [],
            bubbles: [],
            background: '#ffffff'
        }
    ],
    currentPageId: 'page-1',
    selectedElementId: null,
    mode: 'layout',

    addPage: () => set((state) => {
        const newId = `page-${state.pages.length + 1}`;
        return {
            pages: [...state.pages, { id: newId, panels: [], bubbles: [], background: '#ffffff' }],
            currentPageId: newId
        };
    }),

    selectPage: (id) => set({ currentPageId: id }),

    addPanel: (pageId, panelData) => set((state) => ({
        pages: state.pages.map(p =>
            p.id === pageId
                ? { ...p, panels: [...p.panels, { ...panelData, id: crypto.randomUUID(), type: 'panel' }] }
                : p
        )
    })),

    updatePanel: (pageId, panelId, updates) => set((state) => ({
        pages: state.pages.map(p =>
            p.id === pageId
                ? {
                    ...p,
                    panels: p.panels.map(panel =>
                        panel.id === panelId ? { ...panel, ...updates } : panel
                    )
                }
                : p
        )
    })),

    selectElement: (id) => set({ selectedElementId: id })
}));
