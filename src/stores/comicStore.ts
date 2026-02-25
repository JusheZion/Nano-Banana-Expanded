import { create } from 'zustand';
import { persist } from 'zustand/middleware';
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
    rotation?: number;
    flipX?: boolean;
    flipY?: boolean;

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
    projectSettings: {
        inclusiveBiasEnabled: boolean;
        demographicFocus: string;
    };
    pages: ComicPage[];
    currentPageId: string | null;
    layoutMode: 'webtoon' | 'spread';
    zoomLevel: number;
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

    setLayoutMode: (mode: 'webtoon' | 'spread') => void;
    setZoomLevel: (zoom: number | ((prev: number) => number)) => void;
    addPage: () => void;
    removePage: (id: string) => void;
    duplicatePage: (id: string) => void;
    reorderPages: (activeId: string, overId: string) => void;
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

    updateProjectSettings: (settings: Partial<ComicState['projectSettings']>) => void;
    serializeProject: () => void;
    loadProject: (jsonString: string) => void;
    splitPanel: (pageId: string, panelId: string, direction: 'horizontal' | 'vertical', slant?: number) => void;
}

export const useComicStore = create<ComicState>()(
    temporal(
        persist(
            (set) => ({
                projectSettings: {
                    inclusiveBiasEnabled: false,
                    demographicFocus: ''
                },
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
                layoutMode: 'webtoon',
                zoomLevel: 1,
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

                setLayoutMode: (mode) => set({ layoutMode: mode }),
                setZoomLevel: (zoom) => set((state) => ({ zoomLevel: typeof zoom === 'function' ? zoom(state.zoomLevel) : zoom })),

                addPage: () => set((state) => {
                    const newId = `page-${crypto.randomUUID()}`;
                    return {
                        pages: [...state.pages, { id: newId, panels: [], balloons: [], drawings: [], background: '#ffffff', layerOrder: [] }],
                        currentPageId: newId
                    };
                }),

                removePage: (id) => set((state) => {
                    if (state.pages.length <= 1) return state; // Prevent removing last page
                    const filtered = state.pages.filter(p => p.id !== id);
                    return {
                        pages: filtered,
                        currentPageId: state.currentPageId === id ? filtered[0].id : state.currentPageId
                    };
                }),

                duplicatePage: (id) => set((state) => {
                    const pageToDup = state.pages.find(p => p.id === id);
                    if (!pageToDup) return state;

                    const idMap = new Map<string, string>();
                    const newPanels = pageToDup.panels.map(p => { const newId = crypto.randomUUID(); idMap.set(p.id, newId); return { ...p, id: newId }; });
                    const newBalloons = pageToDup.balloons.map(b => { const newId = crypto.randomUUID(); idMap.set(b.id, newId); return { ...b, id: newId }; });
                    const newDrawings = pageToDup.drawings.map(d => { const newId = crypto.randomUUID(); idMap.set(d.id, newId); return { ...d, id: newId }; });

                    const newPage: ComicPage = {
                        ...pageToDup,
                        id: `page-${crypto.randomUUID()}`,
                        panels: newPanels,
                        balloons: newBalloons,
                        drawings: newDrawings,
                        layerOrder: pageToDup.layerOrder.map(oldId => idMap.get(oldId) || oldId)
                    };

                    const index = state.pages.findIndex(p => p.id === id);
                    const newPages = [...state.pages];
                    newPages.splice(index + 1, 0, newPage);
                    return { pages: newPages, currentPageId: newPage.id };
                }),

                reorderPages: (activeId, overId) => set((state) => {
                    const oldIndex = state.pages.findIndex(p => p.id === activeId);
                    const newIndex = state.pages.findIndex(p => p.id === overId);
                    if (oldIndex === -1 || newIndex === -1) return state;
                    const newPages = [...state.pages];
                    const [moved] = newPages.splice(oldIndex, 1);
                    newPages.splice(newIndex, 0, moved);
                    return { pages: newPages };
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
                        }),
                        panels: p.panels.map(panel => {
                            if (panel.id !== elementId) return panel;
                            if (panel.shapeType !== 'polygon' || !panel.points) {
                                return {
                                    ...panel,
                                    flipX: axis === 'horizontal' ? !panel.flipX : panel.flipX,
                                    flipY: axis === 'vertical' ? !panel.flipY : panel.flipY
                                };
                            }

                            // For polygons, mirror the points around the center of its bounding box.
                            const minX = Math.min(...panel.points.map(pt => pt.x));
                            const maxX = Math.max(...panel.points.map(pt => pt.x));
                            const minY = Math.min(...panel.points.map(pt => pt.y));
                            const maxY = Math.max(...panel.points.map(pt => pt.y));
                            const centerX = (minX + maxX) / 2;
                            const centerY = (minY + maxY) / 2;

                            const newPoints = panel.points.map(pt => ({
                                x: axis === 'horizontal' ? centerX - (pt.x - centerX) : pt.x,
                                y: axis === 'vertical' ? centerY - (pt.y - centerY) : pt.y
                            }));

                            // We reverse the points array to maintain the original geometric polygon winding order
                            newPoints.reverse();

                            return {
                                ...panel,
                                points: newPoints
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
                }),

                updateProjectSettings: (settings) => set((state) => ({
                    projectSettings: { ...state.projectSettings, ...settings }
                })),

                serializeProject: () => {
                    const { pages, projectSettings } = useComicStore.getState();
                    const data = {
                        version: "2.0",
                        type: "comic-project",
                        projectSettings,
                        pages
                    };
                    const json = JSON.stringify(data, null, 2);
                    const blob = new Blob([json], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `project-${Date.now()}.json`;
                    a.click();
                    URL.revokeObjectURL(url);
                },

                loadProject: (jsonString) => {
                    try {
                        const data = JSON.parse(jsonString);
                        if (data.type === 'comic-project' && data.pages) {
                            useComicStore.getState().updateProjectSettings(data.projectSettings || {});
                            useComicStore.getState().pages = data.pages;
                            // Trigger re-render by mutating state
                            set({ pages: data.pages });
                        }
                    } catch (e) {
                        console.error("Failed to load project", e);
                    }
                },

                splitPanel: (pageId, panelId, direction, slant = 0) => set((state) => {
                    const page = state.pages.find(p => p.id === pageId);
                    if (!page) return state;
                    const panel = page.panels.find(p => p.id === panelId);
                    if (!panel) return state;

                    // 1. Get 4 absolute world points
                    let p0, p1, p2, p3;
                    if (panel.shapeType === 'rect' || !panel.points || panel.points.length !== 4) {
                        p0 = { x: panel.x, y: panel.y };
                        p1 = { x: panel.x + panel.width, y: panel.y };
                        p2 = { x: panel.x + panel.width, y: panel.y + panel.height };
                        p3 = { x: panel.x, y: panel.y + panel.height };
                    } else {
                        p0 = { x: panel.x + panel.points[0].x, y: panel.y + panel.points[0].y };
                        p1 = { x: panel.x + panel.points[1].x, y: panel.y + panel.points[1].y };
                        p2 = { x: panel.x + panel.points[2].x, y: panel.y + panel.points[2].y };
                        p3 = { x: panel.x + panel.points[3].x, y: panel.y + panel.points[3].y };
                    }

                    const gap = 16;
                    let leftPoints, rightPoints;

                    const lerpY = (A: { x: number, y: number }, B: { x: number, y: number }, x: number) => {
                        if (Math.abs(A.x - B.x) < 0.01) return A.y;
                        return A.y + (x - A.x) * (B.y - A.y) / (B.x - A.x);
                    };
                    const lerpX = (A: { x: number, y: number }, B: { x: number, y: number }, y: number) => {
                        if (Math.abs(A.y - B.y) < 0.01) return A.x;
                        return A.x + (y - A.y) * (B.x - A.x) / (B.y - A.y);
                    };

                    if (direction === 'vertical') {
                        // Vertical cut creates left and right panels
                        let top_x = (p0.x + p1.x) / 2 + slant;
                        let bot_x = (p3.x + p2.x) / 2 - slant;

                        const cut_top_left = { x: top_x - gap / 2, y: lerpY(p0, p1, top_x - gap / 2) };
                        const cut_bot_left = { x: bot_x - gap / 2, y: lerpY(p3, p2, bot_x - gap / 2) };
                        const cut_top_right = { x: top_x + gap / 2, y: lerpY(p0, p1, top_x + gap / 2) };
                        const cut_bot_right = { x: bot_x + gap / 2, y: lerpY(p3, p2, bot_x + gap / 2) };

                        leftPoints = [p0, cut_top_left, cut_bot_left, p3];
                        rightPoints = [cut_top_right, p1, p2, cut_bot_right];
                    } else {
                        // Horizontal cut creates top and bottom panels
                        let left_y = (p0.y + p3.y) / 2 + slant;
                        let right_y = (p1.y + p2.y) / 2 - slant;

                        const cut_left_top = { x: lerpX(p0, p3, left_y - gap / 2), y: left_y - gap / 2 };
                        const cut_right_top = { x: lerpX(p1, p2, right_y - gap / 2), y: right_y - gap / 2 };
                        const cut_left_bot = { x: lerpX(p0, p3, left_y + gap / 2), y: left_y + gap / 2 };
                        const cut_right_bot = { x: lerpX(p1, p2, right_y + gap / 2), y: right_y + gap / 2 };

                        leftPoints = [p0, p1, cut_right_top, cut_left_top];
                        rightPoints = [cut_left_bot, cut_right_bot, p2, p3];
                    }

                    // Convert back to relative bounded panels
                    const makePanel = (pts: { x: number, y: number }[]) => {
                        const minX = Math.min(...pts.map(p => p.x));
                        const minY = Math.min(...pts.map(p => p.y));
                        const maxX = Math.max(...pts.map(p => p.x));
                        const maxY = Math.max(...pts.map(p => p.y));
                        return {
                            ...panel,
                            id: crypto.randomUUID(),
                            shapeType: 'polygon' as const,
                            x: minX,
                            y: minY,
                            width: Math.max(1, maxX - minX),
                            height: Math.max(1, maxY - minY),
                            points: pts.map(p => ({ x: p.x - minX, y: p.y - minY })),
                            imageUrl: undefined,
                            imageFillMode: 'cover' as const,
                            imageScale: 1,
                            imageOffsetX: 0,
                            imageOffsetY: 0
                        };
                    };

                    const panelA = makePanel(leftPoints);
                    const panelB = makePanel(rightPoints);

                    const newPanels = page.panels.map(p => p.id === panelId ? panelA : p);
                    newPanels.push(panelB);

                    const newLayerOrder = page.layerOrder.flatMap(id => id === panelId ? [panelA.id, panelB.id] : [id]);

                    return {
                        pages: state.pages.map(p =>
                            p.id === pageId
                                ? { ...p, panels: newPanels, layerOrder: newLayerOrder }
                                : p
                        )
                    };
                })
            }),
            {
                name: 'nano-banana-comic',
                partialize: (state) => ({ pages: state.pages, projectSettings: state.projectSettings, layoutMode: state.layoutMode })
            }
        ),
        {
            partialize: (state) => ({ pages: state.pages, projectSettings: state.projectSettings, layoutMode: state.layoutMode }),
            limit: 100
        }
    )
);
