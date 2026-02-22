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
    isLocked?: boolean;
    isVisible?: boolean;

    // FX
    shadowBlur?: number;
    shadowOffsetX?: number;
    shadowOffsetY?: number;
    shadowOpacity?: number;
    shadowColor?: string;
    glowColor?: string;
    glowBlur?: number;
    glowSpread?: number;
    glowOpacity?: number;

    // Advanced Fill
    imageFillMode?: 'cover' | 'stretch' | 'center' | 'decal';
    imageOffsetX?: number;
    imageOffsetY?: number;
    imageScale?: number;

    // Texture
    textureId?: string;
    textureOpacity?: number;
}



export interface Drawing {
    id: string;
    type: 'drawing';
    points: number[];
    stroke: string;
    strokeWidth: number;
    isLocked?: boolean;
    isVisible?: boolean;
}

export interface ComicPage {
    id: string;
    panels: Panel[];
    balloons: BalloonInstance[];
    drawings: Drawing[];
    background: string;
    layerOrder: string[]; // Order of IDs from back to front
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
    syncBalloonStyle: (balloonId: string) => void;



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

    // Layer System specific
    reorderLayer: (pageId: string, activeId: string, overId: string) => void;
    toggleLayerVisibility: (pageId: string, elementId: string) => void;
    toggleLayerLock: (pageId: string, elementId: string) => void;

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
                    background: '#ffffff',
                    layerOrder: []
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

            addDrawing: (pageId, drawing) => set((state) => {
                const newId = crypto.randomUUID();
                return {
                    pages: state.pages.map(p =>
                        p.id === pageId
                            ? {
                                ...p,
                                drawings: [...p.drawings, { ...drawing, id: newId, type: 'drawing', isVisible: true, isLocked: false }],
                                layerOrder: [...p.layerOrder, newId]
                            }
                            : p
                    )
                };
            }),

            addPage: () => set((state) => {
                const newId = `page-${state.pages.length + 1}`;
                return {
                    pages: [...state.pages, { id: newId, panels: [], balloons: [], drawings: [], background: '#ffffff', layerOrder: [] }],
                    currentPageId: newId
                };
            }),

            selectPage: (id) => set({ currentPageId: id }),

            addPanel: (pageId, panelData) => set((state) => {
                const newId = crypto.randomUUID();
                return {
                    pages: state.pages.map(p =>
                        p.id === pageId
                            ? {
                                ...p,
                                panels: [...p.panels, { ...panelData, id: newId, type: 'panel', isVisible: true, isLocked: false }],
                                layerOrder: [...p.layerOrder, newId]
                            }
                            : p
                    )
                };
            }),

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

            addBalloon: (pageId, balloonData) => set((state) => {
                const newId = crypto.randomUUID();
                return {
                    pages: state.pages.map(p =>
                        p.id === pageId
                            ? {
                                ...p,
                                balloons: [...p.balloons, { ...balloonData, id: newId, type: 'balloon', isVisible: true, isLocked: false, autoSize: true, padding: 20 }],
                                layerOrder: [...p.layerOrder, newId]
                            }
                            : p
                    )
                };
            }),

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

            syncBalloonStyle: (balloonId) => set((state) => {
                let sourceStyleId: string | null = null;
                let sourceOverrides: any = null;

                for (const page of state.pages) {
                    const balloon = page.balloons.find(b => b.id === balloonId);
                    if (balloon) {
                        sourceStyleId = balloon.styleId;
                        sourceOverrides = balloon.overrides ? { ...balloon.overrides } : {};
                        break;
                    }
                }

                if (!sourceStyleId) return state;

                return {
                    pages: state.pages.map(p => ({
                        ...p,
                        balloons: p.balloons.map(b =>
                            b.styleId === sourceStyleId
                                ? { ...b, overrides: { ...(b.overrides || {}), ...sourceOverrides } }
                                : b
                        )
                    }))
                };
            }),

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
                        drawings: p.drawings?.filter(x => !state.selectedElementIds.includes(x.id)) || [],
                        layerOrder: p.layerOrder.filter(id => !state.selectedElementIds.includes(id))
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
                    const newLayerOrder = [...p.layerOrder];

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

