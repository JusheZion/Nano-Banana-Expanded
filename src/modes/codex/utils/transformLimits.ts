/**
 * Smallest size a resize may leave an object at, by kind.
 *
 * These were once magic numbers inside each node component, and one of them was
 * wrong in a way nothing could catch: frames floored at 16px. A rule *is* a
 * frame one pixel tall, so resizing any divider turned its hairline into a
 * solid 16px bar. Collected here so the floors are a stated policy rather than
 * a constant repeated five times.
 */
import type { CodexObject, CodexObjectKind } from '../types/codexObjects';

export const MIN_EXTENT: Record<CodexObjectKind, number> = {
  // A hairline is legitimate furniture, so frames floor at one pixel — enough
  // to keep the geometry non-degenerate and nothing more.
  frame: 1,
  // The rest have no meaningful form below these; smaller is a lost object
  // rather than a small one. Values match what each node already enforced.
  sigil: 8,
  image: 8,
  /** Narrower than this and a text box cannot hold a word. */
  text: 24,
  /**
   * A single-row bar meter is a chart 30px tall and the library ships several,
   * so the old floor of 60 would have snapped them taller the first time one
   * was resized. Low enough for those, high enough that a chart cannot become
   * a smear.
   */
  chart: 24,
};

/** Clamped extent after a scale, for committing a transform. */
export function resizedExtent(extent: number, scale: number, kind: CodexObjectKind): number {
  return Math.max(MIN_EXTENT[kind], extent * scale);
}

/** What a Konva node reports at the end of a transform. */
export interface TransformReading {
  x: number;
  y: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
}

/**
 * The model change a finished transform means for one object.
 *
 * Konva expresses a resize as a scale on the node; the model stores width and
 * height, so the scale is folded into the size and the node is reset. Pure, so
 * the canvas can build one patch per transformed object and commit them all
 * together — a group resized in one gesture must undo in one step.
 */
export function transformPatch(
  object: CodexObject,
  reading: TransformReading,
): Partial<CodexObject> {
  const patch: Record<string, number> = {
    x: reading.x,
    y: reading.y,
    rotation: reading.rotation,
    width: resizedExtent(object.width, reading.scaleX, object.kind),
  };
  // Text height follows the font and the wrapped line count, so writing a
  // scaled height here would be overwritten on the next render anyway.
  if (object.kind !== 'text') {
    patch.height = resizedExtent(object.height, reading.scaleY, object.kind);
  }
  return patch as Partial<CodexObject>;
}
