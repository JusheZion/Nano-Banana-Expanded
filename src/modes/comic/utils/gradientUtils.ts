/**
 * Phase 15: Gradient helpers for Konva and UI.
 * Stops must be sorted by offset before rendering to avoid visual glitching.
 */

import type { GradientStop } from '../../../types/gradient';

/** Sort stops by offset (0–1). Returns new array. */
export function sortStops(stops: GradientStop[]): GradientStop[] {
  return [...stops].sort((a, b) => a.offset - b.offset);
}

/** Parse hex to r,g,b (0–255). Handles #rgb and #rrggbb. */
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const clean = hex.replace(/^#/, '');
  if (clean.length === 3) {
    const r = parseInt(clean[0] + clean[0], 16);
    const g = parseInt(clean[1] + clean[1], 16);
    const b = parseInt(clean[2] + clean[2], 16);
    return { r, g, b };
  }
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return { r, g, b };
}

/** Apply brightness (0–100) and alpha (0–1) to a hex color; return rgba string for Konva. */
export function applyBrightnessAndAlpha(
  hex: string,
  brightness: number = 100,
  alpha: number = 1
): string {
  const { r, g, b } = hexToRgb(hex);
  const mult = brightness / 100;
  const rr = r * mult;
  const gg = g * mult;
  const bb = b * mult;
  return `rgba(${Math.round(rr)},${Math.round(gg)},${Math.round(bb)},${alpha})`;
}

/** Build Konva fillLinearGradientColorStops / fillRadialGradientColorStops: [offset, color, offset, color, ...]. */
export function toKonvaColorStops(stops: GradientStop[]): (number | string)[] {
  const sorted = sortStops(stops);
  const out: (number | string)[] = [];
  for (const s of sorted) {
    out.push(s.offset, applyBrightnessAndAlpha(s.color, s.brightness ?? 100, s.alpha ?? 1));
  }
  return out;
}

/** Linear gradient: compute start/end points from angle (degrees) and box size. */
export function linearGradientPoints(
  angleDeg: number,
  width: number,
  height: number
): { start: { x: number; y: number }; end: { x: number; y: number } } {
  const rad = (angleDeg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const cx = width / 2;
  const cy = height / 2;
  const len = Math.max(width, height);
  const start = { x: cx - cos * len, y: cy - sin * len };
  const end = { x: cx + cos * len, y: cy + sin * len };
  return { start, end };
}
