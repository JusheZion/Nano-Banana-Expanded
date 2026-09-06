import { Text as KonvaText } from 'react-konva';
import type { CodexTextObject } from '../../types/codexObjects';
import { nodeEffectProps } from '../../utils/nodeEffects';
import { gradientProps } from '../../utils/codexGradient';

interface TextNodeProps {
  object: CodexTextObject;
  onSelect: (e: { evt: MouseEvent }) => void;
  registerRef: (node: unknown | null) => void;
}

/**
 * Codex typography. Unlike the comic text object, this exposes the controls the
 * plates actually depend on — letter-spacing for tracked uppercase labels, and
 * line-height for body copy.
 */
export function TextNode({ object, onSelect, registerRef }: TextNodeProps) {
  const value =
    object.textTransform === 'uppercase' ? object.text.toUpperCase() : object.text;

  // Konva measures a text gradient against the shape box, so size it from the
  // declared width and the laid-out height rather than the glyph extents.
  const grad = gradientProps(
    object.gradient,
    object.width,
    Math.max(object.height, object.fontSize * object.lineHeight),
    'fill',
  );

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
      fill={grad ? undefined : object.fill}
      {...grad}
      fontFamily={object.fontFamily}
      fontSize={object.fontSize}
      fontStyle={object.fontStyle}
      align={object.align}
      lineHeight={object.lineHeight}
      letterSpacing={object.letterSpacing}
      wrap="word"
      /**
       * Konva's default hit region for text is the glyphs themselves, so only
       * the letters were clickable and the space around them was not. That was
       * survivable while a missed click did nothing; once clicking bare plate
       * correctly deselected, every near-miss dropped the selection and the box
       * became hard to grab, drag or transform. The hit region is now the text
       * box, which is what a user is aiming at.
       */
      hitFunc={(context, shape) => {
        context.beginPath();
        context.rect(0, 0, shape.width(), shape.height());
        context.closePath();
        context.fillStrokeShape(shape);
      }}
      onMouseDown={onSelect as never}
      onTap={onSelect as never}
      // No onDragEnd: the canvas commits the whole drag, because a drag can
      // move a group and one gesture must be one undo step.
      // No onTransformEnd: the canvas commits the whole transform, because a
      // transform can resize a group and one gesture must be one undo step.
      {...nodeEffectProps(object)}
    />
  );
}
