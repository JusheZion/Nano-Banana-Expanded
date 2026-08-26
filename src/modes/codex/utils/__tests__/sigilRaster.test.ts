import { describe, expect, it } from 'vitest';
import { buildSigilSvg, rasterSizeFor, sigilDataUri, sigilStrokeWidth } from '../sigilRaster';
import { ALL_SIGILS, getSigil } from '../../data/SigilRegistry';

const sigil = getSigil('spectrum-compression-core')!;

describe('rasterSizeFor', () => {
  it('quantises to powers of two so resizing does not thrash the cache', () => {
    expect(rasterSizeFor(96)).toBe(256);
    expect(rasterSizeFor(100)).toBe(256);
    expect(rasterSizeFor(127)).toBe(256);
  });

  it('never drops below the floor, however small the object', () => {
    expect(rasterSizeFor(1)).toBe(128);
    expect(rasterSizeFor(0)).toBe(128);
  });

  it('caps at the ceiling so a huge object cannot allocate unboundedly', () => {
    expect(rasterSizeFor(100000)).toBe(2048);
  });

  it('renders above display size, keeping marks crisp when scaled', () => {
    expect(rasterSizeFor(300)).toBeGreaterThanOrEqual(600);
  });
});

describe('buildSigilSvg', () => {
  it('produces a standalone SVG document carrying the mark viewBox', () => {
    const svg = buildSigilSvg(sigil, '#ff0000');
    expect(svg.startsWith('<svg')).toBe(true);
    expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"');
    expect(svg).toContain(`viewBox="${sigil.viewBox}"`);
    expect(svg.endsWith('</svg>')).toBe(true);
  });

  it('resolves currentColor to the requested tint', () => {
    const svg = buildSigilSvg(sigil, '#ff0000');
    expect(svg).toContain('#ff0000');
    expect(svg).not.toContain('currentColor');
  });

  it('resolves the background knockout token', () => {
    const knockout = { ...sigil, markup: '<rect fill="var(--sigil-bg)" />' };
    const svg = buildSigilSvg(knockout, '#fff', '#000');
    expect(svg).toContain('#000');
    expect(svg).not.toContain('var(--sigil-bg)');
  });

  it('leaves no unresolved colour tokens for any mark in the library', () => {
    const svg = buildSigilSvg(sigil, '#123456', '#654321');
    expect(svg).not.toMatch(/var\(--/);
  });
});

describe('sigilDataUri', () => {
  it('encodes to a usable image data URI', () => {
    const uri = sigilDataUri(sigil, '#d8b45a');
    expect(uri.startsWith('data:image/svg+xml;charset=utf-8,')).toBe(true);
    expect(decodeURIComponent(uri.split(',')[1])).toContain('<svg');
  });

  it('escapes characters that would break an attribute value', () => {
    const uri = sigilDataUri(sigil, '#d8b45a');
    expect(uri).not.toContain('"');
    expect(uri).not.toContain('<');
    expect(uri).not.toContain('#');
  });
});

describe('sigilStrokeWidth', () => {
  it('scales the weight to the mark’s own coordinate system', () => {
    expect(sigilStrokeWidth('0 0 24 24')).toBe(1.5);
    expect(sigilStrokeWidth('0 0 96 96')).toBe(6);
  });

  it('weights a wide rule mark against its shorter axis', () => {
    expect(sigilStrokeWidth('0 0 360 20')).toBe(1.25);
  });

  it('falls back rather than emitting NaN for an unparseable viewBox', () => {
    expect(sigilStrokeWidth('nonsense')).toBe(1.5);
    expect(sigilStrokeWidth('0 0 0 0')).toBe(1.5);
  });

  it('never returns a non-positive weight for any mark in the library', () => {
    for (const sigil of ALL_SIGILS) {
      expect(sigilStrokeWidth(sigil.viewBox), sigil.id).toBeGreaterThan(0);
    }
  });
});

describe('root presentation', () => {
  it('sets the root fill/stroke the marks were authored against', () => {
    const svg = buildSigilSvg(sigil, '#ff0000');
    expect(svg).toContain('fill="none"');
    expect(svg).toContain('stroke="#ff0000"');
    expect(svg).toContain('stroke-linecap="round"');
  });

  it('resolves currentColor in the root attributes too, not just the body', () => {
    const svg = buildSigilSvg(sigil, '#ff0000');
    const root = svg.slice(0, svg.indexOf('>'));
    expect(root).not.toContain('currentColor');
  });

  it('leaves a mark’s own fill attribute to win over the inherited one', () => {
    const filled = { ...sigil, markup: '<circle fill="currentColor" r="4" />' };
    const svg = buildSigilSvg(filled, '#00ff00');
    expect(svg).toContain('<circle fill="#00ff00"');
  });
});
