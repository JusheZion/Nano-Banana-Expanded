export interface Point {
    x: number;
    y: number;
}

// Determines if a point is to the left (>0), right (<0), or on (0) the line segment A->B
const sideOfLine = (A: Point, B: Point, P: Point): number => {
    return (B.x - A.x) * (P.y - A.y) - (B.y - A.y) * (P.x - A.x);
};

/**
 * How close a vertex must be to the cut line, in pixels, to count as lying *on* it.
 *
 * `sideOfLine` returns a cross product whose magnitude scales with both the polygon size and the
 * length of the cut, so it can't be compared against a fixed tolerance directly. Dividing by the
 * cut length turns it into a perpendicular distance, which can.
 */
const ON_LINE_EPSILON_PX = 1e-9;

/** Signed perpendicular distance from P to the infinite line through A and B, or null if A === B. */
const signedDistanceToLine = (A: Point, B: Point, P: Point): number | null => {
    const lineLength = Math.hypot(B.x - A.x, B.y - A.y);
    if (lineLength < 1e-12) return null; // degenerate cut: not a line at all
    return sideOfLine(A, B, P) / lineLength;
};

/** Counts points that are distinct to within a pixel-ish tolerance. */
const distinctPointCount = (points: Point[]): number => {
    const kept: Point[] = [];
    for (const p of points) {
        if (!kept.some((q) => Math.abs(q.x - p.x) < 1e-9 && Math.abs(q.y - p.y) < 1e-9)) {
            kept.push(p);
        }
    }
    return kept.length;
};

// Calculates the intersection point between line strictly defined by A->B and segment C->D
// Note: Bounding box lines are treated as infinite for the split plane, but we only intersect segments.
const getIntersection = (A: Point, B: Point, C: Point, D: Point): Point | null => {
    const a1 = B.y - A.y;
    const b1 = A.x - B.x;
    const c1 = a1 * A.x + b1 * A.y;

    const a2 = D.y - C.y;
    const b2 = C.x - D.x;
    const c2 = a2 * C.x + b2 * C.y;

    const determinant = a1 * b2 - a2 * b1;

    if (Math.abs(determinant) < 1e-10) {
        return null; // Lines are parallel
    }

    const x = (b2 * c1 - b1 * c2) / determinant;
    const y = (a1 * c2 - a2 * c1) / determinant;

    // Check if the intersection point lies on the segment C->D
    // We only need one valid interpolation ratio to check bounds (0 to 1) 
    // due to floating point, checking distance or bounding box is safer.
    const minX = Math.min(C.x, D.x) - 1e-10;
    const maxX = Math.max(C.x, D.x) + 1e-10;
    const minY = Math.min(C.y, D.y) - 1e-10;
    const maxY = Math.max(C.y, D.y) + 1e-10;

    if (x >= minX && x <= maxX && y >= minY && y <= maxY) {
        return { x, y };
    }

    return null;
};

