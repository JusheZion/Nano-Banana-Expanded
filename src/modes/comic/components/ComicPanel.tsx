import React, { useRef, useEffect } from 'react';
import { Group, Rect, Image, Transformer, Line, Circle } from 'react-konva';
import useImage from 'use-image';
import type { Panel } from '../../../stores/comicStore';

interface ComicPanelProps {
    panel: Panel;
    isSelected: boolean;
    onSelect: (e?: any) => void;
    onChange: (patch: Partial<Panel>) => void;
}

export const ComicPanel: React.FC<ComicPanelProps> = ({ panel, isSelected, onSelect, onChange }) => {
    const [imageObj] = useImage(panel.imageUrl || '', 'anonymous');
    const groupRef = useRef<any>(null);
    const trRef = useRef<any>(null);

    useEffect(() => {
        if (isSelected && groupRef.current && trRef.current) {
            trRef.current.nodes([groupRef.current]);
            trRef.current.getLayer().batchDraw();
        }
    }, [isSelected]);

    const isPolygon = panel.shapeType === 'polygon' && panel.points && panel.points.length >= 3;

    // Compute bounding box for image scaling if polygon
    let bboxWidth = panel.width;
    let bboxHeight = panel.height;
    if (isPolygon) {
        const xs = panel.points!.map(p => p.x);
        const ys = panel.points!.map(p => p.y);
        bboxWidth = Math.max(...xs) - Math.min(...xs);
        bboxHeight = Math.max(...ys) - Math.min(...ys);
        // Ensure strictly positive size
        bboxWidth = Math.max(1, bboxWidth);
        bboxHeight = Math.max(1, bboxHeight);
    }

    const imgScale = imageObj ? Math.max(bboxWidth / imageObj.width, bboxHeight / imageObj.height) : 1;

    return (
        <React.Fragment>
            <Group
                ref={groupRef}
                x={panel.x}
                y={panel.y}
                draggable
                onClick={onSelect}
                onTap={onSelect}
                onDragMove={(e) => {
                    // Update main panel
                    if (e.target === groupRef.current) {
                        onChange({
                            x: e.target.x(),
                            y: e.target.y(),
                        });
                    }
                }}
            >
                {/* 1. The Panel Background & Shadow (Unclipped) */}
                {isPolygon ? (
                    <Group>
                        <Line
                            points={panel.points!.flatMap(p => [p.x, p.y])}
                            closed
                            fill="#f0f0f0"
                            shadowColor="black"
                            shadowBlur={isSelected ? 15 : 10}
                            shadowOpacity={0.3}
                            shadowOffset={{ x: 5, y: 5 }}
                            listening={true}
                        />
                    </Group>
                ) : (
                    <Rect
                        width={panel.width}
                        height={panel.height}
                        fill="#f0f0f0"
                        shadowColor="black"
                        shadowBlur={isSelected ? 15 : 10}
                        shadowOpacity={0.3}
                        shadowOffset={{ x: 5, y: 5 }}
                        listening={true}
                    />
                )}

                {/* 2. The Artwork (Clipped Group) */}
                <Group
                    clipFunc={(ctx) => {
                        ctx.beginPath();
                        if (isPolygon) {
                            ctx.moveTo(panel.points![0].x, panel.points![0].y);
                            for (let i = 1; i < panel.points!.length; i++) {
                                ctx.lineTo(panel.points![i].x, panel.points![i].y);
                            }
                            ctx.closePath();
                        } else {
                            ctx.rect(0, 0, panel.width, panel.height);
                        }
                    }}
                >
                    {imageObj && (
                        <Image
                            image={imageObj}
                            draggable
                            onDragEnd={(e) => {
                                e.cancelBubble = true;
                            }}
                            scaleX={imgScale}
                            scaleY={imgScale}
                        />
                    )}
                </Group>

                {/* 3. The Front Border Stroke (Unclipped) */}
                {isPolygon ? (
                    <Line
                        points={panel.points!.flatMap(p => [p.x, p.y])}
                        closed
                        stroke="#893741"
                        strokeWidth={isSelected ? 6 : 4}
                        listening={false}
                    />
                ) : (
                    <Rect
                        width={panel.width}
                        height={panel.height}
                        stroke="#893741"
                        strokeWidth={isSelected ? 6 : 4}
                        listening={false}
                    />
                )}

                {/* 4. Custom Vertex Coordinates (Trapezoid Anchors) */}
                {isSelected && isPolygon && panel.points!.map((pt, i) => (
                    <Circle
                        key={`anchor-${i}`}
                        x={pt.x}
                        y={pt.y}
                        radius={6}
                        fill="#37615D"
                        stroke="#D4AF37"
                        strokeWidth={2}
                        draggable
                        onDragMove={(e) => {
                            e.cancelBubble = true;
                            const newPoints = [...panel.points!];
                            newPoints[i] = { x: e.target.x(), y: e.target.y() };
                            onChange({ points: newPoints });
                        }}
                        onDragStart={(e) => { e.cancelBubble = true; }}
                        onDragEnd={(e) => { e.cancelBubble = true; }}
                        onMouseDown={(e) => { e.cancelBubble = true; }}
                        onMouseEnter={(e) => {
                            const container = e.target.getStage()?.container();
                            if (container) container.style.cursor = 'crosshair';
                        }}
                        onMouseLeave={(e) => {
                            const container = e.target.getStage()?.container();
                            if (container) container.style.cursor = 'default';
                        }}
                    />
                ))}

                {/* 5. Edge Dragging (Wall Manipulation) */}
                {isSelected && isPolygon && panel.points!.map((pt, i) => {
                    const nextIndex = (i + 1) % panel.points!.length;
                    const nextPt = panel.points![nextIndex];
                    return (
                        <Line
                            key={`edge-${i}`}
                            points={[pt.x, pt.y, nextPt.x, nextPt.y]}
                            stroke="transparent"
                            strokeWidth={15} // Thick hit area
                            draggable
                            onDragStart={(e) => {
                                e.cancelBubble = true;
                                const pos = e.target.getStage()?.getPointerPosition();
                                e.target.setAttr('startPos', pos);
                                e.target.setAttr('startPoints', panel.points);
                            }}
                            dragBoundFunc={function (this: any) {
                                // Lock the line visually exactly where its parent group puts it.
                                return this.parent?.getAbsolutePosition() || { x: 0, y: 0 };
                            }}
                            onDragMove={(e) => {
                                e.cancelBubble = true;
                                const pos = e.target.getStage()?.getPointerPosition();
                                const startPos = e.target.getAttr('startPos');
                                const startPoints = e.target.getAttr('startPoints');

                                if (pos && startPos && startPoints) {
                                    // Calculate delta relative to the drag start
                                    const dx = pos.x - startPos.x;
                                    const dy = pos.y - startPos.y;

                                    // Apply delta to the immutable start points to avoid React state compounding
                                    const newPoints = [...startPoints];
                                    newPoints[i] = { x: startPoints[i].x + dx, y: startPoints[i].y + dy };
                                    newPoints[nextIndex] = { x: startPoints[nextIndex].x + dx, y: startPoints[nextIndex].y + dy };

                                    onChange({ points: newPoints });
                                }
                            }}
                            onDragEnd={(e) => {
                                e.cancelBubble = true;
                                // Cleanup tracking attributes
                                e.target.setAttr('startPos', null);
                                e.target.setAttr('startPoints', null);
                            }}
                            onMouseDown={(e) => {
                                e.cancelBubble = true;
                            }}
                            onMouseEnter={(e) => {
                                const container = e.target.getStage()?.container();
                                if (container) container.style.cursor = 'move';
                                // Optional: make line slightly visible on hover
                                (e.target as any).stroke('rgba(212, 175, 55, 0.4)');
                                e.target.getLayer()?.batchDraw();
                            }}
                            onMouseLeave={(e) => {
                                const container = e.target.getStage()?.container();
                                if (container) container.style.cursor = 'default';
                                (e.target as any).stroke('transparent');
                                e.target.getLayer()?.batchDraw();
                            }}
                        />
                    );
                })}
            </Group>

            {/* Transformer for resizing the panel ONLY IF RECT */}
            {isSelected && !isPolygon && (
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
                />
            )}
        </React.Fragment>
    );
};
