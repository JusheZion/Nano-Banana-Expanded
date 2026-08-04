import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { createComicPersistStorage } from '../shared/lib/idbComicStorage';
import { GENRE_REGISTRY } from '../modes/comic/data/GenreRegistry';
import type { Genre, GenreId } from '../modes/comic/data/GenreRegistry';
import type { BalloonInstance } from '../types/balloon';
import type { GradientSpec } from '../types/gradient';
import type { GuidedComicBalloonSeed } from '../portals/guided-comic/writersWorkshopBridge';
import type { GuidedComicLayoutHandoff, GuidedComicLayoutTemplate } from './guidedComicLayoutBridge';

export interface Panel {
    id: string;
    type: 'panel';
    shapeType: 'rect' | 'polygon' | 'ellipse' | 'halfCircle' | 'quarterCircle' | 'sector';
    x: number;
    y: number;
    width: number;
    height: number;
    points?: { x: number, y: number }[];
    /** For shapeType 'sector': central angle in degrees (1–360). */
    centralAngle?: number;
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
    imageFillMode?: 'cover' | 'contain' | 'stretch' | 'center' | 'decal';
    imageOffsetX?: number;
    imageOffsetY?: number;
    imageScale?: number;
    imageFocusX?: number;
    imageFocusY?: number;

    // Guided Comic narrative metadata carried through handoff for later lettering/polish.
    guidedPageNumber?: number;
    guidedPanelNumber?: number;
    guidedPanelBeat?: string;
    guidedDialogueText?: string;
    guidedVisualPrompt?: string;
    guidedLayoutIntent?: 'feature' | 'wide' | 'tall' | 'normal';

    // Texture
    textureId?: string;
    textureOpacity?: number;

    strokeColor?: string;
    /** Phase 15: gradient fill/stroke (when set, overrides solid fill) */
    fillGradient?: GradientSpec;
    strokeGradient?: GradientSpec;
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

/** Global page styling (canvas background). */
export interface PageSettings {
    backgroundColor: string;
    backgroundImage?: string;
    bgOpacity: number;
    /** How the background image fits the page. Defaults to 'cover' (fills without distortion). */
    bgFillMode?: 'cover' | 'contain' | 'stretch' | 'center';
    /** Focus point (0..1) used to position the image within the page for cover/contain/center. Default 0.5/0.5. */
    bgFocusX?: number;
    bgFocusY?: number;
}

/** Floating asset on the stage (above panels, no panel clipping). type 'sfx' = stamp text (BOOM, ZAP, etc.) with gold fill + black outline. */
export interface OverlayObject {
    id: string;
    type: 'image' | 'sfx';
    src: string;
    /** For type 'sfx', display this text (e.g. BOOM, ZAP, CRASH). */
    text?: string;
    x: number;
    y: number;
    rotation: number;
    scaleX: number;
    scaleY: number;
    zIndex: number;
}

export interface ComicPage {
    id: string;
    panels: Panel[];
    balloons: BalloonInstance[];
    drawings: Drawing[];
    overlays?: OverlayObject[];
    guidedBalloonSeeds?: GuidedComicBalloonSeed[];
    background: string;
    /** Per-page background image (data URL or resolvable src). Independent of other pages. */
    backgroundImage?: string;
    /** How this page's background image fits. Defaults to 'cover'. */
    bgFillMode?: 'cover' | 'contain' | 'stretch' | 'center';
    /** Focus point (0..1) for positioning the background image. Default 0.5/0.5. */
    bgFocusX?: number;
    bgFocusY?: number;
    /** Opacity (0..1) of this page's background image. Default 1. */
    bgOpacity?: number;
    layerOrder: string[]; // Order of IDs from back to front
    /** When true, gutter snapping is disabled for this page (full-bleed cover). */
    isCover?: boolean;
}

/** Serialized panel shape for templates (no id/image/prompt). */
export interface PanelTemplateEntry {
    shapeType: Panel['shapeType'];
    x: number;
    y: number;
    width: number;
    height: number;
    points?: { x: number; y: number }[];
}

export interface PanelTemplate {
    id: string;
    name: string;
    panels: PanelTemplateEntry[];
}

interface ComicState {
    projectSettings: {
        inclusiveBiasEnabled: boolean;
        demographicFocus: string;
        /** When true, the contextual ribbon starts pinned (visible) by default. */
        ribbonPinnedDefault: boolean;
        /** Default page background color for new pages and initial canvas (e.g. #ffffff). */
        defaultPageBackgroundColor: string;
    };
    gutterSize: number;
    pageSettings: PageSettings;
    pages: ComicPage[];
    currentPageId: string | null;
    currentGenreId: GenreId;
    customGenre: Genre;
    layoutMode: 'webtoon' | 'spread';
    zoomLevel: number;
    selectedElementIds: string[];
    clipboard: (Panel | BalloonInstance | Drawing)[];
    mode: 'layout' | 'content' | 'lettering';
    exportFormat: 'png' | 'pdf' | null;
    /** Right-click context menu on canvas */
    contextMenu: {
        open: boolean;
        x: number;
        y: number;
        context: 'balloon' | 'panel' | 'empty';
        pageId?: string;
        balloonId?: string;
        panelId?: string;
        /** Page-local coords when opening on empty (for Add panel at cursor). */
        pageLocalX?: number;
        pageLocalY?: number;
    };
    /** When true, next stage click places a new panel centered at cursor (Position on Click). */
    placePanelAtNextClick: boolean;
    /** Shape to use when placing a panel (polygon = rectangle, ellipse = circle). */
    placePanelShape: 'polygon' | 'ellipse';
    /** Last pointer position on the canvas (page-local) for instant panel placement. */
    lastCanvasPosition: { pageId: string; x: number; y: number } | null;
    templates: PanelTemplate[];
    _autoSaveTick: number;
    /** Phase 15: color picker favorites (hex, max 12) and recently used (max 16), persisted */
    colorFavorites: string[];
    colorRecentlyUsed: string[];

    /** Phase 16: groups per page. Each group is an array of element ids (panels/balloons) that move together. */
    groupsByPage: Record<string, string[][]>;
    /** When set, the balloon with this id is in "text-box edit" mode (Transformer on text group only). UI-only, not persisted. */
    textBoxEditBalloonId: string | null;

    // Drawing Mode State
    isDrawingMode: boolean;
    brushColor: string;
    brushWidth: number;
    toggleDrawingMode: (isActive: boolean) => void;
    // Knife (split panel) tool — shared so main tool strip and canvas can toggle/read
    isKnifeMode: boolean;
    setKnifeMode: (active: boolean) => void;
    setBrushSettings: (color: string, width: number) => void;
    addDrawing: (pageId: string, drawing: Omit<Drawing, 'id' | 'type'>) => void;

    setLayoutMode: (mode: 'webtoon' | 'spread') => void;
    setZoomLevel: (zoom: number | ((prev: number) => number)) => void;
    setGenre: (genreId: GenreId) => void;
    addPage: () => void;
    removePage: (id: string) => void;
    duplicatePage: (id: string) => void;
    reorderPages: (activeId: string, overId: string) => void;
    selectPage: (id: string) => void;
    addPanel: (pageId: string, panel: Omit<Panel, 'id' | 'type'>) => void;
    insertImageIntoWorkspace: (imageUrl: string, options?: { width?: number; height?: number; sourceLabel?: string }) => void;
    updatePanel: (pageId: string, panelId: string, updates: Partial<Panel>) => void;

