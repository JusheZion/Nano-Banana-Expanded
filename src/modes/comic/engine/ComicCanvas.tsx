import React, { useRef, useEffect } from 'react';
import { Stage, Layer, Rect, Transformer, Group, Ellipse, Text } from 'react-konva';
import useImage from 'use-image';
import { useComicStore, type Panel, type Bubble } from '../../../stores/comicStore';

// URL for a placeholder image from the gallery
const PLACEHOLDER_IMAGE_URL = "/assets/images/Aries Palace.jpg";

const PanelView = ({ panel, isSelected, onSelect, onChange }: {
    panel: Panel;
    isSelected: boolean;
    onSelect: () => void;
    onChange: (newAttrs: Partial<Panel>) => void;
}) => {
    const shapeRef = useRef<any>(null);
    const trRef = useRef<any>(null);
    const [image] = useImage(panel.imageUrl || '', 'anonymous');

    useEffect(() => {
        if (isSelected) {
            trRef.current?.nodes([shapeRef.current]);
            trRef.current?.getLayer().batchDraw();
        }
    }, [isSelected]);

    return (
        <React.Fragment>
            <Rect
                ref={shapeRef}
                x={panel.x}
                y={panel.y}
                width={panel.width}
                height={panel.height}
                fill={panel.imageUrl ? undefined : "white"}
                fillPatternImage={image}
                fillPatternScaleX={(() => {
                    if (!image) return 1;
                    const scale = Math.max(panel.width / image.width, panel.height / image.height);
                    return scale;
                })()}
                fillPatternScaleY={(() => {
                    if (!image) return 1;
                    const scale = Math.max(panel.width / image.width, panel.height / image.height);
                    return scale;
                })()}
                fillPatternX={(() => {
                    if (!image) return 0;
                    const scale = Math.max(panel.width / image.width, panel.height / image.height);
                    return (panel.width - image.width * scale) / 2;
                })()}
                fillPatternY={(() => {
                    if (!image) return 0;
                    const scale = Math.max(panel.width / image.width, panel.height / image.height);
                    return (panel.height - image.height * scale) / 2;
                })()}
                stroke="#893741"
                strokeWidth={isSelected ? 3 : 2}
                draggable
                shadowColor="black"
                shadowBlur={isSelected ? 15 : 10}
                shadowOpacity={0.3}
                shadowOffset={{ x: 5, y: 5 }}
                onClick={onSelect}
                onTap={onSelect}
                onDragEnd={(e) => {
                    onChange({
                        x: e.target.x(),
                        y: e.target.y(),
                    });
                }}
                onTransformEnd={() => {
                    const node = shapeRef.current;
                    const scaleX = node.scaleX();
                    const scaleY = node.scaleY();

                    node.scaleX(1);
                    node.scaleY(1);

                    onChange({
                        x: node.x(),
                        y: node.y(),
                        width: Math.max(5, node.width() * scaleX),
                        height: Math.max(5, node.height() * scaleY),
                    });
                }}
            />
            {isSelected && (
                <Transformer
                    ref={trRef}
                    boundBoxFunc={(oldBox, newBox) => {
                        if (newBox.width < 5 || newBox.height < 5) {
                            return oldBox;
                        }
                        return newBox;
                    }}
                    borderStroke="#D4AF37"
                    anchorStroke="#D4AF37"
                    anchorFill="#37615D"
                    anchorSize={12}
                    anchorCornerRadius={2}
                    padding={5}
                    rotateEnabled={false}
                    keepRatio={!!panel.imageUrl}
                    enabledAnchors={panel.imageUrl ? ['top-left', 'top-right', 'bottom-left', 'bottom-right'] : undefined}
                />
            )}
        </React.Fragment>
    );
};

const BubbleView = ({ bubble, isSelected, onSelect, onChange }: {
    bubble: Bubble;
    isSelected: boolean;
    onSelect: () => void;
    onChange: (newAttrs: Partial<Bubble>) => void;
}) => {
    const groupRef = useRef<any>(null);
    const trRef = useRef<any>(null);

    useEffect(() => {
        if (isSelected) {
            trRef.current?.nodes([groupRef.current]);
            trRef.current?.getLayer().batchDraw();
        }
    }, [isSelected]);

    const handleDblClick = () => {
        const newText = window.prompt("Edit Bubble Text:", bubble.content);
        if (newText !== null) {
            onChange({ content: newText });
        }
    };

    return (
        <React.Fragment>
            <Group
                ref={groupRef}
                x={bubble.x}
                y={bubble.y}
                draggable
                onClick={onSelect}
                onTap={onSelect}
                onDblClick={handleDblClick}
                onDblTap={handleDblClick}
                onDragEnd={(e) => {
                    onChange({
                        x: e.target.x(),
                        y: e.target.y(),
                    });
                }}
                onTransformEnd={() => {
                    const node = groupRef.current;

                    node.scaleX(1);
                    node.scaleY(1);

                    onChange({
                        x: node.x(),
                        y: node.y(),
                        rotation: node.rotation(),
                    });
                }}
            >
                <Ellipse
                    radiusX={bubble.width / 2}
                    radiusY={bubble.height / 2}
                    fill="white"
                    stroke="black"
                    strokeWidth={2}
                    shadowColor="black"
                    shadowBlur={5}
                    shadowOpacity={0.2}
                />
                <Text
                    text={bubble.content}
                    fontSize={14}
                    fill="black"
                    align="center"
                    verticalAlign="middle"
                    width={bubble.width * 0.8}
                    height={bubble.height * 0.8}
                    offsetX={bubble.width * 0.4}
                    offsetY={bubble.height * 0.4}
                    fontFamily="Comic Sans MS, cursive, sans-serif"
                />
            </Group>
            {isSelected && (
                <Transformer
                    ref={trRef}
                    borderStroke="#D4AF37"
                    anchorStroke="#D4AF37"
                    anchorFill="#37615D"
                    anchorSize={10}
                />
            )}
        </React.Fragment>
    );
};

