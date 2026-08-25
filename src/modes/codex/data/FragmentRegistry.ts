/**
 * Codex Studio fragment registry.
 *
 * The composed half of the plate library — grounds, panels, badges, bullets,
 * meters and dividers. Where `SigilRegistry` holds single marks, each entry
 * here builds a small group of codex objects. Category modules live in
 * `./fragments/`; this file is the lookup surface, and mirrors the sigil
 * registry's shape so the palette can treat both the same way.
 */
import type { FragmentCategory, FragmentDef } from './fragmentTypes';
import { GROUND_FRAGMENTS } from './fragments/grounds';
import { PANEL_FRAGMENTS } from './fragments/panels';
import { BADGE_FRAGMENTS } from './fragments/badges';
import { BULLET_FRAGMENTS } from './fragments/bullets';
import { METER_FRAGMENTS } from './fragments/meters';
import { DIVIDER_FRAGMENTS } from './fragments/dividers';

export type { FragmentCategory, FragmentDef } from './fragmentTypes';
export { FRAGMENT_CATEGORY_LABELS, FRAGMENT_CATEGORY_ORDER } from './fragmentTypes';

/** Every fragment, in category order. */
export const ALL_FRAGMENTS: FragmentDef[] = [
  ...GROUND_FRAGMENTS,
  ...PANEL_FRAGMENTS,
  ...BADGE_FRAGMENTS,
  ...BULLET_FRAGMENTS,
  ...METER_FRAGMENTS,
  ...DIVIDER_FRAGMENTS,
];

/** Lookup by id. */
export const FRAGMENTS: Record<string, FragmentDef> = Object.fromEntries(
  ALL_FRAGMENTS.map((f) => [f.id, f]),
);

export function getFragment(id: string): FragmentDef | undefined {
  return FRAGMENTS[id];
}

export function fragmentsByCategory(category: FragmentCategory): FragmentDef[] {
  return ALL_FRAGMENTS.filter((f) => f.category === category);
}

/** Section groupings within a category, in declaration order. */
export function fragmentSections(category: FragmentCategory): string[] {
  const seen: string[] = [];
  for (const f of fragmentsByCategory(category)) {
    if (!seen.includes(f.section)) seen.push(f.section);
  }
  return seen;
}

/**
 * Ranked search over name, section and tags. Scoring matches `searchSigils`, so
 * the two halves of the library rank consistently against the same query.
 */
export function searchFragments(query: string, category?: FragmentCategory): FragmentDef[] {
  const pool = category ? fragmentsByCategory(category) : ALL_FRAGMENTS;
  const q = query.trim().toLowerCase();
  if (!q) return pool;
  const terms = q.split(/\s+/);
  const scored: Array<{ fragment: FragmentDef; score: number }> = [];

  for (const fragment of pool) {
    const name = fragment.name.toLowerCase();
    const section = fragment.section.toLowerCase();
    let score = 0;
    let matchedAll = true;

    for (const term of terms) {
      if (name.startsWith(term)) score += 6;
      else if (name.includes(term)) score += 4;
      else if (section.includes(term)) score += 2;
      else if (fragment.tags.some((t) => t.startsWith(term))) score += 1;
      else {
        matchedAll = false;
        break;
      }
    }
    if (matchedAll) scored.push({ fragment, score });
  }

  return scored
    .sort((a, b) => b.score - a.score || a.fragment.name.localeCompare(b.fragment.name))
    .map((s) => s.fragment);
}
