import type { AbsoluteRect, NormalizedRect } from '../types/comicGeometry';
import { roundGeometryValue, type ComicPageSize } from './rects';

export function normalizeRect(rect: AbsoluteRect, pageSize: ComicPageSize): NormalizedRect {
  return {
    x: roundGeometryValue(rect.x / pageSize.width),
    y: roundGeometryValue(rect.y / pageSize.height),
    width: roundGeometryValue(rect.width / pageSize.width),
    height: roundGeometryValue(rect.height / pageSize.height),
  };
}

export function denormalizeRect(rect: NormalizedRect, pageSize: ComicPageSize): AbsoluteRect {
  return {
    x: roundGeometryValue(rect.x * pageSize.width),
    y: roundGeometryValue(rect.y * pageSize.height),
    width: roundGeometryValue(rect.width * pageSize.width),
    height: roundGeometryValue(rect.height * pageSize.height),
  };
}
