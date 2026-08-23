/**
 * Codex Studio sigil registry.
 *
 * 182 hand-drawn marks ported from the Twovestellium asset-library plates.
 * Category modules live in `./sigils/`; this file is the lookup surface.
 *
 * Colour: markup is authored against `currentColor`, so a placed sigil takes
 * the plate's tint. Two marks carry a `var(--sigil-bg)` background knockout
 * and report `tintable: false` — the renderer must supply that second colour.
 */
import type { SigilCategory, SigilDef } from './sigilTypes';
import { SPECTRUM_SIGILS } from './sigils/spectrum';
import { GEOMETRY_SIGILS } from './sigils/geometry';
import { HERMETIC_SIGILS } from './sigils/hermetic';
import { SCIENCE_SIGILS } from './sigils/science';
import { INTERFACE_SIGILS } from './sigils/interface';
import { ORNAMENT_SIGILS } from './sigils/ornament';

export type { SigilCategory, SigilDef } from './sigilTypes';
export {
  SIGIL_CATEGORY_LABELS,
  SIGIL_CATEGORY_ORDER,
} from './sigilTypes';

/** Every sigil, in category order. */
export const ALL_SIGILS: SigilDef[] = [
  ...SPECTRUM_SIGILS,
  ...GEOMETRY_SIGILS,
  ...HERMETIC_SIGILS,
  ...SCIENCE_SIGILS,
  ...INTERFACE_SIGILS,
  ...ORNAMENT_SIGILS,
];

/** Lookup by id — the reference a placed object stores. */
export const SIGILS: Record<string, SigilDef> = Object.fromEntries(
  ALL_SIGILS.map((s) => [s.id, s]),
);

export function getSigil(id: string): SigilDef | undefined {
  return SIGILS[id];
}

export function sigilsByCategory(category: SigilCategory): SigilDef[] {
  return ALL_SIGILS.filter((s) => s.category === category);
}

/** Distinct section names within a category, in first-seen order. */
export function sigilSections(category: SigilCategory): string[] {
  const seen: string[] = [];
  for (const s of sigilsByCategory(category)) {
    if (s.section && !seen.includes(s.section)) seen.push(s.section);
  }
  return seen;
}

/**
 * Palette search. Matches name, section and tags; empty query returns all.
 * Name matches rank above section and tag matches.
 */
export function searchSigils(query: string, category?: SigilCategory): SigilDef[] {
  const pool = category ? sigilsByCategory(category) : ALL_SIGILS;
  const q = query.trim().toLowerCase();
  if (!q) return pool;
  const terms = q.split(/\s+/);
  const scored: Array<{ sigil: SigilDef; score: number }> = [];

  for (const sigil of pool) {
    const name = sigil.name.toLowerCase();
    const section = sigil.section.toLowerCase();
    let score = 0;
    let matchedAll = true;

    for (const term of terms) {
      if (name.startsWith(term)) score += 6;
      else if (name.includes(term)) score += 4;
      else if (section.includes(term)) score += 2;
      else if (sigil.tags.some((t) => t.startsWith(term))) score += 1;
      else {
        matchedAll = false;
        break;
      }
    }
    if (matchedAll) scored.push({ sigil, score });
  }

  return scored
    .sort((a, b) => b.score - a.score || a.sigil.name.localeCompare(b.sigil.name))
    .map((s) => s.sigil);
}
