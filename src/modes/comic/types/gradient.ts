/**
 * Phase 15: Gradient and color types for panels, balloons, and text.
 */

export interface Point {
  x: number;
  y: number;
}

/** Single color stop: offset 0–1, hex color, optional brightness 0–100 and alpha 0–1. */
export interface GradientStop {
  offset: number;
  color: string;
  brightness?: number; // 0–100, default 100
  alpha?: number;    // 0–1, default 1
}

export type GradientType = 'linear' | 'radial' | 'rect';

/** Gradient definition for Konva fill/stroke. Stops are sorted by offset before rendering. */
export interface GradientSpec {
  type: GradientType;
  /** Linear: angle in degrees (0 = right, 90 = down). */
  angle?: number;
  /** Linear: start/end in shape-relative coords (e.g. 0–1 or pixels). */
  start?: Point;
  end?: Point;
  /** Radial/rect: center in relative coords. */
  center?: Point;
  /** Radial: radius from center (relative or px). */
  radiusX?: number;
  radiusY?: number;
  /** Rect: width/height of gradient box (relative). */
  width?: number;
  height?: number;
  stops: GradientStop[];
}

export const DEFAULT_GRADIENT_SPEC: GradientSpec = {
  type: 'linear',
  angle: 90,
  stops: [
    { offset: 0, color: '#ffffff', brightness: 100, alpha: 1 },
    { offset: 1, color: '#cccccc', brightness: 100, alpha: 1 },
  ],
};
