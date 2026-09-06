import type Konva from 'konva';
import { Group, Line, Rect } from 'react-konva';
import type { CodexFrameObject } from '../../types/codexObjects';
import { nodeEffectProps } from '../../utils/nodeEffects';
import { gradientProps } from '../../utils/codexGradient';
import { hitPadding } from '../../engine/hitTest';

interface FrameNodeProps {
  object: CodexFrameObject;
  onSelect: (e: { evt: MouseEvent }) => void;
  registerRef: (node: unknown | null) => void;
}

const TICK = 16;

/**
 * Plate furniture: the frame treatments the codex plates are built from.
 * Variants mirror the Ornament library rather than inventing new ones.
 */
export function FrameNode({ object, onSelect, registerRef }: FrameNodeProps) {
  const { width: w, height: h, stroke, strokeWidth, cornerRadius, variant } = object;

  // Gradients win over the flat colour when present; `null` means "no gradient",
  // so the flat fill/stroke below still applies.
  const fillGrad = gradientProps(object.fillGradient, w, h, 'fill');
  const strokeGrad = gradientProps(object.strokeGradient, w, h, 'stroke');

  // Rules are frames one pixel tall, and Konva's hit region is the drawn shape,
  // so without this a hairline is an unclickable target and a divider looks
  // like it has no line. Only thin frames are padded; the rest are untouched.
  const { x: padX, y: padY } = hitPadding(w, h);
  const needsHitPad = padX > 0 || padY > 0;

  return (
    <Group
      ref={registerRef as never}
      id={object.id}
      name="codex-object"
      x={object.x}
      y={object.y}
      width={w}
      height={h}
      rotation={object.rotation}
      opacity={object.opacity}
      visible={object.visible}
      listening={!object.locked}
      draggable={!object.locked}
      onMouseDown={onSelect as never}
      onTap={onSelect as never}
      // No onDragEnd: the canvas commits the whole drag, because a drag can
      // move a group and one gesture must be one undo step.
      // No onTransformEnd: the canvas commits the whole transform, because a
      // transform can resize a group and one gesture must be one undo step.
      {...nodeEffectProps(object)}
    >
      <Rect
        width={w}
        height={h}
        cornerRadius={cornerRadius}
        fill={fillGrad ? undefined : object.fill}
        stroke={variant === 'bracketed' || strokeGrad ? undefined : stroke}
        strokeWidth={variant === 'bracketed' ? 0 : strokeWidth}
        dash={variant === 'dashed' ? [8, 6] : undefined}
        {...(needsHitPad
          ? {
              hitFunc: (context: Konva.Context, shape: Konva.Shape) => {
                context.beginPath();
                context.rect(-padX, -padY, w + padX * 2, h + padY * 2);
                context.closePath();
                context.fillStrokeShape(shape);
              },
            }
          : {})}
        {...fillGrad}
        {...(variant === 'bracketed' ? {} : strokeGrad)}
      />

      {variant === 'double' && (
        <Rect
          x={5}
          y={5}
          width={Math.max(0, w - 10)}
          height={Math.max(0, h - 10)}
          cornerRadius={Math.max(0, cornerRadius - 1)}
          stroke={stroke}
          strokeWidth={strokeWidth}
          opacity={0.55}
        />
      )}

      {variant === 'bracketed' && (
        <>
          <Line points={[0, TICK, 0, 0, TICK, 0]} stroke={stroke} strokeWidth={strokeWidth} />
          <Line points={[w - TICK, 0, w, 0, w, TICK]} stroke={stroke} strokeWidth={strokeWidth} />
          <Line points={[w, h - TICK, w, h, w - TICK, h]} stroke={stroke} strokeWidth={strokeWidth} />
          <Line points={[TICK, h, 0, h, 0, h - TICK]} stroke={stroke} strokeWidth={strokeWidth} />
        </>
      )}

      {variant === 'litEdge' && (
        <>
          <Line
            points={[w * 0.15, 0, w * 0.85, 0]}
            stroke={stroke}
            strokeWidth={strokeWidth * 1.5}
          />
          <Line
            points={[w * 0.15, h, w * 0.85, h]}
            stroke={stroke}
            strokeWidth={strokeWidth * 1.5}
          />
        </>
      )}
    </Group>
  );
}
