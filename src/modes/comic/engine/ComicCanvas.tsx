import React, { useRef, useEffect } from 'react';
import { Stage, Layer, Rect, Line, Line as KonvaLine } from 'react-konva';
import { useComicStore, type Panel } from '../../../stores/comicStore';
import { BALLOON_STYLES } from '../data/BalloonStyles';
import { BalloonNode } from '../components/BalloonNode';
import { ComicPanel } from '../components/ComicPanel';
import { splitConvexPolygon } from '../utils/geometry';
import type { BalloonStyleId, BalloonInstance } from '../../../types/balloon';

// Placeholder for image URL
const PLACEHOLDER_IMAGE_URL = "https://via.placeholder.com/150";

// --- Drawing View ---
const DrawingView = ({ drawing }: { drawing: { points: number[], stroke: string, strokeWidth: number } }) => {
    return (
        <Line
            points={drawing.points}
            stroke={drawing.stroke}
            strokeWidth={drawing.strokeWidth}
            tension={0.5}
            lineCap="round"
            lineJoin="round"
            perfectDrawEnabled={false}
        />
    );
};

export const ComicCanvas: React.FC = () => {
    const {
        pages,
        currentPageId,
        selectedElementIds,
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

    const currentPage = pages.find(p => p.id === currentPageId);

    // Local state for drawing
    const isDrawingRef = useRef(false);
    const [currentLine, setCurrentLine] = React.useState<number[]>([]);

    // Local state for Knife Tool
    const [isKnifeMode, setIsKnifeMode] = React.useState(false);
    const [knifeStart, setKnifeStart] = React.useState<{ x: number, y: number } | null>(null);
    const [knifeCurrent, setKnifeCurrent] = React.useState<{ x: number, y: number } | null>(null);

    // Multi-Select Marquee
    const [selectionBox, setSelectionBox] = React.useState<{ start: { x: number, y: number }, end: { x: number, y: number } } | null>(null);

    if (!currentPage) return <div className="text-white p-4">Loading Comic Engine...</div>;

    const stageRef = useRef<any>(null);

    const handleStageMouseDown = (e: any) => {
        const stage = e.target.getStage();
        const pos = stage.getPointerPosition();
        const clickedOnEmpty = e.target === stage || e.target.name() === 'background-rect';

        // 1. Knife Mode
        if (isKnifeMode) {
            setKnifeStart(pos);
            setKnifeCurrent(pos);
            clearSelection();
            return;
        }

        // 2. Drawing Mode
        if (isDrawingMode) {
            isDrawingRef.current = true;
            setCurrentLine([pos.x, pos.y]);
            clearSelection();
            return;
        }

        // 3. Normal selection
        if (clickedOnEmpty) {
            clearSelection();
            setSelectionBox({ start: pos, end: pos });
        }
    };

    const handleStageMouseMove = (e: any) => {
        const stage = e.target.getStage();
        const pos = stage.getPointerPosition();

        if (isKnifeMode && knifeStart) {
            setKnifeCurrent(pos);
            return;
        }

        if (isDrawingMode && isDrawingRef.current) {
            setCurrentLine(prev => [...prev, pos.x, pos.y]);
            return;
        }

        if (selectionBox) {
            setSelectionBox({ ...selectionBox, end: pos });
            return;
        }
    };

    const performKnifeSplit = (start: { x: number, y: number }, end: { x: number, y: number }) => {
        currentPage?.panels.forEach(panel => {
            if (panel.shapeType !== 'polygon' || !panel.points || panel.points.length < 3) return;

            // Convert absolute knife slice line to local panel coordinates
            const localStart = { x: start.x - panel.x, y: start.y - panel.y };
            const localEnd = { x: end.x - panel.x, y: end.y - panel.y };

            const splitResult = splitConvexPolygon(panel.points, localStart, localEnd);
            if (splitResult) {
                const [poly1, poly2] = splitResult;

                // 1. Remove the original panel
                removeElement(currentPage.id, panel.id);

                const { id, type, ...panelProps } = panel;

                // 2. Insert the two new halved panels exactly where the old one was
                addPanel(currentPage.id, {
                    ...panelProps,
                    points: poly1
                });
                addPanel(currentPage.id, {
                    ...panelProps,
                    points: poly2
                });
            }
        });
    };

    const handleStageMouseUp = () => {
        if (isKnifeMode && knifeStart && knifeCurrent) {
            performKnifeSplit(knifeStart, knifeCurrent);
            setKnifeStart(null);
            setKnifeCurrent(null);
            return;
        }

        if (selectionBox) {
            // Find intersecting elements
            const { start, end } = selectionBox;
            const x1 = Math.min(start.x, end.x);
            const x2 = Math.max(start.x, end.x);
            const y1 = Math.min(start.y, end.y);
            const y2 = Math.max(start.y, end.y);

            // Avoid triggering select for micro-drags
            if (x2 - x1 > 5 || y2 - y1 > 5) {
                const selectedIds: string[] = [];

                currentPage?.panels.forEach(p => {
                    let px = p.x;
                    let py = p.y;
                    let pw = p.width;
                    let ph = p.height;
                    if (p.shapeType === 'polygon' && p.points) {
                        const xs = p.points.map(pt => pt.x + p.x);
                        const ys = p.points.map(pt => pt.y + p.y);
                        px = Math.min(...xs);
                        pw = Math.max(...xs) - px;
                        py = Math.min(...ys);
                        ph = Math.max(...ys) - py;
                    }
                    if (px < x2 && px + pw > x1 && py < y2 && py + ph > y1) {
                        selectedIds.push(p.id);
                    }
                });

                currentPage?.balloons.forEach(b => {
                    if (b.x < x2 && b.x + b.width > x1 && b.y < y2 && b.y + b.height > y1) {
                        selectedIds.push(b.id);
                    }
                });

                if (selectedIds.length > 0) {
                    setSelectedElements(selectedIds);
                }
            }
            setSelectionBox(null);
            return;
        }

        if (isDrawingMode && isDrawingRef.current) {
            isDrawingRef.current = false;
            if (currentLine.length > 2) {
                // Save drawing
                addDrawing(currentPage.id, {
                    points: currentLine,
                    stroke: brushColor,
                    strokeWidth: brushWidth
                });
            }
            setCurrentLine([]);
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
            const isPanel = currentPage.panels.some(p => selectedElementIds.includes(p.id));
            if (isPanel) {
                const selectedPanels = currentPage.panels.filter(p => selectedElementIds.includes(p.id));
                selectedPanels.forEach(p => updatePanel(currentPage.id, p.id, { imageUrl: PLACEHOLDER_IMAGE_URL }));
            }
        } else {
            alert("Select a panel first!");
        }
    };

    const handleAddCallout = (calloutId: string) => {
        const styleId = calloutId as BalloonStyleId;
        const style = BALLOON_STYLES.find(s => s.id === styleId);
        if (!style) return;

        addBalloon(currentPage.id, {
            x: 400,
            y: 600,
            width: 250,
            height: 150,
            hasTail: style.hasTail,
            tailBasePoint: { x: 0, y: 0 },
            tailTip: { x: -50, y: 100 },
            styleId: styleId,
            text: "Text..."
        });
    };

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
                    title="Add a new panel to the canvas"
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
                        {BALLOON_STYLES.map((style) => (
                            <option key={style.id} value={style.id}>
                                {style.label}
                            </option>
                        ))}
                    </select>
                </div>

                <button
                    className={`px-3 py-1 text-white text-xs rounded border transition-all flex items-center gap-2 ${selectedElementIds.length > 0 && currentPage.panels.some(p => selectedElementIds.includes(p.id))
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
                    width={800}
                    height={1200}
                    onMouseDown={handleStageMouseDown}
                    onMouseMove={handleStageMouseMove}
                    onMouseUp={handleStageMouseUp}
                    onTouchStart={handleStageMouseDown}
                    onTouchMove={handleStageMouseMove}
                    onTouchEnd={handleStageMouseUp}
                    style={{ background: 'transparent' }}
                >
                    <Layer>
                        {/* Page Background */}
                        <Rect
                            name="background-rect"
                            x={0}
                            y={0}
                            width={800}
                            height={1200}
                            fill="white"
                            shadowColor="black"
                            shadowBlur={50}
                            shadowOpacity={0.5}
                            shadowOffset={{ x: 0, y: 0 }}
                            stroke="rgba(255, 255, 255, 0.05)"
                            strokeWidth={1}
                        />

                        {/* Panels */}
                        {(currentPage.panels || []).map((panel) => (
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
                                }}
                                onChange={(newAttrs: Partial<Panel>) => updatePanel(currentPage.id, panel.id, newAttrs)}
                            />
                        ))}

                        {/* Drawings (Behind bubbles?) or Above? Usually top. Let's put them below bubbles for now or user choice?
                            User said "draw 'KABOOM!' next to it".
                            Lets render Drawings layer.
                        */}
                        {currentPage.drawings?.map((drawing) => (
                            <DrawingView key={drawing.id} drawing={drawing} />
                        ))}

                        {/* Current Line (Ghost) */}
                        {isDrawingMode && currentLine.length > 0 && (
                            <Line
                                points={currentLine}
                                stroke={brushColor}
                                strokeWidth={brushWidth}
                                tension={0.5}
                                lineCap="round"
                                lineJoin="round"
                            />
                        )}

                        {/* Balloons */}
                        {(currentPage.balloons || []).map((balloon) => {
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
                                    }}
                                    onChange={(bubbleId: string, newAttrs: Partial<BalloonInstance>) => updateBalloon(currentPage.id, bubbleId, newAttrs)}
                                />
                            );
                        })}
                        {/* Real-time Knife Slash Visual */}
                        {isKnifeMode && knifeStart && knifeCurrent && (
                            <KonvaLine
                                points={[knifeStart.x, knifeStart.y, knifeCurrent.x, knifeCurrent.y]}
                                stroke="#EF4444"
                                strokeWidth={3}
                                dash={[5, 5]}
                                lineCap="round"
                            />
                        )}

                        {/* Marquee Selection Box */}
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
                    </Layer>
                </Stage>
            </div>
        </div>
    );
};
