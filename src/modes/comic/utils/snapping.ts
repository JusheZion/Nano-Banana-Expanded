import type { Panel } from '../../../stores/comicStore';
import type { BalloonInstance } from '../../../types/balloon';

export type SnapAxis = 'x' | 'y';

export interface SnapLine {
    axis: SnapAxis;
    position: number;
}

export interface SnapResult {
    newX: number;
    newY: number;
    snapLines: SnapLine[];
}

export interface BoundingBox {
    x: number;
    y: number;
    width: number;
    height: number;
}

export interface DiagonalGuide {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
}

const SNAP_THRESHOLD = 8;
const VERTEX_SNAP_THRESHOLD = 20;
const DEFAULT_GUTTER = 16;
const GUIDE_EXTENT = 3000;
const DIAG_PROXIMITY = 22;
const DOCSPACE_GUIDE_THRESHOLD = 60;

const PAGE_WIDTH = 800;
const PAGE_HEIGHT = 1200;

const getDocspaceXs = (gutter: number) => [0, PAGE_WIDTH / 2, PAGE_WIDTH, gutter, PAGE_WIDTH - gutter];
const getDocspaceYs = (gutter: number) => [0, PAGE_HEIGHT / 2, PAGE_HEIGHT, gutter, PAGE_HEIGHT - gutter];

export const getBoundingBox = (item: Panel | BalloonInstance): BoundingBox => {
    if (item.type === 'panel' && item.shapeType === 'polygon' && item.points) {
        const xs = item.points.map(pt => pt.x + item.x);
        const ys = item.points.map(pt => pt.y + item.y);
        const minX = Math.min(...xs);
        const maxX = Math.max(...xs);
        const minY = Math.min(...ys);
        const maxY = Math.max(...ys);
        return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
    }
    return { x: item.x, y: item.y, width: item.width, height: item.height };
};

const getAbsoluteVertices = (item: Panel | BalloonInstance): { x: number; y: number }[] => {
    if (item.type === 'panel' && item.shapeType === 'polygon' && item.points) {
        return item.points.map(pt => ({ x: pt.x + item.x, y: pt.y + item.y }));
    }
    const box = getBoundingBox(item);
    return [
        { x: box.x, y: box.y },
        { x: box.x + box.width, y: box.y },
        { x: box.x + box.width, y: box.y + box.height },
        { x: box.x, y: box.y + box.height },
    ];
};

/**
 * Collects all meaningful snap target positions for a sibling,
 * including bounding box edges, center, gutter offsets, and
 * individual polygon vertex positions.
 */
const collectSnapTargets = (sibling: Panel | BalloonInstance, gutter: number) => {
    const box = getBoundingBox(sibling);
    const xs = new Set<number>([
        box.x, box.x + box.width / 2, box.x + box.width,
        box.x - gutter, box.x + box.width + gutter,
    ]);
    const ys = new Set<number>([
        box.y, box.y + box.height / 2, box.y + box.height,
        box.y - gutter, box.y + box.height + gutter,
    ]);

    if (sibling.type === 'panel' && sibling.shapeType === 'polygon' && sibling.points) {
        for (const pt of sibling.points) {
            xs.add(pt.x + sibling.x);
            ys.add(pt.y + sibling.y);
        }
    }

    return { targetXs: [...xs], targetYs: [...ys] };
};

export const getSnapLines = (
    proposedX: number,
    proposedY: number,
    itemWidth: number,
    itemHeight: number,
    siblings: (Panel | BalloonInstance)[],
    skipId?: string
): SnapResult => {
    let newX = proposedX;
    let newY = proposedY;
    const snapLines: SnapLine[] = [];

    const pointsX = [proposedX, proposedX + itemWidth / 2, proposedX + itemWidth];
    const pointsY = [proposedY, proposedY + itemHeight / 2, proposedY + itemHeight];

    let snappedX = false;
    let snappedY = false;

    for (const sibling of siblings) {
        if (skipId && sibling.id === skipId) continue;

        const box = getBoundingBox(sibling);
        const targetXs = [box.x, box.x + box.width / 2, box.x + box.width];
        const targetYs = [box.y, box.y + box.height / 2, box.y + box.height];

        if (!snappedX) {
            for (let i = 0; i < pointsX.length; i++) {
                for (let j = 0; j < targetXs.length; j++) {
                    if (Math.abs(pointsX[i] - targetXs[j]) < SNAP_THRESHOLD) {
                        const offset = pointsX[i] - proposedX;
                        newX = targetXs[j] - offset;
                        snapLines.push({ axis: 'x', position: targetXs[j] });
                        snappedX = true;
                        break;
                    }
                }
                if (snappedX) break;
            }
        }

        if (!snappedY) {
            for (let i = 0; i < pointsY.length; i++) {
                for (let j = 0; j < targetYs.length; j++) {
                    if (Math.abs(pointsY[i] - targetYs[j]) < SNAP_THRESHOLD) {
                        const offset = pointsY[i] - proposedY;
                        newY = targetYs[j] - offset;
                        snapLines.push({ axis: 'y', position: targetYs[j] });
                        snappedY = true;
                        break;
                    }
                }
                if (snappedY) break;
            }
        }
    }

    return { newX, newY, snapLines };
};

