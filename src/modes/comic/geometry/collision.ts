import type { ComicRect } from './rects';

function rectsOverlap(a: ComicRect, b: ComicRect): boolean {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

export function detectPanelOverlap(rect: ComicRect, otherRects: ComicRect[]): boolean {
  return otherRects.some((otherRect) => rectsOverlap(rect, otherRect));
}
