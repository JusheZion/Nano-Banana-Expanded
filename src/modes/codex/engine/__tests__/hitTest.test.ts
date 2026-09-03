import { describe, expect, it } from 'vitest';
import {
  findCodexObject,
  hitObjectId,
  isTransformerPart,
  shouldClearSelection,
  type HitNode,
} from '../hitTest';

/** Minimal stand-in for a Konva node, with an optional ancestor chain. */
function node(name: string, id = '', ancestor: HitNode | null = null): HitNode {
  const self: HitNode = {
    name: () => name,
    id: () => id,
    findAncestor: (selector, includeSelf) => {
      if (includeSelf && name === selector.replace(/^\./, '')) return self;
      return ancestor;
    },
  };
  return self;
}

/** A Transformer anchor: a node whose ancestor chain reaches the Transformer. */
function anchorNode(): HitNode {
  const transformer = node('Transformer');
  return {
    name: () => '',
    id: () => '',
    findAncestor: (selector) => (selector === 'Transformer' ? transformer : null),
  };
}

describe('findCodexObject', () => {
  it('finds an object clicked directly', () => {
    expect(findCodexObject(node('codex-object', 'o1'))).not.toBeNull();
  });

  it('finds the object when a child was clicked', () => {
    const parent = node('codex-object', 'o1');
    expect(findCodexObject(node('', '', parent))).toBe(parent);
  });

  it('returns null for the plate background', () => {
    // The bug this exists to prevent: the background rect is a real node, so
    // "not the stage" wrongly reads as "an object was hit".
    expect(findCodexObject(node('', ''))).toBeNull();
  });

  it('returns null for the plate texture image', () => {
    expect(findCodexObject(node('plate-texture'))).toBeNull();
  });

  it('handles a missing target', () => {
    expect(findCodexObject(null)).toBeNull();
    expect(findCodexObject(undefined)).toBeNull();
  });
});

describe('hitObjectId', () => {
  it('returns the id of the object hit', () => {
    expect(hitObjectId(node('codex-object', 'sigil_42'))).toBe('sigil_42');
  });

  it('returns an empty string for bare plate, not undefined', () => {
    expect(hitObjectId(node(''))).toBe('');
    expect(hitObjectId(null)).toBe('');
  });
});

describe('isTransformerPart', () => {
  it('recognises the selection’s own transform handles', () => {
    expect(isTransformerPart(anchorNode())).toBe(true);
  });

  it('is false for objects and for bare plate', () => {
    expect(isTransformerPart(node('codex-object', 'o1'))).toBe(false);
    expect(isTransformerPart(node(''))).toBe(false);
    expect(isTransformerPart(null)).toBe(false);
  });
});

describe('shouldClearSelection', () => {
  it('clears on bare plate', () => {
    expect(shouldClearSelection(node(''))).toBe(true);
  });

  it('keeps the selection when an object is clicked', () => {
    expect(shouldClearSelection(node('codex-object', 'o1'))).toBe(false);
  });

  it('keeps the selection when a transform handle is grabbed', () => {
    // Clearing here detaches the Transformer mid-gesture, so resizing and
    // rotating by mouse silently stop working.
    expect(shouldClearSelection(anchorNode())).toBe(false);
  });

  it('keeps the selection when a child of an object is clicked', () => {
    const parent = node('codex-object', 'o1');
    expect(shouldClearSelection(node('', '', parent))).toBe(false);
  });
});
