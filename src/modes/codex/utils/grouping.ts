/**
 * Object grouping.
 *
 * A fragment like Chapter Break is three objects — a rule, a mark, a second
 * rule — and a person who places one thinks of it as one thing. Without a
 * group they get three: clicking the mark selects the mark, dragging it leaves
 * the rules behind, and the divider comes apart the first time it is touched.
 *
 * Grouping here is a shared `groupId` rather than a container node. Members
 * stay flat in `plate.objects` with their own coordinates, so ordering,
 * layering, the Transformer and every node component are untouched; only
 * selection changes. The cost is that a group has no transform of its own, so
 * it is a selection convenience rather than a nested frame of reference — which
 * is all the plates ask for.
 */
import type { CodexObject } from '../types/codexObjects';

let seq = 0;

/** Fresh group id. Monotonic within a session; uniqueness is all that matters. */
export function newGroupId(): string {
  seq += 1;
  return `grp_${Date.now().toString(36)}_${seq.toString(36)}`;
}

/** Test seam; group ids are otherwise monotonic for the life of the session. */
export function __resetGroupIds(): void {
  seq = 0;
}

/** Ids of every member of `groupId`, in plate order. */
export function groupMembers(objects: CodexObject[], groupId: string): string[] {
  return objects.filter((o) => o.groupId === groupId).map((o) => o.id);
}

/**
 * Widens a set of ids to whole groups.
 *
 * Selecting one member of a group selects the group: that is what makes a
 * placed fragment behave as one piece. Order follows the plate, so the
 * selection reads back-to-front like the layer tree rather than in click order.
 */
export function expandGroups(objects: CodexObject[], ids: string[]): string[] {
  const wanted = new Set(ids);
  const groups = new Set<string>();
  for (const object of objects) {
    if (wanted.has(object.id) && object.groupId) groups.add(object.groupId);
  }
  if (groups.size === 0) return ids.filter((id) => objects.some((o) => o.id === id));
  return objects
    .filter((o) => wanted.has(o.id) || (o.groupId ? groups.has(o.groupId) : false))
    .map((o) => o.id);
}

/**
 * Group ids present in a selection, and whether the selection is exactly one
 * whole group. Drives whether Group and Ungroup are offered.
 */
export function groupsIn(objects: CodexObject[], ids: string[]): string[] {
  const wanted = new Set(ids);
  const seen: string[] = [];
  for (const object of objects) {
    if (!wanted.has(object.id) || !object.groupId) continue;
    if (!seen.includes(object.groupId)) seen.push(object.groupId);
  }
  return seen;
}

/**
 * Re-keys the groups in a set of copies so a duplicated group is its own group.
 *
 * Without this, duplicating a divider hands the copy the original's id and the
 * two merge: selecting either would select all six objects, and there would be
 * no way to pull them apart again.
 */
export function regroupCopies<T extends { groupId?: string }>(copies: T[]): T[] {
  const remap = new Map<string, string>();
  return copies.map((copy) => {
    if (!copy.groupId) return copy;
    let next = remap.get(copy.groupId);
    if (!next) {
      next = newGroupId();
      remap.set(copy.groupId, next);
    }
    return { ...copy, groupId: next };
  });
}

/**
 * Stamps a shared group id onto a freshly built fragment.
 *
 * Single-object fragments are left ungrouped: a group of one is a group that
 * can only surprise someone, since Ungroup would then be offered on a lone
 * object that never behaved as a group in the first place.
 */
export function asGroup(objects: CodexObject[]): CodexObject[] {
  if (objects.length < 2) return objects;
  const groupId = newGroupId();
  return objects.map((object) => ({ ...object, groupId }));
}

/**
 * Which of the selected objects the Transformer should hold.
 *
 * Locked objects are left off. Konva's Transformer drives every node attached
 * to it — dragging one drags them all, and it never consults a node's own
 * `draggable` — so a locked object attached here would travel with the
 * selection and could be resized by its handles. That is the one thing locking
 * exists to prevent, and it is invisible until someone locks half a group.
 */
export function transformableIds(objects: CodexObject[], selectedIds: string[]): string[] {
  const locked = new Set(objects.filter((o) => o.locked).map((o) => o.id));
  return selectedIds.filter((id) => !locked.has(id));
}
