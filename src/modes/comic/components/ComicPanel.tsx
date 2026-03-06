import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Group, Rect, Image, Transformer, Line, Circle, Ellipse } from 'react-konva';
import useImage from 'use-image';
import { useComicStore, type Panel } from '../../../stores/comicStore';
import { getVertexSnapLines, getGutterAwareSnapLines, type DiagonalGuide, type SnapLine } from '../utils/snapping';
import { getTextureUrl } from '../data/TextureRegistry';

interface ComicPanelProps {
    panel: Panel;
    isSelected: boolean;
    onSelect: (e?: any) => void;
    onChange: (patch: Partial<Panel>) => void;
    onDragEnd?: (e?: any) => void;
    /** Callback to push diagonal guide lines up to the canvas overlay layer. */
    onDiagonalGuides?: (guides: DiagonalGuide[]) => void;
    /** Callback for H/V vertex snap lines (rendered separately from diagonals). */
    onVertexSnap?: (lines: SnapLine[]) => void;
}

export const ComicPanel: React.FC<ComicPanelProps> = ({ panel, isSelected, onSelect, onChange, onDragEnd, onDiagonalGuides, onVertexSnap }) => {
    const [imageObj] = useImage(panel.imageUrl || '', 'anonymous');
    const groupRef = useRef<any>(null);
    const trRef = useRef<any>(null);
    const imageRef = useRef<any>(null);
    const [isContentMode, setIsContentMode] = useState(false);

    useEffect(() => {
        if (groupRef.current) {
            const group = groupRef.current;
            const origGetClientRect = group.getClientRect.bind(group);
            group.getClientRect = (config?: any) => {
                const glowPass = group.findOne('.glow-pass');
                const wasVisible = glowPass ? glowPass.visible() : false;
                if (glowPass && wasVisible) glowPass.visible(false);
                const rect = origGetClientRect(config);
                if (glowPass && wasVisible) glowPass.visible(true);
                return rect;
            };
        }
    }, []);

    useEffect(() => {
        if (!isSelected) {
            setIsContentMode(false);
            return;
        }
        if (trRef.current) {
            const target = isContentMode && imageRef.current ? imageRef.current : groupRef.current;
            if (target) {
                trRef.current.nodes([target]);
                trRef.current.getLayer().batchDraw();
            }
        }
    }, [isSelected, isContentMode]);

    const handleDoubleClick = useCallback(() => {
        if (!isSelected || !panel.imageUrl) return;
        setIsContentMode(prev => !prev);
    }, [isSelected, panel.imageUrl]);

    const isPolygon = panel.shapeType === 'polygon' && panel.points && panel.points.length >= 3;
    const isEllipse = panel.shapeType === 'ellipse';

    let bboxMinX = 0;
    let bboxMinY = 0;
    let bboxWidth = panel.width;
    let bboxHeight = panel.height;

    if (isPolygon) {
        const xs = panel.points!.map(p => p.x);
        const ys = panel.points!.map(p => p.y);
        bboxMinX = Math.min(...xs);
        bboxMinY = Math.min(...ys);
        bboxWidth = Math.max(...xs) - bboxMinX;
        bboxHeight = Math.max(...ys) - bboxMinY;
        // Ensure strictly positive size
        bboxWidth = Math.max(1, bboxWidth);
        bboxHeight = Math.max(1, bboxHeight);
    }

    const fillMode = panel.imageFillMode || 'cover';
    let imgScaleX = 1;
    let imgScaleY = 1;
    let imgX = 0;
    let imgY = 0;

    if (imageObj) {
        const imgW = imageObj.width;
        const imgH = imageObj.height;

        if (fillMode === 'cover') {
            const scale = Math.max(bboxWidth / imgW, bboxHeight / imgH);
            imgScaleX = scale;
            imgScaleY = scale;
            // Center the "cover" crop over the bounding box
            imgX = bboxMinX + (bboxWidth - imgW * scale) / 2;
            imgY = bboxMinY + (bboxHeight - imgH * scale) / 2;
        } else if (fillMode === 'stretch') {
            imgScaleX = bboxWidth / imgW;
            imgScaleY = bboxHeight / imgH;
            imgX = bboxMinX;
            imgY = bboxMinY;
        } else if (fillMode === 'center') {
            imgScaleX = 1;
            imgScaleY = 1;
            imgX = bboxMinX + (bboxWidth - imgW) / 2;
            imgY = bboxMinY + (bboxHeight - imgH) / 2;
        } else if (fillMode === 'decal') {
            imgScaleX = panel.imageScale ?? 1;
            imgScaleY = panel.imageScale ?? 1;
            imgX = bboxMinX + (panel.imageOffsetX ?? 0);
            imgY = bboxMinY + (panel.imageOffsetY ?? 0);
        }
    }

    const textureUrl = panel.textureId ? getTextureUrl(panel.textureId) : '';
    const [textureImg] = useImage(textureUrl || '');

    const renderClipPath = (ctx: any) => {
        ctx.beginPath();
        if (isPolygon) {
            ctx.moveTo(panel.points![0].x, panel.points![0].y);
            for (let i = 1; i < panel.points!.length; i++) {
                ctx.lineTo(panel.points![i].x, panel.points![i].y);
            }
            ctx.closePath();
        } else if (isEllipse) {
            ctx.ellipse(panel.width / 2, panel.height / 2, panel.width / 2, panel.height / 2, 0, 0, 2 * Math.PI);
        } else {
            ctx.rect(0, 0, panel.width, panel.height);
        }
    };

    return (
        <React.Fragment>
            <Group
                ref={groupRef}
                x={panel.x}
                y={panel.y}
                rotation={panel.rotation || 0}
                draggable={panel.isLocked !== true}
                visible={panel.isVisible !== false}
                listening={panel.isLocked !== true}
                onClick={onSelect}
                onTap={onSelect}
                onDblClick={handleDoubleClick}
                onDblTap={handleDoubleClick}
                dragBoundFunc={(pos) => {
                    const state = useComicStore.getState();
                    const currentPage = state.pages.find(p => p.id === state.currentPageId);
                    if (!currentPage) return pos;

                    const siblings = [...currentPage.panels, ...(currentPage.balloons || [])];
                    const gutter = currentPage.isCover ? 0 : (state.gutterSize ?? 16);
                    const { newX, newY } = getGutterAwareSnapLines(
                        pos.x,
                        pos.y,
                        panel.width,
                        panel.height,
                        siblings,
                        panel.id,
                        gutter
                    );

                    return { x: newX, y: newY };
                }}
                onDragMove={(e) => {
                    // Update main panel
                    if (e.target === groupRef.current) {
                        onChange({
                            x: e.target.x(),
                            y: e.target.y(),
                        });
                    }
                }}
                onDragEnd={(e) => {
                    if (onDragEnd) onDragEnd(e);
                }}
                onTransformEnd={() => {
                    const node = groupRef.current;
                    if (!node) return;

                    const scaleX = node.scaleX();
                    const scaleY = node.scaleY();

                    node.scaleX(1);
                    node.scaleY(1);

                    if (isPolygon && panel.points) {
                        const newPoints = panel.points.map(p => ({
                            x: p.x * scaleX,
                            y: p.y * scaleY
                        }));
                        onChange({
                            x: node.x(),
                            y: node.y(),
                            points: newPoints
                        });
                    } else {
                        onChange({
                            x: node.x(),
                            y: node.y(),
                            width: Math.max(20, panel.width * Math.abs(scaleX)),
                            height: Math.max(20, panel.height * Math.abs(scaleY))
                        });
                    }
                }}
            >
                {/* -1. Exclusion Halo Pass (Simulates Boolean Cut for Overlays) */}
                {isEllipse && (() => {
                    const gapMargin = 16;
                    const strokeW = isSelected ? 6 : 4;

                    return (
                        <Group listening={false}>
                            {/* 1. Draw the border ONLY over existing opaque pixels (other panels) */}
                            <Ellipse
                                x={panel.width / 2}
                                y={panel.height / 2}
                                radiusX={panel.width / 2 + gapMargin}
                                radiusY={panel.height / 2 + gapMargin}
                                stroke={panel.strokeColor || "#893741"}
                                strokeWidth={strokeW}
                                globalCompositeOperation="source-atop"
                            />
                            {/* 2. Punch the hole inside the border using destination-out */}
                            <Ellipse
                                x={panel.width / 2}
                                y={panel.height / 2}
                                radiusX={panel.width / 2 + gapMargin - (strokeW / 2)}
                                radiusY={panel.height / 2 + gapMargin - (strokeW / 2)}
                                fill="black"
                                globalCompositeOperation="destination-out"
                            />
                        </Group>
                    );
                })()}

                {/* 0. Shadow Pass (Unclipped) */}
                {!!panel.shadowOpacity && (
                    <Group listening={false}>
                        {isPolygon ? (
                            <Line
                                points={panel.points!.flatMap(p => [p.x, p.y])}
                                closed
                                fill="#f0f0f0"
                                shadowColor={panel.shadowColor ?? "black"}
                                shadowBlur={panel.shadowBlur ?? (isSelected ? 15 : 10)}
                                shadowOpacity={panel.shadowOpacity ?? 0.3}
                                shadowOffset={{ x: panel.shadowOffsetX ?? 5, y: panel.shadowOffsetY ?? 5 }}
                            />
                        ) : isEllipse ? (
                            <Ellipse
                                x={panel.width / 2}
                                y={panel.height / 2}
                                radiusX={panel.width / 2}
                                radiusY={panel.height / 2}
                                fill="#f0f0f0"
                                shadowColor={panel.shadowColor ?? "black"}
                                shadowBlur={panel.shadowBlur ?? (isSelected ? 15 : 10)}
                                shadowOpacity={panel.shadowOpacity ?? 0.3}
                                shadowOffset={{ x: panel.shadowOffsetX ?? 5, y: panel.shadowOffsetY ?? 5 }}
                            />
                        ) : (
                            <Rect
                                width={panel.width}
                                height={panel.height}
                                fill="#f0f0f0"
                                shadowColor={panel.shadowColor ?? "black"}
                                shadowBlur={panel.shadowBlur ?? (isSelected ? 15 : 10)}
                                shadowOpacity={panel.shadowOpacity ?? 0.3}
                                shadowOffset={{ x: panel.shadowOffsetX ?? 5, y: panel.shadowOffsetY ?? 5 }}
                            />
                        )}
                    </Group>
                )}

                {/* 0.5 Glow Pass (Offscreen pure shadow trick) */}
                {!!panel.glowOpacity && (() => {
                    const strokeAmount = (panel.glowSpread || 0) * 2;
                    return (
                        <Group name="glow-pass" x={-9000} y={-9000} opacity={panel.glowOpacity} listening={false}>
                            {isPolygon ? (
                                <Line
                                    points={panel.points!.flatMap(p => [p.x, p.y])}
                                    closed
                                    fill={panel.glowColor ?? "#3B82F6"}
                                    stroke={panel.glowColor ?? "#3B82F6"}
                                    strokeWidth={strokeAmount}
                                    lineCap="round"
                                    lineJoin="round"
                                    shadowColor={panel.glowColor ?? "#3B82F6"}
                                    shadowBlur={panel.glowBlur ?? 20}
                                    shadowOpacity={1}
                                    shadowOffset={{ x: 9000, y: 9000 }}
                                />
                            ) : isEllipse ? (
                                <Ellipse
                                    x={panel.width / 2}
                                    y={panel.height / 2}
                                    radiusX={panel.width / 2}
                                    radiusY={panel.height / 2}
                                    fill={panel.glowColor ?? "#3B82F6"}
                                    stroke={panel.glowColor ?? "#3B82F6"}
                                    strokeWidth={strokeAmount}
                                    shadowColor={panel.glowColor ?? "#3B82F6"}
                                    shadowBlur={panel.glowBlur ?? 20}
                                    shadowOpacity={1}
                                    shadowOffset={{ x: 9000, y: 9000 }}
                                />
                            ) : (
                                <Rect
                                    width={panel.width}
                                    height={panel.height}
                                    fill={panel.glowColor ?? "#3B82F6"}
                                    stroke={panel.glowColor ?? "#3B82F6"}
                                    strokeWidth={strokeAmount}
                                    lineCap="round"
                                    lineJoin="round"
                                    shadowColor={panel.glowColor ?? "#3B82F6"}
                                    shadowBlur={panel.glowBlur ?? 20}
                                    shadowOpacity={1}
                                    shadowOffset={{ x: 9000, y: 9000 }}
                                />
                            )}
                        </Group>
                    );
                })()}

                {/* 1. The Panel Background (No Shadow, Unclipped) */}
                {isPolygon ? (
                    <Group>
                        <Line
                            points={panel.points!.flatMap(p => [p.x, p.y])}
                            closed
                            fill="#f0f0f0"
                            listening={true}
                        />
                    </Group>
                ) : isEllipse ? (
                    <Ellipse
                        x={panel.width / 2}
                        y={panel.height / 2}
                        radiusX={panel.width / 2}
                        radiusY={panel.height / 2}
                        fill="#f0f0f0"
                        listening={true}
                    />
                ) : (
                    <Rect
                        width={panel.width}
                        height={panel.height}
                        fill="#f0f0f0"
                        listening={true}
                    />
                )}

                {/* 2. The Artwork (Clipped Group) */}
                <Group clipFunc={renderClipPath}>
                    {imageObj && (
                        <Image
                            ref={imageRef}
                            image={imageObj}
                            draggable={isContentMode}
                            onDragEnd={(e) => {
                                e.cancelBubble = true;
                                if (isContentMode) {
                                    onChange({
                                        imageOffsetX: e.target.x() - bboxMinX,
                                        imageOffsetY: e.target.y() - bboxMinY,
                                    });
                                }
                            }}
                            onTransformEnd={() => {
                                if (!isContentMode || !imageRef.current) return;
                                const node = imageRef.current;
                                const sx = node.scaleX();
                                const sy = node.scaleY();
                                onChange({
                                    imageOffsetX: node.x() - bboxMinX,
                                    imageOffsetY: node.y() - bboxMinY,
                                    imageScale: Math.max(sx, sy),
                                });
                                node.scaleX(sx);
                                node.scaleY(sy);
                            }}
                            x={imgX}
                            y={imgY}
                            scaleX={imgScaleX}
                            scaleY={imgScaleY}
                        />
                    )}
                </Group>

                {/* 2.5 Texture Overlay (Clipped Group) */}
                {textureImg && (
                    <Group clipFunc={renderClipPath} listening={false}>
                        <Rect
                            x={bboxMinX}
                            y={bboxMinY}
                            width={bboxWidth}
                            height={bboxHeight}
                            fillPatternImage={textureImg}
                            fillPatternRepeat="repeat"
                            opacity={panel.textureOpacity ?? 0.5}
                            globalCompositeOperation="multiply"
                            listening={false}
                        />
                    </Group>
                )}

                {/* 3. The Front Border Stroke (Unclipped) */}
                {isPolygon ? (
                    <Line
                        points={panel.points!.flatMap(p => [p.x, p.y])}
                        closed
                        stroke={panel.strokeColor || "#893741"}
                        strokeWidth={isSelected ? 6 : 4}
                        listening={false}
                    />
                ) : isEllipse ? (
                    <Ellipse
                        x={panel.width / 2}
                        y={panel.height / 2}
                        radiusX={panel.width / 2}
                        radiusY={panel.height / 2}
                        stroke={panel.strokeColor || "#893741"}
                        strokeWidth={isSelected ? 6 : 4}
                        listening={false}
                    />
                ) : (
                    <Rect
                        width={panel.width}
                        height={panel.height}
                        stroke={panel.strokeColor || "#893741"}
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
                        hitStrokeWidth={20}
                        draggable
                        dragBoundFunc={(pos) => {
                            const state = useComicStore.getState();
                            const currentPage = state.pages.find(p => p.id === state.currentPageId);
                            if (!currentPage) return pos;

                            const siblings = [...currentPage.panels, ...(currentPage.balloons || [])];
                            const gutter = currentPage.isCover ? 0 : (state.gutterSize ?? 16);
                            const result = getVertexSnapLines(pos.x, pos.y, siblings, panel.id, gutter);
                            onVertexSnap?.(result.snapLines);
                            onDiagonalGuides?.(result.diagonalGuides);

                            return { x: result.newX, y: result.newY };
                        }}
                        onDragMove={(e) => {
                            e.cancelBubble = true;
                            const newPoints = [...panel.points!];
                            newPoints[i] = { x: e.target.x(), y: e.target.y() };
                            onChange({ points: newPoints });
                        }}
                        onDragStart={(e) => { e.cancelBubble = true; }}
                        onDragEnd={(e) => {
                            e.cancelBubble = true;
                            onVertexSnap?.([]);
                            onDiagonalGuides?.([]);
                            if (onDragEnd) onDragEnd();
                        }}
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
                                (e.target as any).setAttr('startPos', pos);
                                (e.target as any).setAttr('startPoints', panel.points);
                            }}
                            dragBoundFunc={function (this: any) {
                                // Lock the line visually exactly where its parent group puts it.
                                return this.parent?.getAbsolutePosition() || { x: 0, y: 0 };
                            }}
                            onDragMove={(e) => {
                                e.cancelBubble = true;
                                const pos = e.target.getStage()?.getPointerPosition();
                                const startPos = (e.target as any).getAttr('startPos');
                                const startPoints = (e.target as any).getAttr('startPoints');

                                if (pos && startPos && startPoints) {
                                    // Calculate delta relative to the drag start
                                    const dx = pos.x - startPos.x;
                                    const dy = pos.y - startPos.y;

                                    // Apply delta to the immutable start points to avoid React state compounding
                                    const newPoints = [...startPoints];

                                    // Edge dragging snaps based on the mouse position (simplified)
                                    // A more robust way is to snap the line itself, but snapping the pointer gives immediate feedback
                                    const state = useComicStore.getState();
                                    const currentPage = state.pages.find(p => p.id === state.currentPageId);
                                    if (currentPage) {
                                        const siblings = [...currentPage.panels, ...(currentPage.balloons || [])];
                                        const gutter = currentPage.isCover ? 0 : (state.gutterSize ?? 16);
                                        const result = getVertexSnapLines(pos.x, pos.y, siblings, panel.id, gutter);
                                        onVertexSnap?.(result.snapLines);
                                        onDiagonalGuides?.(result.diagonalGuides);
                                        const snapDx = result.newX - startPos.x;
                                        const snapDy = result.newY - startPos.y;
                                        newPoints[i] = { x: startPoints[i].x + snapDx, y: startPoints[i].y + snapDy };
                                        newPoints[nextIndex] = { x: startPoints[nextIndex].x + snapDx, y: startPoints[nextIndex].y + snapDy };
                                    } else {
                                        newPoints[i] = { x: startPoints[i].x + dx, y: startPoints[i].y + dy };
                                        newPoints[nextIndex] = { x: startPoints[nextIndex].x + dx, y: startPoints[nextIndex].y + dy };
                                    }

                                    onChange({ points: newPoints });
                                }
                            }}
                            onDragEnd={(e) => {
                                e.cancelBubble = true;
                                (e.target as any).setAttr('startPos', null);
                                (e.target as any).setAttr('startPoints', null);
                                onVertexSnap?.([]);
                                onDiagonalGuides?.([]);
                                if (onDragEnd) onDragEnd();
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

            {isSelected && (
                <Transformer
                    ref={trRef}
                    boundBoxFunc={(oldBox, newBox) => {
                        if (newBox.width < 5 || newBox.height < 5) {
                            return oldBox;
                        }
                        return newBox;
                    }}
                    borderStroke={isContentMode ? '#00D1FF' : '#D4AF37'}
                    anchorStroke={isContentMode ? '#00D1FF' : '#D4AF37'}
                    anchorFill={isContentMode ? '#0F0F12' : '#37615D'}
                    anchorSize={isContentMode ? 10 : 16}
                    anchorCornerRadius={4}
                    padding={isContentMode ? 0 : 10}
                    rotateEnabled={isContentMode}
                    keepRatio={isContentMode ? true : isPolygon}
                    enabledAnchors={isContentMode
                        ? ['top-left', 'top-right', 'bottom-left', 'bottom-right']
                        : isPolygon
                            ? ['top-left', 'top-right', 'bottom-left', 'bottom-right']
                            : ['top-left', 'top-right', 'bottom-left', 'bottom-right', 'top-center', 'bottom-center', 'middle-left', 'middle-right']}
                />
            )}
        </React.Fragment>
    );
};
