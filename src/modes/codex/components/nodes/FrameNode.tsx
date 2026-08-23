import { Group, Line, Rect } from 'react-konva';
import type { CodexFrameObject } from '../../types/codexObjects';
import { nodeEffectProps } from '../../utils/nodeEffects';

interface FrameNodeProps {
  object: CodexFrameObject;
  onSelect: (e: { evt: MouseEvent }) => void;
  onChange: (patch: Partial<CodexFrameObject>) => void;
  registerRef: (node: unknown | null) => void;
}

const TICK = 16;

/**
 * Plate furniture: the frame treatments the codex plates are built from.
 * Variants mirror the Ornament library rather than inventing new ones.
 */
export function FrameNode({ object, onSelect, onChange, registerRef }: FrameNodeProps) {
  const { width: w, height: h, stroke, strokeWidth, cornerRadius, variant } = object;

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
      onDragEnd={(e) => onChange({ x: e.target.x(), y: e.target.y() })}
      onTransformEnd={(e) => {
        const node = e.target;
        const scaleX = node.scaleX();
        const scaleY = node.scaleY();
        node.scaleX(1);
        node.scaleY(1);
        onChange({
          x: node.x(),
          y: node.y(),
          width: Math.max(16, w * scaleX),
          height: Math.max(16, h * scaleY),
          rotation: node.rotation(),
        });
      }}
      {...nodeEffectProps(object)}
    >
      <Rect
        width={w}
        height={h}
        cornerRadius={cornerRadius}
        fill={object.fill}
        stroke={variant === 'bracketed' ? undefined : stroke}
        strokeWidth={variant === 'bracketed' ? 0 : strokeWidth}
        dash={variant === 'dashed' ? [8, 6] : undefined}
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
