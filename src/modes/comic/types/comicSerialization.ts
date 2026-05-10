import type { ComicPageGeometry } from './comicGeometry';
import {
  isComicAssetObject,
  isComicBalloonObject,
  isComicPanelObject,
  normalizeLegacyComicObject,
  type ComicAssetObject,
  type ComicBalloonObject,
  type ComicDrawingObject,
  type ComicLayer,
  type ComicObject,
  type ComicPanelObject,
} from './comicObjects';

export interface SerializedComicPage {
  id: string;
  geometry: ComicPageGeometry;
  objects: ComicObject[];
  layers: ComicLayer[];
  panels: ComicPanelObject[];
  balloons: ComicBalloonObject[];
  drawings: ComicDrawingObject[];
  overlays: ComicAssetObject[];
  background?: string;
  layerOrder: string[];
  isCover?: boolean;
  [legacyField: string]: unknown;
}

export interface SerializedComicDocument {
  version: string;
  type: 'comic-project' | 'comic-document';
  pages: SerializedComicPage[];
  projectSettings?: Record<string, unknown>;
  gutterSize?: number;
  pageSettings?: Record<string, unknown>;
  templates?: unknown[];
  groupsByPage?: Record<string, string[][]>;
  metadata?: Record<string, unknown>;
  [legacyField: string]: unknown;
}

export type SerializedLegacyComicPage = Record<string, unknown> & {
  id: string;
  panels: Record<string, unknown>[];
  balloons: Record<string, unknown>[];
  drawings: Record<string, unknown>[];
  overlays: Record<string, unknown>[];
  layerOrder: string[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function readNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function readStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

function readObjectArray(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value) ? value.filter(isRecord) : [];
}

function objectLayerFlags(object: ComicObject | undefined): Pick<ComicLayer, 'isLocked' | 'isVisible'> {
  return {
    isLocked: object?.isLocked === true,
    isVisible: object?.isVisible === false ? false : true,
  };
}

export function normalizeLegacyComicPage(value: unknown): SerializedComicPage | null {
  if (!isRecord(value)) return null;

  const id = readString(value.id);
  if (!id) return null;

  const panels = readObjectArray(value.panels)
    .map(normalizeLegacyComicObject)
    .filter(isComicPanelObject);
  const balloons = readObjectArray(value.balloons)
    .map(normalizeLegacyComicObject)
    .filter(isComicBalloonObject);
  const drawings = readObjectArray(value.drawings)
    .map(normalizeLegacyComicObject)
    .filter((object): object is ComicDrawingObject => object?.kind === 'drawing' && object.type === 'drawing');
  const overlays = readObjectArray(value.overlays)
    .map(normalizeLegacyComicObject)
    .filter(isComicAssetObject);
  const objects: ComicObject[] = [...panels, ...balloons, ...drawings, ...overlays];
  const objectsById = new Map(objects.map((object) => [object.id, object]));
  const layerOrder = readStringArray(value.layerOrder);
  const layerObjectIds = [...layerOrder, ...objects.map((object) => object.id).filter((objectId) => !layerOrder.includes(objectId))];
  const layers = layerObjectIds.map((objectId, order): ComicLayer => {
    const object = objectsById.get(objectId);
    return {
      id: `layer-${objectId}`,
      objectId,
      kind: object?.kind ?? 'asset',
      order,
      ...objectLayerFlags(object),
      ...(typeof object?.zIndex === 'number' && { zIndex: object.zIndex }),
      source: layerOrder.includes(objectId) ? 'layerOrder' : 'generated',
    };
  });
  const background = readString(value.background);

  return {
    ...value,
    id,
    geometry: {
      coordinateSpace: 'absolute',
      width: readNumber(value.width) ?? 800,
      height: readNumber(value.height) ?? 1200,
      ...(background && { background }),
      ...(typeof value.isCover === 'boolean' && { isCover: value.isCover }),
    },
    objects,
    layers,
    panels,
    balloons,
    drawings,
    overlays,
    background,
    layerOrder,
    ...(typeof value.isCover === 'boolean' && { isCover: value.isCover }),
  };
}

function legacyObjectFromCanonical(object: ComicObject): Record<string, unknown> {
  const legacy = { ...object } as Record<string, unknown>;
  delete legacy.kind;
  delete legacy.geometry;
  delete legacy.transform;
  delete legacy.image;
  delete legacy.assetType;
  delete legacy.metadata;

  if (isComicPanelObject(object) && object.image) {
    legacy.imageUrl = readString(legacy.imageUrl) ?? object.image.url;
    legacy.imageFillMode = readString(legacy.imageFillMode) ?? object.image.fit;
    legacy.imageOffsetX = readNumber(legacy.imageOffsetX) ?? object.image.offsetX;
    legacy.imageOffsetY = readNumber(legacy.imageOffsetY) ?? object.image.offsetY;
    legacy.imageScale = readNumber(legacy.imageScale) ?? object.image.scale;
    legacy.imageFocusX = readNumber(legacy.imageFocusX) ?? object.image.focusX;
    legacy.imageFocusY = readNumber(legacy.imageFocusY) ?? object.image.focusY;
    legacy.prompt = readString(legacy.prompt) ?? object.image.prompt;
  }

  if (isComicAssetObject(object) && object.type === 'asset') {
    legacy.type = object.assetType === 'sfx' ? 'sfx' : 'image';
  }

  return legacy;
}

export function serializeComicPageForLegacyStore(page: SerializedComicPage | null): SerializedLegacyComicPage {
  if (!page) {
    throw new Error('Cannot serialize an empty comic page.');
  }

  const legacy = { ...page } as Record<string, unknown>;
  delete legacy.geometry;
  delete legacy.objects;
  delete legacy.layers;

  legacy.panels = page.panels.map(legacyObjectFromCanonical);
  legacy.balloons = page.balloons.map(legacyObjectFromCanonical);
  legacy.drawings = page.drawings.map(legacyObjectFromCanonical);
  legacy.overlays = page.overlays.map(legacyObjectFromCanonical);
  legacy.layerOrder = [...page.layerOrder];

  return legacy as SerializedLegacyComicPage;
}
