import React, { useRef, useEffect } from 'react';
import type Konva from 'konva';
import type { KonvaEventObject } from 'konva/lib/Node';
import { Stage, Layer, Rect, Line, Line as KonvaLine, Group, Image } from 'react-konva';
import useImage from 'use-image';
import { jsPDF } from 'jspdf';
import { useComicStore, type Panel, type ComicPage } from '../../../stores/comicStore';
import { resolveBalloonStyle } from '../data/BalloonStyles';
import { BalloonNode } from '../components/BalloonNode';
import { ComicPanel } from '../components/ComicPanel';
import { FloatingAsset } from '../components/FloatingAsset';
import { useArcsResolvedSrc } from '@/shared/hooks/useArcsResolvedSrc';
import { splitConvexPolygon, pointInPanel } from '../utils/geometry';
import { getGutterAwareSnapLines, type SnapLine, type DiagonalGuide } from '../utils/snapping';
import type { BalloonInstance } from '../../../types/balloon';
import { ACCENT_GOLD_SOLID } from '../theme/Phase12DesignTokens';
import { useShallow } from 'zustand/react/shallow';

// --- Drawing View ---
const DrawingView = ({ drawing }: { drawing: { points: number[], stroke: string, strokeWidth: number, isVisible?: boolean, isLocked?: boolean } }) => {
    return (
        <Line
            points={drawing.points}
            stroke={drawing.stroke}
            strokeWidth={drawing.strokeWidth}
            tension={0.5}
            lineCap="round"
            lineJoin="round"
            perfectDrawEnabled={false}
            visible={drawing.isVisible !== false}
            listening={drawing.isLocked !== true}
        />
    );
};

const PAGE_W = 800;
const PAGE_H = 1200;

/**
 * Compute the draw rect (page-local) for a page background image given a fill mode.
 * Fixes IMG-1: previously the background was hard-stretched to 800x1200 (distorting any
 * non-page-ratio image) with no way to fit/center/position it.
 * - cover: fill the page without distortion (may crop), positioned by focus point
 * - contain: fit the whole image inside the page (may letterbox), positioned by focus
 * - center: natural size, positioned by focus point (clipped to page)
 * - stretch: legacy behavior — fill the page exactly (distorts aspect)
 */
const computeBackgroundImageRect = (
    img: HTMLImageElement,
    mode: 'cover' | 'contain' | 'stretch' | 'center',
    focusX: number,
    focusY: number,
): { x: number; y: number; width: number; height: number } => {
    const iw = img.naturalWidth || img.width || PAGE_W;
    const ih = img.naturalHeight || img.height || PAGE_H;
    if (mode === 'stretch' || iw <= 0 || ih <= 0) {
        return { x: 0, y: 0, width: PAGE_W, height: PAGE_H };
    }
    let scale: number;
    if (mode === 'cover') scale = Math.max(PAGE_W / iw, PAGE_H / ih);
    else if (mode === 'contain') scale = Math.min(PAGE_W / iw, PAGE_H / ih);
    else scale = 1; // center = natural size
    const width = iw * scale;
    const height = ih * scale;
    return {
        x: (PAGE_W - width) * focusX,
        y: (PAGE_H - height) * focusY,
        width,
        height,
    };
};

/**
 * Renders ONE page's own background image (per-page, not shared across the project).
 * Falls back to the legacy global background (pageSettings) only when the page has none, so old
 * saved projects keep working. Its own useImage call means each page can have a different image.
 */
const PageBackgroundImage: React.FC<{
    page: ComicPage;
    offsetX: number;
    offsetY: number;
    fallbackSrc?: string;
    fallbackFillMode?: 'cover' | 'contain' | 'stretch' | 'center';
    fallbackOpacity?: number;
}> = ({ page, offsetX, offsetY, fallbackSrc, fallbackFillMode, fallbackOpacity }) => {
    const usingOwn = !!page.backgroundImage;
    const src = page.backgroundImage ?? fallbackSrc ?? '';
    const resolved = useArcsResolvedSrc(src);
    const [img] = useImage(resolved ?? '', 'anonymous');
    if (!src || !img) return null;
    const fillMode = usingOwn ? (page.bgFillMode ?? 'cover') : (fallbackFillMode ?? 'cover');
    const focusX = usingOwn ? (page.bgFocusX ?? 0.5) : 0.5;
    const focusY = usingOwn ? (page.bgFocusY ?? 0.5) : 0.5;
    const opacity = usingOwn ? (page.bgOpacity ?? 1) : (fallbackOpacity ?? 1);
    const rect = computeBackgroundImageRect(img, fillMode, focusX, focusY);
    // Clip to the page so cover/center overflow doesn't bleed onto neighboring pages.
    return (
        <Group x={offsetX} y={offsetY} clipX={0} clipY={0} clipWidth={PAGE_W} clipHeight={PAGE_H} listening={false}>
            <Image image={img} x={rect.x} y={rect.y} width={rect.width} height={rect.height} opacity={opacity} listening={false} />
        </Group>
    );
};