    addBalloon: (pageId: string, balloon: Omit<BalloonInstance, 'id' | 'type'>) => void;
    updateBalloon: (pageId: string, balloonId: string, updates: Partial<BalloonInstance>) => void;
    syncBalloonStyle: (balloonId: string) => void;
    addColorToFavorites: (hex: string) => void;
    removeColorFromFavorites: (hex: string) => void;
    addColorToRecentlyUsed: (hex: string) => void;



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
    reorderGroup: (pageId: string, groupMemberId: string, overId: string) => void;
    toggleLayerVisibility: (pageId: string, elementId: string) => void;
    toggleLayerLock: (pageId: string, elementId: string) => void;

    // Groups (Phase 16)
    createGroup: (pageId: string, elementIds: string[]) => void;
    ungroup: (pageId: string, elementId: string) => void;
    getGroupMembers: (pageId: string, elementId: string) => string[] | null;
    setTextBoxEditBalloonId: (id: string | null) => void;

    triggerExport: (format: 'png' | 'pdf') => void;
    clearExport: () => void;
    openContextMenu: (params: { x: number; y: number; context: 'balloon' | 'panel' | 'empty'; pageId?: string; balloonId?: string; panelId?: string; pageLocalX?: number; pageLocalY?: number }) => void;
    closeContextMenu: () => void;
    setPlacePanelAtNextClick: (active: boolean, shape?: 'polygon' | 'ellipse') => void;
    setLastCanvasPosition: (pos: { pageId: string; x: number; y: number } | null) => void;

    // Genre Management
    applyGenreToAll: () => void;
    updateCustomGenre: (updates: Partial<Genre>, paletteUpdates?: Partial<Genre['palette']>) => void;
    updateProjectSettings: (settings: Partial<ComicState['projectSettings']>) => void;
    setGutterSize: (size: number) => void;
    setPageSettings: (settings: Partial<PageSettings>) => void;
    setPageCover: (pageId: string, isCover: boolean) => void;
    /** Update a single page's background image + fit settings (per-page, not global). */
    setPageBackground: (pageId: string, patch: Partial<Pick<ComicPage, 'backgroundImage' | 'bgFillMode' | 'bgFocusX' | 'bgFocusY' | 'bgOpacity'>>) => void;
    addOverlay: (pageId: string, overlay: Omit<OverlayObject, 'id'>) => void;
    updateOverlay: (pageId: string, overlayId: string, updates: Partial<OverlayObject>) => void;
    removeOverlay: (pageId: string, overlayId: string) => void;
    serializeProject: () => void;
    loadProject: (jsonString: string) => void;
    replaceCurrentPageWithGuidedLayout: (payload: GuidedComicLayoutHandoff) => void;
    splitPanel: (pageId: string, panelId: string, direction: 'horizontal' | 'vertical', slant?: number) => void;
    snapBalloonTailToPanelEdge: (pageId: string, balloonId: string) => void;

    // Panel templates (save/apply blank layout)
    saveBlankPanelTemplate: (pageId: string, name?: string) => void;
    applyTemplate: (pageId: string, templateId: string) => void;

    // Auto-save trigger (call every 30s to persist to localStorage)
    flushAutoSave: () => void;

