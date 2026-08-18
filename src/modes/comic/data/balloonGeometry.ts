/**
 * Balloon body geometry.
 *
 * These used to live as a chain of `if (styleDef.id === '...')` branches inside BalloonNode's
 * renderBody(). That meant adding a balloon style required editing the renderer, and forgetting to
 * do so produced a *silent* failure: the style fell through to the generic ellipse and looked
 * plausible. It also hid a real bug, where three styles with `hasTail: true` drew no tail at all,
 * because their custom body returned early and the tail renderer assumed the body had merged it in.
 *
 * Now each style carries its own `body` spec and `tailAttachment` mode (both required, so a new
 * style that omits either is a compile error), and the renderer just reads them. Every builder here
 * is a pure function of the balloon's half-extents, which makes them directly testable.
 *
 * Coordinate space: the balloon group is centred on its own origin, so every path is built around
 * (0, 0) spanning -halfW..+halfW and -halfH..+halfH.
 */

/** Fixed-design cloud outline, centred at 0,0 in a 2400x1800 design box. */
export const CLOUD_DESIGN_WIDTH = 2400;
export const CLOUD_DESIGN_HEIGHT = 1800;

export const CLOUD_BALLOON_PATH =
    'M384.986 894.426C353.731 658.567 514.663 441.357 744.437 409.274 837.544 396.274 932.208 415.708 1013.28 464.466 1099.19 298.239 1299.94 235.064 1461.67 323.361 1489.95 338.801 1515.9 358.37 1538.72 381.458 1605.63 243.668 1768.6 187.688 1902.73 256.422 1939.85 275.446 1972.23 302.959 1997.39 336.848 2105.23 206.543 2295.79 190.447 2423.02 300.897 2476.49 347.319 2512.53 411.347 2524.96 482.004 2701.66 531.495 2805.9 718.963 2757.78 900.724 2753.74 916.005 2748.66 930.977 2742.6 945.532 2884.31 1134.92 2849.62 1406.38 2665.11 1551.84 2607.68 1597.13 2539.84 1626.44 2468.15 1636.97 2466.56 1840.72 2304.23 2004.58 2105.59 2002.94 2039.22 2002.4 1974.3 1983.03 1918 1946.97 1850.81 2175.41 1616.45 2304.53 1394.54 2235.36 1301.54 2206.38 1221.19 2145.08 1167.19 2061.92 939.983 2202.61 645.079 2126.93 508.501 1892.88 506.78 1889.93 505.089 1886.96 503.428 1883.98 354.731 1901.85 220.041 1792.92 202.588 1640.68 193.286 1559.53 219.378 1478.31 273.912 1418.67 145.162 1340.85 101.913 1170.05 177.311 1037.18 220.81 960.524 297.101 909.848 382.724 900.736Z';

export const CLOUD_BALLOON_TICKS_PATH =
    'M434.292 1448.15C379.327 1452.57 324.367 1439.53 276.793 1410.77M573.255 1857.2C551.152 1866.23 527.983 1872.25 504.346 1875.09M1167.04 2053.75C1150.41 2028.15 1136.49 2000.79 1125.51 1972.14M1934.85 1850.26C1932.4 1880.62 1926.84 1910.64 1918.27 1939.8M2264.5 1297C2389.13 1359.27 2467.77 1489.46 2466.66 1631.65M2741.33 940.574C2721.15 988.992 2690.34 1031.94 2651.31 1066.06M2525.33 474.969C2528.77 494.521 2530.36 514.368 2530.08 534.232M1950.45 405.841C1962.18 378.5 1977.71 353.043 1996.57 330.263M1519.14 441.859C1523.92 419.265 1531.42 397.37 1541.47 376.678M1012.96 463.995C1042.3 481.637 1069.44 502.872 1093.78 527.232M399.1 960.975C392.697 939.214 387.981 916.967 384.996 894.442';

/** Half-extents of the balloon body, in balloon-local units. */
export interface BalloonBodyMetrics {
    halfW: number;
    halfH: number;
}

/**
 * How a balloon's tail is drawn.
 * - `merged-ellipse` / `merged-rounded-rect`: the tail is baked into the body outline as one
 *   continuous path, so body and tail join seamlessly. The separate tail renderer must stand down.
 * - `separate`: the tail is its own shape, drawn by the tail renderer according to `tailStyle`.
 *
 * Getting this wrong is exactly how Thought Cloud, Radio/Electric and Spiky Shout ended up with no
 * tail: they drew a custom body that never merged a tail, while still claiming a merged mode.
 */
export type TailAttachment = 'merged-ellipse' | 'merged-rounded-rect' | 'separate';

/**
 * What shape the body is. `path` and `layeredPath` builders receive the balloon's half-extents and
 * return SVG path data.
 */
export type BalloonBodySpec =
    /** Plain ellipse filling the balloon box. */
    | { shape: 'ellipse' }
    /** Rectangle using the style's `cornerRadius`. */
    | { shape: 'roundedRect' }
    /** The fixed cloud outline, scaled to the balloon box, plus its decorative tick marks. */
    | { shape: 'cloud' }
    /** A single custom outline. `lineJoin`/`lineCap` override the Konva defaults when set. */
    | {
          shape: 'path';
          build: (m: BalloonBodyMetrics) => string;
          lineJoin?: 'miter' | 'round' | 'bevel';
          lineCap?: 'butt' | 'round' | 'square';
      }
    /** Two stacked outlines (outer drawn in the stroke colour, inner in the fill colour). */
    | { shape: 'layeredPath'; build: (m: BalloonBodyMetrics) => { outer: string; inner: string } };

