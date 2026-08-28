/**
 * Sigil finishes — named appearance presets.
 *
 * A single hex cannot read as metal. `#d8b45a` on its own is a dark yellow;
 * gold only reads as gold across a ramp from highlight through body colour to
 * shadow, which is what these presets encode. Each finish is a patch applied to
 * a sigil object, so it can carry gradient, bevel, glow, blur and opacity
 * together rather than colour alone.
 */
import type { CodexSigilObject } from '../types/codexObjects';

export interface SigilFinish {
  id: string;
  name: string;
  /** One line on what it is for, shown as the control's title. */
  description: string;
  /** Swatch for the picker: a CSS background standing in for the finish. */
  swatch: string;
  patch: Partial<CodexSigilObject>;
}

/** Clears every optional appearance field, so switching finish never leaves residue. */
const CLEARED = {
  gradient: undefined,
  bevel: undefined,
  glow: undefined,
  shadow: undefined,
  blur: undefined,
  opacity: 1,
} satisfies Partial<CodexSigilObject>;

function metal(
  id: string,
  name: string,
  description: string,
  highlight: string,
  body: string,
  shadow: string,
  swatch: string,
  bevel = false,
): SigilFinish {
  return {
    id,
    name,
    description,
    swatch,
    patch: {
      ...CLEARED,
      tint: body,
      gradient: {
        type: 'linear',
        angle: 115,
        stops: [
          { offset: 0, color: highlight },
          { offset: 0.35, color: body },
          { offset: 0.62, color: shadow },
          { offset: 0.82, color: body },
          { offset: 1, color: highlight },
        ],
      },
      ...(bevel
        ? { bevel: { depth: 0.35, angle: 125, light: highlight, dark: shadow } }
        : {}),
    },
  };
}

export const SIGIL_FINISHES: SigilFinish[] = [
  {
    id: 'flat',
    name: 'Flat',
    description: 'A single colour. Cleanest for small marks and dense plates.',
    swatch: '#d8b45a',
    patch: { ...CLEARED, tint: '#d8b45a' },
  },
  metal(
    'polished-gold',
    'Polished Gold',
    'Gold as metal: highlight through body to shadow and back.',
    '#fbeeb8',
    '#d8b45a',
    '#7d5a17',
    'linear-gradient(115deg,#fbeeb8,#d8b45a 35%,#7d5a17 62%,#d8b45a 82%,#fbeeb8)',
  ),
  metal(
    'antique-gold',
    'Antique Gold',
    'Darker, bevelled gold — reads as struck or cast rather than printed.',
    '#e2c680',
    '#a8842f',
    '#4c3510',
    'linear-gradient(115deg,#e2c680,#a8842f 35%,#4c3510 62%,#a8842f 82%,#e2c680)',
    true,
  ),
  metal(
    'silver',
    'Silver',
    'Cool metal for counterpoint marks.',
    '#ffffff',
    '#c3c8d4',
    '#5b6274',
    'linear-gradient(115deg,#ffffff,#c3c8d4 35%,#5b6274 62%,#c3c8d4 82%,#ffffff)',
  ),
  metal(
    'copper',
    'Copper',
    'Warm metal, heavier than gold.',
    '#f6cba8',
    '#c07a44',
    '#5d3117',
    'linear-gradient(115deg,#f6cba8,#c07a44 35%,#5d3117 62%,#c07a44 82%,#f6cba8)',
    true,
  ),
  {
    id: 'etched',
    name: 'Etched',
    description: 'Cut into the plate: dark stroke with a lit edge above it.',
    swatch: 'linear-gradient(160deg,#3b3550,#171327)',
    patch: {
      ...CLEARED,
      tint: '#2a2438',
      bevel: { depth: 0.5, angle: 300, light: '#8e86a8', dark: '#0a0812' },
    },
  },
  {
    id: 'neon-jade',
    name: 'Neon Jade',
    description: 'Bright stroke with a glow — the fictional-interface look.',
    swatch: 'linear-gradient(115deg,#d6ffe9,#39f5a5)',
    patch: {
      ...CLEARED,
      tint: '#39f5a5',
      gradient: {
        type: 'linear',
        angle: 115,
        stops: [
          { offset: 0, color: '#d6ffe9' },
          { offset: 0.5, color: '#39f5a5' },
          { offset: 1, color: '#0f9c64' },
        ],
      },
      glow: { color: '#39f5a5', blur: 26, opacity: 0.75 },
    },
  },
  {
    id: 'neon-violet',
    name: 'Neon Violet',
    description: 'Cold arcane glow.',
    swatch: 'linear-gradient(115deg,#ecdcff,#a45cff)',
    patch: {
      ...CLEARED,
      tint: '#a45cff',
      gradient: {
        type: 'linear',
        angle: 115,
        stops: [
          { offset: 0, color: '#ecdcff' },
          { offset: 0.5, color: '#a45cff' },
          { offset: 1, color: '#5417a8' },
        ],
      },
      glow: { color: '#a45cff', blur: 28, opacity: 0.7 },
    },
  },
  {
    id: 'ember',
    name: 'Ember',
    description: 'Hot core fading to char, with a low glow.',
    swatch: 'linear-gradient(115deg,#ffe9b0,#ff7a2f 45%,#7a1d05)',
    patch: {
      ...CLEARED,
      tint: '#ff7a2f',
      gradient: {
        type: 'radial',
        center: { x: 0.5, y: 0.5 },
        radiusX: 0.62,
        stops: [
          { offset: 0, color: '#ffe9b0' },
          { offset: 0.45, color: '#ff7a2f' },
          { offset: 1, color: '#7a1d05' },
        ],
      },
      glow: { color: '#ff7a2f', blur: 22, opacity: 0.55 },
    },
  },
  {
    id: 'ink',
    name: 'Ink',
    description: 'Iron-gall ink for light grounds — parchment, vellum, print.',
    swatch: 'linear-gradient(115deg,#6b5327,#3a2a12 55%,#1d1407)',
    patch: {
      ...CLEARED,
      tint: '#3a2a12',
      gradient: {
        type: 'linear',
        angle: 115,
        stops: [
          { offset: 0, color: '#6b5327' },
          { offset: 0.55, color: '#3a2a12' },
          { offset: 1, color: '#1d1407' },
        ],
      },
    },
  },
  {
    id: 'ghost',
    name: 'Ghost',
    description: 'Faint and softened — for watermarks and background furniture.',
    swatch: 'linear-gradient(115deg,#6b6480,#2a2438)',
    patch: { ...CLEARED, tint: '#cfc7e4', opacity: 0.35, blur: 1.5 },
  },
];

export const DEFAULT_SIGIL_FINISH_ID = 'polished-gold';

export function getSigilFinish(id: string): SigilFinish | undefined {
  return SIGIL_FINISHES.find((f) => f.id === id);
}
