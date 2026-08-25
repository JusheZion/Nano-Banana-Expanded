/**
 * Grounds — full-plate background treatments.
 *
 * In the original library these were CSS `background-image` layers. Konva has
 * no repeating-gradient or noise primitive, so each is re-expressed as a single
 * plate-sized frame carrying one gradient. Drop one behind the artwork, or lift
 * its gradient onto the plate's own background.
 */
import { DEFAULT_PLATE_HEIGHT, DEFAULT_PLATE_WIDTH } from '../../types/codexObjects';
import {
  fFrame,
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
  opacity = 1,
): FragmentDef {
  return {
    id,
    name,
    category: 'ground',
    section: 'Plate grounds',
    width: W,
    height: H,
    tags: ['ground', 'background', ...tags],
    build: (x, y) => [
      fFrame({
        x,
        y,
        width: W,
        height: H,
        variant: 'plain',
        strokeWidth: 0,
        stroke: 'transparent',
        fillGradient,
        opacity,
        name,
      }),
    ],
  };
}

export const GROUND_FRAGMENTS: FragmentDef[] = [
  ground('ground-void', 'Void', ['dark', 'flat'], grad(90, [0, VOID_FILL], [1, '#0e0b16'])),
  ground(
    'ground-vignette',
    'Vignette',
    ['radial', 'focus'],
    radial(0.78, [0, PANEL_FILL], [1, VOID_FILL]),
  ),
  ground(
    'ground-gold-wash',
    'Gold Wash',
    ['gold', 'warm'],
    grad(90, [0, '#2a2033'], [0.55, '#191325'], [1, VOID_FILL]),
  ),
  ground(
    'ground-horizon',
    'Horizon',
    ['glow', 'bottom'],
    grad(90, [0, VOID_FILL], [0.72, '#160f22'], [1, '#3a2a1c']),
  ),
  ground(
    'ground-twin-split',
    'Twin Split',
    ['opposition', 'diagonal', 'twoven'],
    grad(35, [0, '#101a2b'], [0.5, VOID_FILL], [1, '#2b1a12']),
  ),
  ground(
    'ground-spectrum-band',
    'Spectrum Band',
    ['spectrum', 'band'],
    grad(90, [0, VOID_FILL], [0.42, '#1b1430'], [0.5, '#3d2f56'], [0.58, '#1b1430'], [1, VOID_FILL]),
  ),
  ground(
    'ground-obsidian-sheen',
    'Obsidian Sheen',
    ['sheen', 'angled'],
    grad(28, [0, '#0d0b14'], [0.46, '#191424'], [0.52, '#221b33'], [0.6, '#191424'], [1, '#0d0b14']),
  ),
  ground(
    'ground-parchment',
    'Parchment',
    ['light', 'print', 'warm'],
    radial(0.85, [0, '#efe3c8'], [1, '#d8c49b']),
  ),
];

/** Ink colours the light `Parchment` ground expects, exported for template use. */
export const PARCHMENT_INK = { ink: '#4a3418', dim: '#7a6038', rule: INK_DIM, accent: INK };
