import { create } from 'zustand';
import { temporal } from 'zundo';
import type { BalloonInstance } from '../types/balloon';

export interface Panel {
    id: string;
    type: 'panel';
    shapeType: 'rect' | 'polygon' | 'ellipse';
    x: number;
    y: number;
    width: number;
    height: number;
    points?: { x: number, y: number }[];
    imageUrl?: string;
    prompt?: string;
}



export interface Drawing {
    id: string;
    type: 'drawing';
    points: number[];
    stroke: string;
    strokeWidth: number;
}

export interface ComicPage {
    id: string;
    panels: Panel[];
    balloons: BalloonInstance[];
    drawings: Drawing[];
    background: string;
}

interface ComicState {
    pages: ComicPage[];
    currentPageId: string | null;
    selectedElementIds: string[];
    clipboard: (Panel | BalloonInstance | Drawing)[];
    mode: 'layout' | 'content' | 'lettering';
    exportTrigger: number;

    // Drawing Mode State
    isDrawingMode: boolean;
    brushColor: string;
    brushWidth: number;
    toggleDrawingMode: (isActive: boolean) => void;
    setBrushSettings: (color: string, width: number) => void;
    addDrawing: (pageId: string, drawing: Omit<Drawing, 'id' | 'type'>) => void;

    addPage: () => void;
    selectPage: (id: string) => void;
    addPanel: (pageId: string, panel: Omit<Panel, 'id' | 'type'>) => void;
    updatePanel: (pageId: string, panelId: string, updates: Partial<Panel>) => void;

    addBalloon: (pageId: string, balloon: Omit<BalloonInstance, 'id' | 'type'>) => void;
    updateBalloon: (pageId: string, balloonId: string, updates: Partial<BalloonInstance>) => void;



    setSelectedElements: (ids: string[]) => void;
    toggleSelection: (id: string) => void;
    clearSelection: () => void;
    copySelected: () => void;
    pasteClipboard: () => void;
    deleteSelected: () => void;

    // Object Manipulation
    bringToFront: (pageId: string, elementId: string) => void;
    sendToBack: (pageId: string, elementId: string) => void;
    cloneElement: (pageId: string, elementId: string) => void;
    removeElement: (pageId: string, elementId: string) => void;
    toggleFlip: (pageId: string, elementId: string, axis: 'horizontal' | 'vertical') => void;

    triggerExport: () => void;
}

