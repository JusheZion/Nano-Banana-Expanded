/**
 * Snapping engine.
 *
 * This is the densest untested logic in the comic engine: it decides where a dragged panel or
 * balloon actually lands, and a regression here shows up as "panels won't line up any more" rather
 * than as a crash. Page geometry is fixed at 800x1200 with a default 16px gutter.
 */
import { describe, it, expect } from 'vitest';
import {
    getBoundingBox,
    getGutterAwareSnapLines,
    getSnapLines,
    getVertexSnapLines,
    elementsOverlapOrNear,
} from '../snapping';
import type { Panel } from '../../../../stores/comicStore';
import type { BalloonInstance } from '../../../../types/balloon';

const PAGE_W = 800;
const PAGE_H = 1200;
const GUTTER = 16;

function panel(over: Partial<Panel> = {}): Panel {
    return {
        id: 'p1',
        type: 'panel',
        shapeType: 'rect',
        x: 100,
        y: 100,
        width: 200,
        height: 150,
        ...over,
    } as Panel;
}

function balloon(over: Partial<BalloonInstance> = {}): BalloonInstance {
    return {
        id: 'b1',
        type: 'balloon',
        x: 400,
        y: 400,
        width: 120,
        height: 80,
        hasTail: true,
        tailBasePoint: { x: 0, y: 0 },
        tailTip: { x: -20, y: 50 },
        styleId: 'speech_round',
        text: 'hi',
        ...over,
    } as BalloonInstance;
}

describe('getBoundingBox', () => {
    it('uses width/height for rectangular items', () => {
        expect(getBoundingBox(panel())).toEqual({ x: 100, y: 100, width: 200, height: 150 });
    });

    it('derives the box from absolute vertices for polygons', () => {
        const poly = panel({
            shapeType: 'polygon',
            x: 50,
            y: 50,
            points: [
                { x: 0, y: 0 },
                { x: 100, y: 20 },
                { x: 40, y: 90 },
            ],
        });
        // Points are relative to the panel origin, so the box is offset by (50, 50).
        expect(getBoundingBox(poly)).toEqual({ x: 50, y: 50, width: 100, height: 90 });
    });

    it('handles balloons', () => {
        expect(getBoundingBox(balloon())).toEqual({ x: 400, y: 400, width: 120, height: 80 });
    });
});

describe('getGutterAwareSnapLines — page edges', () => {
    it('snaps a near-miss left edge onto x = 0', () => {
        const r = getGutterAwareSnapLines(3, 500, 200, 150, [], undefined, GUTTER);
        expect(r.newX).toBe(0);
        expect(r.snapLines).toContainEqual({ axis: 'x', position: 0 });
    });

    it('snaps the right edge onto the page width', () => {
        const r = getGutterAwareSnapLines(PAGE_W - 200 + 4, 500, 200, 150, [], undefined, GUTTER);
        expect(r.newX + 200).toBe(PAGE_W);
    });

    it('snaps the centre line', () => {
        const r = getGutterAwareSnapLines(PAGE_W / 2 - 100 + 5, 500, 200, 150, [], undefined, GUTTER);
        expect(r.newX + 100).toBe(PAGE_W / 2);
    });

    it('snaps to the gutter inset', () => {
        const r = getGutterAwareSnapLines(GUTTER + 3, 500, 200, 150, [], undefined, GUTTER);
        expect(r.newX).toBe(GUTTER);
    });

    it('snaps vertically to the page bottom', () => {
        const r = getGutterAwareSnapLines(400, PAGE_H - 150 - 4, 200, 150, [], undefined, GUTTER);
        expect(r.newY + 150).toBe(PAGE_H);
    });

    it('leaves a position alone when nothing is within the threshold', () => {
        const r = getGutterAwareSnapLines(333, 555, 200, 150, [], undefined, GUTTER);
        expect(r.newX).toBe(333);
        expect(r.newY).toBe(555);
        expect(r.snapLines).toHaveLength(0);
    });

    it('respects a custom gutter', () => {
        const wide = getGutterAwareSnapLines(40, 500, 200, 150, [], undefined, 40);
        expect(wide.newX).toBe(40);
        // With the default gutter there is no target near x = 40, so nothing moves.
        expect(getGutterAwareSnapLines(40, 500, 200, 150, [], undefined, GUTTER).newX).toBe(40);
    });
});