/**
 * Gutter-aware variant: snaps to document space boundaries,
 * sibling edges, AND positions one gutter width away from sibling edges.
 */
export const getGutterAwareSnapLines = (
    proposedX: number,
    proposedY: number,
    itemWidth: number,
    itemHeight: number,
    siblings: (Panel | BalloonInstance)[],
    skipId?: string,
    gutter: number = DEFAULT_GUTTER
): SnapResult => {
    let newX = proposedX;
    let newY = proposedY;
    const snapLines: SnapLine[] = [];
    const DOCSPACE_XS = getDocspaceXs(gutter);
    const DOCSPACE_YS = getDocspaceYs(gutter);

    const pointsX = [proposedX, proposedX + itemWidth / 2, proposedX + itemWidth];
    const pointsY = [proposedY, proposedY + itemHeight / 2, proposedY + itemHeight];

    let snappedX = false;
    let snappedY = false;

    // Check docspace boundaries first
    if (!snappedX) {
        for (let i = 0; i < pointsX.length; i++) {
            for (const dx of DOCSPACE_XS) {
                if (Math.abs(pointsX[i] - dx) < SNAP_THRESHOLD) {
                    const offset = pointsX[i] - proposedX;
                    newX = dx - offset;
                    snapLines.push({ axis: 'x', position: dx });
                    snappedX = true;
                    break;
                }
            }
            if (snappedX) break;
        }
    }

    if (!snappedY) {
        for (let i = 0; i < pointsY.length; i++) {
            for (const dy of DOCSPACE_YS) {
                if (Math.abs(pointsY[i] - dy) < SNAP_THRESHOLD) {
                    const offset = pointsY[i] - proposedY;
                    newY = dy - offset;
                    snapLines.push({ axis: 'y', position: dy });
                    snappedY = true;
                    break;
                }
            }
            if (snappedY) break;
        }
    }

    for (const sibling of siblings) {
        if (skipId && sibling.id === skipId) continue;

        const box = getBoundingBox(sibling);

        const targetXs = [
            box.x, box.x + box.width / 2, box.x + box.width,
            box.x - gutter,
            box.x + box.width + gutter,
        ];
        const targetYs = [
            box.y, box.y + box.height / 2, box.y + box.height,
            box.y - gutter,
            box.y + box.height + gutter,
        ];

        if (!snappedX) {
            for (let i = 0; i < pointsX.length; i++) {
                for (let j = 0; j < targetXs.length; j++) {
                    if (Math.abs(pointsX[i] - targetXs[j]) < SNAP_THRESHOLD) {
                        const offset = pointsX[i] - proposedX;
                        newX = targetXs[j] - offset;
                        snapLines.push({ axis: 'x', position: targetXs[j] });
                        snappedX = true;
                        break;
                    }
                }
                if (snappedX) break;
            }
        }

        if (!snappedY) {
            for (let i = 0; i < pointsY.length; i++) {
                for (let j = 0; j < targetYs.length; j++) {
                    if (Math.abs(pointsY[i] - targetYs[j]) < SNAP_THRESHOLD) {
                        const offset = pointsY[i] - proposedY;
                        newY = targetYs[j] - offset;
                        snapLines.push({ axis: 'y', position: targetYs[j] });
                        snappedY = true;
                        break;
                    }
                }
                if (snappedY) break;
            }
        }
    }

    return { newX, newY, snapLines };
};

export interface PointSnapResult {
    newX: number;
    newY: number;
    snapLines: SnapLine[];
    diagonalGuides: DiagonalGuide[];
}

/**
 * Vertex/edge snap with visual guides.
 *
 * Snaps to: sibling bounding box edges, centers, gutter offsets,
 * and individual polygon vertex positions. Emits DiagonalGuide
 * entries for every active snap (H, V, or diagonal).
 *
 * Diagonal: perpendicular distance from the dragged vertex to the
 * infinite extension of each non-axis-aligned sibling edge.
 */
