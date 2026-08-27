import { describe, expect, it } from 'vitest';
import {
  DEFAULT_SIGIL_FINISH_ID,
  getSigilFinish,
  SIGIL_FINISHES,
} from '../sigilFinishes';
import { buildSigilSvg } from '../../utils/sigilRaster';
import { getSigil } from '../SigilRegistry';

const mark = getSigil('spectrum-compression-core')!;

describe('sigil finishes', () => {
  it('has no duplicate ids and a resolvable default', () => {
    const ids = SIGIL_FINISHES.map((f) => f.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(getSigilFinish(DEFAULT_SIGIL_FINISH_ID)).toBeDefined();
  });

  it('always sets a tint, so a finish can never leave a mark unpainted', () => {
    for (const f of SIGIL_FINISHES) {
      expect(f.patch.tint, f.id).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });

  it('clears every optional effect it does not set, so finishes do not accumulate', () => {
    // Switching from a glowing finish to a flat one must drop the glow.
    const neon = getSigilFinish('neon-jade')!;
    const flat = getSigilFinish('flat')!;
    expect(neon.patch.glow).toBeDefined();
    expect('glow' in flat.patch).toBe(true);
    expect(flat.patch.glow).toBeUndefined();
    expect(flat.patch.gradient).toBeUndefined();
    expect(flat.patch.bevel).toBeUndefined();
  });

  it('gives every metal a multi-stop ramp — one hex cannot read as metal', () => {
    for (const id of ['polished-gold', 'antique-gold', 'silver', 'copper']) {
      const stops = getSigilFinish(id)!.patch.gradient!.stops;
      expect(stops.length, id).toBeGreaterThanOrEqual(3);
      expect(new Set(stops.map((s) => s.color)).size, id).toBeGreaterThan(1);
    }
  });

  it('renders each finish to a valid standalone SVG', () => {
    for (const f of SIGIL_FINISHES) {
      const svg = buildSigilSvg(mark, {
        tint: f.patch.tint!,
        gradient: f.patch.gradient,
        bevel: f.patch.bevel,
      });
      expect(svg.startsWith('<svg'), f.id).toBe(true);
      expect(svg.endsWith('</svg>'), f.id).toBe(true);
      expect(svg, f.id).not.toContain('currentColor');
      expect(svg, f.id).not.toContain('undefined');
      expect(svg, f.id).not.toMatch(/NaN/);
    }
  });
});

describe('buildSigilSvg painting', () => {
  it('paints from a gradient reference when one is set', () => {
    const svg = buildSigilSvg(mark, {
      tint: '#d8b45a',
      gradient: { type: 'linear', angle: 115, stops: [
        { offset: 0, color: '#ffffff' },
        { offset: 1, color: '#000000' },
      ] },
    });
    expect(svg).toContain('<linearGradient');
    const id = svg.match(/<linearGradient id="([^"]+)"/)![1];
    expect(svg).toContain(`url(#${id})`);
  });

  it('runs the gradient in user space, not per-path bounding boxes', () => {
    // objectBoundingBox would give every path its own ramp and read as patchwork.
    const svg = buildSigilSvg(mark, {
      tint: '#d8b45a',
      gradient: { type: 'linear', stops: [
        { offset: 0, color: '#fff' },
        { offset: 1, color: '#000' },
      ] },
    });
    expect(svg).toContain('gradientUnits="userSpaceOnUse"');
    expect(svg).not.toContain('objectBoundingBox');
  });

  it('supports a radial ramp', () => {
    const svg = buildSigilSvg(mark, {
      tint: '#f00',
      gradient: { type: 'radial', center: { x: 0.5, y: 0.5 }, radiusX: 0.5, stops: [
        { offset: 0, color: '#fff' },
        { offset: 1, color: '#000' },
      ] },
    });
    expect(svg).toContain('<radialGradient');
  });

  it('draws relief as three offset copies, not one', () => {
    const plain = buildSigilSvg(mark, { tint: '#d8b45a' });
    const relief = buildSigilSvg(mark, {
      tint: '#d8b45a',
      bevel: { depth: 0.4, angle: 125, light: '#ffffff', dark: '#000000' },
    });
    expect(relief).toContain('<g transform="translate(');
    expect(relief).toContain('#ffffff');
    expect(relief).toContain('#000000');
    expect(relief.length).toBeGreaterThan(plain.length);
  });

  it('ignores a zero-depth bevel rather than stacking identical copies', () => {
    const svg = buildSigilSvg(mark, {
      tint: '#d8b45a',
      bevel: { depth: 0, angle: 125, light: '#fff', dark: '#000' },
    });
    expect(svg).not.toContain('<g transform="translate(');
  });

  it('still accepts a bare tint string', () => {
    expect(buildSigilSvg(mark, '#abcdef')).toContain('#abcdef');
  });
});

describe('gradient id uniqueness', () => {
  /**
   * SigilGlyph inlines these SVGs into the page. Duplicate ids across inline
   * SVG documents collapse — url(#id) takes the first definition in the
   * document — so a palette of mixed finishes painted every mark with whichever
   * gradient rendered first. Silver, the neons and Ember all came out gold.
   */
  const idOf = (svg: string) => svg.match(/<(?:linear|radial)Gradient id="([^"]+)"/)?.[1];

  it('gives different finishes different gradient ids', () => {
    const ids = SIGIL_FINISHES.filter((f) => f.patch.gradient).map((f) =>
      idOf(
        buildSigilSvg(mark, {
          tint: f.patch.tint!,
          gradient: f.patch.gradient,
          bevel: f.patch.bevel,
        }),
      ),
    );
    expect(ids.every(Boolean)).toBe(true);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('is deterministic for the same paint, so rerenders stay stable', () => {
    const finish = getSigilFinish('polished-gold')!;
    const app = { tint: finish.patch.tint!, gradient: finish.patch.gradient };
    expect(idOf(buildSigilSvg(mark, app))).toBe(idOf(buildSigilSvg(mark, app)));
  });

  it('differs across coordinate systems, since the ramp is in user space', () => {
    const finish = getSigilFinish('polished-gold')!;
    const app = { tint: finish.patch.tint!, gradient: finish.patch.gradient };
    const wide = { ...mark, viewBox: '0 0 360 20' };
    expect(idOf(buildSigilSvg(mark, app))).not.toBe(idOf(buildSigilSvg(wide, app)));
  });
});
