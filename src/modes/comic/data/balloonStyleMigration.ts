/**
 * Balloon style migration.
 *
 * `styleId` is written into every saved comic — both the IndexedDB autosave and exported .json
 * project files — so a style id can never simply be deleted. Any balloon still referencing a removed
 * id would find no matching style, and the renderer used to drop such balloons silently.
 *
 * Retiring a style therefore means: remove it from BALLOON_STYLES, and add an entry here pointing
 * at whatever replaces it. Old artwork then re-maps on load.
 */
import type { BalloonInstance, BalloonStyleId } from '../../../types/balloon';

/**
 * Retired style ids and what they become.
 *
 * - `thought_cloud` -> `cloud_fluffy`: the original hand-drawn thought balloon, whose outline was
 *   never as bold or as fluffy as intended. Once the fluffy cloud existed it took over the same
 *   outline, leaving thought_cloud as a near-duplicate differing only in stroke width and font
 *   size. `cloud_fluffy` is the tailed variant, which matches thought_cloud's `hasTail: true`, so
 *   existing balloons keep their tails.
 */
export const RETIRED_BALLOON_STYLE_IDS: Readonly<Record<string, BalloonStyleId>> = {
    thought_cloud: 'cloud_fluffy',
};

/** Maps a possibly-retired style id onto the id that should render it. */
export function resolveBalloonStyleId(styleId: string): string {
    return RETIRED_BALLOON_STYLE_IDS[styleId] ?? styleId;
}

/** True when any balloon on any page still references a retired style. */
function needsMigration(pages: readonly { balloons?: readonly BalloonInstance[] }[]): boolean {
    return pages.some((page) =>
        (page.balloons ?? []).some((b) => b && b.styleId in RETIRED_BALLOON_STYLE_IDS),
    );
}

/**
 * Rewrites retired style ids across a loaded project.
 *
 * Returns the original array unchanged when there is nothing to migrate, so loading a current
 * project does not churn object identity (which would otherwise show up as a spurious undo step).
 */
export function migrateBalloonStyleIds<P extends { balloons?: BalloonInstance[] }>(
    pages: P[] | undefined | null,
): P[] {
    if (!Array.isArray(pages) || pages.length === 0) return pages ?? [];
    if (!needsMigration(pages)) return pages;

    return pages.map((page) => {
        const balloons = page.balloons;
        if (!Array.isArray(balloons)) return page;
        if (!balloons.some((b) => b && b.styleId in RETIRED_BALLOON_STYLE_IDS)) return page;
        return {
            ...page,
            balloons: balloons.map((b) =>
                b && b.styleId in RETIRED_BALLOON_STYLE_IDS
                    ? { ...b, styleId: RETIRED_BALLOON_STYLE_IDS[b.styleId] }
                    : b,
            ),
        };
    });
}
