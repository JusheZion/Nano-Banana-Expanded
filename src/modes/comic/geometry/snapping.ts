import { clampRectToPage, roundGeometryValue, type ComicRect } from './rects';

export type ComicSnapAxis = 'x' | 'y';
export type ComicSnapSource = 'margin' | 'gutter';

export type ComicSnapGuide = {
  axis: ComicSnapAxis;
  position: number;
  source: ComicSnapSource;
};

export type ComicSnapResult = {
  rect: ComicRect;
  snapped: boolean;
  guides: ComicSnapGuide[];
};

export type SnapRectToMarginsOptions = {
  margin?: number;
  threshold?: number;
};

export type SnapRectToGuttersOptions = {
  gutter?: number;
  threshold?: number;
};

type SnapCandidate = {
  axis: ComicSnapAxis;
  edge: 'start' | 'end';
  target: number;
  source: ComicSnapSource;
};

const DEFAULT_MARGIN = 0.04;
const DEFAULT_GUTTER = 0.017;
const DEFAULT_THRESHOLD = 0.015;

function applyCandidate(rect: ComicRect, candidate: SnapCandidate): ComicRect {
  if (candidate.axis === 'x') {
    return {
      ...rect,
      x: candidate.edge === 'start' ? candidate.target : candidate.target - rect.width,
    };
  }
  return {
    ...rect,
    y: candidate.edge === 'start' ? candidate.target : candidate.target - rect.height,
  };
}

function findSnapCandidate(rect: ComicRect, candidates: SnapCandidate[], threshold: number): SnapCandidate | null {
  return candidates.reduce<{ candidate: SnapCandidate; distance: number } | null>((nearest, candidate) => {
    const current = candidate.axis === 'x'
      ? candidate.edge === 'start'
        ? rect.x
        : rect.x + rect.width
      : candidate.edge === 'start'
        ? rect.y
        : rect.y + rect.height;
    const distance = Math.abs(current - candidate.target);
    if (distance > threshold) return nearest;
    if (!nearest || distance < nearest.distance) return { candidate, distance };
    return nearest;
  }, null)?.candidate ?? null;
}

function candidateDistance(rect: ComicRect, candidate: SnapCandidate): number {
  const current = candidate.axis === 'x'
    ? candidate.edge === 'start'
      ? rect.x
      : rect.x + rect.width
    : candidate.edge === 'start'
      ? rect.y
      : rect.y + rect.height;
  return Math.abs(current - candidate.target);
}

function findSnapCandidateForEdge(
  rect: ComicRect,
  candidates: SnapCandidate[],
  axis: ComicSnapAxis,
  edge: SnapCandidate['edge'],
  threshold: number,
): SnapCandidate | null {
  return candidates
    .filter((candidate) => candidate.axis === axis && candidate.edge === edge)
    .reduce<{ candidate: SnapCandidate; distance: number } | null>((nearest, candidate) => {
      const distance = candidateDistance(rect, candidate);
      if (distance > threshold) return nearest;
      if (!nearest || distance < nearest.distance) return { candidate, distance };
      return nearest;
    }, null)?.candidate ?? null;
}

function snapRect(rect: ComicRect, candidates: SnapCandidate[], threshold: number): ComicSnapResult {
  let nextRect = rect;
  const guides: ComicSnapGuide[] = [];

  for (const axis of ['x', 'y'] as const) {
    const axisCandidates = candidates.filter((item) => item.axis === axis);
    const startCandidate = findSnapCandidateForEdge(nextRect, axisCandidates, axis, 'start', threshold);
    const endCandidate = findSnapCandidateForEdge(nextRect, axisCandidates, axis, 'end', threshold);

    if (startCandidate && endCandidate && endCandidate.target > startCandidate.target) {
      if (axis === 'x') {
        nextRect = { ...nextRect, x: startCandidate.target, width: endCandidate.target - startCandidate.target };
      } else {
        nextRect = { ...nextRect, y: startCandidate.target, height: endCandidate.target - startCandidate.target };
      }
      guides.push(
        { axis, position: roundGeometryValue(startCandidate.target), source: startCandidate.source },
        { axis, position: roundGeometryValue(endCandidate.target), source: endCandidate.source },
      );
      continue;
    }

    const candidate = startCandidate ?? endCandidate ?? findSnapCandidate(nextRect, axisCandidates, threshold);
    if (candidate) {
      nextRect = applyCandidate(nextRect, candidate);
      guides.push({
        axis,
        position: roundGeometryValue(candidate.target),
        source: candidate.source,
      });
    }
  }

  return {
    rect: clampRectToPage(nextRect),
    snapped: guides.length > 0,
    guides,
  };
}

export function snapRectToMargins(rect: ComicRect, options: SnapRectToMarginsOptions = {}): ComicSnapResult {
  const margin = options.margin ?? DEFAULT_MARGIN;
  const threshold = options.threshold ?? DEFAULT_THRESHOLD;
  const candidates: SnapCandidate[] = [
    { axis: 'x', edge: 'start', target: margin, source: 'margin' },
    { axis: 'x', edge: 'end', target: 1 - margin, source: 'margin' },
    { axis: 'y', edge: 'start', target: margin, source: 'margin' },
    { axis: 'y', edge: 'end', target: 1 - margin, source: 'margin' },
  ];

  return snapRect(rect, candidates, threshold);
}

export function snapRectToGutters(
  rect: ComicRect,
  otherRects: ComicRect[],
  options: SnapRectToGuttersOptions = {},
): ComicSnapResult {
  const gutter = options.gutter ?? DEFAULT_GUTTER;
  const threshold = options.threshold ?? DEFAULT_THRESHOLD;
  const candidates = otherRects.flatMap((otherRect): SnapCandidate[] => [
    { axis: 'x', edge: 'start', target: otherRect.x + otherRect.width + gutter, source: 'gutter' },
    { axis: 'x', edge: 'end', target: otherRect.x - gutter, source: 'gutter' },
    { axis: 'y', edge: 'start', target: otherRect.y + otherRect.height + gutter, source: 'gutter' },
    { axis: 'y', edge: 'end', target: otherRect.y - gutter, source: 'gutter' },
  ]);

  return snapRect(rect, candidates, threshold);
}
