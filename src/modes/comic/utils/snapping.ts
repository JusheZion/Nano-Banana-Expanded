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

const SNAP_THRESHOLD = 8; // Default for dragging panels
const VERTEX_SNAP_THRESHOLD = 20; // More aggressive for points/edges

export const getBoundingBox = (item: Panel | BalloonInstance): BoundingBox => {
    if (item.type === 'panel' && item.shapeType === 'polygon' && item.points) {
        // Polygons have internal absolute coordinates offset by the group's (x, y)
        const xs = item.points.map(pt => pt.x + item.x);
        const ys = item.points.map(pt => pt.y + item.y);
        const minX = Math.min(...xs);
        const maxX = Math.max(...xs);
        const minY = Math.min(...ys);
        const maxY = Math.max(...ys);
        return {
            x: minX,
            y: minY,
            width: maxX - minX,
            height: maxY - minY
        };
    }
    return {
        x: item.x,
        y: item.y,
        width: item.width,
        height: item.height
    };
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

    // The moving element's key alignment points
    const pointsX = [
        proposedX,                   // Left
        proposedX + itemWidth / 2,   // Center
        proposedX + itemWidth        // Right
    ];

    const pointsY = [
        proposedY,                   // Top
        proposedY + itemHeight / 2,  // Center
        proposedY + itemHeight       // Bottom
    ];

    let snappedX = false;
    let snappedY = false;

    // Check against all siblings
    for (const sibling of siblings) {
        if (skipId && sibling.id === skipId) continue;

        const box = getBoundingBox(sibling);

        // Sibling's key alignment points
        const targetXs = [
            box.x,                  // Left
            box.x + box.width / 2,  // Center
            box.x + box.width       // Right
        ];

        const targetYs = [
            box.y,                  // Top
            box.y + box.height / 2, // Center
            box.y + box.height      // Bottom
        ];

        // Evaluate X snapping
        if (!snappedX) {
            for (let i = 0; i < pointsX.length; i++) {
                for (let j = 0; j < targetXs.length; j++) {
                    const diff = Math.abs(pointsX[i] - targetXs[j]);
                    if (diff < SNAP_THRESHOLD) {
                        // Calculate offset from the snapping point back to the proposed top-left
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

        // Evaluate Y snapping
        if (!snappedY) {
            for (let i = 0; i < pointsY.length; i++) {
                for (let j = 0; j < targetYs.length; j++) {
                    const diff = Math.abs(pointsY[i] - targetYs[j]);
                    if (diff < SNAP_THRESHOLD) {
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

        // Optimization: if we've snapped on both axes, we can exit early
        // Or, if we want multiple snap lines (e.g. corner snapping), we continue.
        // Continuing allows multiple snap lines to be drawn at the intersection.
    }

    return { newX, newY, snapLines };
};

export interface PointSnapResult {
    newX: number;
    newY: number;
    snapLines: SnapLine[];
}

export const getVertexSnapLines = (
    proposedX: number,
    proposedY: number,
    siblings: (Panel | BalloonInstance)[],
    skipId?: string
): PointSnapResult => {
    let newX = proposedX;
    let newY = proposedY;
    const snapLines: SnapLine[] = [];

    let snappedX = false;
    let snappedY = false;

    for (const sibling of siblings) {
        if (skipId && sibling.id === skipId) continue;

        const box = getBoundingBox(sibling);

        // For point snapping, we snap to sibling bounds and their center
        const targetXs = [box.x, box.x + box.width / 2, box.x + box.width];
        const targetYs = [box.y, box.y + box.height / 2, box.y + box.height];

        // Evaluate X snapping
        if (!snappedX) {
            for (let j = 0; j < targetXs.length; j++) {
                if (Math.abs(proposedX - targetXs[j]) < VERTEX_SNAP_THRESHOLD) {
                    newX = targetXs[j];
                    snapLines.push({ axis: 'x', position: targetXs[j] });
                    snappedX = true;
                    break;
                }
            }
        }

        // Evaluate Y snapping
        if (!snappedY) {
            for (let j = 0; j < targetYs.length; j++) {
                if (Math.abs(proposedY - targetYs[j]) < VERTEX_SNAP_THRESHOLD) {
                    newY = targetYs[j];
                    snapLines.push({ axis: 'y', position: targetYs[j] });
                    snappedY = true;
                    break;
                }
            }
        }
    }

    return { newX, newY, snapLines };
};
