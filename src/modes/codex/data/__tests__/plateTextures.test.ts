import { describe, expect, it } from 'vitest';
import { getPlateTexture, PLATE_TEXTURES, plateTextureDataUri } from '../plateTextures';

describe('plate textures', () => {
  it('has no duplicate ids', () => {
    const ids = PLATE_TEXTURES.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('builds a standalone SVG carrying the filter primitives that make the surface', () => {
    for (const texture of PLATE_TEXTURES) {
      const svg = texture.build(1040, 1400);
      expect(svg.startsWith('<svg'), texture.id).toBe(true);
      expect(svg.endsWith('</svg>'), texture.id).toBe(true);
      // Noise is what stops parchment being a beige block; lighting is what
      // makes the noise read as a crumpled surface rather than as grain.
      expect(svg, texture.id).toContain('feTurbulence');
      expect(svg, texture.id).toContain('feDiffuseLighting');
      expect(svg, texture.id).not.toContain('undefined');
      expect(svg, texture.id).not.toMatch(/NaN/);
    }
  });

  it('caps the generated raster rather than matching an enormous plate', () => {
    const svg = getPlateTexture('parchment')!.build(9000, 12000);
    const w = Number(svg.match(/width="(\d+)"/)![1]);
    expect(w).toBeLessThanOrEqual(1600);
    expect(w).toBeGreaterThan(0);
  });

  it('keeps the plate aspect when it caps', () => {
    const svg = getPlateTexture('parchment')!.build(1040, 1400);
    const w = Number(svg.match(/width="(\d+)"/)![1]);
    const h = Number(svg.match(/height="(\d+)"/)![1]);
    expect(w / h).toBeCloseTo(1040 / 1400, 2);
  });

  it('returns null for an unknown id rather than throwing', () => {
    expect(plateTextureDataUri('nope', 100, 100)).toBeNull();
  });

  it('encodes to a usable image data URI', () => {
    const uri = plateTextureDataUri('parchment', 200, 300)!;
    expect(uri.startsWith('data:image/svg+xml;charset=utf-8,')).toBe(true);
    expect(uri).not.toContain('"');
    expect(uri).not.toContain('#');
  });
});
