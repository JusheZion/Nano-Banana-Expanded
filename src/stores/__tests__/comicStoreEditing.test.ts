/**
 * comicStore editing behaviour: history, selection, grouping, layers, clipboard, pages.
 *
 * The store holds 138 actions and had almost no coverage — only serialization and guided-layout
 * import. Every "ghost element" and "undo ate my work" class of bug lives in here, and it is the
 * most testable part of the portal because it is a plain Zustand store with no canvas involved.
 *
 * Tests marked REGRESSION correspond to a specific bug fixed alongside them.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
    useComicStore,
    comicUndo,
    comicRedo,
    comicHistoryDepth,
    undoClear,
    undoPause,
    undoResume,
    type ComicPage,
    type Panel,
} from '@/stores/comicStore';
import type { BalloonInstance } from '@/types/balloon';

const initialState = useComicStore.getState();

function blankPage(id: string): ComicPage {
    return {
        id,
        panels: [],
        balloons: [],
        drawings: [],
        overlays: [],
        background: '#ffffff',
        layerOrder: [],
    };
}

function reset(pages: ComicPage[] = [blankPage('page-1')]) {
    useComicStore.setState({
        ...initialState,
        pages,
        currentPageId: pages[0]?.id ?? null,
        selectedElementIds: [],
        groupsByPage: {},
        clipboard: [],
        gutterSize: 16,
    });
    undoClear();
    undoResume();
}

const store = () => useComicStore.getState();
const page = (id = 'page-1') => store().pages.find((p) => p.id === id)!;

/** Adds a panel and returns its generated id. */
function addPanel(pageId = 'page-1', over: Partial<Panel> = {}) {
    const before = new Set(page(pageId).panels.map((p) => p.id));
    store().addPanel(pageId, { shapeType: 'rect', x: 50, y: 50, width: 100, height: 100, ...over } as Omit<Panel, 'id' | 'type'>);
    return page(pageId).panels.find((p) => !before.has(p.id))!.id;
}

function addBalloon(pageId = 'page-1') {
    const before = new Set(page(pageId).balloons.map((b) => b.id));
    store().addBalloon(pageId, {
        x: 10,
        y: 10,
        width: 100,
        height: 60,
        hasTail: true,
        tailBasePoint: { x: 0, y: 0 },
        tailTip: { x: -20, y: 40 },
        styleId: 'speech_round',
        text: 'hi',
    } as Omit<BalloonInstance, 'id' | 'type'>);
    return page(pageId).balloons.find((b) => !before.has(b.id))!.id;
}

function addOverlay(pageId = 'page-1') {
    const before = new Set((page(pageId).overlays ?? []).map((o) => o.id));
    store().addOverlay(pageId, {
        type: 'sfx',
        src: '',
        text: 'BOOM',
        x: 30,
        y: 30,
        rotation: 0,
        scaleX: 1,
        scaleY: 1,
        zIndex: 0,
    });
    return (page(pageId).overlays ?? []).find((o) => !before.has(o.id))!.id;
}

function addDrawing(pageId = 'page-1') {
    const before = new Set((page(pageId).drawings ?? []).map((d) => d.id));
    store().addDrawing(pageId, { points: [0, 0, 10, 10], stroke: '#000', strokeWidth: 2 });
    return (page(pageId).drawings ?? []).find((d) => !before.has(d.id))!.id;
}

beforeEach(() => {
    reset();
    vi.restoreAllMocks();
});

