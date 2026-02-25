import React, { useRef, useMemo } from 'react';
import { Transformer, Group, Rect, Ellipse, Path, Text, Circle, TextPath } from 'react-konva';
import useImage from 'use-image';
import { getTextureUrl } from '../data/TextureRegistry';
import type { BalloonInstance, BalloonStyle } from '../../../types/balloon';

// Hand-tuned cloud speech balloon outline, centered at 0,0
const CLOUD_BALLOON_PATH = "M384.986 894.426C353.731 658.567 514.663 441.357 744.437 409.274 837.544 396.274 932.208 415.708 1013.28 464.466 1099.19 298.239 1299.94 235.064 1461.67 323.361 1489.95 338.801 1515.9 358.37 1538.72 381.458 1605.63 243.668 1768.6 187.688 1902.73 256.422 1939.85 275.446 1972.23 302.959 1997.39 336.848 2105.23 206.543 2295.79 190.447 2423.02 300.897 2476.49 347.319 2512.53 411.347 2524.96 482.004 2701.66 531.495 2805.9 718.963 2757.78 900.724 2753.74 916.005 2748.66 930.977 2742.6 945.532 2884.31 1134.92 2849.62 1406.38 2665.11 1551.84 2607.68 1597.13 2539.84 1626.44 2468.15 1636.97 2466.56 1840.72 2304.23 2004.58 2105.59 2002.94 2039.22 2002.4 1974.3 1983.03 1918 1946.97 1850.81 2175.41 1616.45 2304.53 1394.54 2235.36 1301.54 2206.38 1221.19 2145.08 1167.19 2061.92 939.983 2202.61 645.079 2126.93 508.501 1892.88 506.78 1889.93 505.089 1886.96 503.428 1883.98 354.731 1901.85 220.041 1792.92 202.588 1640.68 193.286 1559.53 219.378 1478.31 273.912 1418.67 145.162 1340.85 101.913 1170.05 177.311 1037.18 220.81 960.524 297.101 909.848 382.724 900.736Z";

const CLOUD_BALLOON_TICKS_PATH = "M434.292 1448.15C379.327 1452.57 324.367 1439.53 276.793 1410.77M573.255 1857.2C551.152 1866.23 527.983 1872.25 504.346 1875.09M1167.04 2053.75C1150.41 2028.15 1136.49 2000.79 1125.51 1972.14M1934.85 1850.26C1932.4 1880.62 1926.84 1910.64 1918.27 1939.8M2264.5 1297C2389.13 1359.27 2467.77 1489.46 2466.66 1631.65M2741.33 940.574C2721.15 988.992 2690.34 1031.94 2651.31 1066.06M2525.33 474.969C2528.77 494.521 2530.36 514.368 2530.08 534.232M1950.45 405.841C1962.18 378.5 1977.71 353.043 1996.57 330.263M1519.14 441.859C1523.92 419.265 1531.42 397.37 1541.47 376.678M1012.96 463.995C1042.3 481.637 1069.44 502.872 1093.78 527.232M399.1 960.975C392.697 939.214 387.981 916.967 384.996 894.442";


interface BalloonNodeProps {
    balloon: BalloonInstance;
    styleDef: BalloonStyle;
    onChange: (id: string, patch: Partial<BalloonInstance>) => void;
    onSelect: (id: string, e: any) => void;
}

