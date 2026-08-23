/**
 * Codex Studio sigil library types.
 *
 * A sigil is a hand-drawn inline-SVG mark from the Twovestellium asset library.
 * Follows the same data-driven registry shape as `modes/comic/data/CalloutRegistry.ts`.
 */

export type SigilCategory =
  | 'spectrum'
  | 'geometry'
  | 'hermetic'
  | 'science'
  | 'interface'
  | 'ornament';

export interface SigilDef {
  /** Stable id, `${category}-${slug}`. Used as the reference stored on a placed object. */
  id: string;
  /** Display name shown in the palette. */
  name: string;
  category: SigilCategory;
  /** Sub-grouping within a category, e.g. 'Zodiac', 'Planetary Metals'. */
  section: string;
  /** SVG viewBox the markup is authored against. */
  viewBox: string;
  /**
   * Inner SVG markup (children of `<svg>`), authored against `currentColor`
   * so a placed sigil inherits the plate's tint.
   */
  markup: string;
  /**
   * False when the markup contains a `var(--sigil-bg)` background knockout,
   * which needs a second colour supplied by the renderer.
   */
  tintable: boolean;
  /** Lowercase search terms derived from name and section. */
  tags: string[];
}

/** Label shown as the palette's category heading. */
export const SIGIL_CATEGORY_LABELS: Record<SigilCategory, string> = {
  spectrum: 'Spectrum & Cosmology',
  geometry: 'Sacred Geometry',
  hermetic: 'Hermetic & Alchemical',
  science: 'Science & Biology',
  interface: 'Fictional Interface',
  ornament: 'Ornament',
};

export const SIGIL_CATEGORY_ORDER: SigilCategory[] = [
  'spectrum',
  'geometry',
  'hermetic',
  'science',
  'interface',
  'ornament',
];
