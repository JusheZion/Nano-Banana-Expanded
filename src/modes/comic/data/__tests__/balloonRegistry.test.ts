/**
 * Contract tests for the balloon style registry.
 *
 * The point of these is not to pin down exact coordinates — it's to make the failure modes that
 * used to be silent become loud. Before the registry existed, a style could omit its geometry and
 * quietly render as a generic ellipse, or claim a merged tail while drawing a body that never
 * merged one (which is how Thought Cloud, Radio/Electric and Spiky Shout ended up tailless).
 */
import { describe, it, expect } from 'vitest';
import { BALLOON_STYLES } from '../BalloonStyles';
import {
    buildDoubleBurstPaths,
    buildElectricRimPath,
    buildSlantedBoxPath,
    buildStarburstPath,
} from '../balloonGeometry';
import type { BalloonStyle } from '../../../../types/balloon';

const METRICS = { halfW: 100, halfH: 60 };

/**
 * Pull every numeric coordinate out of an SVG path string. The exponent clause matters: trig at
 * multiples of pi/2 produces values like `1.22e-16`, and a naive pattern splits that into two
 * numbers and throws the coordinate count off.
 */
function pathNumbers(d: string): number[] {
    return (d.match(/-?\d+(?:\.\d+)?(?:e[-+]?\d+)?/gi) ?? []).map(Number);
}

describe('BALLOON_STYLES registry', () => {
    it('exposes every style with a unique id', () => {
        const ids = BALLOON_STYLES.map((s) => s.id);
        expect(new Set(ids).size).toBe(ids.length);
        expect(ids.length).toBeGreaterThan(0);
    });

    it.each(BALLOON_STYLES.map((s) => [s.id, s] as const))(
        '%s declares body geometry and a tail attachment mode',
        (_id, style: BalloonStyle) => {
            expect(style.body).toBeDefined();
            expect(['merged-ellipse', 'merged-rounded-rect', 'separate']).toContain(
                style.tailAttachment,
            );
        },
    );

    it.each(BALLOON_STYLES.filter((s) => s.body.shape === 'path').map((s) => [s.id, s] as const))(
        '%s builds a closed, finite outline',
        (_id, style: BalloonStyle) => {
            if (style.body.shape !== 'path') throw new Error('filtered above');
            const d = style.body.build(METRICS);
            expect(d.startsWith('M')).toBe(true);
            expect(d.trimEnd().endsWith('Z')).toBe(true);
            expect(pathNumbers(d).every(Number.isFinite)).toBe(true);
        },
    );

    it.each(
        BALLOON_STYLES.filter((s) => s.body.shape === 'layeredPath').map((s) => [s.id, s] as const),
    )('%s builds two closed outlines', (_id, style: BalloonStyle) => {
        if (style.body.shape !== 'layeredPath') throw new Error('filtered above');
        const { outer, inner } = style.body.build(METRICS);
        for (const d of [outer, inner]) {
            expect(d.startsWith('M')).toBe(true);
            expect(d.trimEnd().endsWith('Z')).toBe(true);
            expect(pathNumbers(d).every(Number.isFinite)).toBe(true);
        }
    });

    /**
     * Regression guard for the tailless-balloon bug. A merged mode means the body outline itself
     * contains the tail, which only the ellipse and rounded-rect bodies actually do. Any style that
     * draws a custom body must use 'separate', or its tail silently disappears.
     */
    it.each(BALLOON_STYLES.map((s) => [s.id, s] as const))(
        '%s does not claim a merged tail while drawing a custom body',
        (_id, style: BalloonStyle) => {
            if (style.tailAttachment === 'merged-ellipse') {
                expect(style.body.shape).toBe('ellipse');
            }
            if (style.tailAttachment === 'merged-rounded-rect') {
                expect(style.body.shape).toBe('roundedRect');
            }
        },
    );

    it('gives every tail-bearing custom-body style a separate tail', () => {
        const tailBearing = BALLOON_STYLES.filter((s) => s.hasTail);
        const customBody = tailBearing.filter(
            (s) => s.body.shape !== 'ellipse' && s.body.shape !== 'roundedRect',
        );
        // Thought Cloud, Radio/Electric and Spiky Shout all live here and used to render tailless.
        expect(customBody.length).toBeGreaterThan(0);
        for (const style of customBody) {
            expect(style.tailAttachment).toBe('separate');
        }
    });

    it('gives the thought balloons a trailing-bubbles tail', () => {
        const thoughtWithTail = BALLOON_STYLES.filter((s) => s.kind === 'thought' && s.hasTail);
        expect(thoughtWithTail.length).toBeGreaterThan(0);
        for (const style of thoughtWithTail) {
            expect(style.tailStyle).toBe('bubbles');
        }
    });
});

