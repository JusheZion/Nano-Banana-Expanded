/**
 * Codex fragments: the CSS-based half of the plate library.
 *
 * The sigil registry holds single SVG marks. The library the plates were drawn
 * from also carried ~50 composed pieces — grounds, panels, badges, bullets,
 * stat meters and dividers — which were styled markup rather than marks, so
 * they do not fit `SigilDef`. Here they are expressed in the codex object
 * vocabulary instead: each fragment builds a small group of objects that lands
 * on the plate fully editable, rather than as a flattened image.
 *
 * The originals were CSS, so this is a translation, not a copy: CSS features
 * with no Konva equivalent (repeating gradients, backdrop blur, pseudo-element
 * layering) are re-expressed with the primitives the plate model has.
 */
import type { GradientSpec } from '@/modes/comic/types/gradient';
import {
  CODEX_INK,
  type CodexChartKind,
  type CodexFrameVariant,
  type CodexObject,
} from '../types/codexObjects';

export type FragmentCategory =
  | 'ground'
  | 'panel'
  | 'badge'
  | 'bullet'
  | 'meter'
  | 'divider';

export const FRAGMENT_CATEGORY_ORDER: FragmentCategory[] = [
  'ground',
  'panel',
  'badge',
  'bullet',
  'meter',
  'divider',
];

export const FRAGMENT_CATEGORY_LABELS: Record<FragmentCategory, string> = {
  ground: 'Grounds',
  panel: 'Panels',
  badge: 'Badges',
  bullet: 'Bullets',
  meter: 'Meters',
  divider: 'Dividers',
};

/**
 * A fragment that dresses the plate itself rather than adding objects to it.
 * Grounds use this: they are backgrounds, so they belong behind the artwork
 * where they cannot bury it, not on top of it as another object.
 */
export interface PlatePatch {
  background?: string;
  backgroundGradient?: GradientSpec;
  /** Id into the plate texture registry; `null` clears an existing texture. */
  backgroundTexture?: string;
}

export interface FragmentDef {
  id: string;
  name: string;
  category: FragmentCategory;
  /** Sub-grouping inside a category, mirroring the library plates. */
  section: string;
  /** Nominal footprint; the palette previews at this aspect and placement centres on it. */
  width: number;
  height: number;
  tags: string[];
  /**
   * Builds the group at the given top-left origin. Ids are fresh on every call.
   * Empty for plate-target fragments, which carry `plate` instead.
   */
  build: (x: number, y: number) => CodexObject[];
  /**
   * When present, placing this fragment patches the plate rather than adding
   * objects. Mutually exclusive with a non-empty `build`.
   */
  plate?: PlatePatch;
}

/* ---------------------------------------------------------------- palette -- */

export const INK = CODEX_INK;
export const INK_DIM = '#9a7c3c';
export const INK_BRIGHT = '#f0d79a';
export const HAIRLINE = '#4a4361';
export const PANEL_FILL = '#171327';
export const VOID_FILL = '#0b0912';

/* --------------------------------------------------------------- builders -- */

let seq = 0;
/** Local id factory; fragments must not depend on the store. */
function fid(kind: string): string {
  seq += 1;
  return `${kind}_frg_${seq.toString(36)}`;
}

/** Resets the id counter. Tests only — ids are otherwise monotonic for a session. */
export function __resetFragmentIds(): void {
  seq = 0;
}

const base = {
  rotation: 0,
  opacity: 1,
  locked: false,
  visible: true,
};

export function fFrame(opts: {
  x: number;
  y: number;
  width: number;
  height: number;
  variant?: CodexFrameVariant;
  stroke?: string;
  strokeWidth?: number;
  cornerRadius?: number;
  fill?: string;
  fillGradient?: GradientSpec;
  strokeGradient?: GradientSpec;
  opacity?: number;
  name?: string;
}): CodexObject {
  return {
    ...base,
    id: fid('frame'),
    kind: 'frame',
    name: opts.name ?? 'Frame',
    variant: opts.variant ?? 'plain',
    stroke: opts.stroke ?? INK,
    strokeWidth: opts.strokeWidth ?? 1,
    cornerRadius: opts.cornerRadius ?? 0,
    fill: opts.fill,
    fillGradient: opts.fillGradient,
    strokeGradient: opts.strokeGradient,
    x: opts.x,
    y: opts.y,
    width: opts.width,
    height: opts.height,
    opacity: opts.opacity ?? 1,
  };
}

