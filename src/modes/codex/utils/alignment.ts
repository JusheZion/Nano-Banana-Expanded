/**
 * Alignment and distribution for multi-object selections.
 *
 * Pure geometry, kept out of the panel so it can be tested without mounting
 * anything: the arithmetic is where alignment bugs live, not the buttons.
 *
 * Every operation returns per-object patches, so the caller commits them as a
 * single undo step rather than one entry per object.
 */
import type { CodexObject } from '../types/codexObjects';

export type AlignMode = 'left' | 'centerX' | 'right' | 'top' | 'middleY' | 'bottom';
export type DistributeMode = 'horizontal' | 'vertical';

export interface Bounds {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
}

/** Bounding box of a selection. Rotation is ignored — these align frames, not ink. */
export function selectionBounds(objects: CodexObject[]): Bounds | null {
  if (objects.length === 0) return null;
  let left = Infinity;
  let top = Infinity;
  let right = -Infinity;
  let bottom = -Infinity;
  for (const o of objects) {
    left = Math.min(left, o.x);
    top = Math.min(top, o.y);
    right = Math.max(right, o.x + o.width);
    bottom = Math.max(bottom, o.y + o.height);
  }
  return { left, top, right, bottom, width: right - left, height: bottom - top };
}

export interface ObjectPatch {
  id: string;
  patch: Partial<CodexObject>;
}

/** Locked objects are anchors, not cargo: they are never moved by an align. */
function movable(objects: CodexObject[]): CodexObject[] {
  return objects.filter((o) => !o.locked);
}

/**
 * Aligns to the selection's own bounding box.
 *
 * Needs two or more objects to mean anything — aligning one object to its own
 * bounds is a no-op, and returning patches for it would push an empty undo
 * entry.
 */
export function alignPatches(objects: CodexObject[], mode: AlignMode): ObjectPatch[] {
  if (objects.length < 2) return [];
  const bounds = selectionBounds(objects);
  if (!bounds) return [];

  const out: ObjectPatch[] = [];
  for (const o of movable(objects)) {
    let next: number;
    switch (mode) {
      case 'left':
        next = bounds.left;
        break;
      case 'centerX':
        next = bounds.left + bounds.width / 2 - o.width / 2;
        break;
      case 'right':
        next = bounds.right - o.width;
        break;
      case 'top':
        next = bounds.top;
        break;
      case 'middleY':
        next = bounds.top + bounds.height / 2 - o.height / 2;
        break;
      case 'bottom':
        next = bounds.bottom - o.height;
        break;
    }
    const axis = mode === 'left' || mode === 'centerX' || mode === 'right' ? 'x' : 'y';
    const current = axis === 'x' ? o.x : o.y;
    // Skip objects already in place so an align that changes nothing is empty.
    if (Math.abs(current - next) < 0.01) continue;
    out.push({ id: o.id, patch: { [axis]: next } as Partial<CodexObject> });
  }
  return out;
}

/**
 * Spreads the middle objects so the gaps between centres are equal, holding the
 * two outermost in place. Needs three: with two there is nothing between them
 * to distribute.
 */
export function distributePatches(
  objects: CodexObject[],
  mode: DistributeMode,
): ObjectPatch[] {
  if (objects.length < 3) return [];
  const horizontal = mode === 'horizontal';
  const centre = (o: CodexObject) => (horizontal ? o.x + o.width / 2 : o.y + o.height / 2);

  const sorted = [...objects].sort((a, b) => centre(a) - centre(b));
  const first = centre(sorted[0]);
  const last = centre(sorted[sorted.length - 1]);
  const stepSize = (last - first) / (sorted.length - 1);

  const out: ObjectPatch[] = [];
  sorted.forEach((o, i) => {
    if (i === 0 || i === sorted.length - 1) return;
    if (o.locked) return;
    const target = first + stepSize * i;
    const next = horizontal ? target - o.width / 2 : target - o.height / 2;
    const current = horizontal ? o.x : o.y;
    if (Math.abs(current - next) < 0.01) return;
    out.push({ id: o.id, patch: { [horizontal ? 'x' : 'y']: next } as Partial<CodexObject> });
  });
  return out;
}

/**
 * A value shared by every object, or `undefined` when they differ.
 *
 * The panel shows "Mixed" for `undefined` rather than picking the first
 * object's value, which would silently misreport the others.
 */
export function sharedValue<K extends keyof CodexObject>(
  objects: CodexObject[],
  key: K,
): CodexObject[K] | undefined {
  if (objects.length === 0) return undefined;
  const first = objects[0][key];
  return objects.every((o) => o[key] === first) ? first : undefined;
}
