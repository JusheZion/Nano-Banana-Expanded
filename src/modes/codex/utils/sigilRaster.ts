import type { SigilDef } from '../data/SigilRegistry';
import type { GradientSpec } from '@/modes/comic/types/gradient';
import { applyBrightnessAndAlpha } from '@/modes/comic/utils/gradientUtils';
import type { CodexBevel } from '../types/codexObjects';

/**
 * Sigils reach the canvas as SVG data-URIs rather than parsed Konva shapes.
 *
 * The library uses the full SVG vocabulary — groups, nested opacity, rotate
 * transforms, `<text>`, `fill-rule` knockouts — so translating each mark into
 * Konva primitives would mean reimplementing an SVG renderer. Handing the
 * browser an `<svg>` image keeps every feature exact.
 *
 * Crispness is preserved by sizing the source SVG well above its drawn size and
 * quantising that to powers of two, so the raster only regenerates when an
 * object crosses a size threshold rather than on every drag frame.
 */

const MIN_RASTER = 128;
const MAX_RASTER = 2048;

/** Quantise to the next power of two so resizes don't thrash the image cache. */
export function rasterSizeFor(displaySize: number, pixelRatio = 2): number {
  const target = Math.max(displaySize, 1) * pixelRatio;
  const pow = 2 ** Math.ceil(Math.log2(Math.max(target, MIN_RASTER)));
  return Math.min(Math.max(pow, MIN_RASTER), MAX_RASTER);
}

/**
 * Presentation defaults the marks are drawn against.
 *
 * The library is line art: 175 of the 182 marks carry paths with no `fill` or
 * `stroke` attribute, because they were authored inside an `<svg>` that set
 * those at the root. That root was dropped when the marks were ported, so SVG's
 * initial values applied instead — `fill: black`, `stroke: none` — and the
 * marks rendered as black silhouettes rather than tinted outlines.
 *
 * Restoring the root presentation fixes them without touching the data: an
 * element's own attribute still wins, so the 42 marks that set
 * `fill="currentColor"` are unaffected.
 */
export const SIGIL_STROKE_DIVISOR = 16;

/**
 * Stroke weight scaled to the mark's own coordinate system, so a 96-unit mark
 * is not drawn hairline-thin next to a 24-unit one. Uses the shorter axis:
 * wide rule marks (360x20) should weight against their height.
 */
export function strokeWidthForViewBox(viewBox: string): number {
  const parts = viewBox.trim().split(/[\s,]+/).map(Number);
  const w = parts[2];
  const h = parts[3];
  if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) return 1.5;
  return Math.min(w, h) / SIGIL_STROKE_DIVISOR;
}

/**
 * Dense marks need a finer line.
 *
 * The library runs from a single-stroke sparkle to the Flower of Life's twenty
 * overlapping circles inside the same 24-unit box. At one weight for all of
 * them the dense marks fill in: adjacent strokes touch and the lattice reads as
 * a solid disc. Weight tapers with how many shapes share the box.
 */
export function densityFactor(markup: string): number {
  const shapes = (markup.match(/<(path|circle|rect|ellipse|polygon|polyline|line)\b/g) ?? []).length;
  if (shapes <= 6) return 1;
  if (shapes <= 12) return 0.75;
  return 0.55;
}

/**
 * Final stroke weight: scaled to the mark's coordinate system, tapered by how
 * crowded the mark is, then multiplied by the caller's own scale.
 */
export function sigilStrokeWidth(sigil: SigilDef, scale = 1): number {
  const base = strokeWidthForViewBox(sigil.viewBox) * densityFactor(sigil.markup);
  return Math.max(0.05, base * (Number.isFinite(scale) && scale > 0 ? scale : 1));
}

/** Root attributes shared by both render paths, as an attribute string. */
export function sigilRootAttrs(sigil: SigilDef, scale = 1): string {
  return (
    `fill="none" stroke="currentColor" stroke-width="${sigilStrokeWidth(sigil, scale).toFixed(3)}" ` +
    'stroke-linecap="round" stroke-linejoin="round"'
  );
}

/**
 * How a mark is painted. A flat `tint` is the floor; `gradient` and `bevel`
 * are what make a mark read as metal or relief rather than as a coloured
 * outline.
 */
export interface SigilAppearance {
  tint: string;
  gradient?: GradientSpec;
  bevel?: CodexBevel;
  background?: string;
  /** Multiplier on the computed stroke weight; 1 is the default weight. */
  strokeScale?: number;
}

interface ViewBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

function parseViewBox(viewBox: string): ViewBox {
  const p = viewBox.trim().split(/[\s,]+/).map(Number);
  const [x, y, w, h] = p;
  if (![x, y, w, h].every((n) => Number.isFinite(n)) || w <= 0 || h <= 0) {
    return { x: 0, y: 0, w: 24, h: 24 };
  }
  return { x, y, w, h };
}

