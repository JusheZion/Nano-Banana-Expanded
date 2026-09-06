import { useMemo } from 'react';
import { Image as KonvaImage } from 'react-konva';
import useImage from 'use-image';
import { getSigil } from '../../data/SigilRegistry';
import { rasterSizeFor, sigilDataUri } from '../../utils/sigilRaster';
import type { CodexSigilObject } from '../../types/codexObjects';
import { nodeEffectProps } from '../../utils/nodeEffects';

interface SigilNodeProps {
  object: CodexSigilObject;
  onSelect: (e: { evt: MouseEvent }) => void;
  registerRef: (node: unknown | null) => void;
}

export function SigilNode({ object, onSelect, registerRef }: SigilNodeProps) {
  const sigil = getSigil(object.sigilId);

  const rasterSize = rasterSizeFor(Math.max(object.width, object.height));
  const uri = useMemo(
    () =>
      sigil
        ? sigilDataUri(
            sigil,
            {
              tint: object.tint,
              gradient: object.gradient,
              bevel: object.bevel,
              strokeScale: object.strokeScale,
              background: object.background ?? 'transparent',
            },
            rasterSize,
          )
        : '',
    [sigil, object.tint, object.gradient, object.bevel, object.strokeScale, object.background, rasterSize],
  );
  const [image] = useImage(uri);

  if (!sigil) return null;

  return (
    <KonvaImage
      ref={registerRef as never}
      id={object.id}
      name="codex-object"
      image={image}
      x={object.x}
      y={object.y}
      width={object.width}
      height={object.height}
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
    />
  );
}
