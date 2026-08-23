import type { CodexChartObject } from '../types/codexObjects';

/**
 * Values are clamped into 0..max so a stray number can't blow up the plot.
 * NaN has no meaningful position and collapses to 0; infinities clamp to the
 * nearer bound rather than being treated as "no value".
 */
export function clampAxisValue(value: number, max: number): number {
  if (Number.isNaN(value)) return 0;
  return Math.min(Math.max(value, 0), Math.max(max, 1));
}

export interface RadarGeometry {
  /** Concentric grid rings as flat Konva point arrays. */
  rings: number[][];
  /** Centre-to-edge axis lines. */
  spokes: number[][];
  /** The plotted data polygon. */
  polygon: number[];
  vertices: Array<{ x: number; y: number }>;
  labels: Array<{ x: number; y: number; label: string; value: number }>;
}

const RING_STEPS = [0.25, 0.5, 0.75, 1];

/**
 * Radar/spider geometry, laid out from twelve o'clock and running clockwise.
 * Pure maths so it can be unit-tested without mounting a canvas.
 */
export function radarGeometry(object: CodexChartObject): RadarGeometry {
  const axes = object.axes;
  const n = axes.length;
  const cx = object.width / 2;
  const cy = object.height / 2;
  const radius = Math.max(10, Math.min(object.width, object.height) / 2 - 46);
  const max = Math.max(object.max, 1);

  if (n < 3) {
    return { rings: [], spokes: [], polygon: [], vertices: [], labels: [] };
  }

  const pointAt = (index: number, r: number) => {
    const angle = -Math.PI / 2 + index * ((2 * Math.PI) / n);
    return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
  };

  const rings = RING_STEPS.map((step) =>
    axes.flatMap((_, i) => {
      const p = pointAt(i, radius * step);
      return [p.x, p.y];
    }),
  );

  const spokes = axes.map((_, i) => {
    const edge = pointAt(i, radius);
    return [cx, cy, edge.x, edge.y];
  });

  const vertices = axes.map((axis, i) =>
    pointAt(i, radius * (clampAxisValue(axis.value, max) / max)),
  );
  const polygon = vertices.flatMap((v) => [v.x, v.y]);

  const labels = axes.map((axis, i) => {
    const p = pointAt(i, radius + 26);
    return { x: p.x, y: p.y, label: axis.label, value: axis.value };
  });

  return { rings, spokes, polygon, vertices, labels };
}