describe('undo / redo', () => {
    it('records an edit and reverses it', () => {
        const id = addPanel();
        expect(page().panels).toHaveLength(1);
        comicUndo();
        expect(page().panels).toHaveLength(0);
        comicRedo();
        expect(page().panels.map((p) => p.id)).toEqual([id]);
    });

    it('steps back through several edits in order', () => {
        addPanel();
        addPanel();
        addPanel();
        expect(page().panels).toHaveLength(3);
        comicUndo();
        comicUndo();
        expect(page().panels).toHaveLength(1);
    });

    it('does nothing when there is no history', () => {
        expect(() => comicUndo()).not.toThrow();
        expect(() => comicRedo()).not.toThrow();
        expect(page().panels).toHaveLength(0);
    });

    it('drops the redo stack once a new edit lands', () => {
        addPanel();
        comicUndo();
        expect(comicHistoryDepth().future).toBe(1);
        addPanel();
        expect(comicHistoryDepth().future).toBe(0);
    });

    it('ignores selection changes, which are not edits', () => {
        const id = addPanel();
        const depth = comicHistoryDepth().past;
        store().setSelectedElements([id]);
        store().clearSelection();
        expect(comicHistoryDepth().past).toBe(depth);
    });

    it('records nothing while paused', () => {
        undoPause();
        addPanel();
        addPanel();
        undoResume();
        expect(comicHistoryDepth().past).toBe(0);
    });

    /**
     * REGRESSION. A drag pauses history for its whole duration and resumes on drag end. comicUndo
     * used to force the pause flag back to `false` in its `finally`, so pressing Ctrl+Z mid-drag
     * resumed capture behind the drag's back — and every subsequent mousemove then recorded a full
     * entry, flooding the 80-entry history and evicting every real edit.
     */
    it('leaves an in-progress pause intact when undo runs mid-drag', () => {
        addPanel(); // something to undo
        undoPause(); // a drag begins
        comicUndo(); // user hits Ctrl+Z without releasing the mouse
        addPanel(); // a "mousemove" during the still-active drag
        expect(comicHistoryDepth().past).toBe(0);
        undoResume();
    });

    it('restores the paused flag for redo too', () => {
        addPanel();
        comicUndo();
        undoPause();
        comicRedo();
        // Redo itself legitimately pushes the pre-redo state onto the undo stack; what must NOT
        // happen is the edit *after* it recording while the drag's pause is still in force.
        const afterRedo = comicHistoryDepth().past;
        addPanel();
        expect(comicHistoryDepth().past).toBe(afterRedo);
        undoResume();
    });

    it('clears both stacks on undoClear', () => {
        addPanel();
        comicUndo();
        undoClear();
        expect(comicHistoryDepth()).toEqual({ past: 0, future: 0 });
    });
});

describe('selection', () => {
    it('sets, toggles and clears', () => {
        const a = addPanel();
        const b = addPanel();
        store().setSelectedElements([a]);
        expect(store().selectedElementIds).toEqual([a]);
        store().toggleSelection(b);
        expect(store().selectedElementIds).toEqual([a, b]);
        store().toggleSelection(a);
        expect(store().selectedElementIds).toEqual([b]);
        store().clearSelection();
        expect(store().selectedElementIds).toEqual([]);
    });
});

describe('deletion', () => {
    it('deleteSelected removes every element kind', () => {
        const panel = addPanel();
        const balloon = addBalloon();
        const drawing = addDrawing();
        const overlay = addOverlay();
        store().setSelectedElements([panel, balloon, drawing, overlay]);
        store().deleteSelected();
        expect(page().panels).toHaveLength(0);
        expect(page().balloons).toHaveLength(0);
        expect(page().drawings).toHaveLength(0);
        expect(page().overlays).toHaveLength(0);
        expect(store().selectedElementIds).toEqual([]);
    });

    /** REGRESSION: removeElement pruned groups but deleteSelected did not. */
    it('deleteSelected prunes groups that referenced the deleted elements', () => {
        const a = addPanel();
        const b = addPanel();
        store().createGroup('page-1', [a, b]);
        expect(store().getGroupMembers('page-1', a)).toEqual([a, b]);

        store().setSelectedElements([a, b]);
        store().deleteSelected();
        expect(store().groupsByPage['page-1'] ?? []).toEqual([]);
    });

    it('deleteSelected shrinks a group to nothing when only one member survives', () => {
        const a = addPanel();
        const b = addPanel();
        store().createGroup('page-1', [a, b]);
        store().setSelectedElements([a]);
        store().deleteSelected();
        // One member left is not a group.
        expect(store().getGroupMembers('page-1', b)).toBeNull();
    });

    /**
     * REGRESSION. The toolbar Delete button routes every selected id through removeElement, which
     * did not filter overlays — so deleting a floating asset or SFX from the toolbar silently did
     * nothing, while the Delete key (deleteSelected) removed it fine.
     */
    it('removeElement deletes overlays, matching the Delete key', () => {
        const overlay = addOverlay();
        store().setSelectedElements([overlay]);
        store().removeElement('page-1', overlay);
        expect(page().overlays).toHaveLength(0);
        expect(store().selectedElementIds).toEqual([]);
    });

    it('removeElement deletes panels, balloons and drawings', () => {
        const panel = addPanel();
        const balloon = addBalloon();
        const drawing = addDrawing();
        store().removeElement('page-1', panel);
        store().removeElement('page-1', balloon);
        store().removeElement('page-1', drawing);
        expect(page().panels).toHaveLength(0);
        expect(page().balloons).toHaveLength(0);
        expect(page().drawings).toHaveLength(0);
        expect(page().layerOrder).toHaveLength(0);
    });

    it('removeElement is a no-op for an unknown page', () => {
        addPanel();
        const before = store().pages;
        store().removeElement('nope', 'whatever');
        expect(store().pages).toBe(before);
    });
});

