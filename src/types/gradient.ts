/**
 * Phase 15: Shared gradient types for panels, balloons, and text.
 */

export interface GradientPoint {
  x: number;
  y: number;
}

export interface GradientStop {
  offset: number;
  color: string;
  brightness?: number; // 0–100
  alpha?: number;      // 0–1
}

export type GradientType = 'linear' | 'radial' | 'rect';

export interface GradientSpec {
  type: GradientType;
  angle?: number;
  start?: GradientPoint;
  end?: GradientPoint;
  center?: GradientPoint;
  radiusX?: number;
  radiusY?: number;
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
