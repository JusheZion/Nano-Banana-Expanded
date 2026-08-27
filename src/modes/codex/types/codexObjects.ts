/**
 * Codex Studio object model.
 *
 * Deliberately separate from `modes/comic/types/comicObjects.ts`: a codex plate
 * has no panels or balloons, and keeping the models apart means codex work can
 * never regress the Comic Portal. Shared vocabulary (gradients) is imported
 * from the comic mode rather than duplicated.
 */
import type { GradientSpec } from '@/modes/comic/types/gradient';

export type CodexObjectKind = 'sigil' | 'text' | 'frame' | 'chart' | 'image';

/** Drop shadow. Offsets are in plate px. */
export interface CodexShadow {
  color: string;
  blur: number;
  offsetX: number;
  offsetY: number;
  opacity: number;
}

/** Glow is a shadow with no offset; kept separate so both can be active. */
export interface CodexGlow {
  color: string;
  blur: number;
  opacity: number;
}

export interface CodexBaseObject {
  id: string;
  kind: CodexObjectKind;
  /** Layer-tree label; falls back to a kind-derived default. */
  name?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  /** Degrees, clockwise. */
  rotation: number;
  opacity: number;
  locked: boolean;
  visible: boolean;
  shadow?: CodexShadow;
  glow?: CodexGlow;
  /**
   * Gaussian blur radius in px. Requires the node to be cached, so it costs a
   * re-rasterise on change — unlike shadow and glow, which are free.
   */
  blur?: number;
}

/**
 * Fake bevel for line art: the mark is drawn three times — a dark copy offset
 * one way, a light copy the other, then the mark itself on top. Cheap, and it
 * reads as relief on strokes where a real lighting filter would not.
 */
export interface CodexBevel {
  /** Offset in mark units; 0 disables. */
  depth: number;
  /** Light direction in degrees; 0 = right, 90 = down. */
  angle: number;
  light: string;
  dark: string;
}

export interface CodexSigilObject extends CodexBaseObject {
  kind: 'sigil';
  /** Id into the sigil registry. */
  sigilId: string;
  /** Resolves `currentColor` in the mark's markup. */
  tint: string;
  /**
   * Painted instead of the flat tint when set. Gold, brass and the other metals
   * only read as metal across a gradient — a single hex reads as dark yellow.
   */
  gradient?: GradientSpec;
  bevel?: CodexBevel;
  /**
   * Multiplier on the mark's computed stroke weight. Weight is already scaled
   * to the viewBox and tapered by density; this is the manual override.
   */
  strokeScale?: number;
  /** Resolves `var(--sigil-bg)` for knockout marks. */
  background?: string;
}

export type CodexFontStyle = 'normal' | 'bold' | 'italic' | 'italic bold';

export interface CodexTextObject extends CodexBaseObject {
  kind: 'text';
  text: string;
  fontFamily: string;
  fontSize: number;
  fontStyle: CodexFontStyle;
  fill: string;
  align: 'left' | 'center' | 'right';
  /** Multiplier, not px — matches Konva's `lineHeight`. */
  lineHeight: number;
  /** px of tracking; the codex plates lean on this heavily for labels. */
  letterSpacing: number;
  textTransform?: 'none' | 'uppercase';
  gradient?: GradientSpec;
}

export type CodexFrameVariant =
  | 'plain'
  | 'double'
  | 'bracketed'
  | 'dashed'
  | 'litEdge';

export interface CodexFrameObject extends CodexBaseObject {
  kind: 'frame';
  variant: CodexFrameVariant;
  stroke: string;
  strokeWidth: number;
  cornerRadius: number;
  fill?: string;
  fillGradient?: GradientSpec;
  strokeGradient?: GradientSpec;
}

export type CodexChartKind = 'radial' | 'bars' | 'pips' | 'dial';

export interface CodexChartAxis {
  label: string;
  value: number;
}

export interface CodexChartObject extends CodexBaseObject {
  kind: 'chart';
  chartKind: CodexChartKind;
  axes: CodexChartAxis[];
  /** Upper bound for every axis. */
  max: number;
  stroke: string;
  fill: string;
  /** Grid/track colour behind the plotted data. */
  track: string;
  labelColor: string;
  fontFamily: string;
  fontSize: number;
  /** pips only: how many segments a full bar is divided into. */
  segments?: number;
  showLabels: boolean;
  showValues: boolean;
}

export interface CodexImageObject extends CodexBaseObject {
  kind: 'image';
  src: string;
}

export type CodexObject =
  | CodexSigilObject
  | CodexTextObject
  | CodexFrameObject
  | CodexChartObject
  | CodexImageObject;

export interface CodexPlate {
  id: string;
  name: string;
  width: number;
  height: number;
  /** Flat background colour behind `backgroundGradient`. */
  background: string;
  backgroundGradient?: GradientSpec;
  /**
   * Id into the plate texture registry. Drawn above the colour/gradient and
   * below every object — the surface the plate is printed on.
   */
  backgroundTexture?: string;
  /** Ordered back-to-front. */
  objects: CodexObject[];
}

export interface CodexDocument {
  id: string;
  title: string;
  plates: CodexPlate[];
  createdAt: string;
  updatedAt: string;
  /** Bumped when the persisted shape changes, so old saves can be migrated. */
  schemaVersion: number;
}

export const CODEX_SCHEMA_VERSION = 1;

/** Plate defaults match the Twovestellium codex plates the library was drawn for. */
export const DEFAULT_PLATE_WIDTH = 1040;
export const DEFAULT_PLATE_HEIGHT = 1400;
export const CODEX_INK = '#d8b45a';
export const CODEX_GROUND = '#120f1c';

export function defaultObjectName(kind: CodexObjectKind): string {
  switch (kind) {
    case 'sigil':
      return 'Sigil';
    case 'text':
      return 'Text';
    case 'frame':
      return 'Frame';
    case 'chart':
      return 'Chart';
    case 'image':
      return 'Image';
  }
}
