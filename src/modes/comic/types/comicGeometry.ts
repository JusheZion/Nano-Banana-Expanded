export type ComicCoordinateSpace = 'absolute' | 'normalized';

export interface ComicPoint {
  x: number;
  y: number;
}

export interface NormalizedRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface AbsoluteRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ComicTransform {
  x: number;
  y: number;
  width?: number;
  height?: number;
  rotation?: number;
  scaleX?: number;
  scaleY?: number;
  flipX?: boolean;
  flipY?: boolean;
}

export type ComicPanelShape = 'rect' | 'polygon' | 'ellipse' | 'halfCircle' | 'quarterCircle' | 'sector';

export interface ComicPanelGeometry {
  shapeType: ComicPanelShape;
  coordinateSpace: ComicCoordinateSpace;
  bounds: AbsoluteRect | NormalizedRect;
  points?: ComicPoint[];
  centralAngle?: number;
  order?: number;
  locked?: boolean;
}

export interface ComicPageGeometry {
  coordinateSpace: 'absolute';
  width: number;
  height: number;
  gutterSize?: number;
  background?: string;
  isCover?: boolean;
}
