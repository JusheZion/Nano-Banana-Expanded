import { create } from 'zustand';
import {
  CODEX_GROUND,
  CODEX_INK,
  CODEX_SCHEMA_VERSION,
  DEFAULT_PLATE_HEIGHT,
  DEFAULT_PLATE_WIDTH,
  defaultObjectName,
  type CodexDocument,
  type CodexObject,
  type CodexPlate,
} from '@/modes/codex/types/codexObjects';
import {
  DEFAULT_SIGIL_FINISH_ID,
  getSigilFinish,
} from '@/modes/codex/data/sigilFinishes';
import {
  expandGroups,
  newGroupId,
  regroupCopies,
} from '@/modes/codex/utils/grouping';

const HISTORY_LIMIT = 60;
/** Offset applied to pasted copies so they do not land exactly on the original. */
const PASTE_OFFSET = 24;

function uid(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

export function createPlate(name = 'Plate 1'): CodexPlate {
  return {
    id: uid('plate'),
    name,
    width: DEFAULT_PLATE_WIDTH,
    height: DEFAULT_PLATE_HEIGHT,
    background: CODEX_GROUND,
    objects: [],
  };
}

export function createDocument(title = 'Untitled Codex'): CodexDocument {
  const now = new Date().toISOString();
  return {
    id: uid('codex'),
    title,
    plates: [createPlate()],
    createdAt: now,
    updatedAt: now,
    schemaVersion: CODEX_SCHEMA_VERSION,
  };
}

const FINISH_KEY = 'codex.sigilFinish.v1';

function readStoredFinish(): string {
  try {
    return localStorage.getItem(FINISH_KEY) ?? DEFAULT_SIGIL_FINISH_ID;
  } catch {
    return DEFAULT_SIGIL_FINISH_ID;
  }
}

export interface CodexState {
  doc: CodexDocument;
  activePlateId: string;
  selectedIds: string[];
  past: CodexDocument[];
  future: CodexDocument[];

  // selection + navigation
  setActivePlate: (plateId: string) => void;
  select: (ids: string[]) => void;
  /**
   * Selects an object from the canvas. `isolate` reaches inside a group to take
   * the single member that was clicked, which is what Alt-click does.
   */
  toggleSelect: (id: string, additive: boolean, isolate?: boolean) => void;
  clearSelection: () => void;

  // document
  loadDocument: (doc: CodexDocument) => void;
  newDocument: (title?: string) => void;
  renameDocument: (title: string) => void;

  // plates
  addPlate: () => void;
  removePlate: (plateId: string) => void;
  updatePlate: (plateId: string, patch: Partial<CodexPlate>) => void;

  // objects
  /**
   * Finish applied to newly placed marks. An authoring preference, not document
   * state, so it lives outside `doc` and persists on its own.
   */
  sigilFinishId: string;
  setSigilFinish: (id: string) => void;

  addObject: (object: CodexObject, plateId?: string) => void;
  /** Places a group as one undo step, so a fragment is not 12 separate undos. */
  addObjects: (objects: CodexObject[], plateId?: string) => void;
  updateObject: (id: string, patch: Partial<CodexObject>) => void;
  updateObjects: (ids: string[], patch: Partial<CodexObject>) => void;
  /** Per-object patches committed as one undo step. */
  applyPatches: (entries: Array<{ id: string; patch: Partial<CodexObject> }>) => void;

  /** Objects held for paste. Not persisted: a clipboard is session state. */
  clipboard: CodexObject[];
  copyObjects: (ids: string[]) => void;
  cutObjects: (ids: string[]) => void;
  /** Pastes onto the active plate, offset so it does not hide the original. */
  pasteClipboard: () => void;
  selectAll: () => void;
  /** Moves by a delta; arrow-key nudging goes through here so it is undoable. */
  nudgeObjects: (ids: string[], dx: number, dy: number) => void;
  removeObjects: (ids: string[]) => void;
  duplicateObjects: (ids: string[]) => void;
  /** Binds the selection into one group, replacing any groups it spanned. */
  groupObjects: (ids: string[]) => void;
  /** Releases the selection from its groups. */
  ungroupObjects: (ids: string[]) => void;
  reorderObject: (id: string, direction: 'front' | 'back' | 'forward' | 'backward') => void;

  // history
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
}

/** Deep-enough clone for the document shape (plain JSON only). */
function cloneDoc(doc: CodexDocument): CodexDocument {
  return JSON.parse(JSON.stringify(doc)) as CodexDocument;
}

function cloneObject(object: CodexObject): CodexObject {
  return JSON.parse(JSON.stringify(object)) as CodexObject;
}

function assignChanged(target: object, patch: object): boolean {
  const current = target as Record<string, unknown>;
  const entries = Object.entries(patch);
  if (!entries.some(([key, value]) => current[key] !== value)) return false;
  Object.assign(target, patch);
  return true;
}

export const useCodexStore = create<CodexState>((set, get) => {
  const initial = createDocument();

  /** Apply a mutation to the document, recording it on the undo stack. */
  const commit = (mutate: (doc: CodexDocument) => boolean) => {
    set((state) => {
      const next = cloneDoc(state.doc);
      if (!mutate(next)) return state;
      next.updatedAt = new Date().toISOString();
      return {
        doc: next,
        past: [...state.past, state.doc].slice(-HISTORY_LIMIT),
        future: [],
      };
    });
  };

  const activePlate = (doc: CodexDocument, plateId: string): CodexPlate | undefined =>
    doc.plates.find((p) => p.id === plateId);

  return {
    doc: initial,
    activePlateId: initial.plates[0].id,
    selectedIds: [],
    past: [],
    future: [],

    sigilFinishId: readStoredFinish(),
    setSigilFinish: (id) => {
      set({ sigilFinishId: id });
      try {
        localStorage.setItem(FINISH_KEY, id);
      } catch {
        // A blocked storage quota must not stop the user changing finish.
      }
    },

    setActivePlate: (plateId) => set((state) =>
      state.doc.plates.some((plate) => plate.id === plateId)
        ? { activePlateId: plateId, selectedIds: [] }
        : state),
    select: (ids) => set({ selectedIds: ids }),
    toggleSelect: (id, additive, isolate = false) =>
      set((state) => {
        const plate = activePlate(state.doc, state.activePlateId);
        // Clicking one member of a group takes the whole group, so a placed
        // fragment behaves as the single piece it looks like.
        const ids = isolate ? [id] : expandGroups(plate?.objects ?? [], [id]);
        if (ids.length === 0) return state;
        if (!additive) return { selectedIds: ids };
        // Shift-clicking a group that is already fully selected removes it.
        const whole = ids.every((i) => state.selectedIds.includes(i));
        if (whole) {
          return { selectedIds: state.selectedIds.filter((s) => !ids.includes(s)) };
        }
        const added = ids.filter((i) => !state.selectedIds.includes(i));
        return { selectedIds: [...state.selectedIds, ...added] };
      }),
    clearSelection: () => set({ selectedIds: [] }),

    loadDocument: (doc) => {
      const next = cloneDoc(doc);
      if (!next.plates[0]) return;
      set({
        doc: next,
        activePlateId: next.plates[0].id,
        selectedIds: [],
        past: [],
        future: [],
      });
    },

    newDocument: (title) => {
      const doc = createDocument(title);
      set({ doc, activePlateId: doc.plates[0].id, selectedIds: [], past: [], future: [] });
    },

    renameDocument: (title) => commit((doc) => assignChanged(doc, { title })),

    addPlate: () =>
      commit((doc) => {
        doc.plates.push(createPlate(`Plate ${doc.plates.length + 1}`));
        return true;
      }),

    removePlate: (plateId) => {
      const { doc } = get();
      if (doc.plates.length <= 1) return;
      commit((d) => {
        const next = d.plates.filter((p) => p.id !== plateId);
        if (next.length === d.plates.length) return false;
        d.plates = next;
        return true;
      });
      const remaining = get().doc.plates;
      if (get().activePlateId === plateId) {
        set({ activePlateId: remaining[0]?.id ?? '', selectedIds: [] });
      }
    },

    updatePlate: (plateId, patch) =>
      commit((doc) => {
        const plate = activePlate(doc, plateId);
        return plate ? assignChanged(plate, patch) : false;
      }),

    addObject: (object, plateId) => {
      const targetId = plateId ?? get().activePlateId;
      let added = false;
      commit((doc) => {
        const plate = activePlate(doc, targetId);
        if (!plate) return false;
        plate.objects.push(object);
        added = true;
        return true;
      });
      if (added) set({ selectedIds: [object.id] });
    },

    addObjects: (objects, plateId) => {
      if (objects.length === 0) return;
      const targetId = plateId ?? get().activePlateId;
      let added = false;
      commit((doc) => {
        const plate = activePlate(doc, targetId);
        if (!plate) return false;
        plate.objects.push(...objects);
        added = true;
        return true;
      });
      if (added) set({ selectedIds: objects.map((o) => o.id) });
    },

    clipboard: [],

    copyObjects: (ids) => {
      const plate = activePlate(get().doc, get().activePlateId);
      if (!plate) return;
      set({ clipboard: plate.objects.filter((o) => ids.includes(o.id)) });
    },

    cutObjects: (ids) => {
      get().copyObjects(ids);
      get().removeObjects(ids);
    },

    pasteClipboard: () => {
      const clipboard = get().clipboard;
      if (clipboard.length === 0) return;
      // Fresh group ids: a pasted divider must be its own group, or it would
      // merge with the one it was copied from and neither could be moved alone.
      const copies = regroupCopies(
        clipboard.map((object) => ({
          ...object,
          id: uid(object.kind),
          x: object.x + PASTE_OFFSET,
          y: object.y + PASTE_OFFSET,
        })),
      );
      get().addObjects(copies);
      // Paste again and the next copy steps further, rather than restacking.
      set({ clipboard: copies });
    },

    selectAll: () => {
      const plate = activePlate(get().doc, get().activePlateId);
      if (!plate) return;
      set({ selectedIds: plate.objects.filter((o) => o.visible && !o.locked).map((o) => o.id) });
    },

    nudgeObjects: (ids, dx, dy) => {
      if (ids.length === 0) return;
      commit((doc) => {
        let moved = false;
        for (const plate of doc.plates) {
          for (const obj of plate.objects) {
            if (ids.includes(obj.id) && !obj.locked) {
              obj.x += dx;
              obj.y += dy;
              moved = true;
            }
          }
        }
        // A nudge that moved nothing (all locked) must not push an undo entry.
        return moved;
      });
    },

    updateObject: (id, patch) => get().updateObjects([id], patch),

    updateObjects: (ids, patch) => {
      if (ids.length === 0 || Object.keys(patch).length === 0) return;
      const targets = new Set(ids);
      commit((doc) => {
        let changed = false;
        for (const plate of doc.plates) {
          for (const obj of plate.objects) {
            if (targets.has(obj.id)) changed = assignChanged(obj, patch) || changed;
          }
        }
        return changed;
      });
    },

    applyPatches: (entries) => {
      if (entries.length === 0) return;
      const byId = new Map(entries.map((e) => [e.id, e.patch]));
      commit((doc) => {
        let changed = false;
        for (const plate of doc.plates) {
          for (const obj of plate.objects) {
            const patch = byId.get(obj.id);
            if (patch) changed = assignChanged(obj, patch) || changed;
          }
        }
        return changed;
      });
    },

    removeObjects: (ids) => {
      if (ids.length === 0) return;
      const targets = new Set(ids);
      commit((doc) => {
        let changed = false;
        for (const plate of doc.plates) {
          const objects = plate.objects.filter((object) => !targets.has(object.id));
          changed = objects.length !== plate.objects.length || changed;
          plate.objects = objects;
        }
        return changed;
      });
      set((state) => ({ selectedIds: state.selectedIds.filter((id) => !targets.has(id)) }));
    },

    duplicateObjects: (ids) => {
      if (ids.length === 0) return;
      const targets = new Set(ids);
      const newIds: string[] = [];
      commit((doc) => {
        for (const plate of doc.plates) {
          const copies: CodexObject[] = [];
          for (const obj of plate.objects) {
            if (!targets.has(obj.id)) continue;
            const copy: CodexObject = {
              ...cloneObject(obj),
              id: uid(obj.kind),
              x: obj.x + 16,
              y: obj.y + 16,
            };
            copies.push(copy);
          }
          // Re-key before pushing, so the duplicate is its own group.
          const regrouped = regroupCopies(copies);
          newIds.push(...regrouped.map((c) => c.id));
          plate.objects.push(...regrouped);
        }
        return newIds.length > 0;
      });
      if (newIds.length) set({ selectedIds: newIds });
    },

    groupObjects: (ids) => {
      if (ids.length < 2) return;
      const targets = new Set(ids);
      const groupId = newGroupId();
      commit((doc) => {
        let changed = false;
        for (const plate of doc.plates) {
          for (const obj of plate.objects) {
            if (targets.has(obj.id)) changed = assignChanged(obj, { groupId }) || changed;
          }
        }
        return changed;
      });
    },

    ungroupObjects: (ids) => {
      if (ids.length === 0) return;
      const targets = new Set(ids);
      commit((doc) => {
        let changed = false;
        for (const plate of doc.plates) {
          for (const obj of plate.objects) {
            if (targets.has(obj.id) && obj.groupId !== undefined) {
              delete obj.groupId;
              changed = true;
            }
          }
        }
        return changed;
      });
    },

    reorderObject: (id, direction) =>
      commit((doc) => {
        for (const plate of doc.plates) {
          const index = plate.objects.findIndex((o) => o.id === id);
          if (index === -1) continue;
          const last = plate.objects.length - 1;
          if ((direction === 'front' || direction === 'forward') && index === last) return false;
          if ((direction === 'back' || direction === 'backward') && index === 0) return false;
          const [obj] = plate.objects.splice(index, 1);
          if (direction === 'front') plate.objects.push(obj);
          else if (direction === 'back') plate.objects.unshift(obj);
          else if (direction === 'forward') {
            plate.objects.splice(Math.min(index + 1, plate.objects.length), 0, obj);
          } else {
            plate.objects.splice(Math.max(index - 1, 0), 0, obj);
          }
          return true;
        }
        return false;
      }),

    undo: () =>
      set((state) => {
        const previous = state.past[state.past.length - 1];
        if (!previous) return state;
        return {
          doc: previous,
          past: state.past.slice(0, -1),
          future: [state.doc, ...state.future].slice(0, HISTORY_LIMIT),
          selectedIds: [],
        };
      }),

    redo: () =>
      set((state) => {
        const next = state.future[0];
        if (!next) return state;
        return {
          doc: next,
          past: [...state.past, state.doc].slice(-HISTORY_LIMIT),
          future: state.future.slice(1),
          selectedIds: [],
        };
      }),

    canUndo: () => get().past.length > 0,
    canRedo: () => get().future.length > 0,
  };
});

/** Factory helpers so callers don't hand-build object literals. */
export function makeSigilObject(
  sigilId: string,
  opts: {
    x: number;
    y: number;
    size?: number;
    tint?: string;
    name?: string;
    /** Finish preset to paint the mark with; falls back to a flat tint. */
    finishId?: string;
  },
): CodexObject {
  const size = opts.size ?? 96;
  const finish = opts.finishId ? getSigilFinish(opts.finishId) : undefined;
  return {
    id: uid('sigil'),
    kind: 'sigil',
    name: opts.name ?? defaultObjectName('sigil'),
    sigilId,
    tint: opts.tint ?? CODEX_INK,
    x: opts.x,
    y: opts.y,
    width: size,
    height: size,
    rotation: 0,
    opacity: 1,
    locked: false,
    visible: true,
    ...(finish?.patch ?? {}),
  };
}

export function makeTextObject(opts: {
  x: number;
  y: number;
  text?: string;
  width?: number;
}): CodexObject {
  return {
    id: uid('text'),
    kind: 'text',
    name: defaultObjectName('text'),
    text: opts.text ?? 'Text',
    fontFamily: 'Cinzel',
    fontSize: 28,
    fontStyle: 'normal',
    fill: CODEX_INK,
    align: 'left',
    lineHeight: 1.4,
    letterSpacing: 0,
    textTransform: 'none',
    x: opts.x,
    y: opts.y,
    width: opts.width ?? 360,
    height: 44,
    rotation: 0,
    opacity: 1,
    locked: false,
    visible: true,
  };
}
