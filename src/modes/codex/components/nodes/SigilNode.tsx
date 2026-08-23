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
  onChange: (patch: Partial<CodexSigilObject>) => void;
  registerRef: (node: unknown | null) => void;
}

export function SigilNode({ object, onSelect, onChange, registerRef }: SigilNodeProps) {
  const sigil = getSigil(object.sigilId);

  const rasterSize = rasterSizeFor(Math.max(object.width, object.height));
  const uri = useMemo(
    () =>
      sigil
        ? sigilDataUri(sigil, object.tint, object.background ?? 'transparent', rasterSize)
        : '',
    [sigil, object.tint, object.background, rasterSize],
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
          width: Math.max(8, object.width * scaleX),
          height: Math.max(8, object.height * scaleY),
          rotation: node.rotation(),
        });
      }}
      {...nodeEffectProps(object)}
    />
  );
}