export function fText(opts: {
  x: number;
  y: number;
  width: number;
  text: string;
  fontSize?: number;
  fontFamily?: string;
  fontStyle?: 'normal' | 'bold' | 'italic' | 'italic bold';
  fill?: string;
  align?: 'left' | 'center' | 'right';
  letterSpacing?: number;
  lineHeight?: number;
  uppercase?: boolean;
  gradient?: GradientSpec;
  opacity?: number;
  name?: string;
}): CodexObject {
  const fontSize = opts.fontSize ?? 14;
  const lineHeight = opts.lineHeight ?? 1.4;
  return {
    ...base,
    id: fid('text'),
    kind: 'text',
    name: opts.name ?? opts.text.slice(0, 24),
    text: opts.text,
    fontFamily: opts.fontFamily ?? 'Cinzel',
    fontSize,
    fontStyle: opts.fontStyle ?? 'normal',
    fill: opts.fill ?? INK,
    align: opts.align ?? 'left',
    lineHeight,
    letterSpacing: opts.letterSpacing ?? 0,
    textTransform: opts.uppercase ? 'uppercase' : 'none',
    gradient: opts.gradient,
    x: opts.x,
    y: opts.y,
    width: opts.width,
    height: Math.round(fontSize * lineHeight),
    opacity: opts.opacity ?? 1,
  };
}

export function fSigil(opts: {
  x: number;
  y: number;
  size: number;
  sigilId: string;
  tint?: string;
  opacity?: number;
  rotation?: number;
  name?: string;
}): CodexObject {
  return {
    ...base,
    id: fid('sigil'),
    kind: 'sigil',
    name: opts.name ?? 'Sigil',
    sigilId: opts.sigilId,
    tint: opts.tint ?? INK,
    x: opts.x,
    y: opts.y,
    width: opts.size,
    height: opts.size,
    rotation: opts.rotation ?? 0,
    opacity: opts.opacity ?? 1,
  };
}

export function fChart(opts: {
  x: number;
  y: number;
  width: number;
  height: number;
  chartKind: CodexChartKind;
  axes: Array<{ label: string; value: number }>;
  max?: number;
  stroke?: string;
  fill?: string;
  track?: string;
  labelColor?: string;
  fontSize?: number;
  segments?: number;
  showLabels?: boolean;
  showValues?: boolean;
  name?: string;
}): CodexObject {
  return {
    ...base,
    id: fid('chart'),
    kind: 'chart',
    name: opts.name ?? 'Chart',
    chartKind: opts.chartKind,
    axes: opts.axes,
    max: opts.max ?? 100,
    stroke: opts.stroke ?? INK,
    fill: opts.fill ?? INK_DIM,
    track: opts.track ?? HAIRLINE,
    labelColor: opts.labelColor ?? INK_DIM,
    fontFamily: 'Cinzel',
    fontSize: opts.fontSize ?? 11,
    segments: opts.segments,
    showLabels: opts.showLabels ?? true,
    showValues: opts.showValues ?? true,
    x: opts.x,
    y: opts.y,
    width: opts.width,
    height: opts.height,
  };
}

/** Linear gradient shorthand. Angle: 0 = right, 90 = down. */
export function grad(
  angle: number,
  ...stops: Array<[offset: number, color: string, alpha?: number]>
): GradientSpec {
  return {
    type: 'linear',
    angle,
    stops: stops.map(([offset, color, alpha]) => ({ offset, color, alpha: alpha ?? 1 })),
  };
}

/** Radial gradient shorthand; centre and radius are fractions of the box. */
export function radial(
  radiusX: number,
  ...stops: Array<[offset: number, color: string, alpha?: number]>
): GradientSpec {
  return {
    type: 'radial',
    center: { x: 0.5, y: 0.5 },
    radiusX,
    stops: stops.map(([offset, color, alpha]) => ({ offset, color, alpha: alpha ?? 1 })),
  };
}

/** A hairline rule, used by dividers and panel furniture. */
export function fRule(opts: {
  x: number;
  y: number;
  width: number;
  stroke?: string;
  strokeWidth?: number;
  gradient?: GradientSpec;
  opacity?: number;
  name?: string;
}): CodexObject {
  return fFrame({
    x: opts.x,
    y: opts.y,
    width: opts.width,
    height: Math.max(1, opts.strokeWidth ?? 1),
    variant: 'plain',
    stroke: opts.stroke ?? INK_DIM,
    strokeWidth: 0,
    fill: opts.gradient ? undefined : (opts.stroke ?? INK_DIM),
    fillGradient: opts.gradient,
    opacity: opts.opacity ?? 1,
    name: opts.name ?? 'Rule',
  });
}
