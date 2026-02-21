export interface Point {
    x: number;
    y: number;
}

// Determines if a point is to the left (>0), right (<0), or on (0) the line segment A->B
const sideOfLine = (A: Point, B: Point, P: Point): number => {
    return (B.x - A.x) * (P.y - A.y) - (B.y - A.y) * (P.x - A.x);
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

        const sideCurrent = sideOfLine(lineStart, lineEnd, current);
        const sideNext = sideOfLine(lineStart, lineEnd, next);

        // Add current point to the respective polygon based on which side of the line it falls
        if (sideCurrent >= 0) {
            poly1.push(current);
        } else {
            poly2.push(current);
        }

        // If the edge crosses the line, calculate intersection
        if ((sideCurrent > 0 && sideNext < 0) || (sideCurrent < 0 && sideNext > 0)) {
            const intersection = getIntersection(lineStart, lineEnd, current, next);
            if (intersection) {
                // The intersection point belongs to both resulting polygons
                poly1.push(intersection);
                poly2.push(intersection);
            }
        }
    }

    // A valid split must result in two polygons each having at least 3 points
    if (poly1.length >= 3 && poly2.length >= 3) {
        return [poly1, poly2];
    }

    return null;
};
