/**
 * Grounds — full-plate background treatments.
 *
 * In the original library these were CSS `background-image` layers. Konva has
 * no repeating-gradient or noise primitive, so each is re-expressed as a single
 * gradient.
 *
 * Grounds are the one plate-target fragment family: placing one writes
 * `plate.backgroundGradient` rather than adding an object. They are
 * backgrounds, so they belong behind the artwork where they cannot bury it —
 * as objects they landed on top and covered whatever was already laid out.
 */
import { DEFAULT_PLATE_HEIGHT, DEFAULT_PLATE_WIDTH } from '../../types/codexObjects';
import {
  grad,
  INK,
  INK_DIM,
  PANEL_FILL,
  radial,
  VOID_FILL,
  type FragmentDef,
} from '../fragmentTypes';

const W = DEFAULT_PLATE_WIDTH;
const H = DEFAULT_PLATE_HEIGHT;

function ground(
  id: string,
  name: string,
  tags: string[],
  fillGradient: ReturnType<typeof grad>,
  texture?: string,
): FragmentDef {
  return {
    id,
    name,
    category: 'ground',
    section: texture ? 'Textured grounds' : 'Plate grounds',
    width: W,
    height: H,
    tags: ['ground', 'background', ...tags],
    build: () => [],
    plate: {
      backgroundGradient: fillGradient,
      // Explicitly cleared, so switching from a textured ground to a plain one
      // does not leave the old surface behind.
      backgroundTexture: texture ?? '',
    },
  };
}

export const GROUND_FRAGMENTS: FragmentDef[] = [
  ground('ground-void', 'Void', ['dark', 'flat'], grad(90, [0, '#171331'], [0.5, VOID_FILL], [1, '#050409'])),
  ground(
    'ground-vignette',
    'Vignette',
    ['radial', 'focus'],
    radial(0.72, [0, '#2a2340'], [0.6, PANEL_FILL], [1, '#040309']),
  ),
  ground(
    'ground-gold-wash',
    'Gold Wash',
    ['gold', 'warm'],
    grad(90, [0, '#5a4320'], [0.28, '#2e2338'], [0.7, '#191325'], [1, VOID_FILL]),
  ),
  ground(
    'ground-horizon',
    'Horizon',
    ['glow', 'bottom'],
    grad(90, [0, '#04030a'], [0.62, '#1b1228'], [0.88, '#5c3f22'], [1, '#8a5f2c']),
  ),
  ground(
    'ground-twin-split',
    'Twin Split',
    ['opposition', 'diagonal', 'twoven'],
    grad(35, [0, '#16375f'], [0.42, '#0b0a14'], [0.58, '#0b0a14'], [1, '#6b3a18']),
  ),
  ground(
    'ground-spectrum-band',
    'Spectrum Band',
    ['spectrum', 'band'],
    grad(90, [0, '#04030a'], [0.38, '#231a42'], [0.5, '#6a51a0'], [0.62, '#231a42'], [1, '#04030a']),
  ),
  ground(
    'ground-obsidian-sheen',
    'Obsidian Sheen',
    ['sheen', 'angled'],
    grad(28, [0, '#08070e'], [0.44, '#1d1730'], [0.52, '#372d55'], [0.62, '#1d1730'], [1, '#08070e']),
  ),
  ground(
    'ground-parchment',
    'Parchment',
    ['light', 'print', 'warm', 'texture', 'aged'],
    radial(0.85, [0, '#efe3c8'], [1, '#c9b184']),
    'parchment',
  ),
  ground(
    'ground-vellum',
    'Vellum',
    ['light', 'print', 'texture', 'soft'],
    radial(0.9, [0, '#f6efdc'], [1, '#dfd0ab']),
    'vellum',
  ),
  ground(
    'ground-slate',
    'Slate',
    ['dark', 'stone', 'texture'],
    radial(0.85, [0, '#2b2440'], [1, '#100d1c']),
    'slate',
  ),
];

/** Ink colours the light `Parchment` ground expects, exported for template use. */
export const PARCHMENT_INK = { ink: '#4a3418', dim: '#7a6038', rule: INK_DIM, accent: INK };