export const BalloonNode: React.FC<BalloonNodeProps> = ({
    balloon,
    styleDef,
    onChange,
    onSelect,
}) => {
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
    const textStroke = balloon.overrides?.textStroke;
    const textStrokeWidth = balloon.overrides?.textStrokeWidth;
    const secondaryTextStroke = balloon.overrides?.secondaryTextStroke;
    const secondaryTextStrokeWidth = balloon.overrides?.secondaryTextStrokeWidth;
    const textWarp = balloon.overrides?.textWarp || 'none';
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
            if (Math.abs(w - newW) > 2 || Math.abs(h - newH) > 2) {
                onChange(balloon.id, { width: newW, height: newH });
            }
        }
    });

    // Calculate Warp Path if applicable
    const warpPathData = useMemo(() => {
        if (!textWarp || textWarp === 'none') return '';
        const pathW = autoSize ? (textRef.current?.width() || w * 0.8) : w * 0.8;
        const pathH = autoSize ? (textRef.current?.height() || h * 0.8) : h * 0.8;
        const halfW = pathW / 2;
        const intensity = balloon.overrides?.textWarpIntensity ?? 1;

        switch (textWarp) {
            case 'arcUp':
                return `M ${-halfW},${pathH / 2} Q 0,${-pathH * intensity} ${halfW},${pathH / 2}`;
            case 'arcDown':
                return `M ${-halfW},${-pathH / 2} Q 0,${pathH * intensity} ${halfW},${-pathH / 2}`;
            case 'wave':
                return `M ${-halfW},0 Q ${-halfW / 2},${-pathH * intensity} 0,0 T ${halfW},0`;
            case 'circle': {
                const r = pathW / Math.max(0.1, intensity * 2);
                const topY = -pathH / 4;
                const bottomY = topY + 2 * r;
                return `M 0,${bottomY} A ${r},${r} 0 1,1 0,${topY} A ${r},${r} 0 1,1 0,${bottomY}`;
            }
            case 'arch':
                return `M ${-halfW},${pathH / 2} C ${-halfW * 0.5},${-pathH * 2.5 * intensity} ${halfW * 0.5},${-pathH * 2.5 * intensity} ${halfW},${pathH / 2}`;
            default:
                return '';
        }
    }, [textWarp, w, h, autoSize, balloon.text, fontSize, fontFamily, balloon.overrides?.textWarpIntensity]);

    const textureUrl = balloon.textureId ? getTextureUrl(balloon.textureId) : '';
    const [textureImg] = useImage(textureUrl || '');

    // Tail geometry
    const localTailTip = { x: balloon.tailTip.x, y: balloon.tailTip.y };

    const tailIntersection = useMemo(() => {
        if (!balloon.hasTail) return { x: 0, y: 0 };
        const dx = localTailTip.x;
        const dy = localTailTip.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance === 0) return { x: 0, y: 0 };
        const nx = dx / distance;
        const ny = dy / distance;

        const rx = halfW;
        const ry = halfH;

        const denom = Math.sqrt((rx * rx * ny * ny) + (ry * ry * nx * nx));
        if (denom === 0) return { x: 0, y: 0 };
        const ix = (rx * ry * nx) / denom;
        const iy = (rx * ry * ny) / denom;
        return { x: ix, y: iy };
    }, [localTailTip, halfW, halfH, balloon.hasTail]);

    const getRenderProps = (
        pass: 'shadow' | 'glow' | 'base' | 'texture',
        isTail: boolean
    ) => {
        let baseProps: any = {
            listening: pass === 'base',
            perfectDrawEnabled: false,
            opacity: pass === 'texture' ? (balloon.textureOpacity ?? 0.5) : 1,
            globalCompositeOperation: pass === 'texture' ? 'multiply' : 'source-over',
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
            baseProps.shadowOffset = {
                x: balloon.shadowOffsetX ?? 0,
                y: balloon.shadowOffsetY ?? 0,
            };
        } else if (pass === 'glow') {
            const spread = balloon.glowSpread ?? 0;
            baseProps.fill = balloon.glowColor ?? '#10B981';
            baseProps.stroke = balloon.glowColor ?? '#10B981';
            const bodyStrokeAmount = isTail ? 0 : Number(strokeWidth || 0);
            baseProps.strokeWidth = bodyStrokeAmount + (isTail ? 0 : spread * 2);
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
            baseProps.fillPatternRepeat = 'repeat';
        }

        return baseProps;
    };

    const renderBody = (pass: 'shadow' | 'glow' | 'base' | 'texture') => {
        const props = getRenderProps(pass, false);

        // Fixed cloud outline matching the reference image
        if (styleDef.id === 'cloud_fluffy' || styleDef.id === 'cloud_fluffy_no_tail') {
            const designW = 2400;
            const designH = 1800;

            const scaleX = w / designW;
            const scaleY = h / designH;
            const avgScale = (Math.abs(scaleX) + Math.abs(scaleY)) / 2;

            // Compensate for down-scaling so visual stroke looks thicker
            const bodyStrokeWidth = (strokeWidth || 1) / avgScale;

            return (
                <Group>
                    <Path
                        {...props}
                        data={CLOUD_BALLOON_PATH}
                        x={0}
                        y={0}
                        offsetX={designW / 2}
                        offsetY={designH / 2}
                        scaleX={scaleX}
                        scaleY={scaleY}
                        stroke={stroke}
                        strokeWidth={bodyStrokeWidth}
                        lineJoin="round"
                        lineCap="round"
                    />
                    {pass === 'base' && (
                        <Path
                            listening={false}
                            perfectDrawEnabled={false}
                            data={CLOUD_BALLOON_TICKS_PATH}
                            x={0}
                            y={0}
                            offsetX={designW / 2}
                            offsetY={designH / 2}
                            scaleX={scaleX}
                            scaleY={scaleY}
                            stroke={stroke}
                            strokeWidth={bodyStrokeWidth}
                            lineCap="round"
                            lineJoin="round"
                        />
                    )}
                </Group>
            );
        }




        if (styleDef.id === 'speech_rounded_rectangle' || styleDef.id === 'narration_box') {
            return (
                <Rect
                    x={-halfW}
                    y={-halfH}
                    width={w}
                    height={h}
                    cornerRadius={styleDef.cornerRadius || 0}
                    {...props}
                />
            );
        }

        if (styleDef.id === 'box_slanted') {
            const slantOffset = h * 0.15;
            const pathData = `M ${-halfW + slantOffset},${-halfH} L ${halfW},${-halfH} L ${halfW - slantOffset},${halfH} L ${-halfW},${halfH} Z`;
            return <Path data={pathData} {...props} />;
        }

        if (styleDef.id === 'starburst_action' || styleDef.id === 'scream_jagged') {
            const numSpikes = styleDef.id === 'starburst_action' ? 14 : 24;
            const innerRadiusX = halfW * 0.7;
            const innerRadiusY = halfH * 0.7;
            let pathData = '';

            for (let i = 0; i < numSpikes * 2; i++) {
                const angle = (i * Math.PI * 2) / (numSpikes * 2);
                let rx = i % 2 === 0 ? halfW : innerRadiusX;
                let ry = i % 2 === 0 ? halfH : innerRadiusY;

                if (styleDef.id === 'scream_jagged' && i % 2 !== 0) {
                    rx *= 0.8 + Math.random() * 0.4;
                    ry *= 0.8 + Math.random() * 0.4;
                }

                const x = Math.cos(angle) * rx;
                const y = Math.sin(angle) * ry;
                if (i === 0) pathData += `M ${x},${y} `;
                else pathData += `L ${x},${y} `;
            }

            pathData += 'Z';
            return <Path data={pathData} {...props} />;
        }

        if (styleDef.id === 'double_burst') {
            const numSpikes = 18;

            const generateBurst = (
                rxOuter: number,
                ryOuter: number,
                rxInner: number,
                ryInner: number,
                rotationOffset: number = 0
            ) => {
                let d = '';
                for (let i = 0; i < numSpikes * 2; i++) {
                    const baseAngle = (i * Math.PI * 2) / (numSpikes * 2);
                    const angle = baseAngle + rotationOffset;
                    const rx = i % 2 === 0 ? rxOuter : rxInner;
                    const ry = i % 2 === 0 ? ryOuter : ryInner;
                    const x = Math.cos(angle) * rx;
                    const y = Math.sin(angle) * ry;
                    if (i === 0) d += `M ${x},${y} `;
                    else d += `L ${x},${y} `;
                }
                return d + 'Z';
            };

            const outerPathData = generateBurst(halfW, halfH, halfW * 0.75, halfH * 0.75, 0);
            const innerRotation = (Math.PI * 2) / (numSpikes * 4);
            const innerPathData = generateBurst(halfW * 0.8, halfH * 0.8, halfW * 0.55, halfH * 0.55, innerRotation);

            if (pass !== 'base') {
                return <Path data={outerPathData} {...props} />;
            }

            const outerProps = { ...props, fill: props.stroke };
            const innerProps = { ...props, fill: props.fill, stroke: 'transparent', strokeWidth: 0 };

            return (
                <Group>
                    <Path data={outerPathData} {...outerProps} />
                    <Path data={innerPathData} {...innerProps} />
                </Group>
            );
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

        if (styleDef.tailStyle === 'bubbles') {
            const props = getRenderProps(pass, true);
            const r1 = baseWidth * 0.8;
            const r2 = baseWidth * 0.5;
            const r3 = baseWidth * 0.3;

            return (
                <Group>
                    <Ellipse
                        x={tailIntersection.x + dx * 0.18}
                        y={tailIntersection.y + dy * 0.18}
                        radiusX={r1}
                        radiusY={r1}
                        {...props}
                    />
                    <Ellipse
                        x={tailIntersection.x + dx * 0.32}
                        y={tailIntersection.y + dy * 0.32}
                        radiusX={r2}
                        radiusY={r2}
                        {...props}
                    />
                    <Ellipse
                        x={tailIntersection.x + dx * 0.46}
                        y={tailIntersection.y + dy * 0.46}
                        radiusX={r3}
                        radiusY={r3}
                        {...props}
                    />
                </Group>
            );
        }

        const nx = dx / length;
        const ny = dy / length;
        const px = -ny;
        const py = nx;
        const actualStrokeWidth = Number(strokeWidth) || 2;
        const tuckOffset = Math.max(1, actualStrokeWidth / 2);

        const tuckedIntersection = {
            x: tailIntersection.x - nx * tuckOffset,
            y: tailIntersection.y - ny * tuckOffset,
        };

        const p1 = {
            x: tuckedIntersection.x + px * baseWidth,
            y: tuckedIntersection.y + py * baseWidth,
        };
        const p2 = {
            x: tuckedIntersection.x - px * baseWidth,
            y: tuckedIntersection.y - py * baseWidth,
        };

        const curveStrength = length * 0.5;
        const isFlipped = balloon.overrides?.tailFlip ?? false;
        const flipMultiplier = isFlipped ? -1 : 1;

        const cp = {
            x: tuckedIntersection.x + nx * (length * 0.4) - px * (curveStrength * flipMultiplier),
            y: tuckedIntersection.y + ny * (length * 0.4) - py * (curveStrength * flipMultiplier),
        };

        const pathData = `M ${p1.x} ${p1.y} Q ${cp.x} ${cp.y} ${localTailTip.x} ${localTailTip.y} Q ${cp.x} ${cp.y} ${p2.x} ${p2.y} `;

        return <Path data={pathData} {...getRenderProps(pass, true)} />;
    };

    const hasTextGlow = false;

    return (
        <React.Fragment>
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
                    const newText = window.prompt('Edit Bubble Text:', balloon.text);
                    if (newText !== null) onChange(balloon.id, { text: newText });
                }}
                onDragMove={() => {
                    // tailTip is local to the group; no update needed during drag
                }}
                onDragEnd={() => {
                    onChange(balloon.id, {
                        x: groupRef.current.x(),
                        y: groupRef.current.y(),
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
                        height: Math.max(20, h * Math.abs(scaleY)),
                    });
                }}
            >
                {!!balloon.shadowOpacity && renderTail('shadow')}
                {!!balloon.shadowOpacity && renderBody('shadow')}

                {!!balloon.glowOpacity && (
                    <Group
                        name="glow-pass"
                        x={-9000}
                        y={-9000}
                        opacity={balloon.glowOpacity}
                        listening={false}
                    >
                        {renderTail('glow')}
                        {renderBody('glow')}
                    </Group>
                )}

                {renderBody('base')}
                {renderTail('base')}

                {textureImg && renderBody('texture')}
                {textureImg && renderTail('texture')}

                {warpPathData ? (
                    <React.Fragment>
                        {(() => {
                            const depth = balloon.overrides?.text3DExtrusion || 0;
                            const color = balloon.overrides?.text3DExtrusionColor || '#000000';
                            const angleDeg = balloon.overrides?.text3DExtrusionAngle ?? 45;
                            const angleRad = (angleDeg * Math.PI) / 180;
                            const dx = Math.cos(angleRad);
                            const dy = Math.sin(angleRad);
                            if (!depth) return null;
                            const nodes = [];
                            const totalStroke = (textStrokeWidth || 0) + (secondaryTextStrokeWidth || 0);
                            for (let i = depth; i > 0; i--) {
                                const ox = i * dx;
                                const oy = i * dy;
                                nodes.push(
                                    <TextPath
                                        key={`ext-${i}`}
                                        text={balloon.text}
                                        fontFamily={fontFamily}
                                        fontSize={fontSize}
                                        letterSpacing={balloon.overrides?.textLetterSpacing || 0}
                                        fill={color}
                                        stroke={color}
                                        strokeWidth={totalStroke}
                                        lineJoin="round"
                                        align="center"
                                        data={warpPathData}
                                        x={ox}
                                        y={oy}
                                        perfectDrawEnabled={false}
                                    />
                                );
                            }
                            return <>{nodes}</>;
                        })()}
                        {secondaryTextStroke && secondaryTextStrokeWidth ? (
                            <TextPath
                                text={balloon.text}
                                fontFamily={fontFamily}
                                fontSize={fontSize}
                                letterSpacing={balloon.overrides?.textLetterSpacing || 0}
                                fill="transparent"
                                stroke={secondaryTextStroke}
                                strokeWidth={(textStrokeWidth || 0) + secondaryTextStrokeWidth}
                                lineJoin="round"
                                align="center"
                                data={warpPathData}
                                perfectDrawEnabled={false}
                            />
                        ) : null}
                        {textStroke && textStrokeWidth ? (
                            <TextPath
                                text={balloon.text}
                                fontFamily={fontFamily}
                                fontSize={fontSize}
                                letterSpacing={balloon.overrides?.textLetterSpacing || 0}
                                fill="transparent"
                                stroke={textStroke}
                                strokeWidth={textStrokeWidth}
                                lineJoin="round"
                                align="center"
                                data={warpPathData}
                                perfectDrawEnabled={false}
                            />
                        ) : null}
                        <TextPath
                            ref={textRef}
                            text={balloon.text}
                            fontFamily={fontFamily}
                            fontSize={fontSize}
                            letterSpacing={balloon.overrides?.textLetterSpacing || 0}
                            fill={textColor}
                            align="center"
                            data={warpPathData}
                            shadowColor={hasTextGlow ? 'cyan' : undefined}
                            shadowBlur={hasTextGlow ? 10 : 0}
                            shadowOpacity={hasTextGlow ? 1 : 0}
                            perfectDrawEnabled={false}
                        />
                    </React.Fragment>
                ) : (
                    <React.Fragment>
                        {(() => {
                            const depth = balloon.overrides?.text3DExtrusion || 0;
                            const color = balloon.overrides?.text3DExtrusionColor || '#000000';
                            const angleDeg = balloon.overrides?.text3DExtrusionAngle ?? 45;
                            const angleRad = (angleDeg * Math.PI) / 180;
                            const dx = Math.cos(angleRad);
                            const dy = Math.sin(angleRad);
                            if (!depth) return null;
                            const nodes = [];
                            const totalStroke = (textStrokeWidth || 0) + (secondaryTextStrokeWidth || 0);
                            const baseX = autoSize ? -(textRef.current?.width() || 0) / 2 : -w * 0.4;
                            const baseY = autoSize ? -(textRef.current?.height() || 0) / 2 : -h * 0.4;
                            for (let i = depth; i > 0; i--) {
                                const ox = i * dx;
                                const oy = i * dy;
                                nodes.push(
                                    <Text
                                        key={`ext-${i}`}
                                        text={balloon.text}
                                        fontFamily={fontFamily}
                                        fontSize={fontSize}
                                        letterSpacing={balloon.overrides?.textLetterSpacing || 0}
                                        fill={color}
                                        stroke={color}
                                        strokeWidth={totalStroke}
                                        lineJoin="round"
                                        align="center"
                                        verticalAlign="middle"
                                        width={autoSize ? undefined : w * 0.8}
                                        height={autoSize ? undefined : h * 0.8}
                                        x={baseX + ox}
                                        y={baseY + oy}
                                        perfectDrawEnabled={false}
                                    />
                                );
                            }
                            return <>{nodes}</>;
                        })()}
                        {secondaryTextStroke && secondaryTextStrokeWidth ? (
                            <Text
                                text={balloon.text}
                                fontFamily={fontFamily}
                                fontSize={fontSize}
                                letterSpacing={balloon.overrides?.textLetterSpacing || 0}
                                fill="transparent"
                                stroke={secondaryTextStroke}
                                strokeWidth={(textStrokeWidth || 0) + secondaryTextStrokeWidth}
                                lineJoin="round"
                                align="center"
                                verticalAlign="middle"
                                width={autoSize ? undefined : w * 0.8}
                                height={autoSize ? undefined : h * 0.8}
                                x={autoSize ? -(textRef.current?.width() || 0) / 2 : -w * 0.4}
                                y={autoSize ? -(textRef.current?.height() || 0) / 2 : -h * 0.4}
                                perfectDrawEnabled={false}
                            />
                        ) : null}
                        {textStroke && textStrokeWidth ? (
                            <Text
                                text={balloon.text}
                                fontFamily={fontFamily}
                                fontSize={fontSize}
                                fill="transparent"
                                stroke={textStroke}
                                strokeWidth={textStrokeWidth}
                                lineJoin="round"
                                align="center"
                                verticalAlign="middle"
                                width={autoSize ? undefined : w * 0.8}
                                height={autoSize ? undefined : h * 0.8}
                                x={autoSize ? -(textRef.current?.width() || 0) / 2 : -w * 0.4}
                                y={autoSize ? -(textRef.current?.height() || 0) / 2 : -h * 0.4}
                                perfectDrawEnabled={false}
                            />
                        ) : null}
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
                    </React.Fragment>
                )}

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
                            e.cancelBubble = true;
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

            {balloon.isSelected && (
                <Transformer
                    ref={trRef}
                    borderStroke="#D4AF37"
                    anchorStroke="#D4AF37"
                    anchorFill="#37615D"
                    anchorSize={10}
                    resizeEnabled={!autoSize}
                    rotateEnabled={true}
                    rotateAnchorOffset={40}
                />
            )}
        </React.Fragment>
    );
};
