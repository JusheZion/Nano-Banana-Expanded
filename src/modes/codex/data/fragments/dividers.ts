/**
 * Dividers — the rules and flourishes that separate sections on a plate.
 *
 * Rules are frames rather than lines so they can carry a gradient: the fade
 * rules taper by alpha, which a plain stroke cannot do.
 */
import {
  fRule,
  fSigil,
  fText,
  grad,
  HAIRLINE,
  INK,
  INK_BRIGHT,
  INK_DIM,
  type FragmentDef,
} from '../fragmentTypes';

const RULE_W = 460;

export const DIVIDER_FRAGMENTS: FragmentDef[] = [
  {
    id: 'divider-hairline',
    name: 'Hairline Rule',
    category: 'divider',
    section: 'Rules',
    width: RULE_W,
    height: 1,
    tags: ['rule', 'hairline', 'plain'],
    build: (x, y) => [fRule({ x, y, width: RULE_W, stroke: HAIRLINE, name: 'Hairline rule' })],
  },
  {
    id: 'divider-fade',
    name: 'Fade Rule',
    category: 'divider',
    section: 'Rules',
    width: RULE_W,
    height: 1,
    tags: ['rule', 'fade', 'taper'],
    build: (x, y) => [
      fRule({
        x,
        y,
        width: RULE_W,
        gradient: grad(0, [0, INK, 0], [0.5, INK, 1], [1, INK, 0]),
        name: 'Fade rule',
      }),
    ],
  },
  {
    id: 'divider-double',
    name: 'Double Rule',
    category: 'divider',
    section: 'Rules',
    width: RULE_W,
    height: 8,
    tags: ['rule', 'double', 'formal'],
    build: (x, y) => [
      fRule({ x, y, width: RULE_W, stroke: INK, strokeWidth: 1.5, name: 'Double rule top' }),
      fRule({ x, y: y + 6, width: RULE_W, stroke: INK_DIM, name: 'Double rule bottom' }),
    ],
  },
  {
    id: 'divider-tick',
    name: 'Tick Rule',
    category: 'divider',
    section: 'Rules',
    width: RULE_W,
    height: 12,
    tags: ['rule', 'ticks', 'measure'],
    build: (x, y) => [
      fRule({ x, y: y + 6, width: RULE_W, stroke: INK_DIM, name: 'Tick baseline' }),
      ...[0, 0.25, 0.5, 0.75, 1].map((t, i) =>
        fRule({
          x: x + Math.round(t * (RULE_W - 1)),
          y,
          width: 1.5,
          strokeWidth: 12,
          stroke: i === 2 ? INK_BRIGHT : INK_DIM,
          name: `Tick ${i + 1}`,
        }),
      ),
    ],
  },
  {
    id: 'divider-diamond',
    name: 'Diamond Rule',
    category: 'divider',
    section: 'Ornamented',
    width: RULE_W,
    height: 24,
    tags: ['rule', 'ornament', 'diamond'],
    // The mark is square, so it sits on a full-width rule rather than being
    // stretched across it.
    build: (x, y) => [
      fRule({ x, y: y + 11, width: RULE_W, stroke: INK_DIM, name: 'Diamond rule line' }),
      fSigil({ x: x + RULE_W / 2 - 12, y, size: 24, sigilId: 'ornament-diamond-rule', tint: INK, name: 'Diamond mark' }),
    ],
  },
  {
    id: 'divider-chapter-break',
    name: 'Chapter Break',
    category: 'divider',
    section: 'Ornamented',
    width: RULE_W,
    height: 30,
    tags: ['break', 'chapter', 'sigil'],
    build: (x, y) => [
      fRule({ x, y: y + 14, width: 190, gradient: grad(0, [0, INK, 0], [1, INK, 1]), name: 'Break rule left' }),
      fSigil({ x: x + 210, y, size: 30, sigilId: 'ornament-sparkle', tint: INK_BRIGHT, name: 'Break mark' }),
      fRule({ x: x + 270, y: y + 14, width: 190, gradient: grad(0, [0, INK, 1], [1, INK, 0]), name: 'Break rule right' }),
    ],
  },
  {
    id: 'divider-section-header',
    name: 'Section Header Rule',
    category: 'divider',
    section: 'Ornamented',
    width: RULE_W,
    height: 40,
    tags: ['header', 'section', 'label'],
    build: (x, y) => [
      fText({ x, y, width: 260, text: 'section', fontSize: 12, fill: INK, letterSpacing: 4, uppercase: true, name: 'Section label' }),
      fRule({ x, y: y + 26, width: RULE_W, gradient: grad(0, [0, INK, 1], [1, INK, 0]), name: 'Section rule' }),
    ],
  },
  {
    id: 'divider-corner-flourish',
    name: 'Corner Flourish Pair',
    category: 'divider',
    section: 'Ornamented',
    width: 200,
    height: 200,
    tags: ['corner', 'flourish', 'frame'],
    build: (x, y) => [
      fSigil({ x, y, size: 64, sigilId: 'ornament-rounded-corners', tint: INK, name: 'Flourish top-left' }),
      fSigil({ x: x + 136, y: y + 136, size: 64, sigilId: 'ornament-rounded-corners', tint: INK, rotation: 180, name: 'Flourish bottom-right' }),
    ],
  },
];
