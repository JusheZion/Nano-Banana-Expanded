import { useCallback, useEffect, useMemo, useRef } from 'react';
import type Konva from 'konva';
import { Image as KonvaImage, Layer, Rect, Stage, Transformer } from 'react-konva';
import { gradientProps } from '../utils/codexGradient';
import { findCodexObject, hitObjectId, shouldClearSelection, type HitNode } from './hitTest';
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
import { transformableIds } from '../utils/grouping';
import { transformPatch } from '../utils/transformLimits';

interface CodexCanvasProps {
  plate: CodexPlate;
  /** Display scale, 1 = 100%. */
  scale: number;
  stageRef?: React.MutableRefObject<Konva.Stage | null>;
  /** Right-click on the plate. `onObject` is false when the empty plate was hit. */
  onContextMenu?: (info: { x: number; y: number; onObject: boolean }) => void;
  /** Double-click on an object — the conventional "show me its properties". */
  onObjectActivate?: () => void;
}

export function CodexCanvas({ plate, scale, stageRef, onContextMenu, onObjectActivate }: CodexCanvasProps) {
  const selectedIds = useCodexStore((s) => s.selectedIds);
  const toggleSelect = useCodexStore((s) => s.toggleSelect);
  const clearSelection = useCodexStore((s) => s.clearSelection);

  const applyPatches = useCodexStore((s) => s.applyPatches);

  const transformerRef = useRef<Konva.Transformer | null>(null);
  const nodeRefs = useRef(new Map<string, Konva.Node>());

  /**
   * The drag in progress, captured at its start.
   *
   * Dragging is handled here rather than on each node because a drag can move
   * more than the object under the cursor: a group, or any multi-selection,
   * has to travel together. Konva only moves the node you grabbed, so the rest
   * are carried by delta, and the whole gesture is committed as a single undo
   * step at the end — a divider that took one drag must take one undo.
   */
  const drag = useRef<{
    anchorId: string;
    start: Map<string, { x: number; y: number }>;
  } | null>(null);

  /**
   * A press on an already-selected object, held until the mouse comes up.
   *
   * Pressing must not change the selection, or dragging a group — or any
   * multi-selection — would be impossible: the press would collapse the
   * selection to the one object under the cursor and the drag would leave the
   * rest behind, which is the very thing a group is meant to prevent. Narrowing
   * is what a *click* means, so it is applied on release, and only if no drag
   * happened in between.
   */
  const pendingNarrow = useRef<string | null>(null);
  const dragged = useRef(false);
  /** True between transformstart and the commit, so the gesture commits once. */
  const transforming = useRef(false);

  const registerRef = useCallback(
    (id: string) => (node: unknown | null) => {
      if (node) nodeRefs.current.set(id, node as Konva.Node);
      else nodeRefs.current.delete(id);
    },
    [],
  );

  // Bind the transformer to whatever is selected.
  //
  // Locked objects are left off it. Konva's Transformer drives every node
  // attached to it — dragging one drags them all, and it does not consult each
  // node's own `draggable` — so a locked object attached here would travel with
  // the selection and could be resized by its handles, which is the one thing
  // locking is for.
  useEffect(() => {
    const tr = transformerRef.current;
    if (!tr) return;
    const nodes = transformableIds(plate.objects, selectedIds)
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
      pendingNarrow.current = null;
      dragged.current = false;
      // Alt reaches inside a group for the one part under the cursor — the
      // standard way to edit a member without taking the group apart.
      if (additive || e.evt.altKey) {
        toggleSelect(id, additive, e.evt.altKey);
        return;
      }
      // Already selected: hold the selection so a drag can carry all of it,
      // and narrow on release instead.
      if (useCodexStore.getState().selectedIds.includes(id)) {
        pendingNarrow.current = id;
        return;
      }
      toggleSelect(id, false, false);
    },
    [toggleSelect],
  );

  const handleMouseUp = useCallback(() => {
    const id = pendingNarrow.current;
    pendingNarrow.current = null;
    // A press that turned into a drag was a move, not a click, so it must not
    // also change what is selected.
    if (id && !dragged.current) toggleSelect(id, false, false);
    dragged.current = false;
  }, [toggleSelect]);

  const handleDragStart = useCallback((e: { target: unknown }) => {
    const node = findCodexObject(e.target as HitNode);
    const anchorId = node?.id?.() ?? '';
    if (!anchorId) return;
    dragged.current = true;
    // The Transformer starts a drag on every node it holds, so this fires once
    // per selected object. The first one captured the gesture; the rest would
    // only re-record start positions that have already begun to move.
    if (drag.current) return;
    // Read the selection from the store, not from a render closure: the
    // mousedown that selected this object landed moments ago and the drag may
    // begin before the re-render that would refresh a captured value.
    const state = useCodexStore.getState();
    const plate = state.doc.plates.find((p) => p.id === state.activePlateId);
    const selected = state.selectedIds.includes(anchorId) ? state.selectedIds : [anchorId];
    const start = new Map<string, { x: number; y: number }>();
    for (const id of selected) {
      // A locked object stays put even when the selection around it moves.
      if (plate?.objects.find((o) => o.id === id)?.locked) continue;
      const other = nodeRefs.current.get(id);
      if (other) start.set(id, { x: other.x(), y: other.y() });
    }
    if (!start.has(anchorId)) return;
    drag.current = { anchorId, start };
  }, []);

  const handleDragMove = useCallback(() => {
    const state = drag.current;
    if (!state || state.start.size < 2) return;
    const anchor = nodeRefs.current.get(state.anchorId);
    const from = state.start.get(state.anchorId);
    if (!anchor || !from) return;
    const dx = anchor.x() - from.x;
    const dy = anchor.y() - from.y;
    for (const [id, origin] of state.start) {
      if (id === state.anchorId) continue;
      nodeRefs.current.get(id)?.position({ x: origin.x + dx, y: origin.y + dy });
    }
  }, []);

  const handleTransformStart = useCallback(() => {
    transforming.current = true;
  }, []);

  /**
   * Commits a finished resize or rotation for everything it touched.
   *
   * Owned by the canvas for the same reason dragging is: a transform can act on
   * a whole group, and five objects resized by one gesture must take one undo
   * step, not five.
   */
  const handleTransformEnd = useCallback(() => {
    // Guarded so a stray end without a start cannot commit a phantom patch.
    if (!transforming.current) return;
    transforming.current = false;
    const byId = new Map(plate.objects.map((o) => [o.id, o]));
    const patches: Array<{ id: string; patch: Partial<CodexObject> }> = [];
    for (const node of transformerRef.current?.nodes() ?? []) {
      const object = byId.get(node.id());
      if (!object) continue;
      const reading = {
        x: node.x(),
        y: node.y(),
        rotation: node.rotation(),
        scaleX: node.scaleX(),
        scaleY: node.scaleY(),
      };
      node.scaleX(1);
      node.scaleY(1);
      patches.push({ id: object.id, patch: transformPatch(object, reading) });
    }
    applyPatches(patches);
  }, [applyPatches, plate.objects]);

  const handleDragEnd = useCallback(() => {
    const state = drag.current;
    drag.current = null;
    if (!state) return;
    const patches: Array<{ id: string; patch: Partial<CodexObject> }> = [];
    for (const [id, origin] of state.start) {
      const node = nodeRefs.current.get(id);
      if (!node) continue;
      const x = node.x();
      const y = node.y();
      if (x === origin.x && y === origin.y) continue;
      patches.push({ id, patch: { x, y } });
    }
    applyPatches(patches);
  }, [applyPatches]);

  return (
    <Stage
      ref={stageRef as never}
      id={`codex-stage-${plate.id}`}
      width={plate.width * scale}
      height={plate.height * scale}
      scaleX={scale}
      scaleY={scale}
      onMouseDown={(e) => {
        if (shouldClearSelection(e.target as unknown as HitNode)) clearSelection();
      }}
      onMouseUp={handleMouseUp}
      onDragStart={handleDragStart}
      onDragMove={handleDragMove}
      onDragEnd={handleDragEnd}
      onDblClick={(e) => {
        if (findCodexObject(e.target as unknown as HitNode)) onObjectActivate?.();
      }}
      onContextMenu={(e) => {
        e.evt.preventDefault();
        const id = hitObjectId(e.target as unknown as HitNode);
        // Right-clicking an unselected object selects it first, so the menu acts
        // on what was actually clicked rather than on a stale selection.
        if (id && !selectedIds.includes(id)) toggleSelect(id, false);
        onContextMenu?.({ x: e.evt.clientX, y: e.evt.clientY, onObject: !!id });
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
            registerRef={registerRef(object.id)}
          />
        ))}

        <Transformer
          ref={transformerRef as never}
          // The handlers belong here, not on the Stage: Konva fires transform
          // events directly on the Transformer and on each attached node
          // without bubbling, so a Stage-level handler never sees them.
          onTransformStart={handleTransformStart}
          onTransformEnd={handleTransformEnd}
          rotateEnabled
          keepRatio={false}
          ignoreStroke
          borderStroke="#7dd3fc"
          anchorStroke="#7dd3fc"
          anchorFill="#0b1220"
          anchorSize={8}
          // Only rejects degenerate boxes. Each node type sets its own real
          // minimum on commit, and a rule's minimum is one pixel — a shared
          // floor here would quietly forbid the hairlines the plates are
          // built from.
          boundBoxFunc={(oldBox, newBox) =>
            newBox.width < 1 || newBox.height < 1 ? oldBox : newBox
          }
        />
      </Layer>
    </Stage>
  );
}

