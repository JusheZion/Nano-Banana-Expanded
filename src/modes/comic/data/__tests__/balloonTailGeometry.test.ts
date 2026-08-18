/**
 * Tail geometry tests.
 *
 * Two behaviours are pinned here deliberately:
 *  - `'straight'` must produce a genuinely straight-sided tail. It previously fell through to the
 *    same quadratic curve as `'curved'`, so nine styles claimed a straight tail and drew a curved
 *    one.
 *  - the four tail styles must stay visually distinct from one another.
 */
import { describe, it, expect } from 'vitest';
import {
    buildBubbleTail,
    buildCurvedTailPath,
    buildSpikyTailPath,
    buildStraightTailPath,
    buildTailFrame,
    type TailFrame,
} from '../balloonTailGeometry';

const INTERSECTION = { x: 0, y: 30 };
const TIP = { x: -40, y: 110 };

function frame(overrides: Partial<Parameters<typeof buildTailFrame>[0]> = {}): TailFrame {
    const f = buildTailFrame({
        intersection: INTERSECTION,
        tip: TIP,
        width: 200,
        height: 120,
        strokeWidth: 2,
        ...overrides,
    });
    if (!f) throw new Error('expected a tail frame');
    return f;
}

describe('buildTailFrame', () => {
    it('returns null for a tail too short to draw', () => {
        expect(
            buildTailFrame({
                intersection: { x: 0, y: 0 },
                tip: { x: 0, y: 1 },
                width: 200,
                height: 120,
                strokeWidth: 2,
            }),
        ).toBeNull();
    });

    it('produces unit direction and perpendicular vectors', () => {
        const f = frame();
        expect(Math.hypot(f.nx, f.ny)).toBeCloseTo(1, 10);
        expect(Math.hypot(f.px, f.py)).toBeCloseTo(1, 10);
        expect(f.nx * f.px + f.ny * f.py).toBeCloseTo(0, 10); // perpendicular
    });

    it('tucks the base back inside the balloon so the seam hides under the stroke', () => {
        const thin = frame({ strokeWidth: 2 });
        const thick = frame({ strokeWidth: 20 });
        const distance = (f: TailFrame) => Math.hypot(f.base.x - INTERSECTION.x, f.base.y - INTERSECTION.y);
        expect(distance(thick)).toBeGreaterThan(distance(thin));
    });

    it('places the two base corners symmetrically about the base point', () => {
        const f = frame();
        expect((f.p1.x + f.p2.x) / 2).toBeCloseTo(f.base.x, 10);
        expect((f.p1.y + f.p2.y) / 2).toBeCloseTo(f.base.y, 10);
    });

    it('scales base width with the smaller balloon dimension', () => {
        expect(frame({ width: 400, height: 120 }).baseWidth).toBe(frame({ width: 200, height: 120 }).baseWidth);
        expect(frame({ width: 200, height: 400 }).baseWidth).toBeGreaterThan(frame().baseWidth);
    });

    it('records the flip multiplier', () => {
        expect(frame({ flipped: false }).flip).toBe(1);
        expect(frame({ flipped: true }).flip).toBe(-1);
    });
});

describe('buildStraightTailPath', () => {
    it('draws a closed triangle with no curve commands', () => {
        const d = buildStraightTailPath(frame());
        expect(d).not.toMatch(/[QCAqca]/); // no quadratic, cubic or arc segments
        expect(d.match(/L/g)).toHaveLength(2);
        expect(d.trimEnd().endsWith('Z')).toBe(true);
    });

    it('runs from one base corner to the tip to the other base corner', () => {
        const f = frame();
        const d = buildStraightTailPath(f);
        expect(d).toContain(`M ${f.p1.x} ${f.p1.y}`);
        expect(d).toContain(`L ${f.tip.x} ${f.tip.y}`);
        expect(d).toContain(`L ${f.p2.x} ${f.p2.y}`);
    });

    /** The bug: 'straight' and 'curved' used to be the same path. */
    it('differs from the curved tail', () => {
        const f = frame();
        expect(buildStraightTailPath(f)).not.toBe(buildCurvedTailPath(f));
    });

    it('ignores the flip flag, since a straight tail has no bias to mirror', () => {
        expect(buildStraightTailPath(frame({ flipped: false }))).toBe(
            buildStraightTailPath(frame({ flipped: true })),
        );
    });
});

describe('buildCurvedTailPath', () => {
    it('uses quadratic segments through a shared control point', () => {
        const d = buildCurvedTailPath(frame());
        expect(d.match(/Q/g)).toHaveLength(2);
    });

    it('mirrors its bend when flipped', () => {
        expect(buildCurvedTailPath(frame({ flipped: false }))).not.toBe(
            buildCurvedTailPath(frame({ flipped: true })),
        );
    });
});

describe('buildSpikyTailPath', () => {
    it('zig-zags through two midpoints on alternating sides', () => {
        const f = frame();
        const d = buildSpikyTailPath(f);
        expect(d.match(/L/g)).toHaveLength(4);
        expect(d.trimEnd().endsWith('Z')).toBe(true);
        expect(d).not.toMatch(/[QC]/);
    });

    it('mirrors when flipped', () => {
        expect(buildSpikyTailPath(frame({ flipped: false }))).not.toBe(
            buildSpikyTailPath(frame({ flipped: true })),
        );
    });
});

describe('buildBubbleTail', () => {
    it('returns three bubbles that shrink toward the tip', () => {
        const bubbles = buildBubbleTail(frame(), INTERSECTION);
        expect(bubbles).toHaveLength(3);
        expect(bubbles[0].radius).toBeGreaterThan(bubbles[1].radius);
        expect(bubbles[1].radius).toBeGreaterThan(bubbles[2].radius);
    });

    it('marches the bubbles along the line from balloon to tip', () => {
        const bubbles = buildBubbleTail(frame(), INTERSECTION);
        const distances = bubbles.map((b) => Math.hypot(b.x - INTERSECTION.x, b.y - INTERSECTION.y));
        expect(distances[0]).toBeLessThan(distances[1]);
        expect(distances[1]).toBeLessThan(distances[2]);
    });

    it('keeps every bubble between the balloon and the tip', () => {
        const total = Math.hypot(TIP.x - INTERSECTION.x, TIP.y - INTERSECTION.y);
        for (const b of buildBubbleTail(frame(), INTERSECTION)) {
            expect(Math.hypot(b.x - INTERSECTION.x, b.y - INTERSECTION.y)).toBeLessThan(total);
        }
    });
});

describe('tail styles are mutually distinct', () => {
    it('produces four different shapes', () => {
        const f = frame();
        const paths = [buildStraightTailPath(f), buildCurvedTailPath(f), buildSpikyTailPath(f)];
        expect(new Set(paths).size).toBe(paths.length);
        expect(buildBubbleTail(f, INTERSECTION).length).toBeGreaterThan(0);
    });
});
