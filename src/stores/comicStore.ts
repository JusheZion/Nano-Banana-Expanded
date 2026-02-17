import { create } from 'zustand';

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
    width: number;
    height: number;
    rotation?: number;
}

export interface ComicPage {
    id: string;
    panels: Panel[];
    bubbles: Bubble[];
    background: string;
}

interface ComicState {
    pages: ComicPage[];
    currentPageId: string | null;
    selectedElementId: string | null;
    mode: 'layout' | 'content' | 'lettering';
    exportTrigger: number; // Increment to trigger export

    addPage: () => void;
    selectPage: (id: string) => void;
    addPanel: (pageId: string, panel: Omit<Panel, 'id' | 'type'>) => void;
    updatePanel: (pageId: string, panelId: string, updates: Partial<Panel>) => void;
    addBubble: (pageId: string, bubble: Omit<Bubble, 'id' | 'type'>) => void;
    updateBubble: (pageId: string, bubbleId: string, updates: Partial<Bubble>) => void;
    selectElement: (id: string | null) => void;

    // Object Manipulation
    bringToFront: (pageId: string, elementId: string) => void;
    sendToBack: (pageId: string, elementId: string) => void;
    cloneElement: (pageId: string, elementId: string) => void;
    removeElement: (pageId: string, elementId: string) => void;

    triggerExport: () => void;
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
    exportTrigger: 0,

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

    addBubble: (pageId, bubbleData) => set((state) => ({
        pages: state.pages.map(p =>
            p.id === pageId
                ? { ...p, bubbles: [...p.bubbles, { ...bubbleData, id: crypto.randomUUID(), type: 'bubble' }] }
                : p
        )
    })),

    updateBubble: (pageId, bubbleId, updates) => set((state) => ({
        pages: state.pages.map(p =>
            p.id === pageId
                ? {
                    ...p,
                    bubbles: p.bubbles.map(bubble =>
                        bubble.id === bubbleId ? { ...bubble, ...updates } : bubble
                    )
                }
                : p
        )
    })),

    selectElement: (id) => set({ selectedElementId: id }),

    bringToFront: (pageId, elementId) => set((state) => {
        const page = state.pages.find(p => p.id === pageId);
        if (!page) return state;

        const panelIndex = page.panels.findIndex(p => p.id === elementId);
        if (panelIndex > -1) {
            const newPanels = [...page.panels];
            const [panel] = newPanels.splice(panelIndex, 1);
            newPanels.push(panel);
            return {
                pages: state.pages.map(p => p.id === pageId ? { ...p, panels: newPanels } : p)
            };
        }

        const bubbleIndex = page.bubbles.findIndex(b => b.id === elementId);
        if (bubbleIndex > -1) {
            const newBubbles = [...page.bubbles];
            const [bubble] = newBubbles.splice(bubbleIndex, 1);
            newBubbles.push(bubble);
            return {
                pages: state.pages.map(p => p.id === pageId ? { ...p, bubbles: newBubbles } : p)
            };
        }
        return state;
    }),

    sendToBack: (pageId, elementId) => set((state) => {
        const page = state.pages.find(p => p.id === pageId);
        if (!page) return state;

        const panelIndex = page.panels.findIndex(p => p.id === elementId);
        if (panelIndex > -1) {
            const newPanels = [...page.panels];
            const [panel] = newPanels.splice(panelIndex, 1);
            newPanels.unshift(panel);
            return {
                pages: state.pages.map(p => p.id === pageId ? { ...p, panels: newPanels } : p)
            };
        }

        const bubbleIndex = page.bubbles.findIndex(b => b.id === elementId);
        if (bubbleIndex > -1) {
            const newBubbles = [...page.bubbles];
            const [bubble] = newBubbles.splice(bubbleIndex, 1);
            newBubbles.unshift(bubble);
            return {
                pages: state.pages.map(p => p.id === pageId ? { ...p, bubbles: newBubbles } : p)
            };
        }
        return state;
    }),

    cloneElement: (pageId, elementId) => set((state) => {
        const page = state.pages.find(p => p.id === pageId);
        if (!page) return state;

        const panel = page.panels.find(p => p.id === elementId);
        if (panel) {
            const newPanel: Panel = {
                ...panel,
                id: crypto.randomUUID(),
                x: panel.x + 20,
                y: panel.y + 20
            };
            return {
                pages: state.pages.map(p => p.id === pageId ? { ...p, panels: [...p.panels, newPanel] } : p),
                selectedElementId: newPanel.id
            };
        }

        const bubble = page.bubbles.find(b => b.id === elementId);
        if (bubble) {
            const newBubble: Bubble = {
                ...bubble,
                id: crypto.randomUUID(),
                x: bubble.x + 20,
                y: bubble.y + 20
            };
            return {
                pages: state.pages.map(p => p.id === pageId ? { ...p, bubbles: [...p.bubbles, newBubble] } : p),
                selectedElementId: newBubble.id
            };
        }
        return state;
    }),

    removeElement: (pageId, elementId) => set((state) => {
        const page = state.pages.find(p => p.id === pageId);
        if (!page) return state;

        return {
            pages: state.pages.map(p => p.id === pageId ? {
                ...p,
                panels: p.panels.filter(panel => panel.id !== elementId),
                bubbles: p.bubbles.filter(bubble => bubble.id !== elementId)
            } : p),
            selectedElementId: state.selectedElementId === elementId ? null : state.selectedElementId
        };
    }),

    triggerExport: () => set((state) => ({ exportTrigger: state.exportTrigger + 1 }))
}));