interface NodeProps {
  object: CodexObject;
  onSelect: (e: { evt: MouseEvent }) => void;
  registerRef: (node: unknown | null) => void;
}

function CodexObjectNode({ object, onSelect, registerRef }: NodeProps) {
  switch (object.kind) {
    case 'sigil':
      return (
        <SigilNode
          object={object}
          onSelect={onSelect}
          registerRef={registerRef}
        />
      );
    case 'text':
      return (
        <TextNode
          object={object}
          onSelect={onSelect}
          registerRef={registerRef}
        />
      );
    case 'frame':
      return (
        <FrameNode
          object={object}
          onSelect={onSelect}
          registerRef={registerRef}
        />
      );
    case 'chart':
      return (
        <ChartNode
          object={object}
          onSelect={onSelect}
          registerRef={registerRef}
        />
      );
    case 'image':
      return (
        <PlateImageNode
          object={object}
          onSelect={onSelect}
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
  registerRef,
}: {
  object: CodexImageObject;
  onSelect: (e: { evt: MouseEvent }) => void;
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
      // No onDragEnd: the canvas commits the whole drag, because a drag can
      // move a group and one gesture must be one undo step.
      // No onTransformEnd: the canvas commits the whole transform, because a
      // transform can resize a group and one gesture must be one undo step.
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
