/**
 * Badges — the small identity tokens the dossier plates use for rank, tier,
 * element, affiliation and archetype.
 *
 * Each is a shape plus its label, kept as separate objects so the label can be
 * retyped without rebuilding the badge.
 */
import {
  fFrame,
  fSigil,
  fText,
  grad,
  HAIRLINE,
  INK,
  INK_BRIGHT,
  INK_DIM,
  PANEL_FILL,
  radial,
  VOID_FILL,
  type FragmentDef,
} from '../fragmentTypes';

export const BADGE_FRAGMENTS: FragmentDef[] = [
  {
    id: 'badge-rank-pill',
    name: 'Rank Pill',
    category: 'badge',
    section: 'Tokens',
    width: 150,
    height: 34,
    tags: ['rank', 'pill', 'label'],
    build: (x, y) => [
      fFrame({ x, y, width: 150, height: 34, variant: 'plain', stroke: INK, strokeWidth: 1, cornerRadius: 17, fill: PANEL_FILL, name: 'Rank pill' }),
      fText({ x, y: y + 11, width: 150, text: 'rank i', fontSize: 12, fill: INK, align: 'center', letterSpacing: 4, uppercase: true, name: 'Rank label' }),
    ],
  },
  {
    id: 'badge-tier-chip',
    name: 'Tier Chip',
    category: 'badge',
    section: 'Tokens',
    width: 108,
    height: 28,
    tags: ['tier', 'chip', 'grade'],
    build: (x, y) => [
      fFrame({ x, y, width: 108, height: 28, variant: 'plain', strokeWidth: 0, stroke: 'transparent', cornerRadius: 2, fillGradient: grad(0, [0, '#3a2d1a'], [1, '#241c2e']), name: 'Tier chip' }),
      fText({ x, y: y + 8, width: 108, text: 'tier a', fontSize: 11, fill: INK_BRIGHT, align: 'center', letterSpacing: 3, uppercase: true, name: 'Tier label' }),
    ],
  },
  {
    id: 'badge-element-token',
    name: 'Element Token',
    category: 'badge',
    section: 'Tokens',
    width: 96,
    height: 118,
    tags: ['element', 'sigil', 'circle'],
    build: (x, y) => [
      fFrame({ x, y, width: 96, height: 96, variant: 'plain', stroke: INK, strokeWidth: 1.5, cornerRadius: 48, fillGradient: radial(0.6, [0, '#241c34'], [1, VOID_FILL]), name: 'Token disc' }),
      fSigil({ x: x + 24, y: y + 24, size: 48, sigilId: 'spectrum-fire', tint: INK_BRIGHT, name: 'Element mark' }),
      fText({ x, y: y + 102, width: 96, text: 'element', fontSize: 10, fill: INK_DIM, align: 'center', letterSpacing: 3, uppercase: true, name: 'Element label' }),
    ],
  },
  {
    id: 'badge-numbered-medallion',
    name: 'Numbered Medallion',
    category: 'badge',
    section: 'Tokens',
    width: 78,
    height: 78,
    tags: ['number', 'medallion', 'index'],
    build: (x, y) => [
      fFrame({ x, y, width: 78, height: 78, variant: 'plain', stroke: INK, strokeWidth: 1, cornerRadius: 39, fill: VOID_FILL, name: 'Medallion' }),
      fFrame({ x: x + 6, y: y + 6, width: 66, height: 66, variant: 'plain', stroke: INK_DIM, strokeWidth: 1, cornerRadius: 33, name: 'Medallion inner' }),
      fText({ x, y: y + 26, width: 78, text: 'I', fontSize: 26, fill: INK_BRIGHT, align: 'center', name: 'Medallion numeral' }),
    ],
  },
  {
    id: 'badge-classification-tag',
    name: 'Classification Tag',
    category: 'badge',
    section: 'Labels',
    width: 190,
    height: 26,
    tags: ['classification', 'tag', 'meta'],
    build: (x, y) => [
      fFrame({ x, y, width: 4, height: 26, variant: 'plain', strokeWidth: 0, stroke: 'transparent', fill: INK, name: 'Tag spine' }),
      fText({ x: x + 14, y: y + 7, width: 176, text: 'classification', fontSize: 11, fill: INK_DIM, letterSpacing: 3.5, uppercase: true, name: 'Tag label' }),
    ],
  },
  {
    id: 'badge-affiliation-crest',
    name: 'Affiliation Crest',
    category: 'badge',
    section: 'Labels',
    width: 220,
    height: 64,
    tags: ['affiliation', 'crest', 'faction'],
    build: (x, y) => [
      fSigil({ x, y: y + 6, size: 52, sigilId: 'hermetic-seal-of-solomon', tint: INK, name: 'Crest mark' }),
      fText({ x: x + 66, y: y + 12, width: 154, text: 'affiliation', fontSize: 10, fill: INK_DIM, letterSpacing: 3.5, uppercase: true, name: 'Crest kicker' }),
      fText({ x: x + 66, y: y + 30, width: 154, text: 'Twovestellium', fontSize: 17, fill: INK, name: 'Crest name' }),
    ],
  },
  {
    id: 'badge-status-flag',
    name: 'Status Flag',
    category: 'badge',
    section: 'Labels',
    width: 132,
    height: 30,
    tags: ['status', 'flag', 'state'],
    build: (x, y) => [
      fFrame({ x, y, width: 132, height: 30, variant: 'plain', stroke: HAIRLINE, strokeWidth: 1, fill: PANEL_FILL, name: 'Status flag' }),
      fFrame({ x: x + 10, y: y + 12, width: 6, height: 6, variant: 'plain', strokeWidth: 0, stroke: 'transparent', cornerRadius: 3, fill: INK_BRIGHT, name: 'Status dot' }),
      fText({ x: x + 24, y: y + 9, width: 100, text: 'active', fontSize: 11, fill: INK, letterSpacing: 2.5, uppercase: true, name: 'Status label' }),
    ],
  },
  {
    id: 'badge-archetype',
    name: 'Archetype Badge',
    category: 'badge',
    section: 'Labels',
    width: 260,
    height: 74,
    tags: ['archetype', 'role', 'mediator'],
    build: (x, y) => [
      fFrame({ x, y, width: 260, height: 74, variant: 'bracketed', stroke: INK_DIM, strokeWidth: 1.5, name: 'Archetype frame' }),
      fText({ x, y: y + 16, width: 260, text: 'archetype', fontSize: 10, fill: INK_DIM, align: 'center', letterSpacing: 4, uppercase: true, name: 'Archetype kicker' }),
      fText({ x, y: y + 36, width: 260, text: 'Mediator · Architect', fontSize: 16, fill: INK, align: 'center', name: 'Archetype value' }),
    ],
  },
];