    /** No-op; drag batching uses undoPause/undoResume. */
    captureUndoCheckpoint: () => void;
}

// --- Explicit undo/redo (replaces zundo/temporal) ---
const UNDO_MAX = 80;

// Snapshots hold REFERENCES to the (immutable) state slices — not deep-cloned JSON strings.
// The store only ever updates immutably (new arrays/objects, verified), so unchanged large data
// (e.g. base64 page/panel images) is shared across all 80 snapshots instead of duplicated. This
// avoids both the per-edit JSON.stringify of megabytes and the memory blow-up that made building
// a page slow down over time.
type UndoSnapshot = Pick<
    ComicState,
    'pages' | 'projectSettings' | 'gutterSize' | 'pageSettings' | 'layoutMode' |
    'currentGenreId' | 'customGenre' | 'templates' | 'colorFavorites' | 'colorRecentlyUsed' | 'groupsByPage'
>;
let past: UndoSnapshot[] = [];
let future: UndoSnapshot[] = [];
let undoPaused = false;

function undoSnapshotSlice(state: ComicState): UndoSnapshot {
    return {
        pages: state.pages,
        projectSettings: state.projectSettings,
        gutterSize: state.gutterSize,
        pageSettings: state.pageSettings,
        layoutMode: state.layoutMode,
        currentGenreId: state.currentGenreId,
        customGenre: state.customGenre,
        templates: state.templates,
        colorFavorites: state.colorFavorites,
        colorRecentlyUsed: state.colorRecentlyUsed,
        groupsByPage: state.groupsByPage,
        // SYS-6: selection is intentionally excluded — including it made every click a new undo step,
        // so Ctrl+Z reverted the selection instead of the last real edit.
    };
}

// Cheap change detection: every immutable update replaces the changed slice's top-level reference,
// so a shallow reference comparison of the slice keys is sufficient (no stringify).
function undoSliceChanged(a: UndoSnapshot, b: UndoSnapshot): boolean {
    const keys = Object.keys(a) as (keyof UndoSnapshot)[];
    for (const k of keys) if (a[k] !== b[k]) return true;
    return false;
}

function undoMiddleware(config: any) {
    return (set: any, get: () => ComicState, store: any) => {
        const wrappedSet = (partial: any) => {
            const snapBefore = undoPaused ? null : undoSnapshotSlice(get());
            const ret = set(partial);
            if (!undoPaused && snapBefore) {
                const snapAfter = undoSnapshotSlice(get());
                if (undoSliceChanged(snapBefore, snapAfter)) {
                    past.push(snapBefore);
                    if (past.length > UNDO_MAX) past.shift();
                    future = [];
                }
            }
            return ret;
        };
        return config(wrappedSet, get, store);
    };
}

export function undoPause(): void {
    undoPaused = true;
}
export function undoResume(): void {
    undoPaused = false;
}
export function undoClear(): void {
    past = [];
    future = [];
}

export function comicUndo(): void {
    if (past.length === 0) return;
    const current = undoSnapshotSlice(useComicStore.getState());
    const snap = past.pop()!;
    future.push(current);
    undoPaused = true;
    try {
        useComicStore.setState(snap as Partial<ComicState>);
    } finally {
        undoPaused = false;
    }
}

export function comicRedo(): void {
    if (future.length === 0) return;
    const current = undoSnapshotSlice(useComicStore.getState());
    const snap = future.pop()!;
    past.push(current);
    undoPaused = true;
    try {
        useComicStore.setState(snap as Partial<ComicState>);
    } finally {
        undoPaused = false;
    }
}

const COMIC_PAGE_WIDTH = 800;
const COMIC_PAGE_HEIGHT = 1200;

function layoutRectsForTemplate(template: GuidedComicLayoutTemplate, gutter: number): Array<Pick<Panel, 'x' | 'y' | 'width' | 'height'>> {
    const safeGutter = Math.max(0, gutter);
    const innerX = safeGutter;
    const innerY = safeGutter;
    const innerWidth = COMIC_PAGE_WIDTH - safeGutter * 2;
    const innerHeight = COMIC_PAGE_HEIGHT - safeGutter * 2;

    if (template === 'splash') {
        return [{ x: innerX, y: innerY, width: innerWidth, height: innerHeight }];
    }

    if (template === 'three-panel') {
        const panelHeight = (innerHeight - safeGutter * 2) / 3;
        return [0, 1, 2].map((row) => ({
            x: innerX,
            y: innerY + row * (panelHeight + safeGutter),
            width: innerWidth,
            height: panelHeight,
        }));
    }

    if (template === 'three-panel-wide-top' || template === 'three-panel-wide-bottom') {
        const halfWidth = (innerWidth - safeGutter) / 2;
        const topHeight = (innerHeight - safeGutter) / 3;
        const bottomHeight = innerHeight - topHeight - safeGutter;
        const topPanels = [
            { x: innerX, y: innerY, width: halfWidth, height: topHeight },
            { x: innerX + halfWidth + safeGutter, y: innerY, width: halfWidth, height: topHeight },
        ];
        const bottomPanel = { x: innerX, y: innerY + topHeight + safeGutter, width: innerWidth, height: bottomHeight };
        if (template === 'three-panel-wide-bottom') {
            return [...topPanels, bottomPanel];
        }
        return [
            { x: innerX, y: innerY, width: innerWidth, height: bottomHeight },
            { x: innerX, y: innerY + bottomHeight + safeGutter, width: halfWidth, height: topHeight },
            { x: innerX + halfWidth + safeGutter, y: innerY + bottomHeight + safeGutter, width: halfWidth, height: topHeight },
        ];
    }

    const columns = 2;
    const rows = template === 'six-panel-grid' ? 3 : 2;
    const panelWidth = (innerWidth - safeGutter * (columns - 1)) / columns;
    const panelHeight = (innerHeight - safeGutter * (rows - 1)) / rows;

    return Array.from({ length: columns * rows }, (_, index) => {
        const column = index % columns;
        const row = Math.floor(index / columns);
        return {
            x: innerX + column * (panelWidth + safeGutter),
            y: innerY + row * (panelHeight + safeGutter),
            width: panelWidth,
            height: panelHeight,
        };
    });
}

function layoutRectsForGuidedGeometry(
    payload: GuidedComicLayoutHandoff,
): Array<Pick<Panel, 'x' | 'y' | 'width' | 'height'>> {
    if (!payload.panelGeometry.length) return [];
    const geometryById = new Map(payload.panelGeometry.map((panel) => [panel.panelId, panel]));
    return payload.orderedPanelIds
        .map((panelId) => geometryById.get(panelId))
        .filter((panel): panel is NonNullable<typeof panel> => Boolean(panel))
        .sort((a, b) => a.order - b.order)
        .map((panel) => ({
            x: Math.round(panel.x * COMIC_PAGE_WIDTH),
            y: Math.round(panel.y * COMIC_PAGE_HEIGHT),
            width: Math.round(panel.w * COMIC_PAGE_WIDTH),
            height: Math.round(panel.h * COMIC_PAGE_HEIGHT),
        }));
}

type GuidedPanelImportEntry = {
    panelId: string;
    order: number;
    rect: Pick<Panel, 'x' | 'y' | 'width' | 'height'>;
    geometry?: GuidedComicLayoutHandoff['panelGeometry'][number];
};

function rectFromNormalizedPanelRect(
    normalized: NonNullable<GuidedComicLayoutHandoff['normalizedPanelRects']>[number]['rect'],
): Pick<Panel, 'x' | 'y' | 'width' | 'height'> {
    return {
        x: Math.round(normalized.x * COMIC_PAGE_WIDTH),
        y: Math.round(normalized.y * COMIC_PAGE_HEIGHT),
        width: Math.round(normalized.width * COMIC_PAGE_WIDTH),
        height: Math.round(normalized.height * COMIC_PAGE_HEIGHT),
    };
}

function guidedPanelImportEntries(
    payload: GuidedComicLayoutHandoff,
    fallbackRects: Array<Pick<Panel, 'x' | 'y' | 'width' | 'height'>>,
): GuidedPanelImportEntry[] {
    const geometryById = new Map(payload.panelGeometry.map((panel) => [panel.panelId, panel]));
    if (payload.normalizedPanelRects?.length) {
        return payload.normalizedPanelRects
            .map((panel) => ({
                panelId: panel.panelId,
                order: panel.order,
                rect: rectFromNormalizedPanelRect(panel.rect),
                geometry: geometryById.get(panel.panelId),
            }))
            .sort((a, b) => a.order - b.order);
    }

    const geometryRects = layoutRectsForGuidedGeometry(payload);
    if (geometryRects.length > 0) {
        return [...payload.panelGeometry]
            .sort((a, b) => a.order - b.order)
            .map((panel, index) => ({
                panelId: panel.panelId,
                order: panel.order,
                rect: geometryRects[index],
                geometry: panel,
            }))
            .filter((entry) => Boolean(entry.rect));
    }

    return payload.orderedPanelIds.map((panelId, index) => ({
        panelId,
        order: index,
        rect: fallbackRects[index],
        geometry: geometryById.get(panelId),
    })).filter((entry) => Boolean(entry.rect));
}

export const useComicStore = create<ComicState>()(
    undoMiddleware(
        persist(
            (set, get) => ({
                projectSettings: {
                    inclusiveBiasEnabled: false,
                    demographicFocus: '',
                    ribbonPinnedDefault: false,
                    defaultPageBackgroundColor: '#ffffff'
                },
                gutterSize: 16,
                pageSettings: {
                    backgroundColor: '#ffffff',
                    bgOpacity: 1
                },
                pages: [
                    {
                        id: 'page-1',
                        panels: [],
                        balloons: [],
                        drawings: [],
                        overlays: [],
                        background: '#ffffff',
                        layerOrder: []
                    }
                ],
                currentPageId: 'page-1',
                currentGenreId: 'none' as GenreId,
                customGenre: GENRE_REGISTRY.find(g => g.id === 'custom') || GENRE_REGISTRY[0],
                layoutMode: 'webtoon' as const,
                zoomLevel: 1,
                selectedElementIds: [],
                clipboard: [],
                mode: 'layout' as const,
                exportFormat: null,
                contextMenu: { open: false, x: 0, y: 0, context: 'empty' as const },
                placePanelAtNextClick: false,
                placePanelShape: 'polygon' as const,
                lastCanvasPosition: null,
                templates: [],
                _autoSaveTick: 0,
                colorFavorites: [],
                colorRecentlyUsed: [],
                groupsByPage: {},
                textBoxEditBalloonId: null,

                isDrawingMode: false,
                brushColor: '#000000',
                brushWidth: 3,
                isKnifeMode: false,

                toggleDrawingMode: (isActive: boolean) => set({ isDrawingMode: isActive }),
                setKnifeMode: (active: boolean) => set({ isKnifeMode: active }),
                setBrushSettings: (color: string, width: number) => set({ brushColor: color, brushWidth: width }),

                addDrawing: (pageId: string, drawing: Omit<Drawing, 'id' | 'type'>) => set((state: ComicState) => {
                    const newId = crypto.randomUUID();
                    return {
                        pages: state.pages.map((p: ComicPage) =>
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

                setLayoutMode: (mode: 'webtoon' | 'spread') => set({ layoutMode: mode }),
                setZoomLevel: (zoom: number | ((prev: number) => number)) => set((state: ComicState) => ({
                    zoomLevel: typeof zoom === 'function' ? zoom(state.zoomLevel) : zoom
                })),

                setGenre: (genreId: GenreId) => set({ currentGenreId: genreId }),

                updateCustomGenre: (updates: Partial<Genre>, paletteUpdates?: Partial<Genre['palette']>) => set((state: ComicState) => ({
                    customGenre: {
                        ...state.customGenre,
                        ...updates,
                        palette: {
                            ...state.customGenre.palette,
                            ...(paletteUpdates || {})
                        }
                    }
                })),

                applyGenreToAll: () => set((state: ComicState) => {
                    const baseGenre = GENRE_REGISTRY.find(g => g.id === state.currentGenreId) || GENRE_REGISTRY[0];
                    const genre = state.currentGenreId === 'custom' ? state.customGenre : baseGenre;
                    return {
                        pages: state.pages.map((p: ComicPage) => ({
                            ...p,
                            background: genre.palette.background,
                            panels: p.panels.map(panel => ({
                                ...panel,
                                strokeColor: genre.palette.border,
                                ...(genre.textureId !== undefined && { textureId: genre.textureId }),
                                ...(genre.textureOpacity !== undefined && { textureOpacity: genre.textureOpacity })
                            })),
                            balloons: p.balloons.map(balloon => ({ ...balloon, fontFamily: genre.fontFamily }))
                        }))
                    };
                }),

                addPage: () => set((state: ComicState) => {
                    const newId = `page-${crypto.randomUUID()}`;
                    const defaultBg = state.projectSettings?.defaultPageBackgroundColor ?? '#ffffff';
                    return {
                        pages: [...state.pages, {
                            id: newId,
                            panels: [],
                            balloons: [],
                            drawings: [],
                            overlays: [],
                            background: defaultBg,
                            layerOrder: []
                        }],
                        currentPageId: newId
                    };
                }),

                removePage: (id: string) => set((state: ComicState) => {
                    if (state.pages.length <= 1) return state; // Prevent removing last page
                    const filtered = state.pages.filter(p => p.id !== id);
                    return {
                        pages: filtered,
                        currentPageId: state.currentPageId === id ? filtered[0].id : state.currentPageId
                    };
                }),

                duplicatePage: (id: string) => set((state: ComicState) => {
                    const pageToDup = state.pages.find(p => p.id === id);
                    if (!pageToDup) return state;

                    const idMap = new Map<string, string>();
                    const newPanels = pageToDup.panels.map(p => { const newId = crypto.randomUUID(); idMap.set(p.id, newId); return { ...p, id: newId }; });
                    const newBalloons = pageToDup.balloons.map(b => { const newId = crypto.randomUUID(); idMap.set(b.id, newId); return { ...b, id: newId }; });
                    const newDrawings = pageToDup.drawings.map(d => { const newId = crypto.randomUUID(); idMap.set(d.id, newId); return { ...d, id: newId }; });
                    const newOverlays = (pageToDup.overlays || []).map(o => ({ ...o, id: crypto.randomUUID() }));

                    const newPage: ComicPage = {
                        ...pageToDup,
                        id: `page-${crypto.randomUUID()}`,
                        panels: newPanels,
                        balloons: newBalloons,
                        drawings: newDrawings,
                        overlays: newOverlays,
                        layerOrder: pageToDup.layerOrder.map(oldId => idMap.get(oldId) || oldId)
                    };

                    const index = state.pages.findIndex(p => p.id === id);
                    const newPages = [...state.pages];
                    newPages.splice(index + 1, 0, newPage);
                    const oldGroups = state.groupsByPage[id] || [];
                    const newGroups = oldGroups.map(g => g.map(eid => idMap.get(eid)).filter((id): id is string => id !== undefined)).filter(g => g.length >= 2);
                    const nextGroupsByPage = { ...state.groupsByPage, [newPage.id]: newGroups };
                    return { pages: newPages, currentPageId: newPage.id, groupsByPage: nextGroupsByPage };
                }),

                reorderPages: (activeId: string, overId: string) => set((state: ComicState) => {
                    const oldIndex = state.pages.findIndex(p => p.id === activeId);
                    const newIndex = state.pages.findIndex(p => p.id === overId);
                    if (oldIndex === -1 || newIndex === -1) return state;
                    const newPages = [...state.pages];
                    const [moved] = newPages.splice(oldIndex, 1);
                    newPages.splice(newIndex, 0, moved);
                    return { pages: newPages };
                }),



                selectPage: (id: string) => set({ currentPageId: id }),

                addPanel: (pageId: string, panelData: Omit<Panel, 'id' | 'type'>) => set((state: ComicState) => {
                    const newId = crypto.randomUUID();
                    const baseGenre = GENRE_REGISTRY.find(g => g.id === state.currentGenreId) || GENRE_REGISTRY[0];
                    const genre = state.currentGenreId === 'custom' ? state.customGenre : baseGenre;

                    // Clamp the new panel on-page. Toolbar/ribbon "Add Panel" positions at
                    // lastCanvasPosition.x - width/2, which with no clamp lands panels half off the
                    // left/top edge (into the dead area beside the page). This is the single choke-point
                    // every caller flows through, mirroring insertImageIntoWorkspace's clamp.
                    const PAGE_W = 800, PAGE_H = 1200;
                    const pw = typeof panelData.width === 'number' && panelData.width > 0 ? panelData.width : 200;
                    const ph = typeof panelData.height === 'number' && panelData.height > 0 ? panelData.height : 200;
                    const clampedX = typeof panelData.x === 'number'
                        ? Math.max(0, Math.min(Math.max(0, PAGE_W - pw), Math.round(panelData.x)))
                        : panelData.x;
                    const clampedY = typeof panelData.y === 'number'
                        ? Math.max(0, Math.min(Math.max(0, PAGE_H - ph), Math.round(panelData.y)))
                        : panelData.y;

                    return {
                        pages: state.pages.map((p: ComicPage) =>
                            p.id === pageId
                                ? {
                                    ...p,
                                    panels: [...p.panels, {
                                        ...(genre.textureId !== undefined && { textureId: genre.textureId }),
                                        ...(genre.textureOpacity !== undefined && { textureOpacity: genre.textureOpacity }),
                                        ...panelData,
                                        x: clampedX,
                                        y: clampedY,
                                        id: newId,
                                        type: 'panel',
                                        isVisible: true,
                                        isLocked: false,
                                        strokeColor: (panelData as Partial<Panel>).strokeColor ?? genre.palette?.border ?? '#000000'
                                    }],
                                    layerOrder: [...p.layerOrder, newId]
                                }
                                : p
                        )
                    };
                }),

                insertImageIntoWorkspace: (imageUrl: string, options?: { width?: number; height?: number; sourceLabel?: string }) => set((state: ComicState) => {
                    const pageId = state.currentPageId ?? state.pages[0]?.id;
                    if (!pageId || !imageUrl.trim()) return state;
                    const page = state.pages.find(p => p.id === pageId);
                    if (!page) return state;
                    const selectedPanels = page.panels.filter(panel => state.selectedElementIds.includes(panel.id));
                    if (selectedPanels.length > 0) {
                        return {
                            pages: state.pages.map(p =>
                                p.id === pageId
                                    ? {
                                        ...p,
                                        panels: p.panels.map(panel =>
                                            state.selectedElementIds.includes(panel.id)
                                                ? { ...panel, imageUrl }
                                                : panel
                                        )
                                    }
                                    : p
                            )
                        };
                    }

                    const newId = crypto.randomUUID();
                    const baseGenre = GENRE_REGISTRY.find(g => g.id === state.currentGenreId) || GENRE_REGISTRY[0];
                    const genre = state.currentGenreId === 'custom' ? state.customGenre : baseGenre;
                    const width = Math.max(40, Math.min(620, Math.round(options?.width ?? 300)));
                    const height = Math.max(40, Math.min(620, Math.round(options?.height ?? 300)));
                    const pos = state.lastCanvasPosition?.pageId === pageId
                        ? state.lastCanvasPosition
                        : { pageId, x: 400, y: 600 };
                    const x = Math.max(0, Math.min(800 - width, Math.round(pos.x - width / 2)));
                    const y = Math.max(0, Math.min(1200 - height, Math.round(pos.y - height / 2)));
                    const panel: Panel = {
                        ...(genre.textureId !== undefined && { textureId: genre.textureId }),
                        ...(genre.textureOpacity !== undefined && { textureOpacity: genre.textureOpacity }),
                        id: newId,
                        type: 'panel',
                        shapeType: 'rect',
                        x,
                        y,
                        width,
                        height,
                        imageUrl,
                        // Default to 'contain' so an imported image shows in full (aspect preserved,
                        // never cropped/out-of-scale). Users can switch to cover/etc. per panel.
                        imageFillMode: 'contain',
                        prompt: options?.sourceLabel,
                        isVisible: true,
                        isLocked: false,
                        strokeColor: genre.palette?.border ?? '#000000',
                    };

                    return {
                        pages: state.pages.map(p =>
                            p.id === pageId
                                ? {
                                    ...p,
                                    panels: [...p.panels, panel],
                                    layerOrder: [...p.layerOrder, newId]
                                }
                                : p
                        ),
                        selectedElementIds: [newId]
                    };
                }),

                updatePanel: (pageId: string, panelId: string, updates: Partial<Panel>) => set((state: ComicState) => {
                    const page = state.pages.find(p => p.id === pageId);
                    if (!page) return state;
                    const groups = state.groupsByPage[pageId] || [];
                    const group = groups.find(g => g.includes(panelId));
                    const hasPosition = updates.x !== undefined || updates.y !== undefined;
                    const panel = page.panels.find(p => p.id === panelId);
                    if (!panel) return state;

                    let dx = 0, dy = 0;
                    if (hasPosition && group && group.length > 1) {
                        dx = (updates.x ?? panel.x) - panel.x;
                        dy = (updates.y ?? panel.y) - panel.y;
                    }

                    return {
                        pages: state.pages.map(p => {
                            if (p.id !== pageId) return p;
                            return {
                                ...p,
                                panels: p.panels.map(pan => {
                                    if (pan.id === panelId) return { ...pan, ...updates };
                                    if (group && group.includes(pan.id) && (dx !== 0 || dy !== 0))
                                        return { ...pan, x: pan.x + dx, y: pan.y + dy };
                                    return pan;
                                }),
                                balloons: (group && (dx !== 0 || dy !== 0)) ? p.balloons.map(b =>
                                    group.includes(b.id) ? { ...b, x: b.x + dx, y: b.y + dy } : b
                                ) : p.balloons
                            };
                        })
                    };
                }),

                addBalloon: (pageId: string, balloonData: Omit<BalloonInstance, 'id' | 'type'>) => set((state: ComicState) => {
                    const newId = crypto.randomUUID();
                    const baseGenre = GENRE_REGISTRY.find(g => g.id === state.currentGenreId) || GENRE_REGISTRY[0];
                    const genre = state.currentGenreId === 'custom' ? state.customGenre : baseGenre;

                    return {
                        pages: state.pages.map((p: ComicPage) =>
                            p.id === pageId
                                ? {
                                    ...p,
                                    balloons: [...p.balloons, {
                                        // Defaults first so caller-supplied balloonData can override them;
                                        // id/type are forced last.
                                        fontFamily: genre.fontFamily,
                                        isVisible: true,
                                        isLocked: false,
                                        autoSize: false,
                                        padding: 20,
                                        ...balloonData,
                                        id: newId,
                                        type: 'balloon',
                                    }],
                                    layerOrder: [...p.layerOrder, newId]
                                }
                                : p
                        )
                    };
                }),

                updateBalloon: (pageId: string, balloonId: string, updates: Partial<BalloonInstance>) => set((state: ComicState) => {
                    const page = state.pages.find(p => p.id === pageId);
                    if (!page) return state;
                    const groups = state.groupsByPage[pageId] || [];
                    const group = groups.find(g => g.includes(balloonId));
                    const hasPosition = updates.x !== undefined || updates.y !== undefined;
                    const balloon = page.balloons.find(b => b.id === balloonId);
                    if (!balloon) return state;

                    let dx = 0, dy = 0;
                    if (hasPosition && group && group.length > 1) {
                        dx = (updates.x ?? balloon.x) - balloon.x;
                        dy = (updates.y ?? balloon.y) - balloon.y;
                    }

                    return {
                        pages: state.pages.map(p => {
                            if (p.id !== pageId) return p;
                            return {
                                ...p,
                                panels: (group && (dx !== 0 || dy !== 0)) ? p.panels.map(pan =>
                                    group.includes(pan.id) ? { ...pan, x: pan.x + dx, y: pan.y + dy } : pan
                                ) : p.panels,
                                balloons: p.balloons.map(b => {
                                    if (b.id === balloonId) return { ...b, ...updates };
                                    if (group && group.includes(b.id) && (dx !== 0 || dy !== 0))
                                        return { ...b, x: b.x + dx, y: b.y + dy };
                                    return b;
                                })
                            };
                        })
                    };
                }),

                /** Snap selected balloon tail tip to nearest panel edge (clamp to panel rect). */
                snapBalloonTailToPanelEdge: (pageId: string, balloonId: string) => set((state: ComicState) => {
                    const page = state.pages.find(p => p.id === pageId);
                    const balloon = page?.balloons.find(b => b.id === balloonId);
                    if (!page || !balloon?.hasTail || !balloon.tailTip || !page.panels.length) return state;
                    const tipPageX = balloon.x + balloon.tailTip.x;
                    const tipPageY = balloon.y + balloon.tailTip.y;
                    const balloonCenterX = balloon.x + balloon.width / 2;
                    const balloonCenterY = balloon.y + balloon.height / 2;
                    let best = page.panels[0];
                    let bestDist = Infinity;
                    for (const panel of page.panels) {
                        const px = panel.x + panel.width / 2;
                        const py = panel.y + panel.height / 2;
                        const inPanel = balloonCenterX >= panel.x && balloonCenterX <= panel.x + panel.width &&
                            balloonCenterY >= panel.y && balloonCenterY <= panel.y + panel.height;
                        if (inPanel) { best = panel; break; }
                        const d = (balloonCenterX - px) ** 2 + (balloonCenterY - py) ** 2;
                        if (d < bestDist) { bestDist = d; best = panel; }
                    }
                    const nx = Math.max(best.x, Math.min(best.x + best.width, tipPageX));
                    const ny = Math.max(best.y, Math.min(best.y + best.height, tipPageY));
                    const newTailTip = { x: nx - balloon.x, y: ny - balloon.y };
                    return {
                        pages: state.pages.map((p: ComicPage) =>
                            p.id !== pageId ? p : {
                                ...p,
                                balloons: p.balloons.map(b =>
                                    b.id !== balloonId ? b : { ...b, tailTip: newTailTip }
                                )
                            }
                        )
                    };
                }),

                syncBalloonStyle: (balloonId: string) => set((state: ComicState) => {
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
                        pages: state.pages.map((p: ComicPage) => ({
                            ...p,
                            balloons: p.balloons.map(b =>
                                b.styleId === sourceStyleId
                                    ? { ...b, overrides: { ...(b.overrides || {}), ...sourceOverrides } }
                                    : b
                            )
                        }))
                    };
                }),
                addColorToFavorites: (hex: string) => set((state: ComicState) => {
                    const normalized = hex.startsWith('#') ? hex : `#${hex}`;
                    if (state.colorFavorites.includes(normalized)) return state;
                    const next = [...state.colorFavorites, normalized].slice(-12);
                    return { colorFavorites: next };
                }),
                removeColorFromFavorites: (hex: string) => set((state: ComicState) => ({
                    colorFavorites: state.colorFavorites.filter(c => (c.startsWith('#') ? c : `#${c}`) !== (hex.startsWith('#') ? hex : `#${hex}`))
                })),
                addColorToRecentlyUsed: (hex: string) => set((state: ComicState) => {
                    const normalized = hex.startsWith('#') ? hex : `#${hex}`;
                    const without = state.colorRecentlyUsed.filter(c => c !== normalized);
                    return { colorRecentlyUsed: [normalized, ...without].slice(0, 16) };
                }),

                setSelectedElements: (ids: string[]) => set({ selectedElementIds: ids }),

                toggleSelection: (id: string) => set((state: ComicState) => ({
                    selectedElementIds: state.selectedElementIds.includes(id)
                        ? state.selectedElementIds.filter(x => x !== id)
                        : [...state.selectedElementIds, id]
                })),

                clearSelection: () => set({ selectedElementIds: [] }),

                copySelected: () => set((state: ComicState) => {
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

                deleteSelected: () => set((state: ComicState) => {
                    if (!state.currentPageId || state.selectedElementIds.length === 0) return state;
                    return {
                        pages: state.pages.map((p: ComicPage) => p.id === state.currentPageId ? {
                            ...p,
                            panels: p.panels.filter(panel => !state.selectedElementIds.includes(panel.id)),
                            balloons: p.balloons.filter(balloon => !state.selectedElementIds.includes(balloon.id)),
                            drawings: p.drawings?.filter(x => !state.selectedElementIds.includes(x.id)) || [],
                            overlays: (p.overlays || []).filter(o => !state.selectedElementIds.includes(o.id)),
                            layerOrder: p.layerOrder.filter(id => !state.selectedElementIds.includes(id))
                        } : p),
                        selectedElementIds: []
                    };
                }),

                pasteClipboard: () => set((state: ComicState) => {
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

                bringToFront: (pageId: string, elementId: string) => set((state: ComicState) => {
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

                sendToBack: (pageId: string, elementId: string) => set((state: ComicState) => {
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

                cloneElement: (pageId: string, elementId: string) => set((state: ComicState) => {
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

                removeElement: (pageId: string, elementId: string) => set((state: ComicState) => {
                    const page = state.pages.find(p => p.id === pageId);
                    if (!page) return state;

                    const pageGroups = (state.groupsByPage[pageId] || []).map(g => g.filter(id => id !== elementId)).filter(g => g.length >= 2);
                    const nextGroupsByPage = { ...state.groupsByPage, [pageId]: pageGroups };

                    return {
                        pages: state.pages.map((p: ComicPage) => p.id === pageId ? {
                            ...p,
                            panels: p.panels.filter(panel => panel.id !== elementId),
                            balloons: p.balloons.filter(balloon => balloon.id !== elementId),
                            drawings: p.drawings?.filter(x => x.id !== elementId) || [],
                            layerOrder: p.layerOrder.filter(id => id !== elementId)
                        } : p),
                        groupsByPage: nextGroupsByPage,
                        selectedElementIds: state.selectedElementIds.filter(id => id !== elementId)
                    };
                }),

                triggerExport: (format: 'png' | 'pdf') => set({ exportFormat: format }),
                clearExport: () => set({ exportFormat: null }),
                openContextMenu: (params: { x: number; y: number; context: 'balloon' | 'panel' | 'empty'; pageId?: string; balloonId?: string; panelId?: string; pageLocalX?: number; pageLocalY?: number }) => set({ contextMenu: { ...params, open: true } }),
                setPlacePanelAtNextClick: (active: boolean, shape?: 'polygon' | 'ellipse') => set((state: ComicState) => ({
                    ...state,
                    placePanelAtNextClick: active,
                    ...(active && shape != null && { placePanelShape: shape }),
                })),
                setLastCanvasPosition: (pos: { pageId: string; x: number; y: number } | null) => set({ lastCanvasPosition: pos }),
                closeContextMenu: () => set((s: ComicState) => ({ contextMenu: { ...s.contextMenu, open: false } })),

                toggleFlip: (pageId: string, elementId: string, axis: 'horizontal' | 'vertical') => set((state: ComicState) => ({
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

                reorderLayer: (pageId: string, activeId: string, overId: string) => set((state: ComicState) => {
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
                        pages: state.pages.map((p: ComicPage) => p.id === pageId ? { ...p, layerOrder: newOrder } : p)
                    }
                }),

                reorderGroup: (pageId: string, groupMemberId: string, overId: string) => set((state: ComicState) => {
                    const page = state.pages.find(p => p.id === pageId);
                    if (!page) return state;

                    const groups = state.groupsByPage[pageId] || [];
                    const group = groups.find(g => g.includes(groupMemberId));
                    if (!group || group.length < 2) {
                        // Single element: same as reorderLayer
                        const oldIndex = page.layerOrder.indexOf(groupMemberId);
                        const newIndex = page.layerOrder.indexOf(overId);
                        if (oldIndex === -1 || newIndex === -1) return state;
                        const newOrder = [...page.layerOrder];
                        newOrder.splice(oldIndex, 1);
                        newOrder.splice(newIndex, 0, groupMemberId);
                        return { pages: state.pages.map((p: ComicPage) => p.id === pageId ? { ...p, layerOrder: newOrder } : p) };
                    }

                    const groupSet = new Set(group);
                    const newOrder = page.layerOrder.filter(id => !groupSet.has(id));
                    let insertIndex = newOrder.indexOf(overId);
                    if (insertIndex === -1) insertIndex = newOrder.length;
                    const groupOrder = [...group].sort((a, b) => page.layerOrder.indexOf(a) - page.layerOrder.indexOf(b));
                    newOrder.splice(insertIndex, 0, ...groupOrder);

                    return {
                        pages: state.pages.map((p: ComicPage) => p.id === pageId ? { ...p, layerOrder: newOrder } : p)
                    };
                }),

                toggleLayerVisibility: (pageId: string, elementId: string) => set((state: ComicState) => {
                    return {
                        pages: state.pages.map((p: ComicPage) => {
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

                toggleLayerLock: (pageId: string, elementId: string) => set((state: ComicState) => {
                    return {
                        pages: state.pages.map((p: ComicPage) => {
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

                createGroup: (pageId: string, elementIds: string[]) => set((state: ComicState) => {
                    if (elementIds.length < 2) return state;
                    const page = state.pages.find(p => p.id === pageId);
                    if (!page) return state;
                    const groups = (state.groupsByPage[pageId] || []).map(g => g.filter(id => !elementIds.includes(id)));
                    const kept = groups.filter(g => g.length >= 2);
                    const next = { ...state.groupsByPage, [pageId]: [...kept, [...elementIds]] };
                    return { groupsByPage: next };
                }),

                ungroup: (pageId: string, elementId: string) => set((state: ComicState) => {
                    const groups = state.groupsByPage[pageId] || [];
                    const nextGroups = groups.filter(g => !g.includes(elementId));
                    if (nextGroups.length === groups.length) return state;
                    return { groupsByPage: { ...state.groupsByPage, [pageId]: nextGroups } };
                }),

                getGroupMembers: (pageId: string, elementId: string) => {
                    const state = get();
                    const groups = state.groupsByPage[pageId];
                    if (!groups) return null;
                    const group = groups.find(g => g.includes(elementId));
                    return group ? [...group] : null;
                },

                setTextBoxEditBalloonId: (id: string | null) => set({ textBoxEditBalloonId: id }),

                captureUndoCheckpoint: () => {},

                updateProjectSettings: (settings: Partial<ComicState['projectSettings']>) => set((state: ComicState) => ({
                    projectSettings: { ...state.projectSettings, ...settings }
                })),

                setGutterSize: (size: number) => set({ gutterSize: Math.max(0, Math.min(64, size)) }),

                setPageSettings: (settings: Partial<PageSettings>) => set((state: ComicState) => ({
                    pageSettings: { ...state.pageSettings, ...settings }
                })),

                setPageCover: (pageId: string, isCover: boolean) => set((state: ComicState) => ({
                    pages: state.pages.map(p => p.id === pageId ? { ...p, isCover } : p)
                })),

                setPageBackground: (pageId, patch) => set((state: ComicState) => ({
                    pages: state.pages.map(p => p.id === pageId ? { ...p, ...patch } : p)
                })),

                addOverlay: (pageId: string, overlay: Omit<OverlayObject, 'id'>) => set((state: ComicState) => {
                    const newId = crypto.randomUUID();
                    return {
                        pages: state.pages.map((p: ComicPage) =>
                            p.id === pageId
                                ? {
                                    ...p,
                                    overlays: [...(p.overlays || []), { ...overlay, id: newId }]
                                }
                                : p
                        )
                    };
                }),

                updateOverlay: (pageId: string, overlayId: string, updates: Partial<OverlayObject>) => set((state: ComicState) => ({
                    pages: state.pages.map(p =>
                        p.id === pageId
                            ? {
                                ...p,
                                overlays: (p.overlays || []).map(o =>
                                    o.id === overlayId ? { ...o, ...updates } : o
                                )
                            }
                            : p
                    )
                })),

                removeOverlay: (pageId: string, overlayId: string) => set((state: ComicState) => ({
                    pages: state.pages.map(p =>
                        p.id === pageId
                            ? { ...p, overlays: (p.overlays || []).filter(o => o.id !== overlayId) }
                            : p
                    )
                })),

                serializeProject: () => {
                    const { pages, projectSettings, gutterSize, pageSettings, groupsByPage, templates, currentGenreId, customGenre } = useComicStore.getState();
                    const data = {
                        version: "2.1",
                        type: "comic-project",
                        projectSettings,
                        gutterSize,
                        pageSettings,
                        pages,
                        // v2.1: preserve grouping, saved templates, and theme so save/load round-trips them
                        groupsByPage,
                        templates,
                        currentGenreId,
                        customGenre
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
                            set({
                                pages: data.pages,
                                ...(data.gutterSize != null && { gutterSize: data.gutterSize }),
                                ...(data.pageSettings != null && { pageSettings: { ...useComicStore.getState().pageSettings, ...data.pageSettings } }),
                                // v2.1: restore grouping/templates/theme. Reset per-project grouping to the
                                // loaded value (never carry stale groups that reference the old project's IDs).
                                groupsByPage: data.groupsByPage ?? {},
                                ...(data.templates != null && { templates: data.templates }),
                                ...(data.currentGenreId != null && { currentGenreId: data.currentGenreId }),
                                ...(data.customGenre != null && { customGenre: data.customGenre }),
                                // Loaded pages have fresh IDs — point the active page at the first one and
                                // clear any selection left over from the previous project.
                                currentPageId: data.pages[0]?.id ?? null,
                                selectedElementIds: []
                            });
                            // New project load must not share undo/redo with previous session
                            undoClear();
                        }
                    } catch (e) {
                        console.error("Failed to load project", e);
                    }
                },

                replaceCurrentPageWithGuidedLayout: (payload: GuidedComicLayoutHandoff) => set((state: ComicState) => {
                    const pageId = state.currentPageId ?? payload.pageId ?? state.pages[0]?.id ?? `page-${payload.pageNumber}`;
                    const targetPage = state.pages.find((page) => page.id === pageId);
                    const defaultBg = state.projectSettings?.defaultPageBackgroundColor ?? '#ffffff';
                    const baseGenre = GENRE_REGISTRY.find(g => g.id === state.currentGenreId) || GENRE_REGISTRY[0];
                    const genre = state.currentGenreId === 'custom' ? state.customGenre : baseGenre;
                    const fallbackRects = layoutRectsForTemplate(payload.layoutTemplate, state.gutterSize);
                    const panelEntries = guidedPanelImportEntries(payload, fallbackRects);
                    const requestedPanelCount = Math.max(1, Math.min(payload.panelCount, panelEntries.length));
                    const panels: Panel[] = panelEntries.slice(0, requestedPanelCount).map((entry) => {
                        const sourcePanelId = entry.panelId;
                        const panelImage = payload.panelArtImages[sourcePanelId];
                        const panelBeat = payload.panelBeats?.find((beat) => beat.panelId === sourcePanelId);
                        const visualPanel = payload.visualStoryMetadata?.panels.find((panel) => panel.panelId === sourcePanelId);
                        const sourceGeometry = entry.geometry ?? payload.panelGeometry.find((panel) => panel.panelId === sourcePanelId);
                        return {
                            id: crypto.randomUUID(),
                            type: 'panel',
                            shapeType: payload.panelShapeDefaults?.shapeType ?? 'rect',
                            ...entry.rect,
                            imageUrl: panelImage?.imageUrl,
                            prompt: panelBeat?.beatText || panelImage?.prompt,
                            imageFillMode: panelImage ? (sourceGeometry?.imageFit ?? 'cover') : undefined,
                            imageScale: panelImage ? (sourceGeometry?.imageZoom ?? 1) : undefined,
                            imageOffsetX: panelImage ? 0 : undefined,
                            imageOffsetY: panelImage ? 0 : undefined,
                            imageFocusX: panelImage ? sourceGeometry?.imageFocusX : undefined,
                            imageFocusY: panelImage ? sourceGeometry?.imageFocusY : undefined,
                            isVisible: payload.panelShapeDefaults?.isVisible ?? true,
                            isLocked: payload.panelShapeDefaults?.isLocked ?? false,
                            guidedPageNumber: payload.visualStoryMetadata?.pageNumber,
                            guidedPanelNumber: visualPanel?.panelNumber,
                            guidedPanelBeat: visualPanel?.beatText,
                            guidedDialogueText: visualPanel?.dialogueText,
                            guidedVisualPrompt: visualPanel?.visualPrompt,
                            guidedLayoutIntent: visualPanel?.layoutIntent,
                            strokeColor: genre.palette?.border ?? '#000000',
                            ...(genre.textureId !== undefined && { textureId: genre.textureId }),
                            ...(genre.textureOpacity !== undefined && { textureOpacity: genre.textureOpacity }),
                        };
                    });
                    const panelLayerIds = panels.map((panel) => panel.id);
                    const existingPages = state.pages.length > 0 ? state.pages : [{
                        id: pageId,
                        panels: [],
                        balloons: [],
                        drawings: [],
                        overlays: [],
                        background: defaultBg,
                        layerOrder: [],
                    }];

                    return {
                        pages: existingPages.map((page) =>
                            page.id === pageId
                                ? {
                                    ...page,
                                    panels,
                                    balloons: [],
                                    drawings: [],
                                    overlays: page.overlays ?? [],
                                    guidedBalloonSeeds: payload.balloonSeeds ?? [],
                                    background: targetPage?.background ?? defaultBg,
                                    layerOrder: panelLayerIds,
                                }
                                : page
                        ),
                        currentPageId: pageId,
                        selectedElementIds: panelLayerIds.slice(0, 1),
                        groupsByPage: {
                            ...state.groupsByPage,
                            [pageId]: [],
                        },
                    };
                }),

                saveBlankPanelTemplate: (pageId: string, name?: string) => set((state: ComicState) => {
                    const page = state.pages.find(p => p.id === pageId);
                    if (!page || page.panels.length === 0) return state;
                    const panels: PanelTemplateEntry[] = page.panels.map(p => ({
                        shapeType: p.shapeType,
                        x: p.x,
                        y: p.y,
                        width: p.width,
                        height: p.height,
                        ...(p.points && { points: p.points.map(pt => ({ ...pt })) })
                    }));
                    const template: PanelTemplate = {
                        id: crypto.randomUUID(),
                        name: name || `Template ${state.templates.length + 1}`,
                        panels
                    };
                    return { templates: [...state.templates, template] };
                }),

                applyTemplate: (pageId: string, templateId: string) => set((state: ComicState) => {
                    const page = state.pages.find(p => p.id === pageId);
                    const template = state.templates.find(t => t.id === templateId);
                    if (!page || !template) return state;
                    const newPanels: Panel[] = template.panels.map((entry) => ({
                        id: crypto.randomUUID(),
                        type: 'panel',
                        shapeType: entry.shapeType,
                        x: entry.x,
                        y: entry.y,
                        width: entry.width,
                        height: entry.height,
                        ...(entry.points && { points: entry.points.map(pt => ({ ...pt })) })
                    }));
                    const newPanelIds = newPanels.map(p => p.id);
                    const otherOrder = (page.layerOrder || []).filter(id => !page.panels.some(p => p.id === id));
                    return {
                        pages: state.pages.map((p: ComicPage) =>
                            p.id === pageId
                                ? { ...p, panels: newPanels, layerOrder: [...newPanelIds, ...otherOrder] }
                                : p
                        )
                    };
                }),

                flushAutoSave: () => set((state: ComicState) => ({ ...state, _autoSaveTick: Date.now() })),

                splitPanel: (pageId: string, panelId: string, direction: 'horizontal' | 'vertical', slant = 0) => set((state: ComicState) => {
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
                        const top_x = (p0.x + p1.x) / 2 + slant;
                        const bot_x = (p3.x + p2.x) / 2 - slant;

                        const cut_top_left = { x: top_x - gap / 2, y: lerpY(p0, p1, top_x - gap / 2) };
                        const cut_bot_left = { x: bot_x - gap / 2, y: lerpY(p3, p2, bot_x - gap / 2) };
                        const cut_top_right = { x: top_x + gap / 2, y: lerpY(p0, p1, top_x + gap / 2) };
                        const cut_bot_right = { x: bot_x + gap / 2, y: lerpY(p3, p2, bot_x + gap / 2) };

                        leftPoints = [p0, cut_top_left, cut_bot_left, p3];
                        rightPoints = [cut_top_right, p1, p2, cut_bot_right];
                    } else {
                        // Horizontal cut creates top and bottom panels
                        const left_y = (p0.y + p3.y) / 2 + slant;
                        const right_y = (p1.y + p2.y) / 2 - slant;

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
                        pages: state.pages.map((p: ComicPage) =>
                            p.id === pageId
                                ? { ...p, panels: newPanels, layerOrder: newLayerOrder }
                                : p
                        )
                    };
                })
            }),
            {
                name: 'arcs-comic',
                // Persist to IndexedDB (hundreds of MB / GB) instead of localStorage (~5MB), and
                // DEBOUNCE the write so dragging with large images no longer re-serializes the whole
                // project on every mouse-move. Migrates existing localStorage data on first load and
                // falls back to localStorage where IndexedDB is unavailable.
                storage: createComicPersistStorage(),
                merge: (persisted, current) => {
                    const p = persisted as Partial<ComicState>;
                    const mergedProject = { ...current.projectSettings, ...p.projectSettings };
                    if (mergedProject.defaultPageBackgroundColor == null) mergedProject.defaultPageBackgroundColor = '#ffffff';
                    return {
                        ...current,
                        ...p,
                        projectSettings: mergedProject,
                    } as ComicState;
                },
                partialize: (state: ComicState) => ({
                    pages: state.pages,
                    projectSettings: state.projectSettings,
                    gutterSize: state.gutterSize,
                    pageSettings: state.pageSettings,
                    layoutMode: state.layoutMode,
                    currentGenreId: state.currentGenreId,
                    customGenre: state.customGenre,
                    templates: state.templates,
                    _autoSaveTick: state._autoSaveTick,
                    colorFavorites: state.colorFavorites,
                    colorRecentlyUsed: state.colorRecentlyUsed,
                    groupsByPage: state.groupsByPage
                })
            }
        )
    )
);
