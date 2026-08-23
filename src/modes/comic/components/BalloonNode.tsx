import React, { useRef, useMemo } from 'react';
import type Konva from 'konva';
import type { KonvaEventObject } from 'konva/lib/Node';
import { Transformer, Group, Rect, Ellipse, Path, Text, Circle, TextPath } from 'react-konva';
import { useComicStore, undoPause, undoResume } from '../../../stores/comicStore';
import useImage from 'use-image';
import { getTextureUrl } from '../data/TextureRegistry';
import { toKonvaColorStops, linearGradientPoints } from '../utils/gradientUtils';
import {
    CLOUD_BALLOON_PATH,
    CLOUD_BALLOON_TICKS_PATH,
    CLOUD_DESIGN_HEIGHT,
    CLOUD_DESIGN_WIDTH,
} from '../data/balloonGeometry';
import {
    buildBubbleTail,
    buildCurvedTailPath,
    buildSpikyTailPath,
    buildStraightTailPath,
    buildTailFrame,
} from '../data/balloonTailGeometry';
import type { BalloonInstance, BalloonStyle, TextBoxTransform } from '../../../types/balloon';




interface BalloonNodeProps {
    balloon: BalloonInstance;
    styleDef: BalloonStyle;
    onChange: (id: string, patch: Partial<BalloonInstance>) => void;
    onSelect: (id: string, e: KonvaEventObject<MouseEvent | TouchEvent>) => void;
}

