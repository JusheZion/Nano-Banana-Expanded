import type { BalloonOverrides, BalloonStyleId, Point as BalloonPoint } from '@/types/balloon';
import type { GradientSpec } from './gradient';
import type { ComicPanelGeometry, ComicPanelShape, ComicPoint, ComicTransform } from './comicGeometry';

export type ComicObjectKind = 'panel' | 'balloon' | 'text' | 'asset' | 'drawing';
export type ComicImageFit = 'cover' | 'contain' | 'stretch' | 'center' | 'decal';
export type ComicAssetSubtype = 'image' | 'sfx' | 'asset';

export interface ComicBaseObject {
  id: string;
  kind: ComicObjectKind;
  type?: string;
  pageId?: string;
  name?: string;
  transform?: ComicTransform;
  isLocked?: boolean;
  isVisible?: boolean;
  opacity?: number;
  metadata?: Record<string, unknown>;
  [legacyField: string]: unknown;
}

export interface ComicPanelImage {
  url: string;
  fit?: ComicImageFit;
  offsetX?: number;
  offsetY?: number;
  scale?: number;
  focusX?: number;
  focusY?: number;
  prompt?: string;
  returnedAt?: string;
  source?: 'imageshop' | 'vault' | 'upload' | 'paste' | 'legacy';
  [legacyField: string]: unknown;
}

export interface ComicPanelObject extends ComicBaseObject {
  kind: 'panel';
  type: 'panel';
  shapeType?: ComicPanelShape;
  geometry: ComicPanelGeometry;
  image?: ComicPanelImage;
  prompt?: string;
  strokeColor?: string;
  fillGradient?: GradientSpec;
  strokeGradient?: GradientSpec;
  points?: ComicPoint[];
  centralAngle?: number;
}

export interface ComicBalloonObject extends ComicBaseObject {
  kind: 'balloon';
  type: 'balloon';
  text: string;
  styleId?: BalloonStyleId;
  hasTail?: boolean;
  tailBasePoint?: BalloonPoint;
  tailTip?: BalloonPoint;
  overrides?: BalloonOverrides;
  fontFamily?: string;
  autoSize?: boolean;
  padding?: number;
}

export interface ComicTextObject extends ComicBaseObject {
  kind: 'text';
  type: 'text';
  text: string;
  fontFamily?: string;
  fontSize?: number;
  color?: string;
  textAlign?: 'left' | 'center' | 'right';
}

export interface ComicAssetObject extends ComicBaseObject {
  kind: 'asset';
  type: ComicAssetSubtype;
  assetType: ComicAssetSubtype;
  src: string;
  text?: string;
  zIndex?: number;
}

export interface ComicDrawingObject extends ComicBaseObject {
  kind: 'drawing';
  type: 'drawing';
  points: number[];
  stroke?: string;
  strokeWidth?: number;
}

export type ComicObject =
  | ComicPanelObject
  | ComicBalloonObject
  | ComicTextObject
  | ComicAssetObject
  | ComicDrawingObject;

export interface ComicLayer {
  id: string;
  objectId: string;
  kind: ComicObjectKind;
  order: number;
  name?: string;
  isLocked: boolean;
  isVisible: boolean;
  groupId?: string;
  zIndex?: number;
  source?: 'layerOrder' | 'overlay-zIndex' | 'generated';
  [legacyField: string]: unknown;
}

const PANEL_SHAPES = new Set<ComicPanelShape>(['rect', 'polygon', 'ellipse', 'halfCircle', 'quarterCircle', 'sector']);
const IMAGE_FITS = new Set<ComicImageFit>(['cover', 'contain', 'stretch', 'center', 'decal']);
const ASSET_TYPES = new Set<ComicAssetSubtype>(['asset', 'image', 'sfx']);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function readNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function readBoolean(value: unknown): boolean | undefined {
  return typeof value === 'boolean' ? value : undefined;
}

function readPanelShape(value: unknown): ComicPanelShape {
  return typeof value === 'string' && PANEL_SHAPES.has(value as ComicPanelShape) ? (value as ComicPanelShape) : 'rect';
}

function readImageFit(value: unknown): ComicImageFit | undefined {
  return typeof value === 'string' && IMAGE_FITS.has(value as ComicImageFit) ? (value as ComicImageFit) : undefined;
}

function readAssetType(value: unknown): ComicAssetSubtype {
  return typeof value === 'string' && ASSET_TYPES.has(value as ComicAssetSubtype) ? (value as ComicAssetSubtype) : 'asset';
}

function readPoints(value: unknown): ComicPoint[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const points = value
    .filter(isRecord)
    .map((point) => {
      const x = readNumber(point.x);
      const y = readNumber(point.y);
      return x == null || y == null ? null : { x, y };
    })
    .filter((point): point is ComicPoint => point !== null);
  return points.length > 0 ? points : undefined;
}