/**
 * Gradient ids must be unique per distinct paint.
 *
 * `SigilGlyph` inlines these SVGs into the page, and duplicate ids across
 * inline SVG documents collapse: `url(#id)` resolves to whichever definition
 * appears first in the document, so a palette of mixed finishes painted every
 * mark with the first gradient on the page. Deriving the id from the gradient
 * and the coordinate system keeps it deterministic — identical paints may share
 * an id safely, because the definitions they resolve to are identical.
 */
function paintId(spec: GradientSpec, vb: ViewBox): string {
  const key = `${vb.x},${vb.y},${vb.w},${vb.h}|${JSON.stringify(spec)}`;
  let hash = 0;
  for (let i = 0; i < key.length; i += 1) {
    hash = (hash * 31 + key.charCodeAt(i)) | 0;
  }
  return `sigil-paint-${(hash >>> 0).toString(36)}`;
}

/**
 * Gradient defs in **user space**, not object bounding box.
 *
 * A mark is many separate paths. With `objectBoundingBox` each path resolves
 * the gradient against its own bbox, so every stroke gets its own full run of
 * the ramp and the mark reads as patchwork. User space runs one gradient across
 * the whole mark, which is what makes gold look like gold.
 */
function gradientDefs(spec: GradientSpec, vb: ViewBox, id: string): string {
  const stops = [...spec.stops]
    .sort((a, b) => a.offset - b.offset)
    .map((s) => {
      const color = applyBrightnessAndAlpha(s.color, s.brightness ?? 100, 1);
      const alpha = s.alpha ?? 1;
      return `<stop offset="${s.offset}" stop-color="${color}" stop-opacity="${alpha}"/>`;
    })
    .join('');

  if (spec.type === 'radial') {
    const cx = vb.x + (spec.center?.x ?? 0.5) * vb.w;
    const cy = vb.y + (spec.center?.y ?? 0.5) * vb.h;
    const r = Math.max(0.001, (spec.radiusX ?? 0.5) * Math.max(vb.w, vb.h));
    return (
      `<defs><radialGradient id="${id}" gradientUnits="userSpaceOnUse" ` +
      `cx="${cx}" cy="${cy}" r="${r}">${stops}</radialGradient></defs>`
    );
  }

  const rad = ((spec.angle ?? 90) * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const cx = vb.x + vb.w / 2;
  const cy = vb.y + vb.h / 2;
  const half = Math.max(vb.w, vb.h) / 2;
  return (
    `<defs><linearGradient id="${id}" gradientUnits="userSpaceOnUse" ` +
    `x1="${cx - cos * half}" y1="${cy - sin * half}" ` +
    `x2="${cx + cos * half}" y2="${cy + sin * half}">${stops}</linearGradient></defs>`
  );
}

/** The mark's own markup with its colour tokens resolved to one paint. */
function bodyPaintedWith(sigil: SigilDef, paint: string, background: string): string {
  return sigil.markup
    .replace(/var\(--sigil-bg\)/g, background)
    .replace(/currentColor/g, paint);
}

/**
 * Resolve the mark's colour tokens and wrap it in a standalone SVG document.
 * `currentColor` becomes the paint — a flat tint, or a gradient reference when
 * one is set. `var(--sigil-bg)` becomes the knockout colour.
 */
export function buildSigilSvg(
  sigil: SigilDef,
  appearance: SigilAppearance | string,
  size = 256,
): string {
  const app: SigilAppearance =
    typeof appearance === 'string' ? { tint: appearance } : appearance;
  const background = app.background ?? 'transparent';
  const vb = parseViewBox(sigil.viewBox);

  const useGradient = !!app.gradient && app.gradient.stops.length > 0;
  const id = useGradient ? paintId(app.gradient!, vb) : '';
  const paint = useGradient ? `url(#${id})` : app.tint;
  const defs = useGradient ? gradientDefs(app.gradient!, vb, id) : '';

  const root = sigilRootAttrs(sigil, app.strokeScale ?? 1).replace(/currentColor/g, paint);

  let layers = '';
  const bevel = app.bevel;
  if (bevel && bevel.depth > 0) {
    // Offsets are in mark units so a bevel reads the same at any raster size.
    const rad = (bevel.angle * Math.PI) / 180;
    const dx = Math.cos(rad) * bevel.depth;
    const dy = Math.sin(rad) * bevel.depth;
    layers +=
      `<g transform="translate(${dx.toFixed(3)} ${dy.toFixed(3)})" stroke="${bevel.dark}">` +
      `${bodyPaintedWith(sigil, bevel.dark, background)}</g>` +
      `<g transform="translate(${(-dx).toFixed(3)} ${(-dy).toFixed(3)})" stroke="${bevel.light}">` +
      `${bodyPaintedWith(sigil, bevel.light, background)}</g>`;
  }
  layers += bodyPaintedWith(sigil, paint, background);

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${sigil.viewBox}" ` +
    `width="${size}" height="${size}" ${root}>${defs}${layers}</svg>`
  );
}

export function sigilDataUri(
  sigil: SigilDef,
  appearance: SigilAppearance | string,
  size = 256,
): string {
  const svg = buildSigilSvg(sigil, appearance, size);
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
