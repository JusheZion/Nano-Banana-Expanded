import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Group, Rect, Image, Transformer, Line, Circle, Ellipse, Path, Shape } from 'react-konva';
import useImage from 'use-image';
import { useComicStore, undoPause, undoResume, type Panel } from '../../../stores/comicStore';
import { getVertexSnapLines, getGutterAwareSnapLines, type DiagonalGuide, type SnapLine } from '../utils/snapping';
import { getTextureUrl } from '../data/TextureRegistry';
import {
    getHalfCirclePath,
    getQuarterCirclePath,
    getSectorPath,
} from '../utils/circularPanelPaths';
import { toKonvaColorStops, linearGradientPoints } from '../utils/gradientUtils';

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
    const isFirstPanelDragMove = useRef(true);
    const isFirstVertexOrEdgeDrag = useRef(true);
    const isFirstSectorAngleDrag = useRef(true);

    useEffect(() => {
        if (!groupRef.current) return;
        const group = groupRef.current;
        const origGetClientRect = group.getClientRect.bind(group);
        group.getClientRect = (config?: any) => {
            const glowPass = group.findOne('.glow-pass');
            const wasVisible = glowPass ? glowPass.visible() : false;
            if (glowPass && wasVisible) glowPass.visible(false);
            let rect = origGetClientRect(config);
            if (glowPass && wasVisible) glowPass.visible(true);
            // For half-circle (and quarter/sector), use visible bounding box so Transformer and drag use correct bounds and don't jump off-page.
            const st = panel.shapeType;
            if (st === 'halfCircle') {
                const r = Math.min(panel.width, panel.height) / 2;
                rect = { x: group.x(), y: group.y(), width: 2 * r, height: r };
            } else if (st === 'quarterCircle') {
                const r = Math.min(panel.width, panel.height);
                rect = { x: group.x(), y: group.y(), width: r, height: r };
            } else if (st === 'sector') {
                const r = Math.min(panel.width, panel.height) / 2;
                rect = { x: group.x(), y: group.y(), width: 2 * r, height: 2 * r };
            }
            return rect;
        };
    }, [panel.shapeType, panel.width, panel.height]);

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
    const isHalfCircle = panel.shapeType === 'halfCircle';
    const isQuarterCircle = panel.shapeType === 'quarterCircle';
    const isSector = panel.shapeType === 'sector';
    const isCircularPath = isHalfCircle || isQuarterCircle || isSector;

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
        bboxWidth = Math.max(1, bboxWidth);
        bboxHeight = Math.max(1, bboxHeight);
    } else if (isHalfCircle) {
        const r = Math.min(panel.width, panel.height) / 2;
        bboxMinX = panel.width / 2 - r;
        bboxMinY = panel.height / 2 - r;
        bboxWidth = 2 * r;
        bboxHeight = r;
    } else if (isQuarterCircle) {
        const r = Math.min(panel.width, panel.height);
        bboxWidth = r;
        bboxHeight = r;
    } else if (isSector) {
        const r = Math.min(panel.width, panel.height) / 2;
        bboxMinX = panel.width / 2 - r;
        bboxMinY = panel.height / 2 - r;
        bboxWidth = 2 * r;
        bboxHeight = 2 * r;
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

    const panelFillProps = React.useMemo(() => {
        const g = panel.fillGradient;
        if (!g || !g.stops?.length) return { fill: '#f0f0f0' };
        const colorStops = toKonvaColorStops(g.stops);
        if (g.type === 'linear') {
            const angle = g.angle ?? 90;
            const { start, end } = linearGradientPoints(angle, panel.width, panel.height);
            return {
                fillLinearGradientStartPoint: start,
                fillLinearGradientEndPoint: end,
                fillLinearGradientColorStops: colorStops,
            };
        }
        if (g.type === 'radial') {
            const cx = (g.center?.x ?? 0.5) * panel.width;
            const cy = (g.center?.y ?? 0.5) * panel.height;
            const r = (g.radiusX ?? 0.5) * Math.max(panel.width, panel.height);
            return {
                fillRadialGradientStartPoint: { x: cx, y: cy },
                fillRadialGradientEndPoint: { x: cx + r, y: cy },
                fillRadialGradientStartRadius: 0,
                fillRadialGradientEndRadius: r,
                fillRadialGradientColorStops: colorStops,
            };
        }
        return {
            fillLinearGradientStartPoint: g.start ?? { x: 0, y: 0 },
            fillLinearGradientEndPoint: g.end ?? { x: panel.width, y: panel.height },
            fillLinearGradientColorStops: colorStops,
        };
    }, [panel.fillGradient, panel.width, panel.height]);

    const panelStrokeProps = React.useMemo(() => {
        const g = panel.strokeGradient;
        if (!g || !g.stops?.length) return { stroke: panel.strokeColor || '#893741' };
        const colorStops = toKonvaColorStops(g.stops);
        if (g.type === 'linear') {
            const angle = g.angle ?? 90;
            const { start, end } = linearGradientPoints(angle, panel.width, panel.height);
            return {
                strokeLinearGradientStartPoint: start,
                strokeLinearGradientEndPoint: end,
                strokeLinearGradientColorStops: colorStops,
            };
        }
        if (g.type === 'radial') {
            const cx = (g.center?.x ?? 0.5) * panel.width;
            const cy = (g.center?.y ?? 0.5) * panel.height;
            const r = (g.radiusX ?? 0.5) * Math.max(panel.width, panel.height);
            return {
                strokeRadialGradientStartPoint: { x: cx, y: cy },
                strokeRadialGradientEndPoint: { x: cx + r, y: cy },
                strokeRadialGradientStartRadius: 0,
                strokeRadialGradientEndRadius: r,
                strokeRadialGradientColorStops: colorStops,
            };
        }
        return {
            strokeLinearGradientStartPoint: g.start ?? { x: 0, y: 0 },
            strokeLinearGradientEndPoint: g.end ?? { x: panel.width, y: panel.height },
            strokeLinearGradientColorStops: colorStops,
        };
    }, [panel.strokeGradient, panel.strokeColor, panel.width, panel.height]);

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
        } else if (isHalfCircle) {
            const r = Math.min(panel.width, panel.height) / 2;
            const cx = panel.width / 2;
            const cy = panel.height / 2;
            ctx.moveTo(cx - r, cy);
            ctx.arc(cx, cy, r, Math.PI, 0, false);
            ctx.closePath();
        } else if (isQuarterCircle) {
            const r = Math.min(panel.width, panel.height);
            ctx.moveTo(0, 0);
            ctx.lineTo(r, 0);
            ctx.arc(0, 0, r, 0, Math.PI / 2, false);
            ctx.closePath();
        } else if (isSector) {
            const r = Math.min(panel.width, panel.height) / 2;
            const cx = panel.width / 2;
            const cy = panel.height / 2;
            const α = Math.max(1, Math.min(360, panel.centralAngle ?? 90));
            const endRad = (α * Math.PI) / 180;
            ctx.moveTo(cx, cy);
            ctx.lineTo(cx + r, cy);
            ctx.arc(cx, cy, r, 0, endRad, false);
            ctx.closePath();
        } else {
            ctx.rect(0, 0, panel.width, panel.height);
        }
    };

    return (
        <React.Fragment>
            <Group
                name={`panel-${panel.id}`}
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

                    const PAGE_W = 800;
                    const PAGE_H = 1200;
                    let boundW = panel.width;
                    let boundH = panel.height;
                    if (isHalfCircle) {
                        boundW = 2 * (Math.min(panel.width, panel.height) / 2);
                        boundH = Math.min(panel.width, panel.height) / 2;
                    } else if (isQuarterCircle) {
                        boundW = Math.min(panel.width, panel.height);
                        boundH = boundW;
                    } else if (isSector) {
                        boundW = 2 * (Math.min(panel.width, panel.height) / 2);
                        boundH = boundW;
                    }

                    const siblings = [...currentPage.panels, ...(currentPage.balloons || [])];
                    const gutter = currentPage.isCover ? 0 : (state.gutterSize ?? 16);
                    const { newX, newY } = getGutterAwareSnapLines(
                        pos.x,
                        pos.y,
                        boundW,
                        boundH,
                        siblings,
                        panel.id,
                        gutter
                    );

                    const clampedX = Math.max(0, Math.min(PAGE_W - boundW, newX));
                    const clampedY = Math.max(0, Math.min(PAGE_H - boundH, newY));
                    return { x: clampedX, y: clampedY };
                }}
                onDragStart={() => {
                    undoPause();
                    isFirstPanelDragMove.current = true;
                }}
                onDragMove={(e) => {
                    if (e.target !== groupRef.current) return;
                    if (isFirstPanelDragMove.current) {
                        undoResume();
                        isFirstPanelDragMove.current = false;
                    }
                    onChange({
                        x: e.target.x(),
                        y: e.target.y(),
                    });
                    undoPause();
                }}
                onDragEnd={(e) => {
                    undoResume();
                    if (onDragEnd) onDragEnd(e);
                }}
                onTransformEnd={() => {
                    const node = groupRef.current;
                    if (!node) return;

                    const scaleX = node.scaleX();
                    const scaleY = node.scaleY();
                    const rotation = node.rotation();

                    node.scaleX(1);
                    node.scaleY(1);
                    node.rotation(0);

                    const PAGE_W = 800;
                    const PAGE_H = 1200;

                    if (isPolygon && panel.points) {
                        const newPoints = panel.points.map(p => ({
                            x: p.x * scaleX,
                            y: p.y * scaleY
                        }));
                        let nx = node.x();
                        let ny = node.y();
                        const xs = newPoints.map(p => p.x);
                        const ys = newPoints.map(p => p.y);
                        const w = Math.max(1, Math.max(...xs) - Math.min(...xs));
                        const h = Math.max(1, Math.max(...ys) - Math.min(...ys));
                        nx = Math.max(0, Math.min(PAGE_W - w, nx));
                        ny = Math.max(0, Math.min(PAGE_H - h, ny));
                        onChange({
                            x: nx,
                            y: ny,
                            rotation: rotation,
                            points: newPoints
                        });
                    } else {
                        let nx = node.x();
                        let ny = node.y();
                        const nw = Math.max(20, panel.width * Math.abs(scaleX));
                        const nh = Math.max(20, panel.height * Math.abs(scaleY));
                        if (isHalfCircle) {
                            const visibleH = nh / 2;
                            nx = Math.max(0, Math.min(PAGE_W - nw, nx));
                            ny = Math.max(0, Math.min(PAGE_H - visibleH, ny));
                        } else if (isQuarterCircle) {
                            nx = Math.max(0, Math.min(PAGE_W - nw, nx));
                            ny = Math.max(0, Math.min(PAGE_H - nh, ny));
                        } else if (isSector) {
                            nx = Math.max(0, Math.min(PAGE_W - nw, nx));
                            ny = Math.max(0, Math.min(PAGE_H - nh, ny));
                        } else {
                            nx = Math.max(0, Math.min(PAGE_W - nw, nx));
                            ny = Math.max(0, Math.min(PAGE_H - nh, ny));
                        }
                        onChange({
                            x: nx,
                            y: ny,
                            rotation: rotation,
                            width: nw,
                            height: nh
                        });
                    }
                }}
            >
                {/* -1. Exclusion Halo Pass (Simulates Boolean Cut for Overlays) — overlap effect for circle and circular shapes */}
                {(isEllipse || isCircularPath) && (() => {
                    const gapMargin = 16;
                    const strokeW = isSelected ? 6 : 4;
                    const rHalf = Math.min(panel.width, panel.height) / 2;
                    const rQuarter = Math.min(panel.width, panel.height);
                    const rSector = Math.min(panel.width, panel.height) / 2;

                    if (isEllipse) {
                        return (
                            <Group listening={false}>
                                <Ellipse
                                    x={panel.width / 2}
                                    y={panel.height / 2}
                                    radiusX={panel.width / 2 + gapMargin}
                                    radiusY={panel.height / 2 + gapMargin}
                                    stroke={panel.strokeColor || "#893741"}
                                    strokeWidth={strokeW}
                                    globalCompositeOperation="source-atop"
                                />
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
                    }

                    const outerR = isHalfCircle ? rHalf + gapMargin : isQuarterCircle ? rQuarter + gapMargin : rSector + gapMargin;
                    // Match ellipse branch: stroke centered on outer boundary, punch at outerR - strokeW/2.
                    const innerPunchR = Math.max(1, outerR - strokeW / 2);
                    const haloColor = panel.strokeColor || '#893741';

                    // Half-circle / quarter-circle: same composite as ellipse — stroke offset boundary then destination-out filled interior.
                    // Path fill+compound subpaths was inconsistent; canvas stroke+fill punch matches ellipse behavior.
                    if (isHalfCircle) {
                        return (
                            <Group listening={false} x={panel.width / 2} y={panel.height / 2}>
                                <Shape
                                    listening={false}
                                    sceneFunc={(ctx) => {
                                        ctx.save();
                                        ctx.strokeStyle = haloColor;
                                        ctx.lineWidth = strokeW;
                                        ctx.lineJoin = 'round';
                                        ctx.lineCap = 'round';
                                        ctx.globalCompositeOperation = 'source-atop';
                                        ctx.beginPath();
                                        // Panel path uses SVG sweep 0 = top semicircle (arc at top); canvas equivalent is anticlockwise PI→0.
                                        ctx.arc(0, 0, outerR, Math.PI, 0, true);
                                        ctx.closePath();
                                        ctx.stroke();
                                        ctx.beginPath();
                                        ctx.arc(0, 0, innerPunchR, Math.PI, 0, true);
                                        ctx.closePath();
                                        ctx.fillStyle = 'black';
                                        ctx.globalCompositeOperation = 'destination-out';
                                        ctx.fill();
                                        ctx.restore();
                                    }}
                                />
                            </Group>
                        );
                    }
                    if (isQuarterCircle) {
                        return (
                            <Group listening={false} x={0} y={0}>
                                <Shape
                                    listening={false}
                                    sceneFunc={(ctx) => {
                                        ctx.save();
                                        ctx.strokeStyle = haloColor;
                                        ctx.lineWidth = strokeW;
                                        ctx.lineJoin = 'round';
                                        ctx.lineCap = 'round';
                                        ctx.globalCompositeOperation = 'source-atop';
                                        ctx.beginPath();
                                        ctx.moveTo(0, 0);
                                        ctx.lineTo(outerR, 0);
                                        ctx.arc(0, 0, outerR, 0, Math.PI / 2, false);
                                        ctx.closePath();
                                        ctx.stroke();
                                        ctx.beginPath();
                                        ctx.moveTo(0, 0);
                                        ctx.lineTo(innerPunchR, 0);
                                        ctx.arc(0, 0, innerPunchR, 0, Math.PI / 2, false);
                                        ctx.closePath();
                                        ctx.fillStyle = 'black';
                                        ctx.globalCompositeOperation = 'destination-out';
                                        ctx.fill();
                                        ctx.restore();
                                    }}
                                />
                            </Group>
                        );
                    }

                    // Sector: stroke offset boundary then destination-out inner wedge (gap on arc only; straight edges left as-is per design).
                    const sectorAngleDeg = Math.max(1, Math.min(360, panel.centralAngle ?? 90));
                    const sectorAngleRad = (sectorAngleDeg * Math.PI) / 180;
                    return (
                        <Group listening={false} x={panel.width / 2} y={panel.height / 2}>
                            <Shape
                                listening={false}
                                sceneFunc={(ctx) => {
                                    ctx.save();
                                    ctx.strokeStyle = haloColor;
                                    ctx.lineWidth = strokeW;
                                    ctx.lineJoin = 'round';
                                    ctx.lineCap = 'round';
                                    ctx.globalCompositeOperation = 'source-atop';
                                    ctx.beginPath();
                                    ctx.moveTo(0, 0);
                                    ctx.lineTo(outerR, 0);
                                    ctx.arc(0, 0, outerR, 0, sectorAngleRad, false);
                                    ctx.closePath();
                                    ctx.stroke();
                                    ctx.beginPath();
                                    ctx.moveTo(0, 0);
                                    ctx.lineTo(innerPunchR, 0);
                                    ctx.arc(0, 0, innerPunchR, 0, sectorAngleRad, false);
                                    ctx.closePath();
                                    ctx.fillStyle = 'black';
                                    ctx.globalCompositeOperation = 'destination-out';
                                    ctx.fill();
                                    ctx.restore();
                                }}
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
                        ) : isCircularPath ? (
                            <Group x={isQuarterCircle ? 0 : panel.width / 2} y={isQuarterCircle ? 0 : panel.height / 2}>
                                <Path
                                    data={isHalfCircle ? getHalfCirclePath(Math.min(panel.width, panel.height) / 2) : isQuarterCircle ? getQuarterCirclePath(Math.min(panel.width, panel.height)) : getSectorPath(Math.min(panel.width, panel.height) / 2, panel.centralAngle ?? 90)}
                                    fill="#f0f0f0"
                                    shadowColor={panel.shadowColor ?? "black"}
                                    shadowBlur={panel.shadowBlur ?? (isSelected ? 15 : 10)}
                                    shadowOpacity={panel.shadowOpacity ?? 0.3}
                                    shadowOffset={{ x: panel.shadowOffsetX ?? 5, y: panel.shadowOffsetY ?? 5 }}
                                />
                            </Group>
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
                            ) : isCircularPath ? (
                                <Group x={isQuarterCircle ? 0 : panel.width / 2} y={isQuarterCircle ? 0 : panel.height / 2}>
                                    <Path
                                        data={isHalfCircle ? getHalfCirclePath(Math.min(panel.width, panel.height) / 2) : isQuarterCircle ? getQuarterCirclePath(Math.min(panel.width, panel.height)) : getSectorPath(Math.min(panel.width, panel.height) / 2, panel.centralAngle ?? 90)}
                                        fill={panel.glowColor ?? "#3B82F6"}
                                        stroke={panel.glowColor ?? "#3B82F6"}
                                        strokeWidth={strokeAmount}
                                        shadowColor={panel.glowColor ?? "#3B82F6"}
                                        shadowBlur={panel.glowBlur ?? 20}
                                        shadowOpacity={1}
                                        shadowOffset={{ x: 9000, y: 9000 }}
                                    />
                                </Group>
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
                            {...panelFillProps}
                            listening={true}
                        />
                    </Group>
                ) : isEllipse ? (
                    <Ellipse
                        x={panel.width / 2}
                        y={panel.height / 2}
                        radiusX={panel.width / 2}
                        radiusY={panel.height / 2}
                        {...panelFillProps}
                        listening={true}
                    />
                ) : isCircularPath ? (
                    <Group x={isQuarterCircle ? 0 : panel.width / 2} y={isQuarterCircle ? 0 : panel.height / 2}>
                        <Path
                            data={isHalfCircle ? getHalfCirclePath(Math.min(panel.width, panel.height) / 2) : isQuarterCircle ? getQuarterCirclePath(Math.min(panel.width, panel.height)) : getSectorPath(Math.min(panel.width, panel.height) / 2, panel.centralAngle ?? 90)}
                            {...panelFillProps}
                            listening={true}
                        />
                    </Group>
                ) : (
                    <Rect
                        width={panel.width}
                        height={panel.height}
                        {...panelFillProps}
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
                        {...panelStrokeProps}
                        strokeWidth={isSelected ? 6 : 4}
                        listening={false}
                    />
                ) : isEllipse ? (
                    <Ellipse
                        x={panel.width / 2}
                        y={panel.height / 2}
                        radiusX={panel.width / 2}
                        radiusY={panel.height / 2}
                        {...panelStrokeProps}
                        strokeWidth={isSelected ? 6 : 4}
                        listening={false}
                    />
                ) : isCircularPath ? (
                    <Group x={isQuarterCircle ? 0 : panel.width / 2} y={isQuarterCircle ? 0 : panel.height / 2}>
                        <Path
                            data={isHalfCircle ? getHalfCirclePath(Math.min(panel.width, panel.height) / 2) : isQuarterCircle ? getQuarterCirclePath(Math.min(panel.width, panel.height)) : getSectorPath(Math.min(panel.width, panel.height) / 2, panel.centralAngle ?? 90)}
                            {...panelStrokeProps}
                            strokeWidth={isSelected ? 6 : 4}
                            lineJoin="round"
                            lineCap="round"
                            listening={false}
                        />
                    </Group>
                ) : (
                    <Rect
                        width={panel.width}
                        height={panel.height}
                        {...panelStrokeProps}
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
                            if (isFirstVertexOrEdgeDrag.current) {
                                undoResume();
                                isFirstVertexOrEdgeDrag.current = false;
                            }
                            const newPoints = [...panel.points!];
                            newPoints[i] = { x: e.target.x(), y: e.target.y() };
                            onChange({ points: newPoints });
                            undoPause();
                        }}
                        onDragStart={(e) => {
                            e.cancelBubble = true;
                            undoPause();
                            isFirstVertexOrEdgeDrag.current = true;
                        }}
                        onDragEnd={(e) => {
                            e.cancelBubble = true;
                            undoResume();
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
                                undoPause();
                                isFirstVertexOrEdgeDrag.current = true;
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
                                if (isFirstVertexOrEdgeDrag.current) {
                                    undoResume();
                                    isFirstVertexOrEdgeDrag.current = false;
                                }
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
                                undoPause();
                            }}
                            onDragEnd={(e) => {
                                e.cancelBubble = true;
                                undoResume();
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

                {/* Sector angle handle: drag to wipe open/closed */}
                {isSector && isSelected && (() => {
                    const r = Math.min(panel.width, panel.height) / 2;
                    const α = Math.max(1, Math.min(360, panel.centralAngle ?? 90));
                    const rad = (α * Math.PI) / 180;
                    const hx = r * Math.cos(rad);
                    const hy = r * Math.sin(rad);
                    return (
                        <Group x={panel.width / 2} y={panel.height / 2} listening={false}>
                            <Circle
                                x={hx}
                                y={hy}
                                radius={10}
                                fill="#D4AF37"
                                stroke="#000"
                                strokeWidth={1}
                                draggable
                                listening={true}
                                onMouseDown={(e) => e.cancelBubble = true}
                                onDragStart={(e) => {
                                    e.cancelBubble = true;
                                    undoPause();
                                    isFirstSectorAngleDrag.current = true;
                                }}
                                dragBoundFunc={(pos) => {
                                    const dist = Math.sqrt(pos.x * pos.x + pos.y * pos.y) || r;
                                    const scale = r / dist;
                                    return { x: pos.x * scale, y: pos.y * scale };
                                }}
                                onDragMove={(e) => {
                                    e.cancelBubble = true;
                                    if (isFirstSectorAngleDrag.current) {
                                        undoResume();
                                        isFirstSectorAngleDrag.current = false;
                                    }
                                    const node = e.target;
                                    const dx = node.x();
                                    const dy = node.y();
                                    let angleRad = Math.atan2(dy, dx);
                                    if (angleRad < 0) angleRad += 2 * Math.PI;
                                    let angleDeg = (angleRad * 180) / Math.PI;
                                    if (angleDeg < 1) angleDeg = 1;
                                    if (angleDeg > 360) angleDeg = 360;
                                    onChange({ centralAngle: Math.round(angleDeg) });
                                    undoPause();
                                }}
                                onDragEnd={() => {
                                    undoResume();
                                }}
                            />
                        </Group>
                    );
                })()}
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
                    rotateEnabled={true}
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
