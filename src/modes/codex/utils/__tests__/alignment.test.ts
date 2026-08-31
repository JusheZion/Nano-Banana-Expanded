import { describe, expect, it } from 'vitest';
import {
  alignPatches,
  distributePatches,
  selectionBounds,
  sharedValue,
} from '../alignment';
import type { CodexObject } from '../../types/codexObjects';

const base = { rotation: 0, opacity: 1, locked: false, visible: true } as const;

function box(id: string, x: number, y: number, width = 100, height = 50, extra: Partial<CodexObject> = {}): CodexObject {
  return {
    ...base,
    id,
    kind: 'frame',
    variant: 'plain',
    stroke: '#fff',
    strokeWidth: 1,
    cornerRadius: 0,
    x, y, width, height,
    ...extra,
  } as CodexObject;
}

describe('selectionBounds', () => {
  it('spans every object', () => {
    const b = selectionBounds([box('a', 0, 0), box('b', 200, 100)])!;
    expect(b).toMatchObject({ left: 0, top: 0, right: 300, bottom: 150, width: 300, height: 150 });
  });

  it('returns null for an empty selection', () => {
    expect(selectionBounds([])).toBeNull();
  });
});

describe('alignPatches', () => {
  const objects = [box('a', 0, 0, 100, 50), box('b', 50, 200, 40, 20)];

  it('aligns left edges', () => {
    expect(alignPatches(objects, 'left')).toEqual([{ id: 'b', patch: { x: 0 } }]);
  });

  it('aligns right edges', () => {
    // bounds.right = 100; b is 40 wide, so it lands at 60.
    expect(alignPatches(objects, 'right')).toEqual([{ id: 'b', patch: { x: 60 } }]);
  });

  it('centres horizontally on the selection box', () => {
    const patches = alignPatches(objects, 'centerX');
    expect(patches).toEqual([{ id: 'b', patch: { x: 30 } }]);
  });

  it('aligns tops and bottoms', () => {
    expect(alignPatches(objects, 'top')).toEqual([{ id: 'b', patch: { y: 0 } }]);
    expect(alignPatches(objects, 'bottom')).toEqual([{ id: 'a', patch: { y: 170 } }]);
  });

  it('emits nothing for a single object — it is already aligned to itself', () => {
    expect(alignPatches([box('a', 5, 5)], 'left')).toEqual([]);
  });

  it('emits nothing for objects already in place, so undo is not polluted', () => {
    const aligned = [box('a', 10, 0), box('b', 10, 80)];
    expect(alignPatches(aligned, 'left')).toEqual([]);
  });

  it('treats a locked object as an anchor and never moves it', () => {
    const withLock = [box('a', 0, 0, 100, 50, { locked: true }), box('b', 50, 0, 40, 20)];
    const patches = alignPatches(withLock, 'left');
    expect(patches.map((p) => p.id)).toEqual(['b']);
  });

  it('only ever patches one axis', () => {
    for (const patch of alignPatches(objects, 'centerX')) {
      expect(Object.keys(patch.patch)).toEqual(['x']);
    }
    for (const patch of alignPatches(objects, 'middleY')) {
      expect(Object.keys(patch.patch)).toEqual(['y']);
    }
  });
});

describe('distributePatches', () => {
  it('equalises centre spacing and holds the outermost in place', () => {
    const objects = [box('a', 0, 0, 20, 20), box('b', 30, 0, 20, 20), box('c', 200, 0, 20, 20)];
    const patches = distributePatches(objects, 'horizontal');
    // Centres run 10 → 210, so the middle centre is 110 and x = 100.
    expect(patches).toEqual([{ id: 'b', patch: { x: 100 } }]);
  });

  it('works vertically', () => {
    const objects = [box('a', 0, 0, 20, 20), box('b', 0, 10, 20, 20), box('c', 0, 200, 20, 20)];
    expect(distributePatches(objects, 'vertical')).toEqual([{ id: 'b', patch: { y: 100 } }]);
  });

  it('needs three objects — two have nothing between them', () => {
    expect(distributePatches([box('a', 0, 0), box('b', 100, 0)], 'horizontal')).toEqual([]);
  });

  it('sorts by position, so selection order does not matter', () => {
    const scrambled = [box('c', 200, 0, 20, 20), box('a', 0, 0, 20, 20), box('b', 30, 0, 20, 20)];
    expect(distributePatches(scrambled, 'horizontal')).toEqual([{ id: 'b', patch: { x: 100 } }]);
  });

  it('never moves a locked middle object', () => {
    const objects = [
      box('a', 0, 0, 20, 20),
      box('b', 30, 0, 20, 20, { locked: true }),
      box('c', 200, 0, 20, 20),
    ];
    expect(distributePatches(objects, 'horizontal')).toEqual([]);
  });
});

describe('sharedValue', () => {
  it('returns the value when every object agrees', () => {
    expect(sharedValue([box('a', 0, 0), box('b', 0, 0)], 'x')).toBe(0);
  });

  it('returns undefined when they differ, so the panel can say "Mixed"', () => {
    expect(sharedValue([box('a', 0, 0), box('b', 5, 0)], 'x')).toBeUndefined();
  });

  it('returns undefined for an empty selection', () => {
    expect(sharedValue([], 'x')).toBeUndefined();
  });
});
