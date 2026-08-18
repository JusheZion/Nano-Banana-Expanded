/**
 * Separate-tail geometry (the tail shapes drawn *beside* the balloon body, rather than merged into
 * its outline).
 *
 * Extracted from BalloonNode.renderTail() so the shapes are pure, testable functions. Two things
 * were fixed on the way out:
 *
 * 1. `'straight'` did not produce a straight tail. Both `'straight'` and `'curved'` fell through to
 *    the same quadratic-curve path, so nine of the sixteen styles claimed a straight tail and drew
 *    a curved one. `'straight'` now builds a real straight-sided triangular tail; `'curved'` keeps
 *    the curve.
 * 2. The tail is built from an explicit `TailFrame` so callers cannot accidentally reorder the
 *    normal/perpendicular maths, which is where the flip handling lived.
 */

export interface TailPoint {
    x: number;
    y: number;
}

/** Everything the tail builders need, derived once by `buildTailFrame`. */
export interface TailFrame {
    /** Where the tail meets the balloon outline, pulled slightly inside so it tucks under the stroke. */
    base: TailPoint;
    /** Far end of the tail. */
    tip: TailPoint;
    /** Corner of the tail base, on one side of the attachment point. */
    p1: TailPoint;
    /** Corner of the tail base, on the other side. */
    p2: TailPoint;
    /** Unit vector from base toward tip. */
    nx: number;
    ny: number;
    /** Unit vector perpendicular to (nx, ny). */
    px: number;
    py: number;
    /** Distance from attachment point to tip. */
    length: number;
    /** Half-width of the tail where it meets the balloon. */
    baseWidth: number;
    /** -1 when the tail is flipped, else 1. */
    flip: number;
}

export interface BuildTailFrameArgs {
    /** Point on the balloon outline the tail grows from. */
    intersection: TailPoint;
    /** Tail tip, in balloon-local coordinates. */
    tip: TailPoint;
    /** Balloon width. */
    width: number;
    /** Balloon height. */
    height: number;
    /** Body stroke width; the base is tucked half of this into the balloon so the seam is hidden. */
    strokeWidth: number;
    /** Mirror the tail's curve/zig-zag to the other side. */
    flipped?: boolean;
}

/**
 * Builds the shared frame for a separate tail, or null when the tail is too short to be worth
 * drawing (which is also the old behaviour — a sub-2px tail was skipped).
 */
export function buildTailFrame({
    intersection,
    tip,
    width,
    height,
    strokeWidth,
    flipped = false,
}: BuildTailFrameArgs): TailFrame | null {
    const dx = tip.x - intersection.x;
    const dy = tip.y - intersection.y;
    const length = Math.sqrt(dx * dx + dy * dy);
    if (length < 2) return null;

    const baseWidth = Math.min(width, height) * 0.1;
    const nx = dx / length;
    const ny = dy / length;
    const px = -ny;
    const py = nx;

    const tuckOffset = Math.max(1, (Number(strokeWidth) || 2) / 2);
    const base: TailPoint = {
        x: intersection.x - nx * tuckOffset,
        y: intersection.y - ny * tuckOffset,
    };

    return {
        base,
        tip,
        p1: { x: base.x + px * baseWidth, y: base.y + py * baseWidth },
        p2: { x: base.x - px * baseWidth, y: base.y - py * baseWidth },
        nx,
        ny,
        px,
        py,
        length,
        baseWidth,
        flip: flipped ? -1 : 1,
    };
}

/**
 * Straight tail: a plain triangle from the two base corners to the tip. This is the traditional
 * comic-book speech tail, and it is what `tailStyle: 'straight'` was always supposed to draw.
 */
export function buildStraightTailPath(f: TailFrame): string {
    return `M ${f.p1.x} ${f.p1.y} L ${f.tip.x} ${f.tip.y} L ${f.p2.x} ${f.p2.y} Z`;
}

/** Curved tail: both edges sweep to the tip through a shared control point. */
export function buildCurvedTailPath(f: TailFrame): string {
    const curveStrength = f.length * 0.5;
    const cx = f.base.x + f.nx * (f.length * 0.4) - f.px * (curveStrength * f.flip);
    const cy = f.base.y + f.ny * (f.length * 0.4) - f.py * (curveStrength * f.flip);
    return `M ${f.p1.x} ${f.p1.y} Q ${cx} ${cy} ${f.tip.x} ${f.tip.y} Q ${cx} ${cy} ${f.p2.x} ${f.p2.y} `;
}

/** Spiky tail: a lightning zig-zag, for shouts and radio/electric transmissions. */
export function buildSpikyTailPath(f: TailFrame): string {
    const mid1 = {
        x: f.base.x + f.nx * (f.length * 0.4) + f.px * f.baseWidth * 0.9 * f.flip,
        y: f.base.y + f.ny * (f.length * 0.4) + f.py * f.baseWidth * 0.9 * f.flip,
    };
    const mid2 = {
        x: f.base.x + f.nx * (f.length * 0.72) - f.px * f.baseWidth * 0.9 * f.flip,
        y: f.base.y + f.ny * (f.length * 0.72) - f.py * f.baseWidth * 0.9 * f.flip,
    };
    return `M ${f.p1.x} ${f.p1.y} L ${mid1.x} ${mid1.y} L ${f.tip.x} ${f.tip.y} L ${mid2.x} ${mid2.y} L ${f.p2.x} ${f.p2.y} Z`;
}

/** One bubble of a trailing-bubbles thought tail. */
export interface TailBubble {
    x: number;
    y: number;
    radius: number;
}

/**
 * Bubbles tail: three shrinking circles trailing from the balloon toward the tip, the classic
 * thought-balloon convention. Positioned from the untucked attachment point so the first bubble
 * sits clear of the outline.
 */
export function buildBubbleTail(f: TailFrame, intersection: TailPoint): TailBubble[] {
    const dx = f.tip.x - intersection.x;
    const dy = f.tip.y - intersection.y;
    return [
        { at: 0.18, r: 0.8 },
        { at: 0.32, r: 0.5 },
        { at: 0.46, r: 0.3 },
    ].map(({ at, r }) => ({
        x: intersection.x + dx * at,
        y: intersection.y + dy * at,
        radius: f.baseWidth * r,
    }));
}