describe('grouping', () => {
    it('needs at least two elements', () => {
        const a = addPanel();
        store().createGroup('page-1', [a]);
        expect(store().getGroupMembers('page-1', a)).toBeNull();
    });

    it('creates and reads back a group', () => {
        const a = addPanel();
        const b = addPanel();
        store().createGroup('page-1', [a, b]);
        expect(store().getGroupMembers('page-1', b)).toEqual([a, b]);
    });

    it('moves an element out of its old group when regrouped', () => {
        const a = addPanel();
        const b = addPanel();
        const c = addPanel();
        store().createGroup('page-1', [a, b]);
        store().createGroup('page-1', [b, c]);
        expect(store().getGroupMembers('page-1', b)).toEqual([b, c]);
        // `a` alone is no longer a group.
        expect(store().getGroupMembers('page-1', a)).toBeNull();
    });

    it('ungroups', () => {
        const a = addPanel();
        const b = addPanel();
        store().createGroup('page-1', [a, b]);
        store().ungroup('page-1', a);
        expect(store().getGroupMembers('page-1', a)).toBeNull();
    });

    it('returns null for an element in no group', () => {
        const a = addPanel();
        expect(store().getGroupMembers('page-1', a)).toBeNull();
        expect(store().getGroupMembers('missing-page', a)).toBeNull();
    });
});

describe('layer order', () => {
    it('brings an element to the front and sends it to the back', () => {
        const a = addPanel();
        const b = addPanel();
        const c = addPanel();
        expect(page().layerOrder).toEqual([a, b, c]);
        store().bringToFront('page-1', a);
        expect(page().layerOrder).toEqual([b, c, a]);
        store().sendToBack('page-1', c);
        expect(page().layerOrder).toEqual([c, b, a]);
    });

    it('does nothing when the element is already at that end', () => {
        const a = addPanel();
        const b = addPanel();
        store().bringToFront('page-1', b);
        const after = store().pages;
        store().bringToFront('page-1', b);
        expect(store().pages).toBe(after);
        store().sendToBack('page-1', a);
        expect(page().layerOrder).toEqual([a, b]);
    });
});

describe('layer visibility and lock', () => {
    it('toggles panels and balloons', () => {
        const panel = addPanel();
        store().toggleLayerVisibility('page-1', panel);
        expect(page().panels[0].isVisible).toBe(false);
        store().toggleLayerVisibility('page-1', panel);
        expect(page().panels[0].isVisible).toBe(true);

        store().toggleLayerLock('page-1', panel);
        expect(page().panels[0].isLocked).toBe(true);
    });

    /** REGRESSION: overlays were absent from both toggles, so they could never be hidden or locked. */
    it('toggles overlays', () => {
        const overlay = addOverlay();
        store().toggleLayerVisibility('page-1', overlay);
        expect(page().overlays![0].isVisible).toBe(false);
        store().toggleLayerLock('page-1', overlay);
        expect(page().overlays![0].isLocked).toBe(true);
    });

    /**
     * REGRESSION: these two read `p.drawings.map(...)` with no guard while sibling actions used
     * `?.`, so a project file predating the drawings field threw a TypeError here.
     */
    it('survives a page with no drawings array', () => {
        const legacy = { ...blankPage('page-1') } as Partial<ComicPage>;
        delete legacy.drawings;
        delete legacy.overlays;
        reset([legacy as ComicPage]);
        const panel = addPanel();
        expect(() => store().toggleLayerVisibility('page-1', panel)).not.toThrow();
        expect(() => store().toggleLayerLock('page-1', panel)).not.toThrow();
    });
});

describe('clipboard', () => {
    it('copies and pastes a panel, offset from the original', () => {
        const id = addPanel();
        const original = page().panels[0];
        store().setSelectedElements([id]);
        store().copySelected();
        store().pasteClipboard();

        expect(page().panels).toHaveLength(2);
        const pasted = page().panels.find((p) => p.id !== id)!;
        expect(pasted.x).toBe(original.x + 20);
        expect(pasted.y).toBe(original.y + 20);
        expect(store().selectedElementIds).toEqual([pasted.id]);
        expect(page().layerOrder).toContain(pasted.id);
    });

    /** REGRESSION: overlays were skipped by copySelected, so Ctrl+C on an SFX copied nothing. */
    it('copies and pastes overlays', () => {
        const id = addOverlay();
        store().setSelectedElements([id]);
        store().copySelected();
        expect(store().clipboard).toHaveLength(1);

        store().pasteClipboard();
        expect(page().overlays).toHaveLength(2);
        const pasted = page().overlays!.find((o) => o.id !== id)!;
        expect(pasted.x).toBe(30 + 20);
        expect(pasted.text).toBe('BOOM');
    });

    /** REGRESSION: pasted drawings kept their original points, landing invisibly on the original. */
    it('offsets pasted drawings instead of stacking them exactly', () => {
        const id = addDrawing();
        store().setSelectedElements([id]);
        store().copySelected();
        store().pasteClipboard();

        const pasted = page().drawings.find((d) => d.id !== id)!;
        expect(pasted.points).toEqual([20, 20, 30, 30]);
    });

    it('pastes a mixed selection', () => {
        const panel = addPanel();
        const balloon = addBalloon();
        store().setSelectedElements([panel, balloon]);
        store().copySelected();
        store().pasteClipboard();
        expect(page().panels).toHaveLength(2);
        expect(page().balloons).toHaveLength(2);
    });

    it('does nothing with an empty clipboard or empty selection', () => {
        const before = store().pages;
        store().copySelected();
        store().pasteClipboard();
        expect(store().pages).toBe(before);
    });

    it('gives pasted copies fresh ids', () => {
        const id = addPanel();
        store().setSelectedElements([id]);
        store().copySelected();
        store().pasteClipboard();
        store().pasteClipboard();
        const ids = page().panels.map((p) => p.id);
        expect(new Set(ids).size).toBe(3);
    });
});