export const ComicCanvas: React.FC = () => {
    const {
        pages,
        currentPageId,
        selectedElementId,
        selectElement,
        updatePanel,
        addPanel,
        addBubble,
        updateBubble
    } = useComicStore();

    const currentPage = pages.find(p => p.id === currentPageId);

    if (!currentPage) return <div className="text-white p-4">Loading Comic Engine...</div>;

    const stageRef = useRef<any>(null);

    const handleStageClick = (e: any) => {
        const clickedOnEmpty = e.target === e.target.getStage() || e.target.name() === 'background-rect';
        if (clickedOnEmpty) {
            selectElement(null);
        }
    };

    // Export Logic
    const exportTrigger = useComicStore(state => state.exportTrigger);
    useEffect(() => {
        if (exportTrigger > 0 && stageRef.current) {
            // Deselect everything to hide handles
            selectElement(null);

            // Wait for render cycle then export
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
        if (selectedElementId) {
            const isPanel = currentPage.panels.some(p => p.id === selectedElementId);
            if (isPanel) {
                updatePanel(currentPage.id, selectedElementId, { imageUrl: PLACEHOLDER_IMAGE_URL });
            }
        } else {
            alert("Select a panel first!");
        }
    };

    const handleAddBubble = () => {
        addBubble(currentPage.id, {
            x: 200,
            y: 200,
            width: 150,
            height: 100,
            content: "Hello World",
            style: 'speech'
        });
    };

    return (
        <div className="w-full h-full flex flex-col bg-neutral-900/50">
            {/* Toolbar */}
            <div className="h-12 border-b border-white/5 bg-obsidian-dark/50 backdrop-blur-md flex items-center px-4 gap-4 z-10">
                <span className="text-white/50 text-xs font-mono uppercase tracking-widest">Comic Engine v0.1</span>
                <div className="h-4 w-px bg-white/10 mx-2" />

                <button
                    className="px-3 py-1 bg-teal-700/80 hover:bg-teal-600 text-white text-xs rounded border border-teal-500/30 transition-all flex items-center gap-2"
                    onClick={() => addPanel(currentPage.id, { x: 100, y: 100, width: 200, height: 200 })}
                >
                    <span className="text-lg">+</span> Add Panel
                </button>

                <button
                    className={`px-3 py-1 text-white text-xs rounded border transition-all flex items-center gap-2 ${selectedElementId && currentPage.panels.some(p => p.id === selectedElementId)
                        ? 'bg-purple-700/80 hover:bg-purple-600 border-purple-500/30'
                        : 'bg-white/5 text-white/30 border-white/5 cursor-not-allowed'
                        }`}
                    onClick={handleInsertImage}
                    disabled={!selectedElementId}
                >
                    <span>🖼️</span> Insert Image
                </button>

                <button
                    className="px-3 py-1 bg-white/10 hover:bg-white/20 text-white text-xs rounded border border-white/10 transition-all flex items-center gap-2"
                    onClick={handleAddBubble}
                >
                    <span>💬</span> Add Bubble
                </button>
            </div>

            {/* Canvas Area */}
            <div className="flex-1 overflow-hidden relative comic-canvas-container">
                <Stage
                    ref={stageRef}
                    width={window.innerWidth}
                    height={window.innerHeight - 100}
                    onMouseDown={handleStageClick}
                    onTouchStart={handleStageClick}
                    style={{ background: '#1a1a1a' }}
                >
                    <Layer>
                        {/* Page Background */}
                        <Rect
                            name="background-rect"
                            x={(window.innerWidth - 800) / 2}
                            y={50}
                            width={800}
                            height={1200}
                            fill="white"
                            shadowColor="black"
                            shadowBlur={20}
                            shadowOpacity={0.5}
                        />
                        {currentPage.panels.map((panel) => (
                            <PanelView
                                key={panel.id}
                                panel={panel}
                                isSelected={panel.id === selectedElementId}
                                onSelect={() => selectElement(panel.id)}
                                onChange={(newAttrs) => updatePanel(currentPage.id, panel.id, newAttrs)}
                            />
                        ))}
                        {currentPage.bubbles.map((bubble) => (
                            <BubbleView
                                key={bubble.id}
                                bubble={bubble}
                                isSelected={bubble.id === selectedElementId}
                                onSelect={() => selectElement(bubble.id)}
                                onChange={(newAttrs) => updateBubble(currentPage.id, bubble.id, newAttrs)}
                            />
                        ))}
                    </Layer>
                </Stage>
            </div>
        </div>
    );
};