describe('body path builders', () => {
    it('slanted box rakes the sides while keeping top and bottom level', () => {
        const pts = pathNumbers(buildSlantedBoxPath(METRICS));
        // M x1,y1 L x2,y2 L x3,y3 L x4,y4 Z
        const [x1, y1, x2, y2, x3, y3, x4, y4] = pts;
        expect(y1).toBe(y2); // top edge level
        expect(y3).toBe(y4); // bottom edge level
        expect(x1).toBeGreaterThan(x4); // top-left inset relative to bottom-left
        expect(x2).toBeGreaterThan(x3); // top-right outset relative to bottom-right
    });

    it('starburst alternates outer and inner radii for the requested spike count', () => {
        const d = buildStarburstPath(METRICS, { spikes: 8 });
        const coords = pathNumbers(d);
        expect(coords.length).toBe(8 * 2 * 2); // two vertices per spike, x and y each
        // First vertex sits on the outer boundary at angle 0.
        expect(coords[0]).toBeCloseTo(METRICS.halfW, 6);
        expect(coords[1]).toBeCloseTo(0, 6);
    });

    it('starburst honours innerRatio', () => {
        const tight = buildStarburstPath(METRICS, { spikes: 4, innerRatio: 0.2 });
        const loose = buildStarburstPath(METRICS, { spikes: 4, innerRatio: 0.9 });
        expect(tight).not.toBe(loose);
    });

    /**
     * The jagged outline used to call Math.random() during the render pass, so the balloon
     * reshuffled its spikes on every frame and could not be tested at all.
     */
    it('jagged starburst is deterministic but still irregular', () => {
        const a = buildStarburstPath(METRICS, { spikes: 12, jagged: true });
        const b = buildStarburstPath(METRICS, { spikes: 12, jagged: true });
        expect(a).toBe(b);
        expect(a).not.toBe(buildStarburstPath(METRICS, { spikes: 12 }));
    });

    it('double burst rotates the inner ring off the outer one', () => {
        const { outer, inner } = buildDoubleBurstPaths(METRICS);
        expect(outer).not.toBe(inner);
        expect(pathNumbers(outer).length).toBe(pathNumbers(inner).length);
    });

    it('electric rim alternates full and inset radii', () => {
        const coords = pathNumbers(buildElectricRimPath(METRICS));
        expect(coords[0]).toBeCloseTo(METRICS.halfW, 6); // first tooth at full radius
        const secondX = coords[2];
        expect(Math.abs(secondX)).toBeLessThan(METRICS.halfW); // second tooth inset
    });

    it('scales every builder with the balloon box', () => {
        const small = { halfW: 10, halfH: 10 };
        const large = { halfW: 200, halfH: 200 };
        const builders = [
            (m: typeof small) => buildSlantedBoxPath(m),
            (m: typeof small) => buildStarburstPath(m, { spikes: 6 }),
            (m: typeof small) => buildElectricRimPath(m),
        ];
        for (const build of builders) {
            const smallMax = Math.max(...pathNumbers(build(small)).map(Math.abs));
            const largeMax = Math.max(...pathNumbers(build(large)).map(Math.abs));
            expect(largeMax).toBeGreaterThan(smallMax);
        }
    });
});
