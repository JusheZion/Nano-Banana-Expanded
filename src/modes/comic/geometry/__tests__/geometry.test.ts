import { describe, expect, it } from 'vitest';
import { detectPanelOverlap } from '../collision';
import { generateLayoutFromAiIntent, generateLayoutFromTemplate } from '../layoutTemplates';
import { denormalizeRect, normalizeRect } from '../normalization';
import { movePanelRect, resizePanelRect } from '../panels';
import { clampRectToPage } from '../rects';
import { snapRectToGutters, snapRectToMargins } from '../snapping';

const PAGE_SIZE = { width: 800, height: 1200 };

describe('comic geometry rect normalization', () => {
  it('normalizes and denormalizes rects against a page size', () => {
    const normalized = normalizeRect({ x: 80, y: 120, width: 400, height: 300 }, PAGE_SIZE);

    expect(normalized).toEqual({ x: 0.1, y: 0.1, width: 0.5, height: 0.25 });
    expect(denormalizeRect(normalized, PAGE_SIZE)).toEqual({ x: 80, y: 120, width: 400, height: 300 });
  });

  it('clamps normalized rects inside page bounds', () => {
    expect(clampRectToPage({ x: -0.1, y: 0.92, width: 0.4, height: 0.2 })).toEqual({
      x: 0,
      y: 0.8,
      width: 0.4,
      height: 0.2,
    });
  });
});

describe('comic geometry panel transforms', () => {
  it('moves panel rects by a normalized delta and keeps them on the page', () => {
    expect(movePanelRect({ x: 0.7, y: 0.2, width: 0.25, height: 0.25 }, { x: 0.2, y: -0.1 })).toEqual({
      x: 0.75,
      y: 0.1,
      width: 0.25,
      height: 0.25,
    });
  });

  it('resizes panel rects from handles while respecting minimum size', () => {
    expect(
      resizePanelRect(
        { x: 0.2, y: 0.2, width: 0.4, height: 0.3 },
        'top-left',
        { x: 0.15, y: 0.1 },
        { minWidth: 0.2, minHeight: 0.2 },
      ),
    ).toEqual({ x: 0.35, y: 0.3, width: 0.25, height: 0.2 });
  });
});

describe('comic geometry snapping and collision', () => {
  it('snaps rects to normalized page margins', () => {
    expect(snapRectToMargins({ x: 0.035, y: 0.93, width: 0.3, height: 0.05 }, { margin: 0.04, threshold: 0.025 })).toEqual({
      rect: { x: 0.04, y: 0.91, width: 0.3, height: 0.05 },
      snapped: true,
      guides: [
        { axis: 'x', position: 0.04, source: 'margin' },
        { axis: 'y', position: 0.96, source: 'margin' },
      ],
    });
  });

  it('snaps rects to sibling gutter spacing without changing unrelated axes', () => {
    const rect = { x: 0.414, y: 0.5, width: 0.2, height: 0.2 };
    const sibling = { x: 0.1, y: 0.5, width: 0.3, height: 0.2 };

    expect(snapRectToGutters(rect, [sibling], { gutter: 0.02, threshold: 0.01 })).toEqual({
      rect: { x: 0.42, y: 0.5, width: 0.2, height: 0.2 },
      snapped: true,
      guides: [{ axis: 'x', position: 0.42, source: 'gutter' }],
    });
  });

  it('detects panel overlap against any sibling rect', () => {
    expect(
      detectPanelOverlap({ x: 0.1, y: 0.1, width: 0.25, height: 0.25 }, [
        { x: 0.5, y: 0.5, width: 0.1, height: 0.1 },
        { x: 0.3, y: 0.3, width: 0.2, height: 0.2 },
      ]),
    ).toBe(true);
  });
});

describe('comic geometry layout generation', () => {
  it('generates starter normalized layouts from template ids', () => {
    expect(generateLayoutFromTemplate('three-panel-wide-bottom', 3).map((panel) => panel.rect)).toEqual([
      { x: 0.04, y: 0.04, width: 0.452, height: 0.299 },
      { x: 0.508, y: 0.04, width: 0.452, height: 0.299 },
      { x: 0.04, y: 0.356, width: 0.92, height: 0.604 },
    ]);
  });

  it('generates starter layouts from AI intent hints', () => {
    expect(generateLayoutFromAiIntent('wide', 3).map((panel) => panel.intent)).toEqual(['wide', 'normal', 'normal']);
    expect(generateLayoutFromAiIntent('feature', 1)[0]?.rect).toEqual({ x: 0.04, y: 0.04, width: 0.92, height: 0.92 });
  });
});