function buildTransform(record: Record<string, unknown>): ComicTransform | undefined {
  const x = readNumber(record.x);
  const y = readNumber(record.y);
  const width = readNumber(record.width);
  const height = readNumber(record.height);
  const rotation = readNumber(record.rotation);
  const scaleX = readNumber(record.scaleX);
  const scaleY = readNumber(record.scaleY);
  const flipX = readBoolean(record.flipX);
  const flipY = readBoolean(record.flipY);
  const hasTransform = [x, y, width, height, rotation, scaleX, scaleY, flipX, flipY].some((value) => value != null);

  if (!hasTransform) return undefined;

  return {
    x: x ?? 0,
    y: y ?? 0,
    ...(width != null && { width }),
    ...(height != null && { height }),
    ...(rotation != null && { rotation }),
    ...(scaleX != null && { scaleX }),
    ...(scaleY != null && { scaleY }),
    ...(flipX != null && { flipX }),
    ...(flipY != null && { flipY }),
  };
}

function buildPanelImage(record: Record<string, unknown>): ComicPanelImage | undefined {
  const url = readString(record.imageUrl) ?? readString(record.url);
  if (!url) return undefined;

  return {
    url,
    fit: readImageFit(record.imageFillMode),
    offsetX: readNumber(record.imageOffsetX),
    offsetY: readNumber(record.imageOffsetY),
    scale: readNumber(record.imageScale),
    focusX: readNumber(record.imageFocusX),
    focusY: readNumber(record.imageFocusY),
    prompt: readString(record.prompt),
    returnedAt: readString(record.returnedAt),
    source: readString(record.source) as ComicPanelImage['source'],
  };
}

export function isComicPanelObject(value: unknown): value is ComicPanelObject {
  return isRecord(value) && value.kind === 'panel' && value.type === 'panel' && isRecord(value.geometry);
}

export function isComicBalloonObject(value: unknown): value is ComicBalloonObject {
  return isRecord(value) && value.kind === 'balloon' && value.type === 'balloon' && typeof value.text === 'string';
}

export function isComicTextObject(value: unknown): value is ComicTextObject {
  return isRecord(value) && value.kind === 'text' && value.type === 'text' && typeof value.text === 'string';
}

export function isComicAssetObject(value: unknown): value is ComicAssetObject {
  return (
    isRecord(value) &&
    value.kind === 'asset' &&
    typeof value.type === 'string' &&
    ASSET_TYPES.has(value.type as ComicAssetSubtype) &&
    typeof value.src === 'string'
  );
}

export function normalizeLegacyComicObject(value: unknown): ComicObject | null {
  if (!isRecord(value)) return null;

  const id = readString(value.id);
  const type = readString(value.type);
  const kind = readString(value.kind);

  if (!id) return null;

  if (type === 'panel' || kind === 'panel') {
    const x = readNumber(value.x) ?? 0;
    const y = readNumber(value.y) ?? 0;
    const width = readNumber(value.width) ?? 0;
    const height = readNumber(value.height) ?? 0;
    const shapeType = readPanelShape(value.shapeType);
    const points = readPoints(value.points);
    const centralAngle = readNumber(value.centralAngle);

    return {
      ...value,
      id,
      kind: 'panel',
      type: 'panel',
      shapeType,
      geometry: {
        shapeType,
        coordinateSpace: 'absolute',
        bounds: { x, y, width, height },
        ...(points && { points }),
        ...(centralAngle != null && { centralAngle }),
      },
      transform: buildTransform(value),
      image: buildPanelImage(value),
    };
  }

  if (type === 'balloon' || kind === 'balloon') {
    return {
      ...value,
      id,
      kind: 'balloon',
      type: 'balloon',
      text: readString(value.text) ?? '',
      transform: buildTransform(value),
    };
  }

  if (type === 'text' || kind === 'text') {
    return {
      ...value,
      id,
      kind: 'text',
      type: 'text',
      text: readString(value.text) ?? '',
      transform: buildTransform(value),
    };
  }

  if (type === 'drawing' || kind === 'drawing') {
    return {
      ...value,
      id,
      kind: 'drawing',
      type: 'drawing',
      points: Array.isArray(value.points) ? value.points.filter((point): point is number => typeof point === 'number') : [],
    };
  }

  if (type === 'image' || type === 'sfx' || type === 'asset' || kind === 'asset') {
    const src = readString(value.src) ?? readString(value.imageUrl);
    if (!src) return null;
    const assetType = readAssetType(type);
    return {
      ...value,
      id,
      kind: 'asset',
      type: assetType,
      assetType,
      src,
      transform: buildTransform(value),
    };
  }

  return null;
}