/* ------------------------------------------------------------------------------------------------
 * Path builders
 * --------------------------------------------------------------------------------------------- */

/** Parallelogram: top and bottom edges level, sides raked by 15% of the height. */
export function buildSlantedBoxPath({ halfW, halfH }: BalloonBodyMetrics): string {
    const slantOffset = halfH * 2 * 0.15;
    return `M ${-halfW + slantOffset},${-halfH} L ${halfW},${-halfH} L ${halfW - slantOffset},${halfH} L ${-halfW},${halfH} Z`;
}

/**
 * Deterministic jitter in [0, 1) derived from an integer index.
 *
 * The jagged-scream outline previously called Math.random() while building its path, which meant
 * the balloon silently reshaped itself on every single render (and could not be tested). This keeps
 * the same irregular look but makes it stable for a given spike index.
 */
function spikeJitter(index: number): number {
    const x = Math.sin(index * 127.1) * 43758.5453;
    return x - Math.floor(x);
}

export interface StarburstOptions {
    /** Number of outer points. */
    spikes: number;
    /** Inner radius as a fraction of the half-extents. */
    innerRatio?: number;
    /** Randomise inner vertices for a torn, screaming edge. */
    jagged?: boolean;
}

/** Star / burst outline alternating between the outer box and an inner radius. */
export function buildStarburstPath(
    { halfW, halfH }: BalloonBodyMetrics,
    { spikes, innerRatio = 0.7, jagged = false }: StarburstOptions,
): string {
    const innerRadiusX = halfW * innerRatio;
    const innerRadiusY = halfH * innerRatio;
    let pathData = '';

    for (let i = 0; i < spikes * 2; i++) {
        const angle = (i * Math.PI * 2) / (spikes * 2);
        const isOuter = i % 2 === 0;
        let rx = isOuter ? halfW : innerRadiusX;
        let ry = isOuter ? halfH : innerRadiusY;

        if (jagged && !isOuter) {
            const wobble = 0.8 + spikeJitter(i) * 0.4;
            rx *= wobble;
            ry *= wobble;
        }

        const x = Math.cos(angle) * rx;
        const y = Math.sin(angle) * ry;
        pathData += `${i === 0 ? 'M' : 'L'} ${x},${y} `;
    }

    return `${pathData}Z`;
}

/** Two concentric bursts, the inner one rotated a half-step for a layered impact look. */
export function buildDoubleBurstPaths(
    { halfW, halfH }: BalloonBodyMetrics,
): { outer: string; inner: string } {
    const spikes = 18;
    const burst = (
        rxOuter: number,
        ryOuter: number,
        rxInner: number,
        ryInner: number,
        rotationOffset = 0,
    ): string => {
        let d = '';
        for (let i = 0; i < spikes * 2; i++) {
            const angle = (i * Math.PI * 2) / (spikes * 2) + rotationOffset;
            const rx = i % 2 === 0 ? rxOuter : rxInner;
            const ry = i % 2 === 0 ? ryOuter : ryInner;
            const x = Math.cos(angle) * rx;
            const y = Math.sin(angle) * ry;
            d += `${i === 0 ? 'M' : 'L'} ${x},${y} `;
        }
        return `${d}Z`;
    };

    return {
        outer: burst(halfW, halfH, halfW * 0.75, halfH * 0.75, 0),
        inner: burst(halfW * 0.8, halfH * 0.8, halfW * 0.55, halfH * 0.55, (Math.PI * 2) / (spikes * 4)),
    };
}

/** Ellipse with a fine regular sawtooth rim, reading as radio / phone / electric transmission. */
export function buildElectricRimPath({ halfW, halfH }: BalloonBodyMetrics): string {
    const teeth = 40;
    let pathData = '';
    for (let i = 0; i <= teeth; i++) {
        const angle = (i * Math.PI * 2) / teeth;
        const r = i % 2 === 0 ? 1 : 0.85;
        const x = Math.cos(angle) * halfW * r;
        const y = Math.sin(angle) * halfH * r;
        pathData += `${i === 0 ? 'M' : 'L'} ${x},${y} `;
    }
    return `${pathData}Z`;
}

/* ------------------------------------------------------------------------------------------------
 * Ready-made body specs, referenced from BalloonStyles
 * --------------------------------------------------------------------------------------------- */

export const ELLIPSE_BODY: BalloonBodySpec = { shape: 'ellipse' };
export const ROUNDED_RECT_BODY: BalloonBodySpec = { shape: 'roundedRect' };
export const CLOUD_BODY: BalloonBodySpec = { shape: 'cloud' };
export const SLANTED_BOX_BODY: BalloonBodySpec = { shape: 'path', build: buildSlantedBoxPath };
/** Sharp joins keep the sawtooth teeth crisp instead of rounding them off in the glow pass. */
export const ELECTRIC_RIM_BODY: BalloonBodySpec = {
    shape: 'path',
    build: buildElectricRimPath,
    lineJoin: 'miter',
    lineCap: 'butt',
};
export const DOUBLE_BURST_BODY: BalloonBodySpec = { shape: 'layeredPath', build: buildDoubleBurstPaths };

/** Starburst variants differ only in spike count and whether the inner vertices wobble. */
export const starburstBody = (options: StarburstOptions): BalloonBodySpec => ({
    shape: 'path',
    build: (m) => buildStarburstPath(m, options),
});
