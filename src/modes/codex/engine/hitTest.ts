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