export const getVertexSnapLines = (
    proposedX: number,
    proposedY: number,
    siblings: (Panel | BalloonInstance)[],
    skipId?: string,
    gutter: number = DEFAULT_GUTTER
): PointSnapResult => {
    let newX = proposedX;
    let newY = proposedY;
    const snapLines: SnapLine[] = [];
    const diagonalGuides: DiagonalGuide[] = [];
    const DOCSPACE_XS = getDocspaceXs(gutter);
    const DOCSPACE_YS = getDocspaceYs(gutter);

    let bestDiffX = Infinity;
    let bestDiffY = Infinity;
    let bestSnapX = proposedX;
    let bestSnapY = proposedY;

    // Docspace boundaries: snap position when close
    for (const dx of DOCSPACE_XS) {
        const diff = Math.abs(proposedX - dx);
        if (diff < VERTEX_SNAP_THRESHOLD && diff < bestDiffX) {
            bestDiffX = diff;
            bestSnapX = dx;
        }
    }
    for (const dy of DOCSPACE_YS) {
        const diff = Math.abs(proposedY - dy);
        if (diff < VERTEX_SNAP_THRESHOLD && diff < bestDiffY) {
            bestDiffY = diff;
            bestSnapY = dy;
        }
    }

    for (const sibling of siblings) {
        if (skipId && sibling.id === skipId) continue;

        const { targetXs, targetYs } = collectSnapTargets(sibling, gutter);

        for (const tx of targetXs) {
            const diff = Math.abs(proposedX - tx);
            if (diff < VERTEX_SNAP_THRESHOLD && diff < bestDiffX) {
                bestDiffX = diff;
                bestSnapX = tx;
            }
        }

        for (const ty of targetYs) {
            const diff = Math.abs(proposedY - ty);
            if (diff < VERTEX_SNAP_THRESHOLD && diff < bestDiffY) {
                bestDiffY = diff;
                bestSnapY = ty;
            }
        }

        // --- Diagonal: perpendicular distance to extended non-H/V edges ---
        const verts = getAbsoluteVertices(sibling);
        for (let vi = 0; vi < verts.length; vi++) {
            const a = verts[vi];
            const b = verts[(vi + 1) % verts.length];

            const edgeDx = b.x - a.x;
            const edgeDy = b.y - a.y;
            const edgeLen = Math.sqrt(edgeDx * edgeDx + edgeDy * edgeDy);
            if (edgeLen < 1) continue;

            // Skip near-horizontal or near-vertical edges (handled by H/V snap)
            if (Math.abs(edgeDx) < 2 || Math.abs(edgeDy) < 2) continue;

            const dist = Math.abs(
                edgeDy * proposedX - edgeDx * proposedY + b.x * a.y - b.y * a.x
            ) / edgeLen;

            if (dist < DIAG_PROXIMITY) {
                const dirX = edgeDx / edgeLen;
                const dirY = edgeDy / edgeLen;
                const midX = (a.x + b.x) / 2;
                const midY = (a.y + b.y) / 2;
                diagonalGuides.push({
                    x1: midX - dirX * GUIDE_EXTENT,
                    y1: midY - dirY * GUIDE_EXTENT,
                    x2: midX + dirX * GUIDE_EXTENT,
                    y2: midY + dirY * GUIDE_EXTENT,
                });
            }
        }
    }

    // Apply best snaps. When either axis snaps, emit a crosshair (both H+V)
    // so the user always gets a reference line on both axes near workspace edges.
    const xHit = bestDiffX < Infinity;
    const yHit = bestDiffY < Infinity;

    if (xHit) newX = bestSnapX;
    if (yHit) newY = bestSnapY;

    if (xHit || yHit) {
        snapLines.push({ axis: 'x', position: xHit ? bestSnapX : proposedX });
        snapLines.push({ axis: 'y', position: yHit ? bestSnapY : proposedY });
    }

    // Visual-only docspace edge guides at a wider threshold.
    // These don't move the vertex — they just show the nearest page boundary
    // so the user can see the edge they're approaching.
    for (const dx of DOCSPACE_XS) {
        const diff = Math.abs(proposedX - dx);
        if (diff < DOCSPACE_GUIDE_THRESHOLD && diff >= VERTEX_SNAP_THRESHOLD) {
            snapLines.push({ axis: 'x', position: dx });
        }
    }
    for (const dy of DOCSPACE_YS) {
        const diff = Math.abs(proposedY - dy);
        if (diff < DOCSPACE_GUIDE_THRESHOLD && diff >= VERTEX_SNAP_THRESHOLD) {
            snapLines.push({ axis: 'y', position: dy });
        }
    }

    return { newX, newY, snapLines, diagonalGuides };
};
