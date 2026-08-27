/**
 * Plate textures — procedural surface for grounds that a gradient cannot give.
 *
 * Parchment is the reason this exists: as a gradient it is a beige block, when
 * what reads as parchment is mottling, fibre and a crumpled surface. SVG filter
 * primitives generate all three without shipping an image: `feTurbulence` makes
 * fractal noise, and `feDiffuseLighting` lights it so the noise reads as relief
 * rather than as grain painted on a flat card.
 *
 * The result is one self-contained SVG data-URI drawn by `Konva.Image` behind
 * the plate's objects, so it costs one raster and no network.
 */

export interface PlateTexture {
  id: string;
  name: string;
  /** Base colour painted under the filtered layers. */
  base: string;
  /** Builds a standalone SVG sized to the plate. */
  build: (width: number, height: number) => string;
}

/** Cap the generated raster; the grain is scale-invariant enough not to need more. */
const MAX_TEXTURE = 1600;

function fit(width: number, height: number): { w: number; h: number } {
  const scale = Math.min(1, MAX_TEXTURE / Math.max(width, height));
  return { w: Math.round(width * scale), h: Math.round(height * scale) };
}

/**
 * Mottled, lit surface.
 *
 * - `mottle` is low-frequency fractal noise lit from a distant source: the
 *   large-scale blotching and the crumple.
 * - `fibre` is high-frequency noise stretched along one axis, which is what
 *   makes pressed plant fibre rather than sandpaper.
 */
function fibrousSurface(opts: {
  base: string;
  light: string;
  /** Relief: crumple and grain. Higher frequency reads as finer tooth. */
  mottleFreq: string;
  /** Fibre: stretched along one axis, which is what makes pressed plant fibre. */
  fibreFreq: string;
  /** Colour staining: very low frequency blotches of `stain`. */
  stainFreq: string;
  stain: [number, number, number];
  mottleOpacity: number;
  fibreOpacity: number;
  stainOpacity: number;
  surfaceScale: number;
  azimuth: number;
  seed: number;
  vignette?: string;
}) {
  return (width: number, height: number): string => {
    const { w, h } = fit(width, height);
    const [sr, sg, sb] = opts.stain;
    return (
      `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">` +
      '<defs>' +
      '<filter id="mottle" x="0" y="0" width="100%" height="100%">' +
      `<feTurbulence type="fractalNoise" baseFrequency="${opts.mottleFreq}" numOctaves="4" seed="${opts.seed}" result="n"/>` +
      `<feDiffuseLighting in="n" lighting-color="${opts.light}" surfaceScale="${opts.surfaceScale}">` +
      `<feDistantLight azimuth="${opts.azimuth}" elevation="62"/>` +
      '</feDiffuseLighting>' +
      '</filter>' +
      '<filter id="fibre" x="0" y="0" width="100%" height="100%">' +
      `<feTurbulence type="fractalNoise" baseFrequency="${opts.fibreFreq}" numOctaves="3" seed="${opts.seed + 11}" result="n"/>` +
      `<feDiffuseLighting in="n" lighting-color="${opts.light}" surfaceScale="1">` +
      `<feDistantLight azimuth="${opts.azimuth + 40}" elevation="48"/>` +
      '</feDiffuseLighting>' +
      '</filter>' +
      // Staining is colour, not relief: low-frequency noise drives alpha over a
      // flat pigment, so the sheet discolours in patches the way age does.
      '<filter id="stain" x="0" y="0" width="100%" height="100%">' +
      `<feTurbulence type="fractalNoise" baseFrequency="${opts.stainFreq}" numOctaves="4" seed="${opts.seed + 29}"/>` +
      '<feColorMatrix type="matrix" values="' +
      `0 0 0 0 ${sr} 0 0 0 0 ${sg} 0 0 0 0 ${sb} 0.9 0 0 0 -0.15"/>` +
      '</filter>' +
      (opts.vignette
        ? '<radialGradient id="vig" cx="50%" cy="48%" r="75%">' +
          `<stop offset="0.6" stop-color="${opts.vignette}" stop-opacity="0"/>` +
          `<stop offset="1" stop-color="${opts.vignette}" stop-opacity="0.42"/>` +
          '</radialGradient>'
        : '') +
      '</defs>' +
      `<rect width="${w}" height="${h}" fill="${opts.base}"/>` +
      `<rect width="${w}" height="${h}" filter="url(#mottle)" opacity="${opts.mottleOpacity}" style="mix-blend-mode:multiply"/>` +
      `<rect width="${w}" height="${h}" filter="url(#fibre)" opacity="${opts.fibreOpacity}" style="mix-blend-mode:overlay"/>` +
      `<rect width="${w}" height="${h}" filter="url(#stain)" opacity="${opts.stainOpacity}" style="mix-blend-mode:multiply"/>` +
      (opts.vignette ? `<rect width="${w}" height="${h}" fill="url(#vig)"/>` : '') +
      '</svg>'
    );
  };
}

export const PLATE_TEXTURES: PlateTexture[] = [
  {
    id: 'parchment',
    name: 'Parchment',
    base: '#e6d5ad',
    build: fibrousSurface({
      base: '#e6d5ad',
      light: '#fff6e0',
      mottleFreq: '0.07 0.08',
      fibreFreq: '0.02 0.8',
      stainFreq: '0.004 0.006',
      stain: [0.42, 0.31, 0.12],
      mottleOpacity: 0.7,
      fibreOpacity: 0.4,
      stainOpacity: 0.42,
      surfaceScale: 3.4,
      azimuth: 235,
      seed: 7,
      vignette: '#6b5220',
    }),
  },
  {
    id: 'vellum',
    name: 'Vellum',
    base: '#f0e6cf',
    build: fibrousSurface({
      base: '#f0e6cf',
      light: '#fffaf0',
      mottleFreq: '0.05 0.055',
      fibreFreq: '0.015 0.6',
      stainFreq: '0.003 0.005',
      stain: [0.55, 0.45, 0.25],
      mottleOpacity: 0.5,
      fibreOpacity: 0.26,
      stainOpacity: 0.24,
      surfaceScale: 2.2,
      azimuth: 220,
      seed: 23,
      vignette: '#8a7440',
    }),
  },
  {
    id: 'slate',
    name: 'Slate',
    base: '#221c31',
    build: fibrousSurface({
      base: '#221c31',
      light: '#7a6fa4',
      mottleFreq: '0.06 0.07',
      fibreFreq: '0.02 0.5',
      stainFreq: '0.004 0.004',
      stain: [0.05, 0.04, 0.12],
      mottleOpacity: 0.6,
      fibreOpacity: 0.3,
      stainOpacity: 0.35,
      surfaceScale: 3.2,
      azimuth: 300,
      seed: 41,
      vignette: '#05040a',
    }),
  },
];

export function getPlateTexture(id: string): PlateTexture | undefined {
  return PLATE_TEXTURES.find((t) => t.id === id);
}

/** Encoded for use as an image source. */
export function plateTextureDataUri(id: string, width: number, height: number): string | null {
  const texture = getPlateTexture(id);
  if (!texture) return null;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(texture.build(width, height))}`;
}
