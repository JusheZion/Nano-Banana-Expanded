/**
 * Ink selection for light and dark plates.
 *
 * The library is drawn in gold against a near-black plate. On parchment that
 * same gold is barely legible, so applying a light ground has to re-ink the
 * plate as well as repaint it.
 *
 * Lightness is measured rather than declared, so any ground — including one a
 * user builds by hand from a gradient — gets the right ink without being added
 * to a list.
 */
import type { CodexObject, CodexPlate } from '../types/codexObjects';
import { getPlateTexture } from '../data/plateTextures';

/** WCAG relative luminance, 0 (black) to 1 (white). */
export function relativeLuminance(hex: string): number {
  const clean = hex.replace(/^#/, '');
  const full =
    clean.length === 3
      ? clean
          .split('')
          .map((c) => c + c)
          .join('')
      : clean.slice(0, 6);
  if (!/^[0-9a-f]{6}$/i.test(full)) return 0;

  const channel = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  const r = channel(parseInt(full.slice(0, 2), 16));
  const g = channel(parseInt(full.slice(2, 4), 16));
  const b = channel(parseInt(full.slice(4, 6), 16));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * How light the plate reads. A texture covers the gradient, so its base colour wins;
 * otherwise the gradient's stops are averaged, falling back to the flat colour.
 */
export function plateLuminance(plate: Pick<CodexPlate,
  'background' | 'backgroundGradient' | 'backgroundTexture'>): number {
  if (plate.backgroundTexture) {
    const texture = getPlateTexture(plate.backgroundTexture);
    if (texture) return relativeLuminance(texture.base);
  }
  const stops = plate.backgroundGradient?.stops;
  if (stops && stops.length > 0) {
    return stops.reduce((sum, s) => sum + relativeLuminance(s.color), 0) / stops.length;
  }
  return relativeLuminance(plate.background);
}

/**
 * Above this the plate needs dark ink. Set above the midpoint because a mid
 * plate still carries gold acceptably, whereas parchment (~0.65) does not.
 */
export const LIGHT_PLATE_THRESHOLD = 0.45;

export function isLightPlate(
  plate: Pick<CodexPlate, 'background' | 'backgroundGradient' | 'backgroundTexture'>,
): boolean {
  return plateLuminance(plate) > LIGHT_PLATE_THRESHOLD;
}

export interface InkPalette {
  /** Marks and headline text. */
  ink: string;
  /** Secondary text. */
  dim: string;
  /** Rules and frame strokes. */
  rule: string;
  /** Finish applied to marks. */
  finishId: string;
}

/** Iron-gall ink on a light sheet. */
export const LIGHT_PLATE_INK: InkPalette = {
  ink: '#3a2a12',
  dim: '#6b5327',
  rule: '#8a7040',
  finishId: 'ink',
};

/** The plate default: gold on near-black. */
export const DARK_PLATE_INK: InkPalette = {
  ink: '#d8b45a',
  dim: '#9a7c3c',
  rule: '#4a4361',
  finishId: 'polished-gold',
};

export function inkForPlate(
  plate: Pick<CodexPlate, 'background' | 'backgroundGradient' | 'backgroundTexture'>,
): InkPalette {
  return isLightPlate(plate) ? LIGHT_PLATE_INK : DARK_PLATE_INK;
}

/**
 * Patches re-inking a plate's objects for a new palette.
 *
 * Deliberately narrow: it repaints strokes, mark tints and text fills, and
 * leaves object *fills* alone. A panel with a deep fill may well be an
 * intentional dark card sitting on parchment, and silently flattening it would
 * destroy a choice rather than fix a legibility problem.
 *
 * Returns one entry per object that needs changing, so the caller can commit
 * them as a single undo step.
 */
export function reinkPatches(
  objects: CodexObject[],
  palette: InkPalette,
  finishPatch: Partial<CodexObject>,
): Array<{ id: string; patch: Partial<CodexObject> }> {
  const out: Array<{ id: string; patch: Partial<CodexObject> }> = [];

  for (const object of objects) {
    if (object.kind === 'sigil') {
      out.push({ id: object.id, patch: { ...finishPatch } });
    } else if (object.kind === 'text') {
      out.push({ id: object.id, patch: { fill: palette.ink } });
    } else if (object.kind === 'frame') {
      // A rule is a fill-only frame; repaint its fill, else its stroke.
      const isRule = object.strokeWidth === 0 && !!object.fill;
      out.push({
        id: object.id,
        patch: isRule ? { fill: palette.rule } : { stroke: palette.rule },
      });
    } else if (object.kind === 'chart') {
      out.push({
        id: object.id,
        patch: { stroke: palette.ink, labelColor: palette.dim, track: palette.rule },
      });
    }
  }

  return out;
}
