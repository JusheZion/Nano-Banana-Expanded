import React, { useRef, useEffect } from 'react';
import { Stage, Layer, Rect, Line, Line as KonvaLine, Group } from 'react-konva';
import { useComicStore, type Panel } from '../../../stores/comicStore';
import { BALLOON_STYLES } from '../data/BalloonStyles';
import { BalloonNode } from '../components/BalloonNode';
import { ComicPanel } from '../components/ComicPanel';
import { splitConvexPolygon } from '../utils/geometry';
import { getSnapLines, type SnapLine } from '../utils/snapping';
import type { BalloonStyleId, BalloonInstance } from '../../../types/balloon';

// Placeholder for image URL
const PLACEHOLDER_IMAGE_URL = "https://via.placeholder.com/150";

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

// Coordinate helper for Multi-Page layout
const getLayoutPosition = (index: number, mode: 'webtoon' | 'spread') => {
    if (mode === 'spread') {
        return { x: (index % 2) * 800, y: Math.floor(index / 2) * 1220 }; // slight vertical gap
    }
    return { x: 0, y: index * 1220 }; // 1200 + 20px gap for webtoon spacing
};

export const ComicCanvas: React.FC = () => {
    const {
        pages,
        currentPageId,
        selectedElementIds,
        layoutMode,
        zoomLevel,
        selectPage,
        setSelectedElements,
        toggleSelection,
        clearSelection,
        updatePanel,
        addPanel,
        addBalloon,
        updateBalloon,

        // Drawing Mode
        isDrawingMode,
        brushColor,
        brushWidth,
        addDrawing,

        // Node manipulation
        removeElement
    } = useComicStore();

    const currentPage = pages.find(p => p.id === currentPageId) || pages[0];

    // Local state for drawing
    const isDrawingRef = useRef(false);
    const [currentLine, setCurrentLine] = React.useState<number[]>([]);
    const targetPageIdRef = useRef<string | null>(null);

    // Local state for Knife Tool
    const [isKnifeMode, setIsKnifeMode] = React.useState(false);
    const [knifeStart, setKnifeStart] = React.useState<{ x: number, y: number } | null>(null);
    const [knifeCurrent, setKnifeCurrent] = React.useState<{ x: number, y: number } | null>(null);

    // Multi-Select Marquee
    const [selectionBox, setSelectionBox] = React.useState<{ start: { x: number, y: number }, end: { x: number, y: number } } | null>(null);

    // Snapping Guides
    const [snapLines, setSnapLines] = React.useState<{ lines: SnapLine[], offset: { x: number, y: number } }>({ lines: [], offset: { x: 0, y: 0 } });

    if (!pages || pages.length === 0) return <div className="text-white p-4">Loading Comic Engine...</div>;

    const stageRef = useRef<any>(null);

    const handleStageMouseDown = (e: any) => {
        const stage = e.target.getStage();
        const rawPos = stage.getPointerPosition();
        if (!rawPos) return;

        const pos = { x: rawPos.x / zoomLevel, y: rawPos.y / zoomLevel };

        // Auto-select page based on pointer click position
        const targetPage = pages.find((_, i) => {
            const offset = getLayoutPosition(i, layoutMode);
            return pos.x >= offset.x && pos.x <= offset.x + 800 && pos.y >= offset.y && pos.y <= offset.y + 1200;
        });

        if (targetPage) {
            selectPage(targetPage.id);
            targetPageIdRef.current = targetPage.id;
        }

        const clickedOnEmpty = e.target === stage || e.target.name() === 'background-rect';

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

    const handleStageMouseMove = (e: any) => {
        const stage = e.target.getStage();
        const rawPos = stage.getPointerPosition();
        if (!rawPos) return;

        const pos = { x: rawPos.x / zoomLevel, y: rawPos.y / zoomLevel };

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
                if (panel.shapeType !== 'polygon' || !panel.points || panel.points.length < 3) return;

                const panelLocalStart = { x: localStart.x - panel.x, y: localStart.y - panel.y };
                const panelLocalEnd = { x: localEnd.x - panel.x, y: localEnd.y - panel.y };

                const splitResult = splitConvexPolygon(panel.points, panelLocalStart, panelLocalEnd);
                if (splitResult) {
                    const [poly1, poly2] = splitResult;
                    removeElement(page.id, panel.id);
                    const { id, type, ...panelProps } = panel;
                    addPanel(page.id, { ...panelProps, points: poly1 });
                    addPanel(page.id, { ...panelProps, points: poly2 });
                }
            });
        });
    };

    const handleStageMouseUp = () => {
        setSnapLines({ lines: [], offset: { x: 0, y: 0 } }); // Ensure they disappear

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
    const exportTrigger = useComicStore(state => state.exportTrigger);
    useEffect(() => {
        if (exportTrigger > 0 && stageRef.current) {
            clearSelection();
            setTimeout(() => {
                const uri = stageRef.current.toDataURL({ pixelRatio: 3 });
                const link = document.createElement('a');
                link.download = `NanoBanana_Comic_${new Date().toISOString().split('T')[0]}.png`;
                link.href = uri;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            }, 100);
        }
    }, [exportTrigger]);

    const handleInsertImage = () => {
        if (selectedElementIds.length > 0) {
            pages.forEach(page => {
                const isPanel = page.panels.some(p => selectedElementIds.includes(p.id));
                if (isPanel) {
                    const selectedPanels = page.panels.filter(p => selectedElementIds.includes(p.id));
                    selectedPanels.forEach(p => updatePanel(page.id, p.id, { imageUrl: PLACEHOLDER_IMAGE_URL }));
                }
            });
        } else {
            alert("Select a panel first!");
        }
    };

    const handleAddCallout = (calloutId: string) => {
        const styleId = calloutId as BalloonStyleId;
        const style = BALLOON_STYLES.find(s => s.id === styleId);
        if (!style) return;

        // Extract style-specific overrides (like SFX defaults)
        const overrides: any = {};
        if (style.textWarp) overrides.textWarp = style.textWarp;
        if (style.textStroke) overrides.textStroke = style.textStroke;
        if (style.textStrokeWidth) overrides.textStrokeWidth = style.textStrokeWidth;
        if (style.secondaryTextStroke) overrides.secondaryTextStroke = style.secondaryTextStroke;
        if (style.secondaryTextStrokeWidth) overrides.secondaryTextStrokeWidth = style.secondaryTextStrokeWidth;
        if (style.text3DExtrusion) overrides.text3DExtrusion = style.text3DExtrusion;
        if (style.text3DExtrusionColor) overrides.text3DExtrusionColor = style.text3DExtrusionColor;

        addBalloon(currentPage.id, {
            x: 400,
            y: 600,
            width: 250,
            height: 150,
            hasTail: style.hasTail,
            tailBasePoint: { x: 0, y: 0 },
            tailTip: { x: -50, y: 100 },
            styleId: styleId,
            text: style.kind === 'shout' && styleId.includes('sound_effect') ? "BOOM!" : "Text...",
            overrides: Object.keys(overrides).length > 0 ? overrides : undefined
        });
    };

    const stageWidth = layoutMode === 'spread' && pages.length > 1 ? 1600 + 40 : 800 + 40; // padding
    const stageHeight = layoutMode === 'spread'
        ? Math.ceil(pages.length / 2) * 1220
        : Math.max(1, pages.length) * 1220;

    return (
        <div className="w-full h-full flex flex-col bg-transparent">
            {/* Toolbar */}
            <div className="h-12 border-b border-white/5 bg-obsidian-dark/50 backdrop-blur-md flex items-center px-4 gap-4 z-50 relative">
                <span className="text-white/50 text-xs font-mono uppercase tracking-widest">Comic Engine v0.3</span>
                <div className="h-4 w-px bg-white/10 mx-2" />

                <button
                    className={`px-3 py-1 bg-teal-700/80 hover:bg-teal-600 text-white text-xs rounded border border-teal-500/30 transition-all flex items-center gap-2`}
                    onClick={() => {
                        setIsKnifeMode(false);
                        addPanel(currentPage.id, {
                            shapeType: 'polygon',
                            x: 100,
                            y: 100,
                            width: 200,
                            height: 200,
                            points: [
                                { x: 0, y: 0 },
                                { x: 200, y: 0 },
                                { x: 200, y: 200 },
                                { x: 0, y: 200 }
                            ]
                        });
                    }}
                    title="Add a new panel to the active page"
                >
                    <span className="text-lg">+</span> Add Panel
                </button>

                {/* Knife Tool Toggle */}
                <button
                    className={`px-3 py-1 text-xs rounded border transition-all flex items-center gap-2 ${isKnifeMode ? 'bg-red-600 border-red-400 text-white' : 'bg-transparent border-white/20 text-white/70 hover:bg-white/10'}`}
                    onClick={() => setIsKnifeMode(!isKnifeMode)}
                    title="Slice panels"
                >
                    <span className="text-lg">🔪</span> Split
                </button>

                {/* Callout Selector - Native Select */}
                <div className="relative flex items-center gap-2" title="Select and add a speech balloon">
                    <span className="text-xl">💬</span>
                    <select
                        className="bg-gray-800 text-white p-2 rounded border border-gray-600 outline-none text-xs w-48"
                        onChange={(e) => {
                            if (e.target.value) {
                                handleAddCallout(e.target.value);
                                e.target.value = ''; // Reset selection
                            }
                        }}
                        defaultValue=""
                    >
                        <option value="" disabled>Add Balloon...</option>
                        <optgroup label="Speech & Thought">
                            {BALLOON_STYLES.filter(s => !s.id.startsWith('sound_effect')).map((style) => (
                                <option key={style.id} value={style.id}>
                                    {style.label}
                                </option>
                            ))}
                        </optgroup>
                        <optgroup label="Word Art & SFX">
                            {BALLOON_STYLES.filter(s => s.id.startsWith('sound_effect')).map((style) => (
                                <option key={style.id} value={style.id}>
                                    {style.label}
                                </option>
                            ))}
                        </optgroup>
                    </select>
                </div>

                <button
                    className={`px-3 py-1 text-white text-xs rounded border transition-all flex items-center gap-2 ${selectedElementIds.length > 0
                        ? 'bg-purple-700/80 hover:bg-purple-600 border-purple-500/30'
                        : 'bg-white/5 text-white/30 border-white/5 cursor-not-allowed'
                        }`}
                    onClick={handleInsertImage}
                    disabled={selectedElementIds.length === 0}
                    title="Insert image into selected panel(s)"
                >
                    <span>🖼️</span> Insert Image
                </button>
            </div>

            {/* Canvas Area */}
            <div className={`flex-1 overflow-auto bg-zinc-950 flex justify-center items-start py-12 relative comic-canvas-container ${isDrawingMode ? 'cursor-crosshair' : 'cursor-default'}`}>
                <Stage
                    ref={stageRef}
                    width={stageWidth * zoomLevel}
                    height={stageHeight * zoomLevel}
                    scale={{ x: zoomLevel, y: zoomLevel }}
                    onMouseDown={handleStageMouseDown}
                    onMouseMove={handleStageMouseMove}
                    onMouseUp={handleStageMouseUp}
                    onTouchStart={handleStageMouseDown}
                    onTouchMove={handleStageMouseMove}
                    onTouchEnd={handleStageMouseUp}
                    style={{ background: 'transparent' }}
                >
                    <Layer name="layer-background">
                        {pages.map((page, i) => {
                            const offset = getLayoutPosition(i, layoutMode);
                            return (
                                <Rect
                                    key={`bg-${page.id}`}
                                    name="background-rect"
                                    x={offset.x}
                                    y={offset.y}
                                    width={800}
                                    height={1200}
                                    fill={page.background || "white"}
                                    shadowColor={currentPageId === page.id ? "#3B82F6" : "black"}
                                    shadowBlur={currentPageId === page.id ? 20 : 50}
                                    shadowOpacity={currentPageId === page.id ? 1 : 0.5}
                                    shadowOffset={{ x: 0, y: 0 }}
                                    stroke={currentPageId === page.id ? "#3B82F6" : "rgba(255, 255, 255, 0.05)"}
                                    strokeWidth={currentPageId === page.id ? 2 : 1}
                                />
                            );
                        })}
                    </Layer>

                    <Layer name="layer-comic-elements">
                        {pages.map((page, i) => {
                            const offset = getLayoutPosition(i, layoutMode);
                            return (
                                <Group key={`elements-${page.id}`} x={offset.x} y={offset.y}>
                                    {(page.layerOrder || []).map((elementId) => {
                                        const panel = page.panels.find(p => p.id === elementId);
                                        if (panel) {
                                            return (
                                                <ComicPanel
                                                    key={panel.id}
                                                    panel={panel}
                                                    isSelected={selectedElementIds.includes(panel.id)}
                                                    onSelect={(e: any) => {
                                                        if (e?.evt?.shiftKey) {
                                                            toggleSelection(panel.id);
                                                        } else {
                                                            setSelectedElements([panel.id]);
                                                        }
                                                        selectPage(page.id);
                                                    }}
                                                    onChange={(newAttrs: Partial<Panel>) => {
                                                        updatePanel(page.id, panel.id, newAttrs);
                                                        if (newAttrs.x !== undefined && newAttrs.y !== undefined) {
                                                            const { snapLines } = getSnapLines(newAttrs.x, newAttrs.y, panel.width, panel.height, [...page.panels, ...(page.balloons || [])], panel.id);
                                                            setSnapLines({ lines: snapLines, offset });
                                                        }
                                                    }}
                                                    onDragEnd={() => setSnapLines({ lines: [], offset: { x: 0, y: 0 } })}
                                                />
                                            );
                                        }

                                        const drawing = page.drawings?.find(d => d.id === elementId);
                                        if (drawing) {
                                            return <DrawingView key={drawing.id} drawing={drawing} />;
                                        }

                                        const balloon = page.balloons?.find(b => b.id === elementId);
                                        if (balloon) {
                                            const styleDef = BALLOON_STYLES.find(s => s.id === balloon.styleId);
                                            if (!styleDef) return null;
                                            return (
                                                <BalloonNode
                                                    key={balloon.id}
                                                    balloon={{ ...balloon, isSelected: selectedElementIds.includes(balloon.id) }}
                                                    styleDef={styleDef}
                                                    onSelect={(id: string, e: any) => {
                                                        if (e?.evt?.shiftKey) {
                                                            toggleSelection(id);
                                                        } else {
                                                            setSelectedElements([id]);
                                                        }
                                                        selectPage(page.id);
                                                    }}
                                                    onChange={(bubbleId: string, newAttrs: Partial<BalloonInstance>) => updateBalloon(page.id, bubbleId, newAttrs)}
                                                />
                                            );
                                        }

                                        return null;
                                    })}

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

                        {/* Rendering the SnapLines on the topmost layer relative to their spawning page */}
                        {snapLines.lines.map((line, i) => (
                            <KonvaLine
                                key={`snap-${i}`}
                                points={
                                    line.axis === 'x'
                                        ? [line.position + snapLines.offset.x, snapLines.offset.y, line.position + snapLines.offset.x, snapLines.offset.y + 1200]
                                        : [snapLines.offset.x, line.position + snapLines.offset.y, snapLines.offset.x + 800, line.position + snapLines.offset.y]
                                }
                                stroke="#D4AF37"
                                strokeWidth={1}
                                dash={[5, 5]}
                            />
                        ))}
                    </Layer>
                </Stage>
            </div>
        </div>
    );
};
