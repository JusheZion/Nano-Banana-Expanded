import React, { useRef, useMemo } from 'react';
import { Transformer, Group, Rect, Ellipse, Path, Text, Circle } from 'react-konva';
import useImage from 'use-image';
import { getTextureUrl } from '../data/TextureRegistry';
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
    const textRef = useRef<any>(null);

    React.useEffect(() => {
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

    const autoSize = balloon.autoSize !== false; // Default true
    const padding = balloon.padding ?? 20;

    const w = balloon.width;
    const h = balloon.height;
    const halfW = w / 2;
    const halfH = h / 2;

    // React to text size changes
    React.useEffect(() => {
        if (autoSize && textRef.current) {
            const textNode = textRef.current;
            const textWidth = textNode.width();
            const textHeight = textNode.height();

            const newW = Math.max(50, textWidth + padding * 2);
            const newH = Math.max(50, textHeight + padding * 2);

            // Update store if dimensions drift too much to prevent infinite micro-loops
            if (Math.abs(w - newW) > 2 || Math.abs(h - newH) > 2) {
                onChange(balloon.id, { width: newW, height: newH });
            }
        }
    }); // Runs after every render to catch text measurement changes

    const textureUrl = balloon.textureId ? getTextureUrl(balloon.textureId) : '';
    const [textureImg] = useImage(textureUrl || '');

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


    const getRenderProps = (pass: 'shadow' | 'glow' | 'base' | 'texture', isTail: boolean) => {
        let baseProps: any = {
            listening: pass === 'base',
            perfectDrawEnabled: false,
            opacity: pass === 'texture' ? (balloon.textureOpacity ?? 0.5) : 1,
            globalCompositeOperation: pass === 'texture' ? "multiply" : "source-over",
        };

        if (isTail) {
            baseProps.lineJoin = 'miter';
            baseProps.lineCap = 'butt';
        }

        if (pass === 'shadow') {
            baseProps.fill = fill;
            baseProps.stroke = stroke;
            baseProps.strokeWidth = strokeWidth;

            baseProps.shadowColor = balloon.shadowColor ?? '#000000';
            baseProps.shadowBlur = balloon.shadowBlur ?? 0;
            baseProps.shadowOpacity = balloon.shadowOpacity ?? 0;
            baseProps.shadowOffset = { x: balloon.shadowOffsetX ?? 0, y: balloon.shadowOffsetY ?? 0 };
        } else if (pass === 'glow') {
            const spread = balloon.glowSpread ?? 0;
            baseProps.fill = balloon.glowColor ?? '#10B981';
            baseProps.stroke = balloon.glowColor ?? '#10B981';

            const bodyStrokeAmount = isTail ? 0 : Number(strokeWidth || 0);
            baseProps.strokeWidth = bodyStrokeAmount + (isTail ? 0 : (spread * 2));
            baseProps.lineCap = 'round';
            baseProps.lineJoin = 'round';

            baseProps.shadowColor = balloon.glowColor ?? '#10B981';
            baseProps.shadowBlur = balloon.glowBlur ?? 0;
            baseProps.shadowOpacity = 1;
            baseProps.shadowOffset = { x: 9000, y: 9000 };

            baseProps.opacity = 1;
        } else if (pass === 'base') {
            baseProps.fill = fill;
            baseProps.stroke = stroke;
            baseProps.strokeWidth = strokeWidth;
            baseProps.dash = (!isTail && styleDef.id === 'whisper_dashed') ? [5, 5] : undefined;
        } else if (pass === 'texture') {
            baseProps.fillPatternImage = textureImg;
            baseProps.fillPatternRepeat = "repeat";
        }

        return baseProps;
    };

    const renderBody = (pass: 'shadow' | 'glow' | 'base' | 'texture') => {
        const props = getRenderProps(pass, false);

        if (styleDef.id === 'speech_rounded_rectangle' || styleDef.id === 'narration_box') {
            return <Rect x={-halfW} y={-halfH} width={w} height={h} cornerRadius={styleDef.cornerRadius || 0} {...props} />;
        }
        if (styleDef.id === 'speech_round' || styleDef.id === 'whisper_dashed') {
            return <Ellipse x={0} y={0} radiusX={halfW} radiusY={halfH} {...props} />;
        }
        return <Ellipse x={0} y={0} radiusX={halfW} radiusY={halfH} {...props} />;
    };

    const renderTail = (pass: 'shadow' | 'glow' | 'base' | 'texture') => {
        if (!balloon.hasTail) return null;

        const baseWidth = Math.min(w, h) * 0.1;
        const dx = localTailTip.x - tailIntersection.x;
        const dy = localTailTip.y - tailIntersection.y;
        const length = Math.sqrt(dx * dx + dy * dy);

        if (length < 2) return null;

        const nx = dx / length;
        const ny = dy / length;
        const px = -ny;
        const py = nx;

        const actualStrokeWidth = Number(strokeWidth) || 2;
        const tuckOffset = Math.max(1, actualStrokeWidth / 2);
        const tuckedIntersection = {
            x: tailIntersection.x - nx * tuckOffset,
            y: tailIntersection.y - ny * tuckOffset
        };

        const p1 = { x: tuckedIntersection.x + px * baseWidth, y: tuckedIntersection.y + py * baseWidth };
        const p2 = { x: tuckedIntersection.x - px * baseWidth, y: tuckedIntersection.y - py * baseWidth };

        const curveStrength = length * 0.5;
        const isFlipped = balloon.overrides?.tailFlip ?? false;
        const flipMultiplier = isFlipped ? -1 : 1;

        const cp = {
            x: tuckedIntersection.x + nx * (length * 0.4) - px * (curveStrength * flipMultiplier),
            y: tuckedIntersection.y + ny * (length * 0.4) - py * (curveStrength * flipMultiplier)
        };

        const pathData = `M ${p1.x} ${p1.y} Q ${cp.x} ${cp.y} ${localTailTip.x} ${localTailTip.y} Q ${cp.x} ${cp.y} ${p2.x} ${p2.y} `;

        return <Path data={pathData} {...getRenderProps(pass, true)} />;
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
                draggable={balloon.isLocked !== true}
                visible={balloon.isVisible !== false}
                listening={balloon.isLocked !== true}
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
                {/* 1. Shadow Pass */}
                {!!balloon.shadowOpacity && renderTail('shadow')}
                {!!balloon.shadowOpacity && renderBody('shadow')}

                {/* 2. Glow Pass (Offscreen pure shadow trick) */}
                {!!balloon.glowOpacity && (
                    <Group name="glow-pass" x={-9000} y={-9000} opacity={balloon.glowOpacity} listening={false}>
                        {renderTail('glow')}
                        {renderBody('glow')}
                    </Group>
                )}

                {/* 3. Base Pass */}
                {/* Render Body first so the tail overlaps and hides the stroke joint */}
                {renderBody('base')}
                {renderTail('base')}

                {/* 4. Texture Pass */}
                {textureImg && renderBody('texture')}
                {textureImg && renderTail('texture')}

                {/* Text */}
                <Text
                    ref={textRef}
                    text={balloon.text}
                    fontFamily={fontFamily}
                    fontSize={fontSize}
                    fill={textColor}
                    align="center"
                    verticalAlign="middle"
                    width={autoSize ? undefined : w * 0.8}
                    height={autoSize ? undefined : h * 0.8}
                    x={autoSize ? -(textRef.current?.width() || 0) / 2 : -w * 0.4}
                    y={autoSize ? -(textRef.current?.height() || 0) / 2 : -h * 0.4}
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
            {
                balloon.isSelected && (
                    <Transformer
                        ref={trRef}
                        borderStroke="#D4AF37"
                        anchorStroke="#D4AF37"
                        anchorFill="#37615D"
                        anchorSize={10}
                        resizeEnabled={!autoSize} // Disable resizing handles if auto-size is active
                    />
                )
            }
        </React.Fragment >
    );
};
