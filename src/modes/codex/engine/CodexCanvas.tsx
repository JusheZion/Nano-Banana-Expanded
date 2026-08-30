import { useCallback, useEffect, useMemo, useRef } from 'react';
import type Konva from 'konva';
import { Image as KonvaImage, Layer, Rect, Stage, Transformer } from 'react-konva';
import { gradientProps } from '../utils/codexGradient';
import { plateTextureDataUri } from '../data/plateTextures';
import useImage from 'use-image';
import { useCodexStore } from '@/stores/codexStore';
import type {
  CodexImageObject,
  CodexObject,
  CodexPlate,
} from '../types/codexObjects';
import { SigilNode } from '../components/nodes/SigilNode';
import { TextNode } from '../components/nodes/TextNode';
import { FrameNode } from '../components/nodes/FrameNode';
import { ChartNode } from '../components/nodes/ChartNode';
import { applyBlurCache, nodeEffectProps } from '../utils/nodeEffects';

interface CodexCanvasProps {
  plate: CodexPlate;
  /** Display scale, 1 = 100%. */
  scale: number;
  stageRef?: React.MutableRefObject<Konva.Stage | null>;
}

export function CodexCanvas({ plate, scale, stageRef }: CodexCanvasProps) {
  const selectedIds = useCodexStore((s) => s.selectedIds);
  const toggleSelect = useCodexStore((s) => s.toggleSelect);
  const clearSelection = useCodexStore((s) => s.clearSelection);
  const updateObject = useCodexStore((s) => s.updateObject);

  const transformerRef = useRef<Konva.Transformer | null>(null);
  const nodeRefs = useRef(new Map<string, Konva.Node>());

  const registerRef = useCallback(
    (id: string) => (node: unknown | null) => {
      if (node) nodeRefs.current.set(id, node as Konva.Node);
      else nodeRefs.current.delete(id);
    },
    [],
  );

  // Bind the transformer to whatever is selected.
  useEffect(() => {
    const tr = transformerRef.current;
    if (!tr) return;
    const nodes = selectedIds
      .map((id) => nodeRefs.current.get(id))
      .filter((n): n is Konva.Node => Boolean(n));
    tr.nodes(nodes);
    tr.getLayer()?.batchDraw();
  }, [selectedIds, plate.objects]);

  // Blur needs a cached node; keep the cache in step with the model.
  useEffect(() => {
    for (const object of plate.objects) {
      applyBlurCache(nodeRefs.current.get(object.id) ?? null, object.blur);
    }
  }, [plate.objects]);

  const handleSelect = useCallback(
    (id: string) => (e: { evt: MouseEvent }) => {
      const additive = e.evt.shiftKey || e.evt.metaKey || e.evt.ctrlKey;
      toggleSelect(id, additive);
    },
    [toggleSelect],
  );

  return (
    <Stage
      ref={stageRef as never}
      id={`codex-stage-${plate.id}`}
      width={plate.width * scale}
      height={plate.height * scale}
      scaleX={scale}
      scaleY={scale}
      onMouseDown={(e) => {
        if (e.target === e.target.getStage()) clearSelection();
      }}
      style={{ background: plate.background }}
    >
      <Layer>
        <Rect
          x={0}
          y={0}
          width={plate.width}
          height={plate.height}
          {...(gradientProps(plate.backgroundGradient, plate.width, plate.height, 'fill') ?? {
            fill: plate.background,
          })}
        />
        <PlateTextureLayer plate={plate} />

        {plate.objects.map((object) => (
          <CodexObjectNode
            key={object.id}
            object={object}
            onSelect={handleSelect(object.id)}
            onChange={(patch) => updateObject(object.id, patch as Partial<CodexObject>)}
            registerRef={registerRef(object.id)}
          />
        ))}

        <Transformer
          ref={transformerRef as never}
          rotateEnabled
          keepRatio={false}
          ignoreStroke
          borderStroke="#7dd3fc"
          anchorStroke="#7dd3fc"
          anchorFill="#0b1220"
          anchorSize={8}
          boundBoxFunc={(oldBox, newBox) =>
            newBox.width < 8 || newBox.height < 8 ? oldBox : newBox
          }
        />
      </Layer>
    </Stage>
  );
}

interface NodeProps {
  object: CodexObject;
  onSelect: (e: { evt: MouseEvent }) => void;
  onChange: (patch: Partial<CodexObject>) => void;
  registerRef: (node: unknown | null) => void;
}

function CodexObjectNode({ object, onSelect, onChange, registerRef }: NodeProps) {
  switch (object.kind) {
    case 'sigil':
      return (
        <SigilNode
          object={object}
          onSelect={onSelect}
          onChange={onChange}
          registerRef={registerRef}
        />
      );
    case 'text':
      return (
        <TextNode
          object={object}
          onSelect={onSelect}
          onChange={onChange}
          registerRef={registerRef}
        />
      );
    case 'frame':
      return (
        <FrameNode
          object={object}
          onSelect={onSelect}
          onChange={onChange}
          registerRef={registerRef}
        />
      );
    case 'chart':
      return (
        <ChartNode
          object={object}
          onSelect={onSelect}
          onChange={onChange}
          registerRef={registerRef}
        />
      );
    case 'image':
      return (
        <PlateImageNode
          object={object}
          onSelect={onSelect}
          onChange={onChange}
          registerRef={registerRef}
        />
      );
    default:
      return null;
  }
}

function PlateImageNode({
  object,
  onSelect,
  onChange,
  registerRef,
}: {
  object: CodexImageObject;
  onSelect: (e: { evt: MouseEvent }) => void;
  onChange: (patch: Partial<CodexImageObject>) => void;
  registerRef: (node: unknown | null) => void;
}) {
  const [image] = useImage(object.src, 'anonymous');
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

/**
 * The plate's printed surface. Sits above the colour/gradient and below every
 * object. Rendered as its own component so the texture raster is memoised and
 * a missing or still-loading texture simply draws nothing.
 */
function PlateTextureLayer({ plate }: { plate: CodexPlate }) {
  const uri = useMemo(
    () =>
      plate.backgroundTexture
        ? plateTextureDataUri(plate.backgroundTexture, plate.width, plate.height)
        : null,
    [plate.backgroundTexture, plate.width, plate.height],
  );
  const [image] = useImage(uri ?? '');
  if (!uri || !image) return null;
  return (
    <KonvaImage
      image={image}
      x={0}
      y={0}
      width={plate.width}
      height={plate.height}
      listening={false}
    />
  );
}
