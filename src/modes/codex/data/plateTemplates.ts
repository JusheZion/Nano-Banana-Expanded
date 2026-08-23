/**
 * Codex plate templates.
 *
 * Ported from the Kaleid dossier plates the sigil library was drawn for, so a
 * new dossier starts at the right proportions instead of a blank rectangle.
 */
import {
  CODEX_GROUND,
  CODEX_INK,
  DEFAULT_PLATE_HEIGHT,
  DEFAULT_PLATE_WIDTH,
  type CodexObject,
  type CodexPlate,
} from '../types/codexObjects';

export interface PlateTemplate {
  id: string;
  name: string;
  description: string;
  build: () => Omit<CodexPlate, 'id'>;
}

let seq = 0;
const oid = (kind: string) => `${kind}_tpl_${(seq += 1).toString(36)}`;

const INK_DIM = '#9a7c3c';
const HAIRLINE = '#4a4361';

function text(
  partial: Partial<CodexObject> & {
    text: string;
    x: number;
    y: number;
    width: number;
    fontSize: number;
  },
): CodexObject {
  return {
    id: oid('text'),
    kind: 'text',
    name: partial.text.slice(0, 24),
    fontFamily: 'Cinzel',
    fontStyle: 'normal',
    fill: CODEX_INK,
    align: 'center',
    lineHeight: 1.4,
    letterSpacing: 2,
    textTransform: 'none',
    rotation: 0,
    opacity: 1,
    locked: false,
    visible: true,
    height: partial.fontSize * 1.5,
    ...partial,
  } as CodexObject;
}

function frame(x: number, y: number, w: number, h: number, variant: 'bracketed' | 'plain'): CodexObject {
  return {
    id: oid('frame'),
    kind: 'frame',
    name: variant === 'bracketed' ? 'Portrait frame' : 'Frame',
    variant,
    stroke: INK_DIM,
    strokeWidth: 1,
    cornerRadius: 2,
    x,
    y,
    width: w,
    height: h,
    rotation: 0,
    opacity: 1,
    locked: false,
    visible: true,
  } as CodexObject;
}

const PAD = 56;
const CONTENT = DEFAULT_PLATE_WIDTH - PAD * 2;