describe('getGutterAwareSnapLines — siblings', () => {
    // Positioned so that none of the dragged item's edges or centre land near a page target
    // (x: 0/400/800/16/784, y: 0/600/1200/16/1184). Otherwise a page snap can mask a sibling snap
    // and the assertion passes for the wrong reason.
    const sibling = panel({ id: 'other', x: 250, y: 520, width: 200, height: 100 });

    it('aligns a dragged item to a sibling edge', () => {
        const r = getGutterAwareSnapLines(254, 700, 200, 150, [sibling], undefined, GUTTER);
        expect(r.newX).toBe(250);
    });

    it('skips the element being dragged', () => {
        const r = getGutterAwareSnapLines(254, 700, 200, 150, [sibling], 'other', GUTTER);
        expect(r.newX).toBe(254);
    });

    it('offers a gutter-spaced position beside a sibling', () => {
        // Right edge of the sibling is 450; a gutter beyond that is 466.
        const r = getGutterAwareSnapLines(464, 700, 200, 150, [sibling], undefined, GUTTER);
        expect(r.newX).toBe(450 + GUTTER);
    });

    it('reports a snap line for every axis it snapped on', () => {
        const r = getGutterAwareSnapLines(252, 522, 200, 150, [sibling], undefined, GUTTER);
        expect(r.snapLines.some((l) => l.axis === 'x')).toBe(true);
        expect(r.snapLines.some((l) => l.axis === 'y')).toBe(true);
    });

    it('snaps to polygon vertices, not just the bounding box', () => {
        const poly = panel({
            id: 'poly',
            shapeType: 'polygon',
            x: 600,
            y: 600,
            points: [
                { x: 0, y: 0 },
                { x: 50, y: 0 },
                { x: 25, y: 60 },
            ],
        });
        // Vertex at absolute x = 625 is not an edge of the bounding box (600..650).
        const r = getGutterAwareSnapLines(627, 900, 100, 100, [poly], undefined, GUTTER);
        expect(r.newX).toBe(625);
    });

    it('snaps both axes independently', () => {
        const r = getGutterAwareSnapLines(3, PAGE_H / 2 - 75 + 4, 200, 150, [], undefined, GUTTER);
        expect(r.newX).toBe(0);
        expect(r.newY + 75).toBe(PAGE_H / 2);
    });
});

describe('getSnapLines', () => {
    it('returns the proposed position when there is nothing to snap to', () => {
        const r = getSnapLines(333, 555, 200, 150, [], undefined);
        expect(r.newX).toBe(333);
        expect(r.newY).toBe(555);
    });

    it('aligns to a sibling edge within the threshold', () => {
        const sibling = panel({ id: 'other', x: 250, y: 520 });
        const r = getSnapLines(253, 900, 200, 150, [sibling], undefined);
        expect(r.newX).toBe(250);
    });
});

describe('getVertexSnapLines', () => {
    it('snaps a dragged vertex to a page boundary', () => {
        const r = getVertexSnapLines(6, 640, [], undefined, GUTTER);
        expect(r.newX).toBe(0);
    });

    it('picks the nearest target when several are in range', () => {
        // x = 10 sits between the page edge (0) and the gutter line (16); 16 is closer.
        const r = getVertexSnapLines(14, 640, [], undefined, GUTTER);
        expect(r.newX).toBe(GUTTER);
    });

    it('leaves a vertex alone when nothing is near', () => {
        const r = getVertexSnapLines(333, 555, [], undefined, GUTTER);
        expect(r.newX).toBe(333);
        expect(r.newY).toBe(555);
    });

    it('snaps onto a sibling polygon vertex', () => {
        const poly = panel({
            id: 'poly',
            shapeType: 'polygon',
            x: 200,
            y: 200,
            points: [
                { x: 0, y: 0 },
                { x: 120, y: 10 },
                { x: 60, y: 140 },
            ],
        });
        const r = getVertexSnapLines(322, 213, [poly], undefined, GUTTER);
        expect(r.newX).toBe(320);
        expect(r.newY).toBe(210);
    });

    it('emits guides for the snaps it made', () => {
        const r = getVertexSnapLines(4, 4, [], undefined, GUTTER);
        expect(r.snapLines.length + r.diagonalGuides.length).toBeGreaterThan(0);
    });

    it('skips the element being dragged', () => {
        const sibling = panel({ id: 'self', x: 300, y: 300, width: 100, height: 100 });
        expect(getVertexSnapLines(302, 640, [sibling], 'self', GUTTER).newX).toBe(302);
        expect(getVertexSnapLines(302, 640, [sibling], undefined, GUTTER).newX).toBe(300);
    });
});

describe('elementsOverlapOrNear', () => {
    const page = {
        panels: [
            panel({ id: 'a', x: 0, y: 0, width: 100, height: 100 }),
            panel({ id: 'b', x: 105, y: 0, width: 100, height: 100 }), // 5px away
            panel({ id: 'far', x: 600, y: 600, width: 100, height: 100 }),
        ],
        balloons: [balloon({ id: 'bal', x: 50, y: 50, width: 40, height: 40 })],
    };

    it('needs at least two ids', () => {
        expect(elementsOverlapOrNear(page, ['a'])).toBe(false);
        expect(elementsOverlapOrNear(page, [])).toBe(false);
    });

    it('detects neighbours within the proximity margin', () => {
        expect(elementsOverlapOrNear(page, ['a', 'b'])).toBe(true);
    });

    it('rejects elements that are far apart', () => {
        expect(elementsOverlapOrNear(page, ['a', 'far'])).toBe(false);
    });

    it('detects genuine overlap', () => {
        expect(elementsOverlapOrNear(page, ['a', 'bal'])).toBe(true);
    });

    it('ignores ids that are not on the page', () => {
        expect(elementsOverlapOrNear(page, ['a', 'ghost'])).toBe(false);
    });

    it('mixes panels and balloons', () => {
        expect(elementsOverlapOrNear(page, ['bal', 'b'])).toBe(true);
        expect(elementsOverlapOrNear(page, ['bal', 'far'])).toBe(false);
    });
});
