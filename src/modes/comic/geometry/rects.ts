import type { AbsoluteRect, NormalizedRect } from '../types/comicGeometry';

export type ComicRect = NormalizedRect;
export type ComicAbsoluteRect = AbsoluteRect;

export type ComicRectDelta = {
  x: number;
  y: number;
};

export type ComicPageSize = {
  width: number;
  height: number;
};

export type ComicRectClampOptions = {
  minWidth?: number;
  minHeight?: number;
};

const DEFAULT_PRECISION = 1000;

export function roundGeometryValue(value: number): number {
  return Math.round(value * DEFAULT_PRECISION) / DEFAULT_PRECISION;
}

export function roundRect(rect: ComicRect): ComicRect {
  return {
    x: roundGeometryValue(rect.x),
    y: roundGeometryValue(rect.y),
    width: roundGeometryValue(rect.width),
    height: roundGeometryValue(rect.height),
  };
}

function clampValue(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function clampRectToPage(rect: ComicRect, options: ComicRectClampOptions = {}): ComicRect {
  const minWidth = options.minWidth ?? 0;
  const minHeight = options.minHeight ?? 0;
  const width = clampValue(rect.width, minWidth, 1);
  const height = clampValue(rect.height, minHeight, 1);
  const x = clampValue(rect.x, 0, 1 - width);
  const y = clampValue(rect.y, 0, 1 - height);

  return roundRect({ x, y, width, height });
}