export const BalloonNode: React.FC<BalloonNodeProps> = ({
    balloon,
    styleDef,
    onChange,
    onSelect,
}) => {
    const groupRef = useRef<Konva.Group | null>(null);
    const trRef = useRef<Konva.Transformer | null>(null);
    const textGroupRef = useRef<Konva.Group | null>(null);
    const textBoxTrRef = useRef<Konva.Transformer | null>(null);
    const tipRef = useRef<Konva.Circle | null>(null);
    // Bound to either <Text> or <TextPath> depending on whether the balloon warps its text. Only
    // width()/height() are read off it, so the common Konva.Node type is enough — and a callback ref
    // keeps a single ref usable across both element types (React's Ref<T> is invariant).
    const textRef = useRef<Konva.Node | null>(null);
    const setTextRef = React.useCallback((node: Konva.Node | null) => {
        textRef.current = node;
    }, []);
    const isFirstBalloonDragMove = useRef(true);

    const textBoxEditBalloonId = useComicStore((s) => s.textBoxEditBalloonId);
    const setTextBoxEditBalloonId = useComicStore((s) => s.setTextBoxEditBalloonId);
    const textBoxEditMode = textBoxEditBalloonId === balloon.id && balloon.isSelected;
    const effectiveTextBox: TextBoxTransform = balloon.overrides?.textBox ?? balloon.textBox ?? { offsetX: 0, offsetY: 0, scaleX: 1, scaleY: 1 };

    React.useEffect(() => {
        if (groupRef.current) {
            const group = groupRef.current;
            const origGetClientRect = group.getClientRect.bind(group);
            group.getClientRect = (config?: Parameters<Konva.Group['getClientRect']>[0]) => {
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
            trRef.current.getLayer()?.batchDraw();
        }
    }, [balloon.isSelected]);

    React.useEffect(() => {
        if (textBoxEditMode && textBoxTrRef.current && textGroupRef.current) {
            textBoxTrRef.current.nodes([textGroupRef.current]);
            textBoxTrRef.current.getLayer()?.batchDraw();
        }
    }, [textBoxEditMode]);

    // Merge overrides
    const fill = balloon.overrides?.fill || styleDef.fill;
    const stroke = balloon.overrides?.stroke || styleDef.stroke;
    const strokeWidth = balloon.overrides?.strokeWidth ?? styleDef.strokeWidth;
    const fontFamily = balloon.fontFamily || balloon.overrides?.fontFamily || styleDef.fontFamily;
    const fontSize = balloon.overrides?.fontSize || styleDef.fontSize;
    const textColor = balloon.overrides?.textColor || styleDef.textColor;
    const textStroke = balloon.overrides?.textStroke;
    const textStrokeWidth = balloon.overrides?.textStrokeWidth;
    const secondaryTextStroke = balloon.overrides?.secondaryTextStroke;
    const secondaryTextStrokeWidth = balloon.overrides?.secondaryTextStrokeWidth;
    const textWarp = balloon.overrides?.textWarp || 'none';
    const textAlign = balloon.overrides?.textAlignHorizontal ?? 'left';
    const verticalAlign = balloon.overrides?.textAlignVertical ?? 'middle';
    const fontWeight = balloon.overrides?.fontWeight ?? 'normal';
    const fontStyle = balloon.overrides?.fontStyle ?? 'normal';
    const textDecoration = balloon.overrides?.textDecoration ?? 'none';
    const autoSize = balloon.autoSize === true; // Default OFF for new balloons
    const padding = balloon.padding ?? 20;

    const w = balloon.width;
    const h = balloon.height;
    const halfW = w / 2;
    const halfH = h / 2;

    const bodyFillProps = useMemo(() => {
        const g = balloon.overrides?.fillGradient;
        if (!g || !g.stops?.length) return { fill };
        const colorStops = toKonvaColorStops(g.stops);
        if (g.type === 'linear') {
            const angle = g.angle ?? 90;
            const { start, end } = linearGradientPoints(angle, w, h);
            return { fillLinearGradientStartPoint: start, fillLinearGradientEndPoint: end, fillLinearGradientColorStops: colorStops };
        }
        if (g.type === 'radial') {
            const cx = (g.center?.x ?? 0.5) * w;
            const cy = (g.center?.y ?? 0.5) * h;
            const r = (g.radiusX ?? 0.5) * Math.max(w, h);
            return { fillRadialGradientStartPoint: { x: cx, y: cy }, fillRadialGradientEndPoint: { x: cx + r, y: cy }, fillRadialGradientStartRadius: 0, fillRadialGradientEndRadius: r, fillRadialGradientColorStops: colorStops };
        }
        return { fillLinearGradientStartPoint: g.start ?? { x: 0, y: 0 }, fillLinearGradientEndPoint: g.end ?? { x: w, y: h }, fillLinearGradientColorStops: colorStops };
    }, [balloon.overrides?.fillGradient, w, h, fill]);

    const textFillProps = useMemo(() => {
        const g = balloon.overrides?.textColorGradient;
        if (!g || !g.stops?.length) return { fill: textColor };
        const colorStops = toKonvaColorStops(g.stops);
        const angle = g.angle ?? 90;
        const tw = w * 0.8;
        const th = h * 0.8;
        const { start, end } = linearGradientPoints(angle, tw, th);
        return { fillLinearGradientStartPoint: start, fillLinearGradientEndPoint: end, fillLinearGradientColorStops: colorStops };
    }, [balloon.overrides?.textColorGradient, w, h, textColor]);

    // React to text size changes. Runs only when the measured inputs change (not every render);
    // the 2px threshold keeps it from looping when it writes back width/height.
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
    }, [autoSize, balloon.id, balloon.text, fontSize, fontFamily, fontStyle, fontWeight, onChange, padding, w, h]);

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
            case 'button':
                return `M ${-halfW},${pathH / 2} Q 0,${-pathH * 1.2 * intensity} ${halfW},${pathH / 2}`;
            case 'square':
                return `M ${-halfW},${pathH / 2} L ${-halfW / 2},${pathH / 2} L ${-halfW / 2},${-pathH / 2} L ${halfW / 2},${-pathH / 2} L ${halfW / 2},${pathH / 2} L ${halfW},${pathH / 2}`;
            case 'triangle':
                return `M ${-halfW},${pathH / 2} L 0,${-pathH / 2 * intensity} L ${halfW},${pathH / 2}`;
            case 'cascade':
                return `M ${-halfW},0 L ${-halfW / 2},0 L ${-halfW / 2},${pathH / 2} L ${halfW / 2},${pathH / 2} L ${halfW / 2},${pathH} L ${halfW},${pathH}`;
            case 'slant':
                return `M ${-halfW},${pathH / 2} L ${halfW},${-pathH / 2 * intensity}`;
            case 'fade':
                return `M ${-halfW},${pathH * 0.4} Q 0,${pathH * 0.7 * intensity} ${halfW},${pathH * 0.4}`;
            default:
                return '';
        }
        // balloon.text / fontSize / fontFamily are deliberate invalidation triggers, not direct
        // reads: the path is measured off textRef.current, whose size changes when they change. The
        // linter can't see through the ref and calls them unnecessary — removing them would freeze
        // the warp path at its first measurement.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [textWarp, w, h, autoSize, balloon.text, fontSize, fontFamily, balloon.overrides?.textWarpIntensity]);

    // Konva Text/TextPath has no `fontWeight` prop — weight is expressed through `fontStyle`
    // ('bold' / 'italic' / 'bold italic'). Combine the two so the Bold button actually applies.
    const konvaFontStyle = [fontWeight === 'bold' ? 'bold' : '', fontStyle === 'italic' ? 'italic' : '']
        .filter(Boolean).join(' ') || 'normal';
    const textFontProps = { fontStyle: konvaFontStyle, textDecoration } as const;

    const textureUrl = balloon.textureId ? getTextureUrl(balloon.textureId) : '';
    const [textureImg] = useImage(textureUrl || '');

    // Tail geometry.
    // This was a bare object literal, so it got a fresh identity on every render — and because four
    // downstream useMemo hooks list it as a dependency, all four recomputed on every render and the
    // memoization did nothing. Memoize on the primitive coordinates so identity is stable.
    const localTailTip = useMemo(
        () => ({ x: balloon.tailTip.x, y: balloon.tailTip.y }),
        [balloon.tailTip.x, balloon.tailTip.y],
    );

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

    // Unified body+tail path for ellipse styles: one continuous outline so tail and bubble blend
    // with no notch.
    //
    // This was previously gated on `!ellipseOnlyIds.includes(styleDef.id)` — an inverted list whose
    // name said the opposite of what it held, and whose default (not listed => treat as ellipse)
    // silently captured styles that draw a custom body. Now the style states its attachment mode.
    const isEllipseStyle = styleDef.tailAttachment === 'merged-ellipse';
    const unifiedEllipseTailPath = useMemo(() => {
        if (!balloon.hasTail || !isEllipseStyle) return null;
        const dx = localTailTip.x - tailIntersection.x;
        const dy = localTailTip.y - tailIntersection.y;
        const length = Math.sqrt(dx * dx + dy * dy);
        if (length < 2) return null;
        const tailAngle = Math.atan2(tailIntersection.y / halfH, tailIntersection.x / halfW);
        const delta = Math.max(0.04, Math.min(0.12, 0.08 * (halfW + halfH) / length)); // narrow mouth: angular half-width at base (smaller = thinner tail start)
        const p1x = halfW * Math.cos(tailAngle - delta);
        const p1y = halfH * Math.sin(tailAngle - delta);
        const p2x = halfW * Math.cos(tailAngle + delta);
        const p2y = halfH * Math.sin(tailAngle + delta);
        const nx = dx / length;
        const ny = dy / length;
        const px = -ny;
        const py = nx;
        const curveStrength = length * 0.5;
        const isFlipped = balloon.overrides?.tailFlip ?? false;
        const flipMultiplier = isFlipped ? -1 : 1;
        const cpx = tailIntersection.x + nx * (length * 0.4) - px * (curveStrength * flipMultiplier);
        const cpy = tailIntersection.y + ny * (length * 0.4) - py * (curveStrength * flipMultiplier);
        // Single path: tail from p1 to tip to p2, then ellipse arc from p2 back to p1 (long way)
        const path = `M ${p1x} ${p1y} Q ${cpx} ${cpy} ${localTailTip.x} ${localTailTip.y} Q ${cpx} ${cpy} ${p2x} ${p2y} A ${halfW} ${halfH} 0 1 1 ${p1x} ${p1y} Z`;
        return path;
    }, [balloon.hasTail, isEllipseStyle, localTailTip, tailIntersection, halfW, halfH, balloon.overrides?.tailFlip]);

    // Unified body+tail path for rounded-rect (Modern Square / narration): tail base on boundary, one continuous outline
    const isRoundedRectStyle = styleDef.tailAttachment === 'merged-rounded-rect';
    const cornerR = Math.min(styleDef.cornerRadius ?? 0, halfW - 1, halfH - 1);
    const roundedRectTailIntersection = useMemo(() => {
        if (!balloon.hasTail || !isRoundedRectStyle || cornerR < 0) return null;
        const dx = localTailTip.x;
        const dy = localTailTip.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist === 0) return null;
        const nx = dx / dist;
        const ny = dy / dist;
        let bestT = Infinity;
        const r = Math.max(0, cornerR);
        const hw = halfW;
        const hh = halfH;
        const testT = (t: number, x: number, y: number) => {
            if (t > 0 && t < bestT) {
                if (x >= -hw && x <= hw && y >= -hh && y <= hh) bestT = t;
            }
        };
        if (ny < 0) {
            const t = -hh / ny;
            const x = t * nx;
            if (x >= -hw + r && x <= hw - r) testT(t, x, -hh);
        }
        if (ny > 0) {
            const t = hh / ny;
            const x = t * nx;
            if (x >= -hw + r && x <= hw - r) testT(t, x, hh);
        }
        if (nx > 0) {
            const t = hw / nx;
            const y = t * ny;
            if (y >= -hh + r && y <= hh - r) testT(t, hw, y);
        }
        if (nx < 0) {
            const t = -hw / nx;
            const y = t * ny;
            if (y >= -hh + r && y <= hh - r) testT(t, -hw, y);
        }
        for (const [cx, cy, startAngle, endAngle] of [
            [hw - r, -hh + r, -0.5 * Math.PI, 0],
            [hw - r, hh - r, 0, 0.5 * Math.PI],
            [-hw + r, hh - r, 0.5 * Math.PI, Math.PI],
            [-hw + r, -hh + r, Math.PI, 1.5 * Math.PI],
        ] as [number, number, number, number][]) {
            const ox = -cx;
            const oy = -cy;
            const a = nx * nx + ny * ny;
            const b = 2 * (nx * ox + ny * oy);
            const c = ox * ox + oy * oy - r * r;
            const disc = b * b - 4 * a * c;
            if (disc < 0) continue;
            const sqrtD = Math.sqrt(disc);
            for (const t of [(-b + sqrtD) / (2 * a), (-b - sqrtD) / (2 * a)]) {
                if (t <= 0 || t >= bestT) continue;
                const px = t * nx;
                const py = t * ny;
                const angle = Math.atan2(py - cy, px - cx);
                let ang = angle;
                if (ang < startAngle) ang += 2 * Math.PI;
                if (ang >= startAngle && ang <= endAngle) bestT = t;
            }
        }
        if (bestT === Infinity) return null;
        return { x: bestT * nx, y: bestT * ny };
    }, [balloon.hasTail, isRoundedRectStyle, cornerR, localTailTip, halfW, halfH]);

    const unifiedRoundedRectTailPath = useMemo(() => {
        if (!balloon.hasTail || !isRoundedRectStyle || !roundedRectTailIntersection) return null;
        const inter = roundedRectTailIntersection;
        const dx = localTailTip.x - inter.x;
        const dy = localTailTip.y - inter.y;
        const length = Math.sqrt(dx * dx + dy * dy);
        if (length < 2) return null;
        const r = Math.max(0, cornerR);
        const hw = halfW;
        const hh = halfH;
        const step = Math.max(8, Math.min(25, length * 0.15));
        const topLen = 2 * (hw - r);
        const rightLen = 2 * (hh - r);
        const cornerLen = (Math.PI * r) / 2;
        const total = 2 * topLen + 2 * rightLen + 4 * cornerLen;
        const boundaryPoint = (s: number): { x: number; y: number } => {
            let t = ((s % total) + total) % total;
            if (t < topLen) return { x: -hw + r + t, y: -hh };
            t -= topLen;
            if (t < cornerLen) {
                const u = t / cornerLen;
                const ang = -0.5 * Math.PI + u * (0.5 * Math.PI);
                return { x: hw - r + r * Math.cos(ang), y: -hh + r + r * Math.sin(ang) };
            }
            t -= cornerLen;
            if (t < rightLen) return { x: hw, y: -hh + r + t };
            t -= rightLen;
            if (t < cornerLen) {
                const u = t / cornerLen;
                const ang = u * (0.5 * Math.PI);
                return { x: hw - r + r * Math.cos(ang), y: hh - r + r * Math.sin(ang) };
            }
            t -= cornerLen;
            if (t < topLen) return { x: hw - r - t, y: hh };
            t -= topLen;
            if (t < cornerLen) {
                const u = t / cornerLen;
                const ang = 0.5 * Math.PI + u * (0.5 * Math.PI);
                return { x: -hw + r + r * Math.cos(ang), y: hh - r + r * Math.sin(ang) };
            }
            t -= cornerLen;
            if (t < rightLen) return { x: -hw, y: hh - r - t };
            t -= rightLen;
            if (t < cornerLen) {
                const u = t / cornerLen;
                const ang = Math.PI + u * (0.5 * Math.PI);
                return { x: -hw + r + r * Math.cos(ang), y: -hh + r + r * Math.sin(ang) };
            }
            return { x: -hw + r, y: -hh };
        };
        let s0 = 0;
        let bestD = Infinity;
        for (let i = 0; i < 120; i++) {
            const s = (i / 120) * total;
            const p = boundaryPoint(s);
            const d = (p.x - inter.x) ** 2 + (p.y - inter.y) ** 2;
            if (d < bestD) {
                bestD = d;
                s0 = s;
            }
        }
        const p1 = boundaryPoint(s0 - step);
        const p2 = boundaryPoint(s0 + step);
        const nx = dx / length;
        const ny = dy / length;
        const px = -ny;
        const py = nx;
        const curveStrength = length * 0.5;
        const isFlipped = balloon.overrides?.tailFlip ?? false;
        const flipMultiplier = isFlipped ? -1 : 1;
        const cpx = inter.x + nx * (length * 0.4) - px * (curveStrength * flipMultiplier);
        const cpy = inter.y + ny * (length * 0.4) - py * (curveStrength * flipMultiplier);
        const tailPath = `M ${p1.x} ${p1.y} Q ${cpx} ${cpy} ${localTailTip.x} ${localTailTip.y} Q ${cpx} ${cpy} ${p2.x} ${p2.y}`;
        const s2 = (s0 + step) % total;
        const s1 = (s0 - step + total) % total;
        const longWay = (s1 - s2 + total) % total;
        const nSteps = Math.max(40, Math.min(80, Math.floor(longWay / 4)));
        const stepSize = longWay / nSteps;
        const boundaryPart: string[] = [];
        for (let i = 1; i <= nSteps; i++) {
            const s = (s2 + i * stepSize) % total;
            const pt = boundaryPoint(s);
            boundaryPart.push(`L ${pt.x} ${pt.y}`);
        }
        boundaryPart.push(`L ${p1.x} ${p1.y} Z`);
        return tailPath + ' ' + boundaryPart.join(' ');
    }, [balloon.hasTail, isRoundedRectStyle, roundedRectTailIntersection, localTailTip, cornerR, halfW, halfH, balloon.overrides?.tailFlip]);

    const getRenderProps = (
        pass: 'shadow' | 'glow' | 'base' | 'texture',
        isTail: boolean
    ) => {
        // Konva shape config, assembled progressively per render pass.
        const baseProps: Konva.ShapeConfig = {
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
            Object.assign(baseProps, bodyFillProps);
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
            Object.assign(baseProps, bodyFillProps);
            baseProps.stroke = stroke;
            baseProps.strokeWidth = strokeWidth;
            baseProps.dash = !isTail ? styleDef.bodyDash : undefined;
        } else if (pass === 'texture') {
            baseProps.fillPatternImage = textureImg;
            baseProps.fillPatternRepeat = 'repeat';
        }

        return baseProps;
    };

    /**
     * Draws the balloon outline from `styleDef.body`. This used to be a chain of
     * `if (styleDef.id === ...)` branches; the geometry now lives with the style (see
     * data/balloonGeometry.ts) so there are no style ids in here at all.
     *
     * For the two merged tail modes the "body" is really the body+tail path built above, so the
     * outline joins the tail seamlessly and `renderTail` stands down.
     */
    const renderBody = (pass: 'shadow' | 'glow' | 'base' | 'texture') => {
        const props = getRenderProps(pass, false);
        const metrics = { halfW, halfH };

        const mergedPath =
            styleDef.tailAttachment === 'merged-rounded-rect'
                ? unifiedRoundedRectTailPath
                : styleDef.tailAttachment === 'merged-ellipse'
                  ? unifiedEllipseTailPath
                  : null;
        if (mergedPath) {
            return <Path data={mergedPath} {...props} lineJoin="round" lineCap="round" />;
        }

        switch (styleDef.body.shape) {
            case 'cloud': {
                const scaleX = w / CLOUD_DESIGN_WIDTH;
                const scaleY = h / CLOUD_DESIGN_HEIGHT;
                const avgScale = (Math.abs(scaleX) + Math.abs(scaleY)) / 2;
                // Compensate for down-scaling so the visual stroke stays the intended weight.
                const bodyStrokeWidth = (strokeWidth || 1) / avgScale;
                const cloudTransform = {
                    x: 0,
                    y: 0,
                    offsetX: CLOUD_DESIGN_WIDTH / 2,
                    offsetY: CLOUD_DESIGN_HEIGHT / 2,
                    scaleX,
                    scaleY,
                    stroke,
                    strokeWidth: bodyStrokeWidth,
                    lineJoin: 'round' as const,
                    lineCap: 'round' as const,
                };
                return (
                    <Group>
                        <Path {...props} data={CLOUD_BALLOON_PATH} {...cloudTransform} />
                        {pass === 'base' && (
                            <Path
                                listening={false}
                                perfectDrawEnabled={false}
                                data={CLOUD_BALLOON_TICKS_PATH}
                                {...cloudTransform}
                            />
                        )}
                    </Group>
                );
            }

            case 'roundedRect':
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

            case 'path': {
                const { build, lineJoin, lineCap } = styleDef.body;
                return <Path data={build(metrics)} {...props} lineJoin={lineJoin} lineCap={lineCap} />;
            }

            case 'layeredPath': {
                const { outer, inner } = styleDef.body.build(metrics);
                if (pass !== 'base') {
                    return <Path data={outer} {...props} />;
                }
                return (
                    <Group>
                        <Path data={outer} {...props} fill={props.stroke} />
                        <Path data={inner} {...props} stroke="transparent" strokeWidth={0} />
                    </Group>
                );
            }

            case 'ellipse':
            default:
                return <Ellipse x={0} y={0} radiusX={halfW} radiusY={halfH} {...props} />;
        }
    };

    /**
     * Draws the tail as its own shape, for styles whose outline does not already contain it.
     *
     * The bail-out condition used to be "is there a merged path available?", which was wrong: a
     * merged path gets *computed* for any ellipse-ish style, including ones whose custom body never
     * rendered it. Thought Cloud, Radio/Electric and Spiky Shout therefore drew no tail at all.
     * It now asks the style directly, so body and tail can never disagree.
     */
    const renderTail = (pass: 'shadow' | 'glow' | 'base' | 'texture') => {
        if (!balloon.hasTail) return null;
        if (styleDef.tailAttachment !== 'separate') return null;

        const frame = buildTailFrame({
            intersection: tailIntersection,
            tip: localTailTip,
            width: w,
            height: h,
            strokeWidth: Number(strokeWidth),
            flipped: balloon.overrides?.tailFlip ?? false,
        });
        if (!frame) return null;

        const props = getRenderProps(pass, true);

        switch (styleDef.tailStyle) {
            case 'bubbles':
                return (
                    <Group>
                        {buildBubbleTail(frame, tailIntersection).map((bubble, i) => (
                            <Ellipse
                                key={i}
                                x={bubble.x}
                                y={bubble.y}
                                radiusX={bubble.radius}
                                radiusY={bubble.radius}
                                {...props}
                            />
                        ))}
                    </Group>
                );

            case 'spiky':
                return <Path data={buildSpikyTailPath(frame)} {...props} lineJoin="miter" lineCap="butt" />;

            case 'straight':
                return <Path data={buildStraightTailPath(frame)} {...props} lineJoin="miter" lineCap="butt" />;

            case 'curved':
            default:
                return <Path data={buildCurvedTailPath(frame)} {...props} />;
        }
    };

    const hasTextGlow = false;

    // Multi-line on-canvas text editor (replaces the old single-line window.prompt).
    // Overlays a textarea aligned to the balloon; Enter commits, Shift+Enter adds a line, Esc cancels.
    const openTextEditor = () => {
        const node = groupRef.current;
        const stage = node?.getStage?.();
        if (!node || !stage) return;
        const container = stage.container();
        const box = container.getBoundingClientRect();
        const scale = stage.scaleX() || 1;
        const abs = node.getAbsolutePosition(); // group origin = balloon center

        const ta = document.createElement('textarea');
        document.body.appendChild(ta);
        ta.value = balloon.text || '';
        Object.assign(ta.style, {
            position: 'absolute',
            top: `${box.top + window.scrollY + abs.y - halfH * scale}px`,
            left: `${box.left + window.scrollX + abs.x - halfW * scale}px`,
            width: `${Math.max(60, w * scale)}px`,
            height: `${Math.max(40, h * scale)}px`,
            fontSize: `${fontSize * scale}px`,
            fontFamily: String(fontFamily),
            fontStyle: konvaFontStyle.includes('italic') ? 'italic' : 'normal',
            fontWeight: konvaFontStyle.includes('bold') ? 'bold' : 'normal',
            textAlign: String(textAlign),
            color: String(textColor),
            lineHeight: '1.2',
            padding: `${padding * scale}px`,
            margin: '0',
            border: '2px solid #00D1FF',
            borderRadius: '4px',
            outline: 'none',
            resize: 'none',
            overflow: 'hidden',
            background: 'rgba(255,255,255,0.96)',
            boxSizing: 'border-box',
            zIndex: '10000',
        } as CSSStyleDeclaration);
        ta.focus();
        ta.select();

        let done = false;
        const cleanup = () => {
            ta.removeEventListener('blur', onBlur);
            ta.removeEventListener('keydown', onKey);
            if (ta.parentNode) ta.parentNode.removeChild(ta);
        };
        const commit = () => { if (done) return; done = true; onChange(balloon.id, { text: ta.value }); cleanup(); };
        const cancel = () => { if (done) return; done = true; cleanup(); };
        const onBlur = () => commit();
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); commit(); }
            else if (e.key === 'Escape') { e.preventDefault(); cancel(); }
        };
        ta.addEventListener('blur', onBlur);
        ta.addEventListener('keydown', onKey);
    };

    return (
        <React.Fragment>
            <Group
                name={`balloon-${balloon.id}`}
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
                onDblClick={openTextEditor}
                onDblTap={openTextEditor}
                onDragStart={() => {
                    undoPause();
                    isFirstBalloonDragMove.current = true;
                }}
                onDragMove={() => {
                    if (!groupRef.current) return;
                    if (isFirstBalloonDragMove.current) {
                        undoResume();
                        isFirstBalloonDragMove.current = false;
                    }
                    onChange(balloon.id, {
                        x: groupRef.current.x(),
                        y: groupRef.current.y(),
                    });
                    undoPause();
                }}
                onDragEnd={() => {
                    undoResume();
                    if (groupRef.current) {
                        onChange(balloon.id, {
                            x: groupRef.current.x(),
                            y: groupRef.current.y(),
                        });
                    }
                }}
                onTransformEnd={() => {
                    const node = groupRef.current;
                    if (!node) return;
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
                        autoSize: false,
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

                {/* Single interactive tail handle is rendered later (radius 8, live drag update).
                    The former duplicate here shared the same ref and read the wrong node on drag end. */}

                {textureImg && renderBody('texture')}
                {textureImg && renderTail('texture')}

                <Group
                    ref={textGroupRef}
                    name="text-box"
                    x={effectiveTextBox.offsetX ?? 0}
                    y={effectiveTextBox.offsetY ?? 0}
                    scaleX={effectiveTextBox.scaleX ?? 1}
                    scaleY={effectiveTextBox.scaleY ?? 1}
                    draggable={textBoxEditMode}
                    listening={textBoxEditMode}
                    onDragEnd={() => {
                        if (!textGroupRef.current) return;
                        const g = textGroupRef.current;
                        const ox = g.x();
                        const oy = g.y();
                        onChange(balloon.id, {
                            overrides: {
                                ...balloon.overrides,
                                textBox: {
                                    ...effectiveTextBox,
                                    offsetX: ox,
                                    offsetY: oy,
                                    scaleX: effectiveTextBox.scaleX ?? 1,
                                    scaleY: effectiveTextBox.scaleY ?? 1,
                                },
                            },
                        });
                    }}
                    onTransformEnd={() => {
                        if (!textGroupRef.current || !textBoxTrRef.current) return;
                        const g = textGroupRef.current;
                        const ox = g.x();
                        const oy = g.y();
                        const sx = g.scaleX();
                        const sy = g.scaleY();
                        g.scaleX(1);
                        g.scaleY(1);
                        onChange(balloon.id, {
                            overrides: {
                                ...balloon.overrides,
                                textBox: {
                                    offsetX: ox,
                                    offsetY: oy,
                                    scaleX: sx,
                                    scaleY: sy,
                                },
                            },
                        });
                        setTextBoxEditBalloonId(null);
                    }}
                >
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
                                        {...textFontProps}
                                        letterSpacing={balloon.overrides?.textLetterSpacing || 0}
                                        fill={color}
                                        stroke={color}
                                        strokeWidth={totalStroke}
                                        lineJoin="round"
                                        align={textAlign}
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
                                {...textFontProps}
                                letterSpacing={balloon.overrides?.textLetterSpacing || 0}
                                fill="transparent"
                                stroke={secondaryTextStroke}
                                strokeWidth={(textStrokeWidth || 0) + secondaryTextStrokeWidth}
                                lineJoin="round"
                                align={textAlign}
                                data={warpPathData}
                                perfectDrawEnabled={false}
                            />
                        ) : null}
                        {textStroke && textStrokeWidth ? (
                            <TextPath
                                text={balloon.text}
                                fontFamily={fontFamily}
                                fontSize={fontSize}
                                {...textFontProps}
                                letterSpacing={balloon.overrides?.textLetterSpacing || 0}
                                fill="transparent"
                                stroke={textStroke}
                                strokeWidth={textStrokeWidth}
                                lineJoin="round"
                                align={textAlign}
                                data={warpPathData}
                                perfectDrawEnabled={false}
                            />
                        ) : null}
                        <TextPath
                            ref={setTextRef}
                            text={balloon.text}
                            fontFamily={fontFamily}
                            fontSize={fontSize}
                            {...textFontProps}
                            letterSpacing={balloon.overrides?.textLetterSpacing || 0}
                            {...textFillProps}
                            align={textAlign}
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
                                        {...textFontProps}
                                        letterSpacing={balloon.overrides?.textLetterSpacing || 0}
                                        fill={color}
                                        stroke={color}
                                        strokeWidth={totalStroke}
                                        lineJoin="round"
                                        align={textAlign}
                                        verticalAlign={verticalAlign}
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
                                {...textFontProps}
                                letterSpacing={balloon.overrides?.textLetterSpacing || 0}
                                fill="transparent"
                                stroke={secondaryTextStroke}
                                strokeWidth={(textStrokeWidth || 0) + secondaryTextStrokeWidth}
                                lineJoin="round"
                                align={textAlign}
                                verticalAlign={verticalAlign}
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
                                {...textFontProps}
                                fill="transparent"
                                stroke={textStroke}
                                strokeWidth={textStrokeWidth}
                                lineJoin="round"
                                align={textAlign}
                                verticalAlign={verticalAlign}
                                width={autoSize ? undefined : w * 0.8}
                                height={autoSize ? undefined : h * 0.8}
                                x={autoSize ? -(textRef.current?.width() || 0) / 2 : -w * 0.4}
                                y={autoSize ? -(textRef.current?.height() || 0) / 2 : -h * 0.4}
                                perfectDrawEnabled={false}
                            />
                        ) : null}
                        <Text
                            ref={setTextRef}
                            text={balloon.text}
                            fontFamily={fontFamily}
                            fontSize={fontSize}
                            {...textFontProps}
                            {...textFillProps}
                            align={textAlign}
                            verticalAlign={verticalAlign}
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
                </Group>

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

            {balloon.isSelected && !textBoxEditMode && (
                <Transformer
                    ref={trRef}
                    borderStroke="#D4AF37"
                    anchorStroke="#D4AF37"
                    anchorFill="#37615D"
                    anchorSize={10}
                    resizeEnabled={true}
                    rotateEnabled={true}
                    rotateAnchorOffset={40}
                />
            )}
            {textBoxEditMode && (
                <Transformer
                    ref={textBoxTrRef}
                    borderStroke="#00D1FF"
                    anchorStroke="#00D1FF"
                    anchorFill="#00D1FF"
                    anchorSize={8}
                    resizeEnabled={true}
                    rotateEnabled={false}
                />
            )}
        </React.Fragment>
    );
};
