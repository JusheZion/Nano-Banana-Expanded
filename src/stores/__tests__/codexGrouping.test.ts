import { beforeEach, describe, expect, it } from 'vitest';
import { createDocument, useCodexStore } from '../codexStore';
import { buildFragment, getFragment } from '@/modes/codex/data/FragmentRegistry';

/**
 * Grouping, from the reported failure inwards.
 *
 * Placing a Diamond Rule put a rule and a mark on the plate as two unrelated
 * objects: clicking the mark selected the mark, dragging it left the line
 * behind, and the line itself could not be picked up at all. These tests hold
 * the two halves of the fix — a fragment is one group, and selecting any part
 * of a group selects the group.
 */
function reset() {
  const doc = createDocument('Grouping');
  useCodexStore.setState({
    doc,
    activePlateId: doc.plates[0].id,
    selectedIds: [],
    past: [],
    future: [],
    clipboard: [],
  });
}

const plate = () => {
  const state = useCodexStore.getState();
  return state.doc.plates.find((p) => p.id === state.activePlateId)!;
};

function placeDivider(id = 'divider-diamond') {
  const fragment = getFragment(id)!;
  const objects = buildFragment(fragment, 100, 100);
  useCodexStore.getState().addObjects(objects);
  return objects;
}

beforeEach(reset);

describe('placing a fragment', () => {
  it('binds a multi-part divider into one group', () => {
    const objects = placeDivider();
    expect(objects.length).toBeGreaterThan(1);
    const ids = new Set(plate().objects.map((o) => o.groupId));
    expect(ids.size).toBe(1);
    expect([...ids][0]).toBeTruthy();
  });

  it('leaves a single-object fragment ungrouped', () => {
    const fragment = getFragment('divider-hairline')!;
    const built = buildFragment(fragment, 0, 0);
    expect(built).toHaveLength(1);
    expect(built[0].groupId).toBeUndefined();
  });

  it('gives two placements of the same fragment separate groups', () => {
    placeDivider();
    placeDivider();
    const groups = new Set(plate().objects.map((o) => o.groupId));
    expect(groups.size).toBe(2);
  });
});

describe('selecting a group', () => {
  it('selects the whole divider when the mark is clicked', () => {
    const objects = placeDivider();
    const mark = objects.find((o) => o.kind === 'sigil')!;
    useCodexStore.getState().toggleSelect(mark.id, false);
    expect(useCodexStore.getState().selectedIds).toEqual(objects.map((o) => o.id));
  });

  it('selects the whole divider when the rule is clicked', () => {
    const objects = placeDivider();
    const rule = objects.find((o) => o.kind === 'frame')!;
    useCodexStore.getState().toggleSelect(rule.id, false);
    expect(useCodexStore.getState().selectedIds).toContain(
      objects.find((o) => o.kind === 'sigil')!.id,
    );
  });

  it('Alt-click reaches inside for the one part under the cursor', () => {
    const objects = placeDivider();
    const mark = objects.find((o) => o.kind === 'sigil')!;
    useCodexStore.getState().toggleSelect(mark.id, false, true);
    expect(useCodexStore.getState().selectedIds).toEqual([mark.id]);
  });

  it('shift-clicking a selected group removes all of it, not one member', () => {
    const objects = placeDivider();
    const store = useCodexStore.getState();
    store.toggleSelect(objects[0].id, false);
    store.toggleSelect(objects[0].id, true);
    expect(useCodexStore.getState().selectedIds).toEqual([]);
  });

  it('shift-clicking a second group adds it whole', () => {
    const first = placeDivider();
    const second = placeDivider('divider-chapter-break');
    const store = useCodexStore.getState();
    store.toggleSelect(first[0].id, false);
    store.toggleSelect(second[0].id, true);
    const selected = useCodexStore.getState().selectedIds;
    for (const object of [...first, ...second]) expect(selected).toContain(object.id);
  });

  it('ignores a click on an object that is not on the plate', () => {
    placeDivider();
    const before = useCodexStore.getState().selectedIds;
    useCodexStore.getState().toggleSelect('ghost', false);
    expect(useCodexStore.getState().selectedIds).toEqual(before);
  });
});

describe('group and ungroup', () => {
  it('binds a hand-made selection', () => {
    placeDivider();
    const ids = plate().objects.map((o) => o.id);
    useCodexStore.getState().ungroupObjects(ids);
    useCodexStore.getState().groupObjects(ids);
    const groups = new Set(plate().objects.map((o) => o.groupId));
    expect(groups.size).toBe(1);
    expect([...groups][0]).toBeTruthy();
  });

  it('releases a group, so its parts move alone again', () => {
    const objects = placeDivider();
    useCodexStore.getState().ungroupObjects(objects.map((o) => o.id));
    expect(plate().objects.every((o) => o.groupId === undefined)).toBe(true);
    useCodexStore.getState().toggleSelect(objects[0].id, false);
    expect(useCodexStore.getState().selectedIds).toEqual([objects[0].id]);
  });

  it('refuses to group a single object', () => {
    placeDivider();
    const before = useCodexStore.getState().past.length;
    useCodexStore.getState().groupObjects([plate().objects[0].id]);
    expect(useCodexStore.getState().past).toHaveLength(before);
  });

  it('is one undo step, and undo puts the group back', () => {
    const objects = placeDivider();
    const before = useCodexStore.getState().past.length;
    useCodexStore.getState().ungroupObjects(objects.map((o) => o.id));
    expect(useCodexStore.getState().past).toHaveLength(before + 1);
    useCodexStore.getState().undo();
    expect(plate().objects.every((o) => Boolean(o.groupId))).toBe(true);
  });

  it('does not record history when there is nothing to ungroup', () => {
    const fragment = getFragment('divider-hairline')!;
    useCodexStore.getState().addObjects(buildFragment(fragment, 0, 0));
    const before = useCodexStore.getState().past.length;
    useCodexStore.getState().ungroupObjects(plate().objects.map((o) => o.id));
    expect(useCodexStore.getState().past).toHaveLength(before);
  });
});

describe('copies of a group', () => {
  it('duplicating gives the copy its own group', () => {
    const objects = placeDivider();
    useCodexStore.getState().duplicateObjects(objects.map((o) => o.id));
    const groups = new Set(plate().objects.map((o) => o.groupId));
    expect(groups.size).toBe(2);
  });

  it('a duplicate selects and moves independently of the original', () => {
    const objects = placeDivider();
    useCodexStore.getState().duplicateObjects(objects.map((o) => o.id));
    const copyIds = useCodexStore.getState().selectedIds;
    expect(copyIds).toHaveLength(objects.length);
    useCodexStore.getState().toggleSelect(copyIds[0], false);
    expect(useCodexStore.getState().selectedIds.sort()).toEqual([...copyIds].sort());
  });

  it('pasting gives the pasted group its own id', () => {
    const objects = placeDivider();
    const store = useCodexStore.getState();
    store.copyObjects(objects.map((o) => o.id));
    store.pasteClipboard();
    const groups = new Set(plate().objects.map((o) => o.groupId));
    expect(groups.size).toBe(2);
  });

  it('pasting twice gives three separate groups, not one merged one', () => {
    const objects = placeDivider();
    const store = useCodexStore.getState();
    store.copyObjects(objects.map((o) => o.id));
    store.pasteClipboard();
    useCodexStore.getState().pasteClipboard();
    const groups = new Set(plate().objects.map((o) => o.groupId));
    expect(groups.size).toBe(3);
  });
});
