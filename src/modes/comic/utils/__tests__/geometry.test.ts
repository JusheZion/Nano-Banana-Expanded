/**
 * Polygon splitting (the Knife tool) and panel hit-testing (image drops, canvas clicks).
 *
 * Note: this covers `utils/geometry.ts`. The existing `geometry/__tests__/geometry.test.ts` covers a
 * different module (`modes/comic/geometry/*`, the normalized layout maths) — same word, different
 * file.
 */
import { describe, it, expect } from 'vitest';
import { splitConvexPolygon, pointInPanel, type Point } from '../geometry';

const SQUARE: Point[] = [
    { x: 0, y: 0 },
    { x: 100, y: 0 },
    { x: 100, y: 100 },
    { x: 0, y: 100 },
];

/** Shoelace area, sign-independent. */
function area(points: Point[]): number {
    let sum = 0;
    for (let i = 0; i < points.length; i++) {
        const a = points[i];
        const b = points[(i + 1) % points.length];
        sum += a.x * b.y - b.x * a.y;
    }
    return Math.abs(sum) / 2;
}

describe('splitConvexPolygon', () => {
    it('rejects anything that is not a polygon', () => {
        expect(splitConvexPolygon([], { x: 0, y: 0 }, { x: 1, y: 1 })).toBeNull();
        expect(splitConvexPolygon([{ x: 0, y: 0 }], { x: 0, y: 0 }, { x: 1, y: 1 })).toBeNull();
        expect(
            splitConvexPolygon(
                [
                    { x: 0, y: 0 },
                    { x: 1, y: 1 },
                ],
                { x: 0, y: 0 },
                { x: 1, y: 1 },
            ),
        ).toBeNull();
    });

    it('halves a square with a horizontal cut', () => {
        const result = splitConvexPolygon(SQUARE, { x: -50, y: 50 }, { x: 150, y: 50 });
        expect(result).not.toBeNull();
        const [a, b] = result!;
        expect(area(a)).toBeCloseTo(5000, 6);
        expect(area(b)).toBeCloseTo(5000, 6);
    });

    it('halves a square with a vertical cut', () => {
        const [a, b] = splitConvexPolygon(SQUARE, { x: 50, y: -50 }, { x: 50, y: 150 })!;
        expect(area(a)).toBeCloseTo(5000, 6);
        expect(area(b)).toBeCloseTo(5000, 6);
    });

    it('splits on a diagonal', () => {
        const [a, b] = splitConvexPolygon(SQUARE, { x: -10, y: -8 }, { x: 110, y: 112 })!;
        expect(area(a) + area(b)).toBeCloseTo(area(SQUARE), 6);
        expect(area(a)).toBeGreaterThan(0);
        expect(area(b)).toBeGreaterThan(0);
    });

    /**
     * This used to return null. A vertex lying exactly on the cut was filed into one half only, so
     * a corner-to-corner cut left the far half holding a single point — below the three-point
     * minimum — and the split was rejected. On-line vertices now belong to both halves, since they
     * are genuinely a corner of each. Matters for any programmatic split (a "Split diagonally"
     * command computes exact corner coordinates); freehand strokes never landed here.
     */
    it('splits exactly corner to corner into two triangles', () => {
        const [a, b] = splitConvexPolygon(SQUARE, { x: -10, y: -10 }, { x: 110, y: 110 })!;
        expect(a).toHaveLength(3);
        expect(b).toHaveLength(3);
        expect(area(a)).toBeCloseTo(5000, 6);
        expect(area(b)).toBeCloseTo(5000, 6);
        expect(area(a) + area(b)).toBeCloseTo(area(SQUARE), 6);
    });

    it('splits corner to corner on the other diagonal too', () => {
        const [a, b] = splitConvexPolygon(SQUARE, { x: 110, y: -10 }, { x: -10, y: 110 })!;
        expect(area(a)).toBeCloseTo(5000, 6);
        expect(area(b)).toBeCloseTo(5000, 6);
    });

    it('splits from a corner to the midpoint of the opposite edge', () => {
        // One vertex on the line, one edge crossed — the mixed case.
        const [a, b] = splitConvexPolygon(SQUARE, { x: 0, y: 0 }, { x: 100, y: 50 })!;
        expect(area(a) + area(b)).toBeCloseTo(area(SQUARE), 6);
        expect(area(a)).toBeGreaterThan(0);
        expect(area(b)).toBeGreaterThan(0);
    });

    it('rejects a degenerate cut whose two points are identical', () => {
        expect(splitConvexPolygon(SQUARE, { x: 50, y: 50 }, { x: 50, y: 50 })).toBeNull();
    });

    it('is unaffected by the scale of the polygon or the cut', () => {
        // The on-line test is a true perpendicular distance, so it must not drift with magnitude.
        const big: Point[] = SQUARE.map((p) => ({ x: p.x * 1000, y: p.y * 1000 }));
        const [a, b] = splitConvexPolygon(big, { x: -1, y: -1 }, { x: 100001, y: 100001 })!;
        expect(a).toHaveLength(3);
        expect(b).toHaveLength(3);
    });

    it('conserves total area for an off-centre cut', () => {
        const [a, b] = splitConvexPolygon(SQUARE, { x: -50, y: 20 }, { x: 150, y: 20 })!;
        expect(area(a) + area(b)).toBeCloseTo(area(SQUARE), 6);
        expect(area(a)).not.toBeCloseTo(area(b), 3);
    });

    it('treats the cut as an infinite line, not a segment', () => {
        // A short stroke well outside the square still splits it, because the line is extended.
        const result = splitConvexPolygon(SQUARE, { x: -200, y: 50 }, { x: -190, y: 50 });
        expect(result).not.toBeNull();
        const [a, b] = result!;
        expect(area(a)).toBeCloseTo(5000, 6);
        expect(area(b)).toBeCloseTo(5000, 6);
    });

    it('returns null when the line misses the polygon entirely', () => {
        expect(splitConvexPolygon(SQUARE, { x: -50, y: 500 }, { x: 150, y: 500 })).toBeNull();
    });

    it('returns null when the line merely grazes an edge', () => {
        // Along y = 0: nothing ends up on the far side, so there is no second polygon.
        expect(splitConvexPolygon(SQUARE, { x: -50, y: 0 }, { x: 150, y: 0 })).toBeNull();
    });

    it('gives both halves the two intersection points', () => {
        const [a, b] = splitConvexPolygon(SQUARE, { x: -50, y: 50 }, { x: 150, y: 50 })!;
        const onCut = (pts: Point[]) => pts.filter((p) => Math.abs(p.y - 50) < 1e-9);
        expect(onCut(a)).toHaveLength(2);
        expect(onCut(b)).toHaveLength(2);
    });

    it('splits a non-rectangular convex polygon', () => {
        const pentagon: Point[] = [
            { x: 50, y: 0 },
            { x: 100, y: 40 },
            { x: 80, y: 100 },
            { x: 20, y: 100 },
            { x: 0, y: 40 },
        ];
        const [a, b] = splitConvexPolygon(pentagon, { x: -10, y: 50 }, { x: 110, y: 50 })!;
        expect(area(a) + area(b)).toBeCloseTo(area(pentagon), 6);
    });
});