// Splits a convex polygon defined by `points` using the infinite line passing through `lineStart` and `lineEnd`.
// Returns two arrays of points representing the two newly formed polygons, or null if no valid split occurred.
export const splitConvexPolygon = (points: Point[], lineStart: Point, lineEnd: Point): [Point[], Point[]] | null => {
    if (points.length < 3) return null;

    const poly1: Point[] = [];
    const poly2: Point[] = [];

    // Sutherland-Hodgman style clip
    for (let i = 0; i < points.length; i++) {
        const current = points[i];
        const next = points[(i + 1) % points.length];

        const distCurrent = signedDistanceToLine(lineStart, lineEnd, current);
        const distNext = signedDistanceToLine(lineStart, lineEnd, next);
        if (distCurrent === null || distNext === null) return null; // degenerate cut

        const sideCurrent = Math.abs(distCurrent) <= ON_LINE_EPSILON_PX ? 0 : Math.sign(distCurrent);
        const sideNext = Math.abs(distNext) <= ON_LINE_EPSILON_PX ? 0 : Math.sign(distNext);

        // A vertex lying ON the cut belongs to BOTH halves — it is a corner of each. Filing it into
        // one side only is what made a corner-to-corner cut fail: the far side was left holding a
        // single vertex, below the three-point minimum, so the whole split was rejected.
        if (sideCurrent === 0) {
            poly1.push(current);
            poly2.push(current);
        } else if (sideCurrent > 0) {
            poly1.push(current);
        } else {
            poly2.push(current);
        }

        // Only a strict sign change crosses the line mid-edge and needs a new shared point. When an
        // endpoint sits on the line, that vertex is already the crossing and is already in both.
        if (sideCurrent * sideNext < 0) {
            const intersection = getIntersection(lineStart, lineEnd, current, next);
            if (intersection) {
                // The intersection point belongs to both resulting polygons
                poly1.push(intersection);
                poly2.push(intersection);
            }
        }
    }

    // A valid split needs two real polygons. Count DISTINCT points: a cut that merely grazes an
    // edge leaves one side holding just the two shared vertices of that edge, which is a line, not
    // a shape, and must still be rejected.
    if (distinctPointCount(poly1) >= 3 && distinctPointCount(poly2) >= 3) {
        return [poly1, poly2];
    }

    return null;
};

/** Returns true if (px, py) is inside the given panel shape (page-local coords). */
export function pointInPanel(
    shapeType: 'rect' | 'polygon' | 'ellipse' | 'halfCircle' | 'quarterCircle' | 'sector',
    x: number,
    y: number,
    width: number,
    height: number,
    points: { x: number; y: number }[] | undefined,
    px: number,
    py: number,
    centralAngle?: number
): boolean {
    if (shapeType === 'rect') {
        return px >= x && px <= x + width && py >= y && py <= y + height;
    }
    if (shapeType === 'ellipse') {
        const cx = x + width / 2;
        const cy = y + height / 2;
        const rx = width / 2;
        const ry = height / 2;
        return ((px - cx) ** 2) / (rx * rx) + ((py - cy) ** 2) / (ry * ry) <= 1;
    }
    // PAN-7: the circular primitives are radius-min(w,h)-based, not full ellipses — hit-test the
    // actual visible shape so image drops don't target the empty region beside the wedge/dome.
    if (shapeType === 'halfCircle') {
        const r = Math.min(width, height) / 2;
        const cx = x + width / 2, cy = y + height / 2;
        // Dome bulges up from the chord at the panel's vertical centre.
        return (px - cx) ** 2 + (py - cy) ** 2 <= r * r && py <= cy;
    }
    if (shapeType === 'quarterCircle') {
        const r = Math.min(width, height);
        const lx = px - x, ly = py - y; // quarter disk anchored at the panel's top-left corner
        return lx >= 0 && ly >= 0 && lx * lx + ly * ly <= r * r;
    }
    if (shapeType === 'sector') {
        const r = Math.min(width, height) / 2;
        const cx = x + width / 2, cy = y + height / 2;
        const dx = px - cx, dy = py - cy;
        if (dx * dx + dy * dy > r * r) return false;
        let ang = Math.atan2(dy, dx); // 0 = +x, increases downward (Konva y-down)
        if (ang < 0) ang += Math.PI * 2;
        const sweep = (Math.max(1, Math.min(360, centralAngle ?? 90)) * Math.PI) / 180;
        return ang <= sweep;
    }
    if (shapeType === 'polygon' && points && points.length >= 3) {
        const n = points.length;
        let inside = false;
        for (let i = 0, j = n - 1; i < n; j = i++) {
            const xi = x + points[i].x;
            const yi = y + points[i].y;
            const xj = x + points[j].x;
            const yj = y + points[j].y;
            if (((yi > py) !== (yj > py)) && (px < (xj - xi) * (py - yi) / (yj - yi) + xi)) inside = !inside;
        }
        return inside;
    }
    return false;
}