export const useComicStore = create<ComicState>()(
    temporal(
        (set) => ({
            pages: [
                {
                    id: 'page-1',
                    panels: [],
                    balloons: [],
                    drawings: [],
                    background: '#ffffff'
                }
            ],
            currentPageId: 'page-1',
            selectedElementIds: [],
            clipboard: [],
            mode: 'layout',
            exportTrigger: 0,

            isDrawingMode: false,
            brushColor: '#000000',
            brushWidth: 3,

            toggleDrawingMode: (isActive) => set({ isDrawingMode: isActive }),
            setBrushSettings: (color, width) => set({ brushColor: color, brushWidth: width }),

            addDrawing: (pageId, drawing) => set((state) => ({
                pages: state.pages.map(p =>
                    p.id === pageId
                        ? { ...p, drawings: [...p.drawings, { ...drawing, id: crypto.randomUUID(), type: 'drawing' }] }
                        : p
                )
            })),

            addPage: () => set((state) => {
                const newId = `page-${state.pages.length + 1}`;
                return {
                    pages: [...state.pages, { id: newId, panels: [], balloons: [], drawings: [], background: '#ffffff' }],
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

            addBalloon: (pageId, balloonData) => set((state) => ({
                pages: state.pages.map(p =>
                    p.id === pageId
                        ? { ...p, balloons: [...p.balloons, { ...balloonData, id: crypto.randomUUID(), type: 'balloon' }] }
                        : p
                )
            })),

            updateBalloon: (pageId, balloonId, updates) => set((state) => ({
                pages: state.pages.map(p =>
                    p.id === pageId
                        ? {
                            ...p,
                            balloons: p.balloons.map(balloon =>
                                balloon.id === balloonId ? { ...balloon, ...updates } : balloon
                            )
                        }
                        : p
                )
            })),



            setSelectedElements: (ids) => set({ selectedElementIds: ids }),

            toggleSelection: (id) => set((state) => ({
                selectedElementIds: state.selectedElementIds.includes(id)
                    ? state.selectedElementIds.filter(x => x !== id)
                    : [...state.selectedElementIds, id]
            })),

            clearSelection: () => set({ selectedElementIds: [] }),

            copySelected: () => set((state) => {
                if (!state.currentPageId || state.selectedElementIds.length === 0) return state;
                const page = state.pages.find(p => p.id === state.currentPageId);
                if (!page) return state;

                const copied: (Panel | BalloonInstance | Drawing)[] = [];

                state.selectedElementIds.forEach(id => {
                    const panel = page.panels.find(p => p.id === id);
                    if (panel) copied.push(panel);
                    const balloon = page.balloons.find(b => b.id === id);
                    if (balloon) copied.push(balloon);
                    const drawing = page.drawings.find(d => d.id === id);
                    if (drawing) copied.push(drawing);
                });

                return { clipboard: copied };
            }),

            deleteSelected: () => set((state) => {
                if (!state.currentPageId || state.selectedElementIds.length === 0) return state;
                return {
                    pages: state.pages.map(p => p.id === state.currentPageId ? {
                        ...p,
                        panels: p.panels.filter(panel => !state.selectedElementIds.includes(panel.id)),
                        balloons: p.balloons.filter(balloon => !state.selectedElementIds.includes(balloon.id)),
                        drawings: p.drawings?.filter(x => !state.selectedElementIds.includes(x.id)) || []
                    } : p),
                    selectedElementIds: []
                };
            }),

            pasteClipboard: () => set((state) => {
                if (!state.currentPageId || state.clipboard.length === 0) return state;

                const newIds: string[] = [];

                const newPages = state.pages.map(p => {
                    if (p.id !== state.currentPageId) return p;

                    const newPanels = [...p.panels];
                    const newBalloons = [...p.balloons];
                    const newDrawings = [...(p.drawings || [])];

                    state.clipboard.forEach(item => {
                        const newId = crypto.randomUUID();
                        newIds.push(newId);

                        if (item.type === 'panel') {
                            newPanels.push({ ...item, id: newId, x: item.x + 20, y: item.y + 20 } as Panel);
                        } else if (item.type === 'balloon') {
                            newBalloons.push({ ...item, id: newId, x: item.x + 20, y: item.y + 20 } as BalloonInstance);
                        } else if (item.type === 'drawing') {
                            newDrawings.push({ ...item, id: newId });
                        }
                    });

                    return { ...p, panels: newPanels, balloons: newBalloons, drawings: newDrawings };
                });

                return { pages: newPages, selectedElementIds: newIds };
            }),

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

                const balloonIndex = page.balloons.findIndex(b => b.id === elementId);
                if (balloonIndex > -1) {
                    const newBalloons = [...page.balloons];
                    const [balloon] = newBalloons.splice(balloonIndex, 1);
                    newBalloons.push(balloon);
                    return {
                        pages: state.pages.map(p => p.id === pageId ? { ...p, balloons: newBalloons } : p)
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

                const balloonIndex = page.balloons.findIndex(b => b.id === elementId);
                if (balloonIndex > -1) {
                    const newBalloons = [...page.balloons];
                    const [balloon] = newBalloons.splice(balloonIndex, 1);
                    newBalloons.unshift(balloon);
                    return {
                        pages: state.pages.map(p => p.id === pageId ? { ...p, balloons: newBalloons } : p)
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
                        selectedElementIds: [newPanel.id]
                    };
                }

                const balloon = page.balloons.find(b => b.id === elementId);
                if (balloon) {
                    const newBalloon: BalloonInstance = {
                        ...balloon,
                        id: crypto.randomUUID(),
                        x: balloon.x + 20,
                        y: balloon.y + 20
                    };
                    return {
                        pages: state.pages.map(p => p.id === pageId ? { ...p, balloons: [...p.balloons, newBalloon] } : p),
                        selectedElementIds: [newBalloon.id]
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
                        balloons: p.balloons.filter(balloon => balloon.id !== elementId),
                        drawings: p.drawings?.filter(x => x.id !== elementId) || []
                    } : p),
                    selectedElementIds: state.selectedElementIds.filter(id => id !== elementId)
                };
            }),

            triggerExport: () => set((state) => ({ exportTrigger: state.exportTrigger + 1 })),

            toggleFlip: (pageId, elementId, axis) => set((state) => ({
                pages: state.pages.map(p => p.id === pageId ? {
                    ...p,
                    balloons: p.balloons.map(b => {
                        if (b.id !== elementId) return b;
                        return {
                            ...b,
                            flipX: axis === 'horizontal' ? !b.flipX : b.flipX,
                            flipY: axis === 'vertical' ? !b.flipY : b.flipY
                        };
                    })
                } : p)
            }))
        }),
        {
            partialize: (state) => ({ pages: state.pages }),
            limit: 100
        }
    )
);
