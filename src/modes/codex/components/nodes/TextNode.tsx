import { Text as KonvaText } from 'react-konva';
import type { CodexTextObject } from '../../types/codexObjects';
import { nodeEffectProps } from '../../utils/nodeEffects';

interface TextNodeProps {
  object: CodexTextObject;
  onSelect: (e: { evt: MouseEvent }) => void;
  onChange: (patch: Partial<CodexTextObject>) => void;
  registerRef: (node: unknown | null) => void;
}

/**
 * Codex typography. Unlike the comic text object, this exposes the controls the
 * plates actually depend on — letter-spacing for tracked uppercase labels, and
 * line-height for body copy.
 */
export function TextNode({ object, onSelect, onChange, registerRef }: TextNodeProps) {
  const value =
    object.textTransform === 'uppercase' ? object.text.toUpperCase() : object.text;

  return (
    <KonvaText
      ref={registerRef as never}
      id={object.id}
      name="codex-object"
      text={value}
      x={object.x}
      y={object.y}
      width={object.width}
      rotation={object.rotation}
      opacity={object.opacity}
      visible={object.visible}
      listening={!object.locked}
      draggable={!object.locked}
      fill={object.fill}
      fontFamily={object.fontFamily}
      fontSize={object.fontSize}
      fontStyle={object.fontStyle}
      align={object.align}
      lineHeight={object.lineHeight}
      letterSpacing={object.letterSpacing}
      wrap="word"
      onMouseDown={onSelect as never}
      onTap={onSelect as never}
      onDragEnd={(e) => onChange({ x: e.target.x(), y: e.target.y() })}
      onTransformEnd={(e) => {
        const node = e.target;
        const scaleX = node.scaleX();
        node.scaleX(1);
        node.scaleY(1);
        onChange({
          x: node.x(),
          y: node.y(),
          width: Math.max(24, object.width * scaleX),
          rotation: node.rotation(),
        });
      }}
      {...nodeEffectProps(object)}
    />
  );
}
