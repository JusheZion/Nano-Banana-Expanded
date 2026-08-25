/**
 * Bullets — single list rows. Place one, then duplicate it down the column.
 *
 * The original CSS versions were `::before` pseudo-elements on `<li>`; here the
 * marker is a real object, so it can be retinted or swapped for any sigil.
 */
import {
  fFrame,
  fRule,
  fSigil,
  fText,
  HAIRLINE,
  INK,
  INK_BRIGHT,
  INK_DIM,
  type FragmentDef,
} from '../fragmentTypes';

const ROW_W = 420;

export const BULLET_FRAGMENTS: FragmentDef[] = [
  {
    id: 'bullet-sigil',
    name: 'Sigil Bullet',
    category: 'bullet',
    section: 'List rows',
    width: ROW_W,
    height: 30,
    tags: ['list', 'sigil', 'marker'],
    build: (x, y) => [
      fSigil({ x, y: y + 4, size: 18, sigilId: 'ornament-sparkle', tint: INK, name: 'Bullet mark' }),
      fText({ x: x + 30, y: y + 4, width: ROW_W - 30, text: 'Ability or trait on one line', fontSize: 14, fontFamily: 'EB Garamond', fill: '#d6cfe4', name: 'Bullet copy' }),
    ],
  },
  {
    id: 'bullet-dash',
    name: 'Dash Bullet',
    category: 'bullet',
    section: 'List rows',
    width: ROW_W,
    height: 28,
    tags: ['list', 'dash', 'plain'],
    build: (x, y) => [
      fRule({ x, y: y + 12, width: 14, stroke: INK, strokeWidth: 1.5, name: 'Bullet dash' }),
      fText({ x: x + 26, y: y + 3, width: ROW_W - 26, text: 'Short list item', fontSize: 14, fontFamily: 'EB Garamond', fill: '#d6cfe4', name: 'Bullet copy' }),
    ],
  },
  {
    id: 'bullet-numbered',
    name: 'Numbered Row',
    category: 'bullet',
    section: 'List rows',
    width: ROW_W,
    height: 32,
    tags: ['list', 'number', 'ordered'],
    build: (x, y) => [
      fText({ x, y: y + 5, width: 26, text: '01', fontSize: 13, fill: INK_DIM, align: 'right', letterSpacing: 1, name: 'Row number' }),
      fText({ x: x + 38, y: y + 4, width: ROW_W - 38, text: 'Ordered step or ranked entry', fontSize: 14, fontFamily: 'EB Garamond', fill: '#d6cfe4', name: 'Row copy' }),
    ],
  },
  {
    id: 'bullet-chevron',
    name: 'Chevron Item',
    category: 'bullet',
    section: 'List rows',
    width: ROW_W,
    height: 28,
    tags: ['list', 'chevron', 'arrow'],
    build: (x, y) => [
      fSigil({ x, y: y + 5, size: 16, sigilId: 'ornament-deco-wedge', tint: INK_BRIGHT, name: 'Chevron' }),
      fText({ x: x + 28, y: y + 3, width: ROW_W - 28, text: 'Follow-on point', fontSize: 14, fontFamily: 'EB Garamond', fill: '#d6cfe4', name: 'Chevron copy' }),
    ],
  },
  {
    id: 'bullet-keyed-entry',
    name: 'Keyed Entry',
    category: 'bullet',
    section: 'Key/value',
    width: ROW_W,
    height: 30,
    tags: ['key', 'value', 'stat', 'field'],
    build: (x, y) => [
      fText({ x, y: y + 6, width: 150, text: 'field', fontSize: 11, fill: INK_DIM, letterSpacing: 3, uppercase: true, name: 'Field key' }),
      fText({ x: x + 160, y: y + 3, width: ROW_W - 160, text: 'Value', fontSize: 15, fill: INK, name: 'Field value' }),
    ],
  },
  {
    id: 'bullet-dotted-leader',
    name: 'Dotted Leader',
    category: 'bullet',
    section: 'Key/value',
    width: ROW_W,
    height: 30,
    tags: ['leader', 'index', 'contents'],
    build: (x, y) => [
      fText({ x, y: y + 4, width: 190, text: 'Entry name', fontSize: 14, fontFamily: 'EB Garamond', fill: '#d6cfe4', name: 'Leader label' }),
      fFrame({ x: x + 196, y: y + 16, width: ROW_W - 240, height: 1, variant: 'dashed', stroke: HAIRLINE, strokeWidth: 1, name: 'Leader dots' }),
      fText({ x: x + ROW_W - 40, y: y + 4, width: 40, text: '00', fontSize: 14, fill: INK, align: 'right', name: 'Leader value' }),
    ],
  },
  {
    id: 'bullet-glyph-row',
    name: 'Glyph List Row',
    category: 'bullet',
    section: 'Key/value',
    width: ROW_W,
    height: 46,
    tags: ['glyph', 'ability', 'two-line'],
    build: (x, y) => [
      fSigil({ x, y: y + 6, size: 30, sigilId: 'geometry-vesica-piscis', tint: INK, name: 'Row glyph' }),
      fText({ x: x + 44, y, width: ROW_W - 44, text: 'Ability name', fontSize: 14, fill: INK, letterSpacing: 1.5, name: 'Row title' }),
      fText({ x: x + 44, y: y + 22, width: ROW_W - 44, text: 'One line on how it behaves.', fontSize: 12, fontFamily: 'EB Garamond', fill: '#a49cba', name: 'Row note' }),
    ],
  },
  {
    id: 'bullet-indent-sub',
    name: 'Indented Sub-item',
    category: 'bullet',
    section: 'Key/value',
    width: ROW_W,
    height: 26,
    tags: ['indent', 'sub', 'nested'],
    build: (x, y) => [
      fRule({ x: x + 24, y: y + 11, width: 10, stroke: INK_DIM, name: 'Sub dash' }),
      fText({ x: x + 42, y: y + 2, width: ROW_W - 42, text: 'Nested detail', fontSize: 13, fontFamily: 'EB Garamond', fill: '#a49cba', name: 'Sub copy' }),
    ],
  },
];