describe('pointInPanel', () => {
    describe('rect', () => {
        it('accepts interior points and edges, rejects outside', () => {
            const hit = (px: number, py: number) =>
                pointInPanel('rect', 10, 20, 100, 50, undefined, px, py);
            expect(hit(60, 45)).toBe(true);
            expect(hit(10, 20)).toBe(true); // top-left corner
            expect(hit(110, 70)).toBe(true); // bottom-right corner
            expect(hit(9, 45)).toBe(false);
            expect(hit(60, 71)).toBe(false);
        });
    });

    describe('ellipse', () => {
        const hit = (px: number, py: number) =>
            pointInPanel('ellipse', 0, 0, 200, 100, undefined, px, py);

        it('accepts the centre and the axis extremes', () => {
            expect(hit(100, 50)).toBe(true);
            expect(hit(0, 50)).toBe(true);
            expect(hit(100, 0)).toBe(true);
        });

        it('rejects the bounding-box corners the ellipse does not reach', () => {
            expect(hit(0, 0)).toBe(false);
            expect(hit(200, 100)).toBe(false);
        });
    });

    describe('halfCircle', () => {
        const hit = (px: number, py: number) =>
            pointInPanel('halfCircle', 0, 0, 200, 200, undefined, px, py);

        it('accepts the upper dome only', () => {
            expect(hit(100, 40)).toBe(true); // above the chord, inside radius
            expect(hit(100, 160)).toBe(false); // below the chord
        });

        it('rejects points beyond the radius', () => {
            expect(hit(5, 5)).toBe(false);
        });
    });

    describe('quarterCircle', () => {
        const hit = (px: number, py: number) =>
            pointInPanel('quarterCircle', 0, 0, 100, 100, undefined, px, py);

        it('accepts the quarter disk anchored at the top-left', () => {
            expect(hit(10, 10)).toBe(true);
            expect(hit(99, 99)).toBe(false); // outside radius 100 from the corner
        });

        it('rejects points behind the corner', () => {
            expect(hit(-1, 50)).toBe(false);
            expect(hit(50, -1)).toBe(false);
        });
    });

    describe('sector', () => {
        const hit = (px: number, py: number, angle: number) =>
            pointInPanel('sector', 0, 0, 200, 200, undefined, px, py, angle);

        it('accepts only within the swept wedge', () => {
            // Centre is (100,100), radius 100. Konva is y-down, so the sweep runs clockwise from +x.
            expect(hit(150, 110, 90)).toBe(true); // just below +x axis, inside a 90-degree sweep
            expect(hit(150, 90, 90)).toBe(false); // above the +x axis, outside the sweep
        });

        it('widens as the central angle grows', () => {
            expect(hit(90, 150, 45)).toBe(false);
            expect(hit(90, 150, 180)).toBe(true);
        });

        it('rejects points outside the radius regardless of angle', () => {
            // Centre is (100,100) with radius 100; this sits ~127 away.
            expect(hit(199, 180, 360)).toBe(false);
        });

        it('defaults to a 90-degree sweep', () => {
            expect(pointInPanel('sector', 0, 0, 200, 200, undefined, 150, 110)).toBe(true);
            expect(pointInPanel('sector', 0, 0, 200, 200, undefined, 50, 110)).toBe(false);
        });
    });

    describe('polygon', () => {
        const triangle = [
            { x: 0, y: 0 },
            { x: 100, y: 0 },
            { x: 50, y: 100 },
        ];
        const hit = (px: number, py: number) =>
            pointInPanel('polygon', 10, 10, 100, 100, triangle, px, py);

        it('offsets the points by the panel origin', () => {
            expect(hit(60, 30)).toBe(true); // inside the triangle once shifted by (10,10)
            expect(hit(15, 100)).toBe(false); // outside the sloped edge
        });

        it('rejects when there are too few points', () => {
            expect(
                pointInPanel('polygon', 0, 0, 100, 100, [{ x: 0, y: 0 }], 10, 10),
            ).toBe(false);
        });

        it('rejects when points are missing entirely', () => {
            expect(pointInPanel('polygon', 0, 0, 100, 100, undefined, 10, 10)).toBe(false);
        });
    });
});
