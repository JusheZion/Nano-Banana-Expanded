import { describe, expect, it } from 'vitest';
import {
  DARK_PLATE_INK,
  inkForPlate,
  isLightPlate,
  LIGHT_PLATE_INK,
  plateLuminance,
  reinkPatches,
  relativeLuminance,
} from '../plateInk';
import { ALL_FRAGMENTS } from '../../data/FragmentRegistry';
import type { CodexObject, CodexPlate } from '../../types/codexObjects';

const dark: Pick<CodexPlate, 'background' | 'backgroundGradient' | 'backgroundTexture'> = {
  background: '#120f1c',
};

describe('relativeLuminance', () => {
  it('anchors at black and white', () => {
    expect(relativeLuminance('#000000')).toBeCloseTo(0, 5);
    expect(relativeLuminance('#ffffff')).toBeCloseTo(1, 5);
  });

  it('accepts shorthand hex', () => {
    expect(relativeLuminance('#fff')).toBeCloseTo(1, 5);
  });

  it('returns 0 for something that is not a colour rather than NaN', () => {
    expect(relativeLuminance('rebeccapurple')).toBe(0);
    expect(relativeLuminance('')).toBe(0);
  });
});

describe('plateLuminance', () => {
  it('reads the flat colour when there is nothing else', () => {
    expect(plateLuminance(dark)).toBeLessThan(0.1);
  });

  it('averages gradient stops', () => {
    const l = plateLuminance({
      background: '#000000',
      backgroundGradient: {
        type: 'linear',
        stops: [
          { offset: 0, color: '#000000' },
          { offset: 1, color: '#ffffff' },
        ],
      },
    });
    expect(l).toBeGreaterThan(0.4);
    expect(l).toBeLessThan(0.6);
  });

  it('lets a texture override the gradient, since the texture is what is seen', () => {
    const l = plateLuminance({
      background: '#000000',
      backgroundGradient: {
        type: 'linear',
        stops: [{ offset: 0, color: '#000000' }],
      },
      backgroundTexture: 'parchment',
    });
    expect(l).toBeGreaterThan(0.5);
  });
});

describe('isLightPlate', () => {
  it('calls the default plate dark and parchment light', () => {
    expect(isLightPlate(dark)).toBe(false);
    expect(isLightPlate({ background: '#000', backgroundTexture: 'parchment' })).toBe(true);
  });

  it('classifies every shipped ground, and gets the light ones right', () => {
    const grounds = ALL_FRAGMENTS.filter((f) => f.plate);
    const light = grounds.filter((f) =>
      isLightPlate({ background: '#120f1c', ...f.plate }),
    );
    expect(light.map((f) => f.id).sort()).toEqual([
      'ground-parchment',
      'ground-vellum',
    ]);
  });
});

describe('inkForPlate', () => {
  it('gives gold on a dark plate and iron-gall on a light one', () => {
    expect(inkForPlate(dark)).toBe(DARK_PLATE_INK);
    expect(inkForPlate({ background: '#f2e6c8' })).toBe(LIGHT_PLATE_INK);
  });
});

describe('reinkPatches', () => {
  const base = {
    x: 0, y: 0, width: 10, height: 10, rotation: 0, opacity: 1, locked: false, visible: true,
  };
  const objects: CodexObject[] = [
    { ...base, id: 's1', kind: 'sigil', sigilId: 'ornament-sparkle', tint: '#d8b45a' },
    { ...base, id: 't1', kind: 'text', text: 'x', fontFamily: 'Cinzel', fontSize: 12,
      fontStyle: 'normal', fill: '#d8b45a', align: 'left', lineHeight: 1.4, letterSpacing: 0 },
    { ...base, id: 'f1', kind: 'frame', variant: 'plain', stroke: '#d8b45a', strokeWidth: 1, cornerRadius: 0 },
    { ...base, id: 'r1', kind: 'frame', variant: 'plain', stroke: '#d8b45a', strokeWidth: 0, cornerRadius: 0, fill: '#9a7c3c' },
    { ...base, id: 'i1', kind: 'image', src: 'x' },
  ];

  it('re-inks marks, text, frames and rules but leaves images alone', () => {
    const patches = reinkPatches(objects, LIGHT_PLATE_INK, { tint: LIGHT_PLATE_INK.ink });
    expect(patches.map((p) => p.id)).toEqual(['s1', 't1', 'f1', 'r1']);
  });

  it('repaints a rule’s fill and a frame’s stroke, since a rule has no stroke', () => {
    const patches = reinkPatches(objects, LIGHT_PLATE_INK, { tint: LIGHT_PLATE_INK.ink });
    const frame = patches.find((p) => p.id === 'f1')!.patch as { stroke?: string };
    const rule = patches.find((p) => p.id === 'r1')!.patch as { fill?: string };
    expect(frame.stroke).toBe(LIGHT_PLATE_INK.rule);
    expect(rule.fill).toBe(LIGHT_PLATE_INK.rule);
  });

  it('never touches an object fill, which may be a deliberate dark card', () => {
    const patches = reinkPatches(
      [{ ...base, id: 'p1', kind: 'frame', variant: 'plain', stroke: '#fff', strokeWidth: 1, cornerRadius: 0, fill: '#171327' }],
      LIGHT_PLATE_INK,
      { tint: LIGHT_PLATE_INK.ink },
    );
    expect((patches[0].patch as { fill?: string }).fill).toBeUndefined();
  });

  it('returns nothing for an empty plate', () => {
    expect(reinkPatches([], LIGHT_PLATE_INK, {})).toEqual([]);
  });
});