                        // Push into layer order rendering top
                        newLayerOrder.push(newId);
                    });

                    return { ...p, panels: newPanels, balloons: newBalloons, drawings: newDrawings, layerOrder: newLayerOrder };
                });

                return { pages: newPages, selectedElementIds: newIds };
            }),

            bringToFront: (pageId, elementId) => set((state) => {
                const page = state.pages.find(p => p.id === pageId);
                if (!page) return state;

                const index = page.layerOrder.indexOf(elementId);
                if (index > -1 && index < page.layerOrder.length - 1) {
                    const newOrder = [...page.layerOrder];
                    newOrder.splice(index, 1);
                    newOrder.push(elementId);
                    return {
                        pages: state.pages.map(p => p.id === pageId ? { ...p, layerOrder: newOrder } : p)
                    };
                }
                return state;
            }),

            sendToBack: (pageId, elementId) => set((state) => {
                const page = state.pages.find(p => p.id === pageId);
                if (!page) return state;

                const index = page.layerOrder.indexOf(elementId);
                if (index > 0) {
                    const newOrder = [...page.layerOrder];
                    newOrder.splice(index, 1);
                    newOrder.unshift(elementId);
                    return {
                        pages: state.pages.map(p => p.id === pageId ? { ...p, layerOrder: newOrder } : p)
                    };
                }
                return state;
            }),

            cloneElement: (pageId, elementId) => set((state) => {
                const page = state.pages.find(p => p.id === pageId);
                if (!page) return state;

                let clonedId: string | undefined;

                const panel = page.panels.find(p => p.id === elementId);
                if (panel) {
                    clonedId = crypto.randomUUID();
                    const newPanel: Panel = {
                        ...panel,
                        id: clonedId,
                        x: panel.x + 20,
                        y: panel.y + 20
                    };
                    return {
                        pages: state.pages.map(p => p.id === pageId ? {
                            ...p,
                            panels: [...p.panels, newPanel],
                            layerOrder: [...p.layerOrder, clonedId!]
                        } : p),
                        selectedElementIds: [clonedId]
                    };
                }

                const balloon = page.balloons.find(b => b.id === elementId);
                if (balloon) {
                    clonedId = crypto.randomUUID();
                    const newBalloon: BalloonInstance = {
                        ...balloon,
                        id: clonedId,
                        x: balloon.x + 20,
                        y: balloon.y + 20
                    };
                    return {
                        pages: state.pages.map(p => p.id === pageId ? {
                            ...p,
                            balloons: [...p.balloons, newBalloon],
                            layerOrder: [...p.layerOrder, clonedId!]
                        } : p),
                        selectedElementIds: [clonedId]
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
                        drawings: p.drawings?.filter(x => x.id !== elementId) || [],
                        layerOrder: p.layerOrder.filter(id => id !== elementId)
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
            })),

            reorderLayer: (pageId, activeId, overId) => set((state) => {
                const page = state.pages.find(p => p.id === pageId);
                if (!page) return state;

                const oldIndex = page.layerOrder.indexOf(activeId);
                const newIndex = page.layerOrder.indexOf(overId);

                if (oldIndex === -1 || newIndex === -1) return state;

                const newOrder = [...page.layerOrder];
                // Move element
                newOrder.splice(oldIndex, 1);
                newOrder.splice(newIndex, 0, activeId);

                return {
                    pages: state.pages.map(p => p.id === pageId ? { ...p, layerOrder: newOrder } : p)
                }
            }),

            toggleLayerVisibility: (pageId, elementId) => set((state) => {
                return {
                    pages: state.pages.map(p => {
                        if (p.id !== pageId) return p;
                        return {
                            ...p,
                            panels: p.panels.map(panel => panel.id === elementId ? { ...panel, isVisible: panel.isVisible === false ? true : false } : panel),
                            balloons: p.balloons.map(balloon => balloon.id === elementId ? { ...balloon, isVisible: balloon.isVisible === false ? true : false } : balloon),
                            drawings: p.drawings.map(drawing => drawing.id === elementId ? { ...drawing, isVisible: drawing.isVisible === false ? true : false } : drawing),
                        }
                    })
                }
            }),

            toggleLayerLock: (pageId, elementId) => set((state) => {
                return {
                    pages: state.pages.map(p => {
                        if (p.id !== pageId) return p;
                        return {
                            ...p,
                            panels: p.panels.map(panel => panel.id === elementId ? { ...panel, isLocked: !panel.isLocked } : panel),
                            balloons: p.balloons.map(balloon => balloon.id === elementId ? { ...balloon, isLocked: !balloon.isLocked } : balloon),
                            drawings: p.drawings.map(drawing => drawing.id === elementId ? { ...drawing, isLocked: !drawing.isLocked } : drawing),
                        }
                    })
                }
            })
        }),
        {
            partialize: (state) => ({ pages: state.pages }),
            limit: 100
        }
    )
);
