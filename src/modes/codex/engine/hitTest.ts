/**
 * "Did this event hit a codex object?"
 *
 * One definition, because getting it wrong is subtle and has already shipped
 * twice. The tempting test is `target === stage`, which reads as "nothing was
 * hit" — but the plate's background rect and its texture image are real Konva
 * nodes, so a click on bare plate lands on one of them and that test is always
 * false. It broke the right-click menu (empty plate offered object actions) and
 * then click-to-deselect (the selection never cleared).
 *
 * Objects are tagged `codex-object`, so ask about the tag, not the stage.
 */

/** The slice of a Konva node this needs; keeps the helper testable. */
export interface HitNode {
  name: () => string;
  findAncestor: (selector: string, includeSelf?: boolean) => HitNode | undefined | null;
  id?: () => string;
}

/** The object node that was hit, or null for bare plate. */
export function findCodexObject(target: HitNode | null | undefined): HitNode | null {
  if (!target) return null;
  if (target.name() === 'codex-object') return target;
  return target.findAncestor('.codex-object', true) ?? null;
}

/** Id of the object hit, or '' for bare plate. */
export function hitObjectId(target: HitNode | null | undefined): string {
  const node = findCodexObject(target);
  return node?.id?.() ?? '';
}

/**
 * True when the event landed on the selection's own transform handles.
 *
 * The Transformer's anchors are separate nodes that are not tagged
 * `codex-object`, so a naive "did this hit an object?" reports false for them —
 * and grabbing a resize or rotate handle would clear the selection, detaching
 * the Transformer and killing the gesture before it began.
 */
export function isTransformerPart(target: HitNode | null | undefined): boolean {
  if (!target) return false;
  // Node-type selector: no leading dot, unlike the `.codex-object` name match.
  return !!target.findAncestor('Transformer', true);
}

/**
 * Whether a pointer event on the stage means "deselect".
 *
 * Only bare plate counts. Objects keep their selection, and so do the transform
 * handles — this is the third place the over-broad version of this test has
 * caused a bug, so it lives here once rather than at each call site.
 */
export function shouldClearSelection(target: HitNode | null | undefined): boolean {
  if (findCodexObject(target)) return false;
  if (isTransformerPart(target)) return false;
  return true;
}

/* ---------------------------------------------------------- hit padding -- */

/**
 * Smallest grabbable extent, in plate units.
 *
 * Konva's hit region is the shape as drawn, which is right for artwork and
 * wrong for furniture: a hairline rule is one pixel tall, so it is a one-pixel
 * target on screen at 100% and a sub-pixel one at any smaller zoom. Placing a
 * Diamond Rule and finding only the mark selectable is this, not a missing
 * object.
 */
export const MIN_HIT_EXTENT = 12;

/**
 * Padding that brings a shape's hit region up to `MIN_HIT_EXTENT`, per axis.
 *
 * Grows outwards from the centre so the padded region stays centred on what is
 * actually drawn, and is zero on any axis already big enough — a normal frame
 * keeps Konva's own hit region untouched.
 */
export function hitPadding(width: number, height: number): { x: number; y: number } {
  return {
    x: Math.max(0, (MIN_HIT_EXTENT - width) / 2),
    y: Math.max(0, (MIN_HIT_EXTENT - height) / 2),
  };
}
