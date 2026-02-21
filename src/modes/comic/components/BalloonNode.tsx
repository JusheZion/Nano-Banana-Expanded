import React, { useRef, useMemo } from 'react';
import { Group, Rect, Circle, Text, Transformer, Path, Ellipse } from 'react-konva';
import type { BalloonInstance, BalloonStyle } from '../../../types/balloon';

interface BalloonNodeProps {
    balloon: BalloonInstance;
    styleDef: BalloonStyle;
    onChange: (id: string, patch: Partial<BalloonInstance>) => void;
    onSelect: (id: string, e: any) => void;
}

export const BalloonNode: React.FC<BalloonNodeProps> = ({ balloon, styleDef, onChange, onSelect }) => {
    const groupRef = useRef<any>(null);
    const trRef = useRef<any>(null);
    const tipRef = useRef<any>(null);

    React.useEffect(() => {
        if (balloon.isSelected && trRef.current && groupRef.current) {
            trRef.current.nodes([groupRef.current]);
            trRef.current.getLayer().batchDraw();
        }
    }, [balloon.isSelected]);

    // Merge overrides
    const fill = balloon.overrides?.fill || styleDef.fill;
    const stroke = balloon.overrides?.stroke || styleDef.stroke;
    const strokeWidth = balloon.overrides?.strokeWidth ?? styleDef.strokeWidth;
    const fontFamily = balloon.overrides?.fontFamily || styleDef.fontFamily;
    const fontSize = balloon.overrides?.fontSize || styleDef.fontSize;
    const textColor = balloon.overrides?.textColor || styleDef.textColor;

    const w = balloon.width;
    const h = balloon.height;
    const halfW = w / 2;
    const halfH = h / 2;

    // Tail geometry
    // We compute the intersection of the line from (0,0) (center of body) to tailTip, 
    // to make it "snap" to the edge. Since shapes vary, we use an approximation: an ellipse boundary
    // for speeches and clouds, or rectangle boundary for boxes.

    // Local coordinates for tail tip (relative to center of group)
    const localTailTip = { x: balloon.tailTip.x, y: balloon.tailTip.y };

    const tailIntersection = useMemo(() => {
        if (!balloon.hasTail) return { x: 0, y: 0 };

        // Normalize vector
        const dx = localTailTip.x;
        const dy = localTailTip.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance === 0) return { x: 0, y: 0 };

        const nx = dx / distance;
        const ny = dy / distance;

        // Use ellipse intersection as a reasonable approximation for most balloons
        // rx = halfW, ry = halfH
        const rx = halfW;
        const ry = halfH;

        // Intersection of line y = (ny/nx)*x with ellipse (x^2/rx^2) + (y^2/ry^2) = 1
        const denom = Math.sqrt((rx * rx * ny * ny) + (ry * ry * nx * nx));
        if (denom === 0) return { x: 0, y: 0 };

        const ix = (rx * ry * nx) / denom;
        const iy = (rx * ry * ny) / denom;

        return { x: ix, y: iy };
    }, [localTailTip, halfW, halfH, balloon.hasTail]);


    // Determine the shape path to render
    const renderBody = () => {
        // Basic body shape depending on kind, fallback to rect/ellipse
        if (styleDef.id === 'speech_rounded_rectangle' || styleDef.id === 'narration_box') {
            const radius = styleDef.cornerRadius || 0;
            return (
                <Rect
                    x={-halfW}
                    y={-halfH}
                    width={w}
                    height={h}
                    cornerRadius={radius}
                    fill={fill}
                    stroke={stroke}
                    strokeWidth={strokeWidth}
                    perfectDrawEnabled={false}
                />
            );
        }

        if (styleDef.id === 'speech_round' || styleDef.id === 'whisper_dashed') {
            return (
                <Ellipse
                    x={0}
                    y={0}
                    radiusX={halfW}
                    radiusY={halfH}
                    fill={fill}
                    stroke={stroke}
                    strokeWidth={strokeWidth}
                    dash={styleDef.id === 'whisper_dashed' ? [5, 5] : undefined}
                    perfectDrawEnabled={false}
                />
            );
        }

        // Default to Ellipse
        return (
            <Ellipse
                x={0}
                y={0}
                radiusX={halfW}
                radiusY={halfH}
                fill={fill}
                stroke={stroke}
                strokeWidth={strokeWidth}
                perfectDrawEnabled={false}
            />
        );
    };

    const renderTail = () => {
        if (!balloon.hasTail) return null;

        // A simple polygon for the tail. Base width depends on the balloon size.
        // User requested reducing base width by 50% from 0.2 to 0.1.
        const baseWidth = Math.min(w, h) * 0.1;

        // We want the base perpendicular to the vector to the tip.
        const dx = localTailTip.x - tailIntersection.x;
        const dy = localTailTip.y - tailIntersection.y;
        const length = Math.sqrt(dx * dx + dy * dy);

        if (length < 2) return null;

        const nx = dx / length;
        const ny = dy / length;

        // perpendicular vector
        const px = -ny;
        const py = nx;

        // Tuck the intersection inward precisely by half the stroke width
        // This ensures the tail's butt-cap aligns exactly with the inner edge of the balloon's stroke
        const actualStrokeWidth = Number(strokeWidth) || 2;
        const tuckOffset = Math.max(1, actualStrokeWidth / 2);
        const tuckedIntersection = {
            x: tailIntersection.x - nx * tuckOffset,
            y: tailIntersection.y - ny * tuckOffset
        };

        const p1 = { x: tuckedIntersection.x + px * baseWidth, y: tuckedIntersection.y + py * baseWidth };
        const p2 = { x: tuckedIntersection.x - px * baseWidth, y: tuckedIntersection.y - py * baseWidth };

        // Instead of straight lines, we use a quadratic curve for a "swoop".
        // Using a single control point guarantees the curves share a tangent at the tip, making it razor sharp!
        const curveStrength = length * 0.5; // Significant swoop multiplier

        // Check if flipped
        const isFlipped = balloon.overrides?.tailFlip ?? false;
        const flipMultiplier = isFlipped ? -1 : 1;

        // Calculate a single control point offset to the side, flipped if necessary
        const cp = {
            x: tuckedIntersection.x + nx * (length * 0.4) - px * (curveStrength * flipMultiplier),
            y: tuckedIntersection.y + ny * (length * 0.4) - py * (curveStrength * flipMultiplier)
        };

        // Open path: Start at p1, curve to tip, curve back to p2. NO line between p2 and p1.
        const pathData = `M ${p1.x} ${p1.y} Q ${cp.x} ${cp.y} ${localTailTip.x} ${localTailTip.y} Q ${cp.x} ${cp.y} ${p2.x} ${p2.y}`;

        return (
            <Path
                data={pathData}
                fill={fill}
                stroke={stroke}
                strokeWidth={strokeWidth}
                lineJoin="miter" // Use miter or round, but cap must be butt
                lineCap="butt"   // Flat cutoff against the balloon body
                perfectDrawEnabled={false}
            />
        );
    };

    const hasTextGlow = false; // Could wire to styles if needed

    return (
        <React.Fragment>
            {/* Container Group for the whole Balloon */}
            <Group
                ref={groupRef}
                x={balloon.x}
                y={balloon.y}
                rotation={balloon.rotation || 0}
                draggable
                onClick={(e) => {
                    onSelect(balloon.id, e);
                    e.cancelBubble = true;
                }}
                onTap={(e) => {
                    onSelect(balloon.id, e);
                    e.cancelBubble = true;
                }}
                onDblClick={() => {
                    const newText = window.prompt("Edit Bubble Text:", balloon.text);
                    if (newText !== null) onChange(balloon.id, { text: newText });
                }}
                onDragMove={() => {
                    // If we drag the group, the tail tip moves relative to the screen, 
                    // but since tailTip is relative to the group center (local coords), we don't need to update tailTip
                    // as long as tailTip is stored in RELATIVE coordinates. 
                    // WAIT: the user stores tailTip as an absolute or relative point? 
                    // "local coords" in Konva Group means dragging the group moves everything together.
                }}
                onDragEnd={() => {
                    onChange(balloon.id, {
                        x: groupRef.current.x(),
                        y: groupRef.current.y()
                    });
                }}
                onTransformEnd={() => {
                    const node = groupRef.current;
                    const scaleX = node.scaleX();
                    const scaleY = node.scaleY();

                    node.scaleX(1);
                    node.scaleY(1);

                    onChange(balloon.id, {
                        x: node.x(),
                        y: node.y(),
                        rotation: node.rotation(),
                        width: Math.max(20, w * Math.abs(scaleX)),
                        height: Math.max(20, h * Math.abs(scaleY))
                    });
                }}
            >
                {/* Render Body first so the tail overlaps and hides the stroke joint */}
                {renderBody()}

                {/* Render Tail on top to merge perfectly with body fill */}
                {renderTail()}

                {/* Text */}
                <Text
                    text={balloon.text}
                    fontFamily={fontFamily}
                    fontSize={fontSize}
                    fill={textColor}
                    align="center"
                    verticalAlign="middle"
                    width={w * 0.8}
                    height={h * 0.8}
                    x={-w * 0.4}
                    y={-h * 0.4}
                    shadowColor={hasTextGlow ? 'cyan' : undefined}
                    shadowBlur={hasTextGlow ? 10 : 0}
                    shadowOpacity={hasTextGlow ? 1 : 0}
                    perfectDrawEnabled={false}
                />

                {/* 1. Z-Index Handle: Render Tail Handle Last when selected */}
                {balloon.isSelected && balloon.hasTail && (
                    <Circle
                        ref={tipRef}
                        x={localTailTip.x}
                        y={localTailTip.y}
                        radius={8}
                        fill="#D4AF37"
                        stroke="#fff"
                        strokeWidth={2}
                        draggable
                        onDragMove={(e) => {
                            // Stop group from moving
                            e.cancelBubble = true;
                            // Because the circle is inside the group, its x/y are already local!
                            const newPos = { x: e.target.x(), y: e.target.y() };
                            onChange(balloon.id, { tailTip: newPos });
                        }}
                        onDragEnd={(e) => {
                            e.cancelBubble = true;
                            const newPos = { x: e.target.x(), y: e.target.y() };
                            onChange(balloon.id, { tailTip: newPos });
                        }}
                    />
                )}
            </Group>

            {/* Transformer for renaming/resizing bound to the Group */}
            {balloon.isSelected && (
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