describe('pages', () => {
    it('adds a page and makes it current', () => {
        store().addPage();
        expect(store().pages).toHaveLength(2);
        expect(store().currentPageId).toBe(store().pages[1].id);
    });

    it('refuses to remove the last page', () => {
        const before = store().pages;
        store().removePage('page-1');
        expect(store().pages).toBe(before);
    });

    /** REGRESSION: the removed page's groups stayed in groupsByPage forever. */
    it('removePage drops that page\'s groups and selection', () => {
        const a = addPanel();
        const b = addPanel();
        store().createGroup('page-1', [a, b]);
        store().setSelectedElements([a, b]);
        store().addPage();

        store().removePage('page-1');
        expect(store().pages.map((p) => p.id)).not.toContain('page-1');
        expect(store().groupsByPage['page-1']).toBeUndefined();
        expect(store().selectedElementIds).toEqual([]);
    });

    it('reorders pages', () => {
        store().addPage();
        store().addPage();
        const [p1, p2, p3] = store().pages.map((p) => p.id);
        store().reorderPages(p3, p1);
        expect(store().pages.map((p) => p.id)).toEqual([p3, p1, p2]);
    });

    it('ignores a reorder naming unknown pages', () => {
        const before = store().pages;
        store().reorderPages('nope', 'page-1');
        expect(store().pages).toBe(before);
    });

    it('duplicates a page with fresh element ids', () => {
        const panel = addPanel();
        store().duplicatePage('page-1');
        expect(store().pages).toHaveLength(2);
        const copy = store().pages[1];
        expect(copy.panels).toHaveLength(1);
        expect(copy.panels[0].id).not.toBe(panel);
        expect(copy.layerOrder).toEqual([copy.panels[0].id]);
    });

    it('remaps groups onto the duplicated page', () => {
        const a = addPanel();
        const b = addPanel();
        store().createGroup('page-1', [a, b]);
        store().duplicatePage('page-1');
        const copy = store().pages[1];
        const members = store().getGroupMembers(copy.id, copy.panels[0].id);
        expect(members).toEqual(copy.panels.map((p) => p.id));
    });

    /** REGRESSION: the view jumps to the duplicate while selection still named the source page. */
    it('clears selection when duplicating, since the view moves to the copy', () => {
        const a = addPanel();
        store().setSelectedElements([a]);
        store().duplicatePage('page-1');
        expect(store().selectedElementIds).toEqual([]);
    });
});

describe('templates', () => {
    /** REGRESSION: applyTemplate destroyed every panel id without pruning selection or groups. */
    it('applying a template clears references to the panels it replaced', () => {
        const a = addPanel();
        const b = addPanel();
        store().createGroup('page-1', [a, b]);
        store().setSelectedElements([a, b]);
        store().saveBlankPanelTemplate('page-1', 'two-up');

        const template = store().templates.at(-1)!;
        store().applyTemplate('page-1', template.id);

        const liveIds = page().panels.map((p) => p.id);
        expect(liveIds).not.toContain(a);
        expect(store().selectedElementIds).toEqual([]);
        for (const group of store().groupsByPage['page-1'] ?? []) {
            for (const id of group) expect(liveIds).toContain(id);
        }
    });
});

describe('splitPanel', () => {
    /** REGRESSION: the source panel id survived in the selection after being split away. */
    it('drops the source panel from the selection', () => {
        const id = addPanel();
        store().setSelectedElements([id]);
        store().splitPanel('page-1', id, 'vertical');

        expect(page().panels).toHaveLength(2);
        expect(page().panels.map((p) => p.id)).not.toContain(id);
        expect(store().selectedElementIds).not.toContain(id);
    });

    it('keeps both halves in the layer order where the original sat', () => {
        const first = addPanel();
        const second = addPanel();
        store().splitPanel('page-1', first, 'horizontal');
        const order = page().layerOrder;
        expect(order).toHaveLength(3);
        expect(order[2]).toBe(second);
    });
});
