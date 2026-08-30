import { beforeEach, describe, expect, it } from 'vitest';
import { createDocument, makeTextObject, useCodexStore } from '../codexStore';

function resetStore() {
  const doc = createDocument('Test Codex');
  useCodexStore.setState({
    doc,
    activePlateId: doc.plates[0].id,
    selectedIds: [],
    past: [],
    future: [],
  });
}

describe('codex store mutation boundaries', () => {
  beforeEach(resetStore);

  it('does not create undo history for missing targets or empty actions', () => {
    const state = useCodexStore.getState();
    state.updateObject('missing', { x: 42 });
    state.removeObjects([]);
    state.duplicateObjects([]);
    state.renameDocument(state.doc.title);
    expect(useCodexStore.getState().past).toHaveLength(0);
  });

  it('does not create a ghost selection when a target plate is missing', () => {
    const object = makeTextObject({ x: 10, y: 10 });
    useCodexStore.getState().addObject(object, 'missing-plate');
    const state = useCodexStore.getState();
    expect(state.doc.plates[0].objects).toEqual([]);
    expect(state.selectedIds).toEqual([]);
    expect(state.past).toEqual([]);
  });

  it('ignores navigation to a plate that does not exist', () => {
    const before = useCodexStore.getState().activePlateId;
    useCodexStore.getState().setActivePlate('missing-plate');
    expect(useCodexStore.getState().activePlateId).toBe(before);
  });

  it('keeps undo snapshots immutable while avoiding a redundant clone', () => {
    const object = makeTextObject({ x: 10, y: 10, text: 'Original' });
    const store = useCodexStore.getState();
    store.addObject(object);
    useCodexStore.getState().updateObject(object.id, { text: 'Edited' });
    useCodexStore.getState().undo();

    const restored = useCodexStore.getState().doc.plates[0].objects[0];
    expect(restored).toMatchObject({ id: object.id, text: 'Original' });
    useCodexStore.getState().redo();
    expect(useCodexStore.getState().doc.plates[0].objects[0]).toMatchObject({ text: 'Edited' });
  });

  it('does not record layer moves that are already at the boundary', () => {
    const object = makeTextObject({ x: 10, y: 10 });
    useCodexStore.getState().addObject(object);
    const depth = useCodexStore.getState().past.length;
    useCodexStore.getState().reorderObject(object.id, 'front');
    expect(useCodexStore.getState().past).toHaveLength(depth);
  });
});
