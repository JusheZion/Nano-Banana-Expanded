import type { SigilDef } from '../data/SigilRegistry';

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
 * Resolve the mark's colour tokens and wrap it in a standalone SVG document.
 * `currentColor` becomes the tint; `var(--sigil-bg)` becomes the knockout
 * colour (transparent by default, which reads correctly over a plate).
 */
export function buildSigilSvg(
  sigil: SigilDef,
  tint: string,
  background = 'transparent',
  size = 256,
): string {
  const body = sigil.markup
    .replace(/var\(--sigil-bg\)/g, background)
    .replace(/currentColor/g, tint);

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${sigil.viewBox}" ` +
    `width="${size}" height="${size}">${body}</svg>`
  );
}

/** Data-URI form, safe for `<img src>` and Konva.Image. */
export function sigilDataUri(
  sigil: SigilDef,
  tint: string,
  background = 'transparent',
  size = 256,
): string {
  const svg = buildSigilSvg(sigil, tint, background, size);
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
