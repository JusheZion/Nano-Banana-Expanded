import { describe, expect, it } from 'vitest';
import { MIN_EXTENT, resizedExtent, transformPatch } from '../transformLimits';
import { ALL_FRAGMENTS } from '../../data/FragmentRegistry';
import type { CodexObject } from '../../types/codexObjects';

describe('MIN_EXTENT', () => {
  // The bug this replaced: frames floored at 16px, and a rule is a frame one
  // pixel tall, so resizing any divider turned its hairline into a solid bar.
  it('lets a frame stay a hairline', () => {
    expect(MIN_EXTENT.frame).toBeLessThanOrEqual(1);
  });

  it('is never zero or negative, so nothing can collapse to nothing', () => {
    for (const [kind, min] of Object.entries(MIN_EXTENT)) {
      expect(min, kind).toBeGreaterThan(0);
    }
  });

  it('covers every extent a fragment actually ships', () => {
    // A floor above a shipped size would silently rewrite that fragment the
    // first time anyone resized it — which is exactly what the old 16px frame
    // floor did to every hairline rule.
    for (const fragment of ALL_FRAGMENTS) {
      for (const object of fragment.build(0, 0)) {
        expect(object.width, `${fragment.id} ${object.kind} width`)
          .toBeGreaterThanOrEqual(MIN_EXTENT[object.kind]);
        // Text height is derived from the font, not clamped on resize, so a
        // one-line label is legitimately shorter than the width floor.
        if (object.kind === 'text') continue;
        expect(object.height, `${fragment.id} ${object.kind} height`)
          .toBeGreaterThanOrEqual(MIN_EXTENT[object.kind]);
      }
    }
  });
});

describe('resizedExtent', () => {
  it('scales proportionally above the floor', () => {
    expect(resizedExtent(460, 1.5, 'frame')).toBe(690);
  });

  it('keeps a hairline a hairline through a resize', () => {
    expect(resizedExtent(1, 1.5, 'frame')).toBe(1.5);
    expect(resizedExtent(1, 0.5, 'frame')).toBe(1);
  });

  it('holds each kind at its own floor', () => {
    expect(resizedExtent(30, 0.01, 'sigil')).toBe(MIN_EXTENT.sigil);
    expect(resizedExtent(360, 0.01, 'text')).toBe(MIN_EXTENT.text);
    expect(resizedExtent(420, 0.01, 'chart')).toBe(MIN_EXTENT.chart);
  });

  it('never returns zero for a zero scale', () => {
    expect(resizedExtent(100, 0, 'frame')).toBe(MIN_EXTENT.frame);
  });
});

function frame(width = 460, height = 1): CodexObject {
  return {
    id: 'f', kind: 'frame', variant: 'plain', stroke: '#fff', strokeWidth: 0,
    cornerRadius: 0, x: 10, y: 20, width, height,
    rotation: 0, opacity: 1, locked: false, visible: true,
  } as CodexObject;
}

function text(): CodexObject {
  return {
    id: 't', kind: 'text', text: 'x', fontFamily: 'Cinzel', fontSize: 14,
    fontStyle: 'normal', fill: '#fff', align: 'left', lineHeight: 1.4,
    letterSpacing: 0, x: 0, y: 0, width: 360, height: 20,
    rotation: 0, opacity: 1, locked: false, visible: true,
  } as CodexObject;
}

const reading = (over = {}) => ({ x: 5, y: 6, rotation: 0, scaleX: 1, scaleY: 1, ...over });

describe('transformPatch', () => {
  it('folds the scale into the stored size and keeps the position', () => {
    const patch = transformPatch(frame(), reading({ scaleX: 2, scaleY: 3 })) as Record<string, number>;
    expect(patch).toMatchObject({ x: 5, y: 6, rotation: 0, width: 920, height: 3 });
  });

  it('keeps a resized hairline a hairline', () => {
    const patch = transformPatch(frame(), reading({ scaleY: 1.5 })) as Record<string, number>;
    expect(patch.height).toBe(1.5);
  });

  it('carries rotation through', () => {
    const patch = transformPatch(frame(), reading({ rotation: 42 })) as Record<string, number>;
    expect(patch.rotation).toBe(42);
  });

  it('leaves text height alone — it follows the font, not the handle', () => {
    const patch = transformPatch(text(), reading({ scaleX: 2, scaleY: 2 })) as Record<string, number>;
    expect(patch.width).toBe(720);
    expect('height' in patch).toBe(false);
  });

  it('never writes a size below the kind floor', () => {
    const patch = transformPatch(frame(460, 1), reading({ scaleX: 0, scaleY: 0 })) as Record<string, number>;
    expect(patch.width).toBe(MIN_EXTENT.frame);
    expect(patch.height).toBe(MIN_EXTENT.frame);
  });
});