export const PLATE_TEMPLATES: PlateTemplate[] = [
  {
    id: 'blank',
    name: 'Blank plate',
    description: 'Empty ground at codex proportions.',
    build: () => ({
      name: 'Plate',
      width: DEFAULT_PLATE_WIDTH,
      height: DEFAULT_PLATE_HEIGHT,
      background: CODEX_GROUND,
      objects: [],
    }),
  },
  {
    id: 'hero',
    name: 'Hero plate',
    description: 'Title, subject line, portrait frame and a stat block.',
    build: () => ({
      name: 'Hero',
      width: DEFAULT_PLATE_WIDTH,
      height: DEFAULT_PLATE_HEIGHT,
      background: CODEX_GROUND,
      objects: [
        text({ text: 'ARCHIVE · COSMIC FORM DOSSIER', x: PAD, y: 50, width: CONTENT, fontSize: 11, fill: INK_DIM, letterSpacing: 4, textTransform: 'uppercase' }),
        text({ text: 'SUBJECT NAME', x: PAD, y: 78, width: CONTENT, fontSize: 54, letterSpacing: 5 }),
        text({ text: 'DESIGNATION', x: PAD, y: 150, width: CONTENT, fontSize: 15, fill: '#b9b3c9', letterSpacing: 5 }),
        frame(PAD, 210, CONTENT, 560, 'bracketed'),
        text({ text: 'Portrait — drop art here', x: PAD, y: 470, width: CONTENT, fontSize: 12, fill: '#6f6885', letterSpacing: 1 }),
        text({ text: 'CORE MANIFESTATION', x: PAD, y: 812, width: CONTENT, fontSize: 11, fill: INK_DIM, letterSpacing: 2, align: 'left', textTransform: 'uppercase' }),
        text({ text: 'The Defining Force', x: PAD, y: 832, width: CONTENT, fontSize: 26, align: 'left', letterSpacing: 1 }),
        text({
          text: 'One or two sentences stating what this subject fundamentally does, in the archivist voice.',
          x: PAD, y: 872, width: CONTENT, fontSize: 15, fill: '#b9b3c9',
          align: 'left', letterSpacing: 0, lineHeight: 1.55, fontFamily: 'EB Garamond',
        }),
        text({ text: 'VITAL SIGNATURE', x: PAD, y: 960, width: CONTENT, fontSize: 13, fill: INK_DIM, letterSpacing: 3, textTransform: 'uppercase' }),
        {
          id: oid('chart'), kind: 'chart', name: 'Vital signature',
          chartKind: 'radial',
          axes: [
            { label: 'AXIS ONE', value: 82 }, { label: 'AXIS TWO', value: 74 },
            { label: 'AXIS THREE', value: 68 }, { label: 'AXIS FOUR', value: 71 },
            { label: 'AXIS FIVE', value: 59 }, { label: 'AXIS SIX', value: 77 },
          ],
          max: 100, stroke: CODEX_INK, fill: 'rgba(216,180,90,0.16)', track: HAIRLINE,
          labelColor: '#8a83a0', fontFamily: 'Cinzel', fontSize: 11,
          showLabels: true, showValues: true,
          x: (DEFAULT_PLATE_WIDTH - 520) / 2, y: 995, width: 520, height: 400,
          rotation: 0, opacity: 1, locked: false, visible: true,
        } as CodexObject,
      ],
    }),
  },
  {
    id: 'spectrum',
    name: 'Spectrum plate',
    description: 'Section header over four tiered ability cards.',
    build: () => {
      const objects: CodexObject[] = [
        text({ text: 'ARCHIVE · SUBJECT', x: PAD, y: 50, width: CONTENT, fontSize: 11, fill: INK_DIM, letterSpacing: 4, textTransform: 'uppercase' }),
        text({ text: 'THE SPECTRUM', x: PAD, y: 80, width: CONTENT, fontSize: 44, letterSpacing: 2 }),
        text({ text: '(CLASSIFICATION)', x: PAD, y: 140, width: CONTENT, fontSize: 17, fill: '#b9b3c9', letterSpacing: 3 }),
      ];
      const cardH = 250;
      for (let i = 0; i < 4; i += 1) {
        const y = 210 + i * (cardH + 22);
        objects.push(frame(PAD, y, CONTENT, cardH, 'plain'));
        objects.push(text({ text: `TIER ${['I', 'II', 'III', 'IV'][i]}`, x: PAD + 22, y: y + 20, width: 220, fontSize: 12, fill: INK_DIM, align: 'left', letterSpacing: 2 }));
        objects.push(text({ text: 'Ability Name · Subtitle', x: PAD + 22, y: y + 40, width: CONTENT - 44, fontSize: 22, align: 'left', letterSpacing: 0.5 }));
        objects.push(text({
          text: 'What the ability does, stated plainly.',
          x: PAD + 22, y: y + 82, width: CONTENT - 44, fontSize: 15, fill: '#b9b3c9',
          align: 'left', letterSpacing: 0, lineHeight: 1.55, fontFamily: 'EB Garamond',
        }));
      }
      return {
        name: 'Spectrum',
        width: DEFAULT_PLATE_WIDTH,
        height: DEFAULT_PLATE_HEIGHT,
        background: CODEX_GROUND,
        objects,
      };
    },
  },
  {
    id: 'identity',
    name: 'Identity plate',
    description: 'Four labelled data cards for esoteric or biographical fields.',
    build: () => {
      const objects: CodexObject[] = [
        text({ text: 'ARCHIVE · SUBJECT', x: PAD, y: 50, width: CONTENT, fontSize: 11, fill: INK_DIM, letterSpacing: 4, textTransform: 'uppercase' }),
        text({ text: 'IDENTITY CODEX', x: PAD, y: 80, width: CONTENT, fontSize: 44, letterSpacing: 2 }),
      ];
      const cardW = (CONTENT - 20) / 2;
      const cardH = 130;
      const fields = ['Zodiac Sign', 'Numerology · Life Path', 'Tarot Arcana', 'Human Design Type'];
      fields.forEach((label, i) => {
        const col = i % 2;
        const row = Math.floor(i / 2);
        const x = PAD + col * (cardW + 20);
        const y = 190 + row * (cardH + 20);
        objects.push(frame(x, y, cardW, cardH, 'plain'));
        objects.push(text({ text: label, x: x + 20, y: y + 20, width: cardW - 40, fontSize: 12, fill: INK_DIM, align: 'left', letterSpacing: 2, textTransform: 'uppercase' }));
        objects.push(text({ text: 'TBD', x: x + 20, y: y + 58, width: cardW - 40, fontSize: 24, fill: '#b9b3c9', align: 'left', letterSpacing: 0 }));
      });
      return {
        name: 'Identity',
        width: DEFAULT_PLATE_WIDTH,
        height: DEFAULT_PLATE_HEIGHT,
        background: CODEX_GROUND,
        objects,
      };
    },
  },
];

export function getTemplate(id: string): PlateTemplate | undefined {
  return PLATE_TEMPLATES.find((t) => t.id === id);
}
