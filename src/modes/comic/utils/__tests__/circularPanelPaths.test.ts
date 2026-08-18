/**
 * Circular panel path builders.
 *
 * These drive the half-circle / quarter-circle / sector panel shapes. They are pure string builders,
 * so they are cheap to pin down — and they had no coverage at all, despite the sector path doing
 * real trigonometry and large-arc selection.
 */
import { describe, it, expect } from 'vitest';
import {
    getHalfCirclePath,
    getQuarterCirclePath,
    getSectorPath,
    getHalfCircleHaloInnerPath,
    getHalfCircleHaloOuterPath,
    getQuarterCircleHaloInnerPath,
    getQuarterCircleHaloOuterPath,
    getSectorHaloInnerPath,
    getSectorHaloOuterPath,
} from '../circularPanelPaths';

/** Numeric coordinates, exponent-aware (trig at pi/2 multiples yields values like 1.2e-16). */
function nums(d: string): number[] {
    return (d.match(/-?\d+(?:\.\d+)?(?:e[-+]?\d+)?/gi) ?? []).map(Number);
}

/** Final coordinate pair of the first arc command in the path. */
function arcEndpoint(d: string): { x: number; y: number } {
    const m = /A\s+[\d.]+\s+[\d.]+\s+\d+\s+(\d)\s+\d+\s+(-?[\d.e+-]+)\s+(-?[\d.e+-]+)/i.exec(d);
    if (!m) throw new Error(`no arc found in: ${d}`);
    return { x: Number(m[2]), y: Number(m[3]) };
}

function largeArcFlag(d: string): number {
    const m = /A\s+[\d.]+\s+[\d.]+\s+\d+\s+(\d)\s+\d+\s+/i.exec(d);
    if (!m) throw new Error(`no arc found in: ${d}`);
    return Number(m[1]);
}

describe('getHalfCirclePath', () => {
    it('spans the full diameter along y = 0 and closes', () => {
        const d = getHalfCirclePath(50);
        expect(d.startsWith('M -50 0')).toBe(true);
        expect(arcEndpoint(d)).toEqual({ x: 50, y: 0 });
        expect(d.trimEnd().endsWith('Z')).toBe(true);
    });

    it('scales with radius', () => {
        expect(Math.max(...nums(getHalfCirclePath(200)).map(Math.abs))).toBeGreaterThan(
            Math.max(...nums(getHalfCirclePath(10)).map(Math.abs)),
        );
    });
});

describe('getQuarterCirclePath', () => {
    it('runs origin -> (r,0) -> arc -> (0,r) and closes', () => {
        const d = getQuarterCirclePath(40);
        expect(d.startsWith('M 0 0')).toBe(true);
        expect(d).toContain('L 40 0');
        expect(arcEndpoint(d)).toEqual({ x: 0, y: 40 });
        expect(d.trimEnd().endsWith('Z')).toBe(true);
    });
});

describe('getSectorPath', () => {
    it('ends where the requested angle lands on the circle', () => {
        const r = 100;
        const end = arcEndpoint(getSectorPath(r, 90));
        expect(end.x).toBeCloseTo(0, 6);
        expect(end.y).toBeCloseTo(r, 6); // Konva is y-down, so 90 degrees points down
    });

    it('uses the large-arc flag only past a half turn', () => {
        expect(largeArcFlag(getSectorPath(100, 90))).toBe(0);
        expect(largeArcFlag(getSectorPath(100, 180))).toBe(0);
        expect(largeArcFlag(getSectorPath(100, 181))).toBe(1);
        expect(largeArcFlag(getSectorPath(100, 359))).toBe(1);
    });

    it('clamps the angle to the documented 1-360 range', () => {
        expect(getSectorPath(100, -50)).toBe(getSectorPath(100, 1));
        expect(getSectorPath(100, 9999)).toBe(getSectorPath(100, 360));
    });

    it('keeps the arc endpoint on the circle for any angle', () => {
        const r = 75;
        for (const angle of [1, 30, 90, 150, 200, 270, 359, 360]) {
            const { x, y } = arcEndpoint(getSectorPath(r, angle));
            expect(Math.hypot(x, y)).toBeCloseTo(r, 6);
        }
    });

    it('produces finite coordinates throughout', () => {
        for (const angle of [1, 45, 90, 180, 270, 360]) {
            expect(nums(getSectorPath(60, angle)).every(Number.isFinite)).toBe(true);
        }
    });
});

describe('halo path builders', () => {
    it('append a skirt to the base arc so the ring reaches past the flat edge', () => {
        const arcOnly = getHalfCirclePath(80);
        const withSkirt = getHalfCircleHaloOuterPath(80, 12);
        expect(withSkirt.length).toBeGreaterThan(arcOnly.length);
        expect(withSkirt.match(/Z/g)!.length).toBe(2); // arc subpath + skirt subpath
    });

    it('nest the inner halo inside the outer one', () => {
        const outer = Math.max(...nums(getHalfCircleHaloOuterPath(100, 10)).map(Math.abs));
        const inner = Math.max(...nums(getHalfCircleHaloInnerPath(80, 10)).map(Math.abs));
        expect(inner).toBeLessThan(outer);

        const qOuter = Math.max(...nums(getQuarterCircleHaloOuterPath(100, 10)).map(Math.abs));
        const qInner = Math.max(...nums(getQuarterCircleHaloInnerPath(80, 10)).map(Math.abs));
        expect(qInner).toBeLessThan(qOuter);
    });

    /**
     * Documented behaviour, not an oversight: the sector halo intentionally ignores bandDepth and
     * reuses the plain arc, because skirts extending into the wedge covered the panel. Pinned so a
     * future change to the signature is a deliberate decision rather than an accident.
     */
    it('sector halos reuse the plain sector arc and ignore band depth', () => {
        expect(getSectorHaloOuterPath(100, 90, 10)).toBe(getSectorPath(100, 90));
        expect(getSectorHaloOuterPath(100, 90, 999)).toBe(getSectorHaloOuterPath(100, 90, 0));
        expect(getSectorHaloInnerPath(80, 90, 10)).toBe(getSectorPath(80, 90));
    });
});