// Coordinate helper for Multi-Page layout
const getLayoutPosition = (index: number, mode: 'webtoon' | 'spread') => {
    if (mode === 'spread') {
        return { x: (index % 2) * 800, y: Math.floor(index / 2) * 1220 }; // slight vertical gap
    }
    return { x: 0, y: index * 1220 }; // 1200 + 20px gap for webtoon spacing
};

export const ComicCanvas: React.FC = () => {
    const defaultPageBg = useComicStore((s) => s.projectSettings?.defaultPageBackgroundColor ?? '#ffffff');
    const {
        pages,
        currentPageId,
        selectedElementIds,
        layoutMode,
        zoomLevel,
        pageSettings,
        gutterSize,
        selectPage,
        setSelectedElements,
        toggleSelection,
        clearSelection,
        updatePanel,
        addPanel,
        placePanelAtNextClick,
        placePanelShape,
        setPlacePanelAtNextClick,
        setLastCanvasPosition,
        updateBalloon,
        addOverlay,
        updateOverlay,

        // Drawing Mode
        isDrawingMode,
        brushColor,
        brushWidth,
        addDrawing,

        // Knife tool (toggle lives in ContextualRibbon / Panel menu)
        isKnifeMode,

        // Node manipulation
        removeElement,

        // Context menu
        openContextMenu,
        // Selected with useShallow rather than subscribing to the whole store: a bare
        // useComicStore() re-renders this component on *every* store write, which during a panel
        // drag is once per mouse move.
    } = useComicStore(
        useShallow((s) => ({
            pages: s.pages,
            currentPageId: s.currentPageId,
            selectedElementIds: s.selectedElementIds,
            layoutMode: s.layoutMode,
            zoomLevel: s.zoomLevel,
            pageSettings: s.pageSettings,
            gutterSize: s.gutterSize,
            selectPage: s.selectPage,
            setSelectedElements: s.setSelectedElements,
            toggleSelection: s.toggleSelection,
            clearSelection: s.clearSelection,
            updatePanel: s.updatePanel,
            addPanel: s.addPanel,
            placePanelAtNextClick: s.placePanelAtNextClick,
            placePanelShape: s.placePanelShape,
            setPlacePanelAtNextClick: s.setPlacePanelAtNextClick,
            setLastCanvasPosition: s.setLastCanvasPosition,
            updateBalloon: s.updateBalloon,
            addOverlay: s.addOverlay,
            updateOverlay: s.updateOverlay,
            isDrawingMode: s.isDrawingMode,
            brushColor: s.brushColor,
            brushWidth: s.brushWidth,
            addDrawing: s.addDrawing,
            isKnifeMode: s.isKnifeMode,
            removeElement: s.removeElement,
            openContextMenu: s.openContextMenu,
        })),
    );


    // Local state for drawing
    const isDrawingRef = useRef(false);
    const [currentLine, setCurrentLine] = React.useState<number[]>([]);
    const targetPageIdRef = useRef<string | null>(null);

    const [knifeStart, setKnifeStart] = React.useState<{ x: number, y: number } | null>(null);
    const [knifeCurrent, setKnifeCurrent] = React.useState<{ x: number, y: number } | null>(null);

    // Multi-Select Marquee
    const [selectionBox, setSelectionBox] = React.useState<{ start: { x: number, y: number }, end: { x: number, y: number } } | null>(null);

    // Snapping Guides — single state for both panel-drag and vertex-drag H/V guides
    const [snapLines, setSnapLines] = React.useState<{ lines: SnapLine[], offset: { x: number, y: number } }>({ lines: [], offset: { x: 0, y: 0 } });
    const [diagonalGuides, setDiagonalGuides] = React.useState<{ guides: DiagonalGuide[], offset: { x: number, y: number } }>({ guides: [], offset: { x: 0, y: 0 } });

    // NOTE: the "no pages yet" guard deliberately lives *below* every hook call (just above the
    // return). An early return here would make the hooks after it conditional, so the transition
    // pages.length > 0 -> 0 (project load / clear) crashed React with "Rendered fewer hooks than
    // expected". Do not reintroduce an early return above this point.
    const stageRef = useRef<Konva.Stage | null>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    // When a canvas click changes the current page we do NOT want to yank the scroll (you're already
    // looking at that page). This suppresses the next auto-scroll after such interactions.
    const suppressPageScrollRef = useRef(false);

    // BAL-7: Konva rasterizes text to canvas immediately, so a balloon added before its web font
    // finishes loading paints in a fallback font. Force a redraw once fonts are ready / finish loading.
    useEffect(() => {
        const fonts: FontFaceSet | undefined = document.fonts;
        if (!fonts) return;
        let cancelled = false;
        const redraw = () => { if (!cancelled) stageRef.current?.batchDraw(); };
        void fonts.ready.then(redraw);
        fonts.addEventListener('loadingdone', redraw);
        return () => { cancelled = true; fonts.removeEventListener('loadingdone', redraw); };
    }, []);

    // Multi-page fix: the canvas view previously never followed the current page, so selecting or
    // adding page 2+ left you stuck looking at page 1. Scroll the current page into view when it
    // changes via an explicit action (PageNavigator select / Add Page) — but not when a canvas click
    // set it (suppressed), so editing panels doesn't jump the view around.
    useEffect(() => {
        if (suppressPageScrollRef.current) { suppressPageScrollRef.current = false; return; }
        const container = scrollContainerRef.current;
        if (!container || !currentPageId) return;
        const idx = pages.findIndex(p => p.id === currentPageId);
        if (idx <= 0) { if (idx === 0) container.scrollTo({ top: 0, behavior: 'smooth' }); return; }
        const CANVAS_TOP_PADDING = 48; // matches the container's py-12
        const pageTop = getLayoutPosition(idx, layoutMode).y * zoomLevel;
        const target = Math.max(0, pageTop + CANVAS_TOP_PADDING - 24);
        container.scrollTo({ top: target, behavior: 'smooth' });
    }, [currentPageId, layoutMode, pages, zoomLevel]);

    const handleStageMouseDown = (e: KonvaEventObject<MouseEvent | TouchEvent>) => {
        const stage = e.target.getStage();
        const rawPos = stage?.getPointerPosition();
        if (!rawPos) return;

        const pos = { x: rawPos.x / zoomLevel, y: rawPos.y / zoomLevel };

        // Auto-select page based on pointer click position
        const targetPage = pages.find((_, i) => {
            const offset = getLayoutPosition(i, layoutMode);
            return pos.x >= offset.x && pos.x <= offset.x + 800 && pos.y >= offset.y && pos.y <= offset.y + 1200;
        });

        if (targetPage) {
            // This page change came from a canvas click on a page you're already viewing — don't
            // auto-scroll it into view (would jump the canvas while you're trying to edit).
            if (targetPage.id !== currentPageId) suppressPageScrollRef.current = true;
            selectPage(targetPage.id);
            targetPageIdRef.current = targetPage.id;
            const offset = getLayoutPosition(pages.findIndex(p => p.id === targetPage.id), layoutMode);
            setLastCanvasPosition({ pageId: targetPage.id, x: pos.x - offset.x, y: pos.y - offset.y });
        }

        const clickedOnEmpty = e.target === stage || e.target.name() === 'background-rect';

        // 0. Position-on-Click: place new panel at cursor
        if (placePanelAtNextClick && targetPage) {
            setPlacePanelAtNextClick(false);
            const offset = getLayoutPosition(pages.findIndex(p => p.id === targetPage.id), layoutMode);
            const localX = pos.x - offset.x;
            const localY = pos.y - offset.y;
            const w = 200;
            const h = 200;
            if (placePanelShape === 'ellipse') {
                addPanel(targetPage.id, {
                    shapeType: 'ellipse',
                    x: localX - w / 2,
                    y: localY - h / 2,
                    width: w,
                    height: h,
                });
            } else {
                addPanel(targetPage.id, {
                    shapeType: 'polygon',
                    x: localX - w / 2,
                    y: localY - h / 2,
                    width: w,
                    height: h,
                    points: [{ x: 0, y: 0 }, { x: w, y: 0 }, { x: w, y: h }, { x: 0, y: h }],
                });
            }
            setSelectedElements([]);
            setSelectionBox(null);
            return;
        }

        // 1. Knife Mode
        if (isKnifeMode) {
            setKnifeStart(pos);
            setKnifeCurrent(pos);
            clearSelection();
            return;
        }

        // 2. Drawing Mode
        if (isDrawingMode && targetPage) {
            isDrawingRef.current = true;
            // Draw points relate to the page's local offsets
            const offset = getLayoutPosition(pages.findIndex(p => p.id === targetPage.id), layoutMode);
            setCurrentLine([pos.x - offset.x, pos.y - offset.y]);
            clearSelection();
            return;
        }

        // 3. Normal selection
        if (clickedOnEmpty) {
            clearSelection();
            setSelectionBox({ start: pos, end: pos });
        }

        // Always attempt to clear snaplines on interaction end
        setSnapLines({ lines: [], offset: { x: 0, y: 0 } });
    };

    const handleStageContextMenu = (e: KonvaEventObject<PointerEvent>) => {
        e.evt?.preventDefault();
        // getStage() is nullable — a detached node would have thrown here before.
        const rawPos = e.target.getStage()?.getPointerPosition() ?? null;
        const clientX = e.evt?.clientX ?? 0;
        const clientY = e.evt?.clientY ?? 0;

        let context: 'balloon' | 'panel' | 'empty' = 'empty';
        let pageId: string | undefined;
        let balloonId: string | undefined;
        let panelId: string | undefined;

        let node: Konva.Node | null = e.target;
        while (node) {
            const name = node.name?.() ?? node.attrs?.name;
            if (typeof name === 'string') {
                if (name.startsWith('balloon-')) {
                    context = 'balloon';
                    balloonId = name.slice(8);
                    break;
                }
                if (name.startsWith('panel-')) {
                    context = 'panel';
                    panelId = name.slice(7);
                    break;
                }
                if (name.startsWith('page-')) {
                    pageId = name.slice(5);
                    if (context === 'empty') break;
                }
            }
            node = node.getParent?.();
        }

        let pageLocalX: number | undefined;
        let pageLocalY: number | undefined;
        if (rawPos && pages.length > 0) {
            const pos = { x: rawPos.x / zoomLevel, y: rawPos.y / zoomLevel };
            const targetPage = pages.find((_, i) => {
                const offset = getLayoutPosition(i, layoutMode);
                return pos.x >= offset.x && pos.x <= offset.x + 800 && pos.y >= offset.y && pos.y <= offset.y + 1200;
            });
            if (targetPage) {
                if (context === 'empty') pageId = targetPage.id;
                const offset = getLayoutPosition(pages.findIndex(p => p.id === targetPage.id), layoutMode);
                pageLocalX = pos.x - offset.x;
                pageLocalY = pos.y - offset.y;
            }
        }
        if ((context === 'balloon' || context === 'panel') && !pageId && node) {
            let p: Konva.Node | null = node.getParent?.() ?? null;
            while (p) {
                const n = p.name?.() ?? p.attrs?.name;
                if (typeof n === 'string' && n.startsWith('page-')) {
                    pageId = n.slice(5);
                    break;
                }
                p = p.getParent?.();
            }
        }

        openContextMenu({ x: clientX, y: clientY, context, pageId, balloonId, panelId, pageLocalX, pageLocalY });
    };

    const handleStageMouseMove = (e: KonvaEventObject<MouseEvent | TouchEvent>) => {
        const rawPos = e.target.getStage()?.getPointerPosition();
        if (!rawPos) return;

        const pos = { x: rawPos.x / zoomLevel, y: rawPos.y / zoomLevel };

        const targetPage = pages.find((_, i) => {
            const offset = getLayoutPosition(i, layoutMode);
            return pos.x >= offset.x && pos.x <= offset.x + 800 && pos.y >= offset.y && pos.y <= offset.y + 1200;
        });
        if (targetPage) {
            const offset = getLayoutPosition(pages.findIndex(p => p.id === targetPage.id), layoutMode);
            setLastCanvasPosition({ pageId: targetPage.id, x: pos.x - offset.x, y: pos.y - offset.y });
        }

        if (isKnifeMode && knifeStart) {
            setKnifeCurrent(pos);
            return;
        }

        if (isDrawingMode && isDrawingRef.current && targetPageIdRef.current) {
            const targetIndex = pages.findIndex(p => p.id === targetPageIdRef.current);
            const offset = getLayoutPosition(targetIndex, layoutMode);
            setCurrentLine(prev => [...prev, pos.x - offset.x, pos.y - offset.y]);
            return;
        }

        if (selectionBox) {
            setSelectionBox({ ...selectionBox, end: pos });
            return;
        }
    };

    const performKnifeSplit = (start: { x: number, y: number }, end: { x: number, y: number }) => {
        pages.forEach((page, index) => {
            const offset = getLayoutPosition(index, layoutMode);
            const localStart = { x: start.x - offset.x, y: start.y - offset.y };
            const localEnd = { x: end.x - offset.x, y: end.y - offset.y };

            page.panels.forEach(panel => {
                // PAN-5: the knife works on any convex panel. Rect panels (incl. every image panel)
                // have no `points`, so build a 4-corner polygon for them before splitting.
                // Ellipse/half/quarter/sector are non-polygonal — skip those.
                let points = panel.points && panel.points.length >= 3 ? panel.points : null;
                if (!points) {
                    if (!panel.shapeType || panel.shapeType === 'rect' || panel.shapeType === 'polygon') {
                        points = [
                            { x: 0, y: 0 },
                            { x: panel.width, y: 0 },
                            { x: panel.width, y: panel.height },
                            { x: 0, y: panel.height },
                        ];
                    } else {
                        return;
                    }
                }

                const panelLocalStart = { x: localStart.x - panel.x, y: localStart.y - panel.y };
                const panelLocalEnd = { x: localEnd.x - panel.x, y: localEnd.y - panel.y };

                const splitResult = splitConvexPolygon(points, panelLocalStart, panelLocalEnd);
                if (splitResult) {
                    const [poly1, poly2] = splitResult;
                    removeElement(page.id, panel.id);
                    const { id: _id, type: _type, ...panelProps } = panel;
                    // PAN-6: recompute each half's width/height from its polygon bbox instead of
                    // inheriting the parent's full size (which made split halves clamp/jump wrongly).
                    const bboxSize = (pts: { x: number; y: number }[]) => {
                        const xs = pts.map(p => p.x), ys = pts.map(p => p.y);
                        return { width: Math.max(...xs) - Math.min(...xs), height: Math.max(...ys) - Math.min(...ys) };
                    };
                    const b1 = bboxSize(poly1), b2 = bboxSize(poly2);
                    addPanel(page.id, { ...panelProps, shapeType: 'polygon', points: poly1, width: b1.width, height: b1.height });
                    addPanel(page.id, { ...panelProps, shapeType: 'polygon', points: poly2, width: b2.width, height: b2.height });
                }
            });
        });
    };

    const handleStageMouseUp = () => {
        setSnapLines({ lines: [], offset: { x: 0, y: 0 } });

        if (isKnifeMode && knifeStart && knifeCurrent) {
            performKnifeSplit(knifeStart, knifeCurrent);
            setKnifeStart(null);
            setKnifeCurrent(null);
            return;
        }

        if (selectionBox) {
            // Find intersecting elements across all pages
            const { start, end } = selectionBox;
            const x1 = Math.min(start.x, end.x);
            const x2 = Math.max(start.x, end.x);
            const y1 = Math.min(start.y, end.y);
            const y2 = Math.max(start.y, end.y);

            // Avoid triggering select for micro-drags
            if (x2 - x1 > 5 || y2 - y1 > 5) {
                const selectedIds: string[] = [];

                pages.forEach((page, index) => {
                    const offset = getLayoutPosition(index, layoutMode);

                    page.panels.forEach(p => {
                        let px = p.x + offset.x;
                        let py = p.y + offset.y;
                        let pw = p.width;
                        let ph = p.height;
                        if (p.shapeType === 'polygon' && p.points) {
                            const xs = p.points.map(pt => pt.x + p.x + offset.x);
                            const ys = p.points.map(pt => pt.y + p.y + offset.y);
                            px = Math.min(...xs);
                            pw = Math.max(...xs) - px;
                            py = Math.min(...ys);
                            ph = Math.max(...ys) - py;
                        }
                        if (px < x2 && px + pw > x1 && py < y2 && py + ph > y1) {
                            selectedIds.push(p.id);
                        }
                    });

                    page.balloons.forEach(b => {
                        if (b.x + offset.x < x2 && b.x + offset.x + b.width > x1 && b.y + offset.y < y2 && b.y + offset.y + b.height > y1) {
                            selectedIds.push(b.id);
                        }
                    });
                });

                if (selectedIds.length > 0) {
                    setSelectedElements(selectedIds);
                }
            }
            setSelectionBox(null);
            return;
        }

        if (isDrawingMode && isDrawingRef.current && targetPageIdRef.current) {
            isDrawingRef.current = false;
            if (currentLine.length > 2) {
                addDrawing(targetPageIdRef.current, {
                    points: currentLine,
                    stroke: brushColor,
                    strokeWidth: brushWidth
                });
            }
            setCurrentLine([]);
            targetPageIdRef.current = null;
        }
    };

    // Export Logic
    const exportFormat = useComicStore(state => state.exportFormat);
    const clearExport = useComicStore(state => state.clearExport);

    useEffect(() => {
        if (!exportFormat || !stageRef.current) return;
        clearSelection();

        // Allow React to flush the clearSelection before capturing. The handle is cleared on
        // cleanup so an unmount / export cancel mid-delay can't fire a capture against a torn-down
        // stage (previously this timer leaked and kept the whole closure alive).
        const timer = window.setTimeout(() => {
            const stage = stageRef.current;
            if (!stage) return;

            if (exportFormat === 'png') {
                // Export just the current page high-res
                const currentPageIndex = pages.findIndex(p => p.id === currentPageId);
                const idx = currentPageIndex >= 0 ? currentPageIndex : 0;
                const offset = getLayoutPosition(idx, layoutMode);

                const uri = stage.toDataURL({
                    x: offset.x * zoomLevel,
                    y: offset.y * zoomLevel,
                    width: 800 * zoomLevel,
                    height: 1200 * zoomLevel,
                    pixelRatio: 3.125 / zoomLevel // ensure pixelRatio counters current zoom to always be precisely 3.125 relative to base 800x1200
                });

                const link = document.createElement('a');
                link.download = `ARCS_Page_${idx + 1}_${new Date().toISOString().split('T')[0]}.png`;
                link.href = uri;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            } else if (exportFormat === 'pdf') {
                // Export all pages into a high-res PDF
                // 800x1200 pixels -> 8.33" x 12.5" at 300 DPI
                const pdf = new jsPDF({
                    orientation: 'portrait',
                    unit: 'in',
                    format: [8.33, 12.5]
                });

                for (let i = 0; i < pages.length; i++) {
                    if (i > 0) pdf.addPage([8.33, 12.5], 'portrait');

                    const offset = getLayoutPosition(i, layoutMode);
                    const uri = stage.toDataURL({
                        x: offset.x * zoomLevel,
                        y: offset.y * zoomLevel,
                        width: 800 * zoomLevel,
                        height: 1200 * zoomLevel,
                        pixelRatio: 3.125 / zoomLevel
                    });

                    pdf.addImage(uri, 'PNG', 0, 0, 8.33, 12.5);
                }

                pdf.save(`ARCS_ComicBook_${new Date().toISOString().split('T')[0]}.pdf`);
            }
            clearExport();
        }, 100);

        return () => window.clearTimeout(timer);
    }, [exportFormat, pages, currentPageId, layoutMode, zoomLevel, clearExport, clearSelection]);

    const stageWidth = layoutMode === 'spread' && pages.length > 1 ? 1600 + 40 : 800 + 40; // padding
    const stageHeight = layoutMode === 'spread'
        ? Math.ceil(pages.length / 2) * 1220
        : Math.max(1, pages.length) * 1220;

    // Every hook above runs unconditionally; only the rendered output is short-circuited here.
    if (!pages || pages.length === 0) {
        return <div className="text-white p-4">Loading Comic Engine...</div>;
    }

    return (
        <div className="w-full h-full flex flex-col bg-transparent">
            {/* Canvas Area — video backdrop for future Infinite Comic Scroll; Asset Bridge: drop image not on panel → overlay */}
            <div
                ref={scrollContainerRef}
                className={`flex-1 overflow-auto flex justify-center items-start py-12 relative comic-canvas-container ${isKnifeMode ? 'cursor-crosshair' : isDrawingMode ? 'cursor-crosshair' : 'cursor-default'}`}
                style={{ background: '#000814' }}
                onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; }}
                onDrop={(e) => {
                    e.preventDefault();
                    const url = e.dataTransfer.getData('application/x-asset-url');
                    if (!url || !currentPageId) return;
                    const stage = stageRef.current;
                    if (!stage?.container) return;
                    const rect = stage.container().getBoundingClientRect();
                    const logicalX = (e.clientX - rect.left) / zoomLevel;
                    const logicalY = (e.clientY - rect.top) / zoomLevel;
                    const pageIndex = pages.findIndex(p => p.id === currentPageId);
                    if (pageIndex < 0) return;
                    const offset = getLayoutPosition(pageIndex, layoutMode);
                    const pageLocalX = logicalX - offset.x;
                    const pageLocalY = logicalY - offset.y;
                    const page = pages[pageIndex];
                    const hitPanel = page.panels.find((p: Panel) =>
                        pointInPanel(p.shapeType, p.x, p.y, p.width, p.height, p.points, pageLocalX, pageLocalY, p.centralAngle)
                    );
                    if (hitPanel) {
                        updatePanel(page.id, hitPanel.id, { imageUrl: url });
                    } else {
                        addOverlay(page.id, {
                            type: 'image',
                            src: url,
                            // IMG-7: the FloatingAsset group origin is the image center (offset applied
                            // there), so drop at the cursor directly — the old -60 double-offset it.
                            x: pageLocalX,
                            y: pageLocalY,
                            rotation: 0,
                            scaleX: 1,
                            scaleY: 1,
                            zIndex: (page.overlays || []).length
                        });
                    }
                }}
            >
                <video
                    className="absolute inset-0 w-full h-full object-cover pointer-events-none opacity-20"
                    aria-hidden
                    muted
                    loop
                    playsInline
                    preload="metadata"
                />
                <Stage
                    ref={stageRef}
                    width={stageWidth * zoomLevel}
                    height={stageHeight * zoomLevel}
                    scale={{ x: zoomLevel, y: zoomLevel }}
                    onMouseDown={handleStageMouseDown}
                    onMouseMove={handleStageMouseMove}
                    onMouseUp={handleStageMouseUp}
                    onContextMenu={handleStageContextMenu}
                    onTouchStart={handleStageMouseDown}
                    onTouchMove={handleStageMouseMove}
                    onTouchEnd={handleStageMouseUp}
                    style={{ background: 'transparent' }}
                >
                    <Layer name="layer-background">
                        {pages.map((page, i) => {
                            const offset = getLayoutPosition(i, layoutMode);
                            const rawFill = pageSettings?.backgroundColor ?? page.background ?? defaultPageBg;
                            const fill = rawFill;
                            return (
                                <React.Fragment key={`bg-${page.id}`}>
                                    <Rect
                                        name="background-rect"
                                        x={offset.x}
                                        y={offset.y}
                                        width={800}
                                        height={1200}
                                        fill={fill}
                                        shadowColor={currentPageId === page.id ? "#3B82F6" : "black"}
                                        shadowBlur={currentPageId === page.id ? 20 : 50}
                                        shadowOpacity={currentPageId === page.id ? 1 : 0.5}
                                        shadowOffset={{ x: 0, y: 0 }}
                                        stroke={currentPageId === page.id ? "#3B82F6" : "rgba(255, 255, 255, 0.05)"}
                                        strokeWidth={currentPageId === page.id ? 2 : 1}
                                    />
                                    <PageBackgroundImage
                                        key={`bgimg-${page.id}`}
                                        page={page}
                                        offsetX={offset.x}
                                        offsetY={offset.y}
                                        fallbackSrc={pageSettings?.backgroundImage}
                                        fallbackFillMode={pageSettings?.bgFillMode}
                                        fallbackOpacity={pageSettings?.bgOpacity}
                                    />
                                </React.Fragment>
                            );
                        })}
                    </Layer>

                    <Layer name="layer-comic-elements">
                        {pages.map((page, i) => {
                            const offset = getLayoutPosition(i, layoutMode);
                            return (
                                <Group key={`elements-${page.id}`} name={`page-${page.id}`} x={offset.x} y={offset.y}>
                                    {/* SYS-2: single pass in layerOrder so panels/balloons/drawings can be freely
                                        restacked (LayerTree + Bring-to-Front/Send-to-Back) instead of panels
                                        always sitting beneath balloons. Any element missing from layerOrder is
                                        appended so nothing disappears. Overlays still render in a later pass. */}
                                    {(() => {
                                        const order = page.layerOrder || [];
                                        const allIds = [
                                            ...page.panels.map(p => p.id),
                                            ...((page.drawings || []).map(d => d.id)),
                                            ...((page.balloons || []).map(b => b.id)),
                                        ];
                                        const orderedIds = [
                                            ...order.filter(id => allIds.includes(id)),
                                            ...allIds.filter(id => !order.includes(id)),
                                        ];
                                        const render = (elementId: string) => {
                                            const panel = page.panels.find(p => p.id === elementId);
                                            if (panel) {
                                                return (
                                                    <ComicPanel
                                                        key={panel.id}
                                                        panel={panel}
                                                        isSelected={selectedElementIds.includes(panel.id)}
                                                        onSelect={(e) => {
                                                            if (e?.evt && 'shiftKey' in e.evt && e.evt.shiftKey) {
                                                                toggleSelection(panel.id);
                                                            } else {
                                                                setSelectedElements([panel.id]);
                                                            }
                                                            selectPage(page.id);
                                                        }}
                                                        onChange={(newAttrs: Partial<Panel>) => {
                                                            updatePanel(page.id, panel.id, newAttrs);
                                                            if (newAttrs.x !== undefined && newAttrs.y !== undefined) {
                                                                // Use the gutter-aware variant so the guide overlay matches the
                                                                // positions the panel actually snaps to — including page-center,
                                                                // true page edges, and one-gutter offsets. The plain getSnapLines
                                                                // only knew sibling edges, so centering/bleed snaps drew no line.
                                                                // PAN-8: for polygons whose points don't start at the group origin,
                                                                // offset by the bbox min so guide lines land on the visible edges.
                                                                let gx = newAttrs.x, gy = newAttrs.y;
                                                                if (panel.shapeType === 'polygon' && panel.points && panel.points.length) {
                                                                    gx += Math.min(...panel.points.map(pt => pt.x));
                                                                    gy += Math.min(...panel.points.map(pt => pt.y));
                                                                }
                                                                const { snapLines } = getGutterAwareSnapLines(gx, gy, panel.width, panel.height, [...page.panels, ...(page.balloons || [])], panel.id, gutterSize);
                                                                setSnapLines({ lines: snapLines, offset });
                                                            }
                                                        }}
                                                        onDragEnd={() => {
                                                            setSnapLines({ lines: [], offset: { x: 0, y: 0 } });
                                                            setDiagonalGuides({ guides: [], offset: { x: 0, y: 0 } });
                                                        }}
                                                        onDiagonalGuides={(guides) => setDiagonalGuides({ guides, offset })}
                                                        onVertexSnap={(lines) => setSnapLines({ lines, offset })}
                                                    />
                                                );
                                            }
                                            const drawing = page.drawings?.find(d => d.id === elementId);
                                            if (drawing) return <DrawingView key={drawing.id} drawing={drawing} />;
                                            const balloon = page.balloons?.find(b => b.id === elementId);
                                            if (balloon) {
                                                // Never `return null` on an unknown id — that made the
                                                // balloon disappear from the page with no error.
                                                const styleDef = resolveBalloonStyle(balloon.styleId);
                                                return (
                                                    <BalloonNode
                                                        key={balloon.id}
                                                        balloon={{ ...balloon, isSelected: selectedElementIds.includes(balloon.id) }}
                                                        styleDef={styleDef}
                                                        onSelect={(id, e) => {
                                                            if (e?.evt && 'shiftKey' in e.evt && e.evt.shiftKey) toggleSelection(id);
                                                            else setSelectedElements([id]);
                                                            selectPage(page.id);
                                                        }}
                                                        onChange={(bubbleId: string, newAttrs: Partial<BalloonInstance>) => updateBalloon(page.id, bubbleId, newAttrs)}
                                                    />
                                                );
                                            }
                                            return null;
                                        };
                                        return <>{orderedIds.map(render)}</>;
                                    })()}

                                    {/* Real-time drawing line preview for this specific page */}
                                    {isDrawingMode && targetPageIdRef.current === page.id && currentLine.length > 0 && (
                                        <Line
                                            points={currentLine}
                                            stroke={brushColor}
                                            strokeWidth={brushWidth}
                                            tension={0.5}
                                            lineCap="round"
                                            lineJoin="round"
                                            perfectDrawEnabled={false}
                                        />
                                    )}
                                </Group>
                            );
                        })}

                        {/* Overlay layer: floating assets above panels, no panel clipping */}
                        {pages.map((page, i) => {
                            const offset = getLayoutPosition(i, layoutMode);
                            return (
                                <Group key={`overlay-${page.id}`} x={offset.x} y={offset.y}>
                                    {/* IMG-7: honor overlay zIndex for stacking (was raw array order). */}
                                    {[...(page.overlays || [])].sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0)).map((overlay) => (
                                        <FloatingAsset
                                            key={overlay.id}
                                            overlay={overlay}
                                            pageId={page.id}
                                            isSelected={selectedElementIds.includes(overlay.id)}
                                            onSelect={(e) => {
                                                if (e?.cancelBubble !== undefined) e.cancelBubble = true;
                                                setSelectedElements([overlay.id]);
                                                selectPage(page.id);
                                            }}
                                            onUpdate={(updates) => updateOverlay(page.id, overlay.id, updates)}
                                        />
                                    ))}
                                </Group>
                            );
                        })}

                        {/* Real-time Knife Slash Visual (Absolute Stage Coords) */}
                        {isKnifeMode && knifeStart && knifeCurrent && (
                            <KonvaLine
                                points={[knifeStart.x, knifeStart.y, knifeCurrent.x, knifeCurrent.y]}
                                stroke="#EF4444"
                                strokeWidth={3}
                                dash={[5, 5]}
                                lineCap="round"
                            />
                        )}

                        {/* Marquee Selection Box (Absolute Stage Coords) */}
                        {selectionBox && (
                            <Rect
                                x={Math.min(selectionBox.start.x, selectionBox.end.x)}
                                y={Math.min(selectionBox.start.y, selectionBox.end.y)}
                                width={Math.abs(selectionBox.end.x - selectionBox.start.x)}
                                height={Math.abs(selectionBox.end.y - selectionBox.start.y)}
                                fill="rgba(59, 130, 246, 0.2)"
                                stroke="#3B82F6"
                                strokeWidth={1}
                                dash={[4, 4]}
                            />
                        )}

                        {/* H/V snap guides — shared by panel drag and vertex/edge drag */}
                        {snapLines.lines.map((line, i) => {
                            const isVertical = line.axis === 'x';
                            const pos = line.position;
                            return (
                                <KonvaLine
                                    key={`snap-${i}`}
                                    points={
                                        isVertical
                                            ? [pos + snapLines.offset.x, 0, pos + snapLines.offset.x, 3000]
                                            : [0, pos + snapLines.offset.y, 3000, pos + snapLines.offset.y]
                                    }
                                    stroke={ACCENT_GOLD_SOLID}
                                    strokeWidth={1}
                                    dash={[4, 4]}
                                    listening={false}
                                />
                            );
                        })}

                        {/* Diagonal guides (angled edge proximity) */}
                        {diagonalGuides.guides.map((g, i) => (
                            <KonvaLine
                                key={`diag-${i}`}
                                points={[
                                    g.x1 + diagonalGuides.offset.x,
                                    g.y1 + diagonalGuides.offset.y,
                                    g.x2 + diagonalGuides.offset.x,
                                    g.y2 + diagonalGuides.offset.y,
                                ]}
                                stroke={ACCENT_GOLD_SOLID}
                                strokeWidth={1}
                                dash={[4, 4]}
                                listening={false}
                            />
                        ))}
                    </Layer>
                </Stage>
            </div>
        </div>
    );
};
