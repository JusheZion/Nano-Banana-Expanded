/**
 * Style migration and fallback.
 *
 * `styleId` is baked into every saved comic, so retiring a style is only safe if old artwork
 * re-maps on load and anything unrecognised still renders. These tests guard both halves.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import {
    RETIRED_BALLOON_STYLE_IDS,
    migrateBalloonStyleIds,
    resolveBalloonStyleId,
} from '../balloonStyleMigration';
import { BALLOON_STYLES, FALLBACK_BALLOON_STYLE_ID, resolveBalloonStyle } from '../BalloonStyles';
import type { BalloonInstance } from '../../../../types/balloon';

function balloon(styleId: string, id = 'b1'): BalloonInstance {
    return {
        id,
        type: 'balloon',
        x: 0,
        y: 0,
        width: 100,
        height: 60,
        hasTail: true,
        tailBasePoint: { x: 0, y: 0 },
        tailTip: { x: -20, y: 40 },
        styleId,
        text: 'hi',
    } as BalloonInstance;
}

afterEach(() => {
    vi.restoreAllMocks();
});

describe('RETIRED_BALLOON_STYLE_IDS', () => {
    it('points every retired id at a style that still exists', () => {
        const live = new Set(BALLOON_STYLES.map((s) => s.id));
        for (const [from, to] of Object.entries(RETIRED_BALLOON_STYLE_IDS)) {
            expect(live.has(to), `${from} -> ${to}`).toBe(true);
        }
    });

    it('never aliases an id that is still live', () => {
        const live = new Set(BALLOON_STYLES.map((s) => s.id));
        for (const from of Object.keys(RETIRED_BALLOON_STYLE_IDS)) {
            expect(live.has(from as never), `${from} is both live and retired`).toBe(false);
        }
    });

    it('retires thought_cloud onto the tailed fluffy cloud', () => {
        // thought_cloud had hasTail: true, so it must land on the tailed variant.
        expect(RETIRED_BALLOON_STYLE_IDS.thought_cloud).toBe('cloud_fluffy');
        expect(BALLOON_STYLES.find((s) => s.id === 'cloud_fluffy')?.hasTail).toBe(true);
    });
});

describe('resolveBalloonStyleId', () => {
    it('rewrites retired ids', () => {
        expect(resolveBalloonStyleId('thought_cloud')).toBe('cloud_fluffy');
    });

    it('leaves live ids alone', () => {
        expect(resolveBalloonStyleId('speech_round')).toBe('speech_round');
        expect(resolveBalloonStyleId('cloud_fluffy')).toBe('cloud_fluffy');
    });

    it('passes unknown ids straight through for the renderer to handle', () => {
        expect(resolveBalloonStyleId('nonsense')).toBe('nonsense');
    });
});

describe('migrateBalloonStyleIds', () => {
    it('rewrites retired ids on loaded pages', () => {
        const pages = [{ balloons: [balloon('thought_cloud'), balloon('speech_round', 'b2')] }];
        const out = migrateBalloonStyleIds(pages);
        expect(out[0].balloons[0].styleId).toBe('cloud_fluffy');
        expect(out[0].balloons[1].styleId).toBe('speech_round');
    });

    it('preserves everything else about the balloon', () => {
        const original = balloon('thought_cloud');
        const migrated = migrateBalloonStyleIds([{ balloons: [original] }])[0].balloons[0];
        expect({ ...migrated, styleId: original.styleId }).toEqual(original);
    });

    /** Identity churn here would register as a spurious undo step on load. */
    it('returns the same array when nothing needs migrating', () => {
        const pages = [{ balloons: [balloon('speech_round')] }];
        expect(migrateBalloonStyleIds(pages)).toBe(pages);
    });

    it('leaves untouched pages by reference even when another page migrates', () => {
        const clean = { balloons: [balloon('speech_round')] };
        const stale = { balloons: [balloon('thought_cloud', 'b2')] };
        const out = migrateBalloonStyleIds([clean, stale]);
        expect(out[0]).toBe(clean);
        expect(out[1]).not.toBe(stale);
    });

    it('survives empty, missing and malformed input', () => {
        expect(migrateBalloonStyleIds([])).toEqual([]);
        expect(migrateBalloonStyleIds(undefined)).toEqual([]);
        expect(migrateBalloonStyleIds(null)).toEqual([]);
        expect(migrateBalloonStyleIds([{ balloons: undefined }])).toEqual([{ balloons: undefined }]);
    });

    it('handles several stale balloons across several pages', () => {
        const out = migrateBalloonStyleIds([
            { balloons: [balloon('thought_cloud', 'a'), balloon('thought_cloud', 'b')] },
            { balloons: [balloon('thought_cloud', 'c')] },
        ]);
        expect(out.flatMap((p) => p.balloons!).every((b) => b.styleId === 'cloud_fluffy')).toBe(true);
    });
});

describe('resolveBalloonStyle', () => {
    it('returns the matching style for a live id', () => {
        expect(resolveBalloonStyle('speech_round').id).toBe('speech_round');
    });

    it('resolves a retired id to its replacement style', () => {
        expect(resolveBalloonStyle('thought_cloud').id).toBe('cloud_fluffy');
    });

    /**
     * The renderer used to `return null` here, which removed the balloon from the page with no
     * error — indistinguishable from lost artwork.
     */
    it('falls back rather than failing on an unknown id', () => {
        vi.spyOn(console, 'warn').mockImplementation(() => {});
        expect(resolveBalloonStyle('does_not_exist').id).toBe(FALLBACK_BALLOON_STYLE_ID);
    });

    it('always returns a renderable style', () => {
        vi.spyOn(console, 'warn').mockImplementation(() => {});
        for (const id of ['speech_round', 'thought_cloud', 'nope', '']) {
            const style = resolveBalloonStyle(id);
            expect(style.body).toBeDefined();
            expect(style.tailAttachment).toBeDefined();
        }
    });

    it('has a fallback style that actually exists', () => {
        expect(BALLOON_STYLES.some((s) => s.id === FALLBACK_BALLOON_STYLE_ID)).toBe(true);
    });
});

describe('cloud style consolidation', () => {
    it('keeps exactly the two fluffy cloud variants', () => {
        const clouds = BALLOON_STYLES.filter((s) => s.body.shape === 'cloud').map((s) => s.id);
        expect(clouds.sort()).toEqual(['cloud_fluffy', 'cloud_fluffy_no_tail']);
    });

    it('offers one cloud with a tail and one without', () => {
        expect(BALLOON_STYLES.find((s) => s.id === 'cloud_fluffy')?.hasTail).toBe(true);
        expect(BALLOON_STYLES.find((s) => s.id === 'cloud_fluffy_no_tail')?.hasTail).toBe(false);
    });

    it('no longer ships thought_cloud', () => {
        expect(BALLOON_STYLES.some((s) => s.id === ('thought_cloud' as never))).toBe(false);
    });
});
