import { describe, expect, it } from 'vitest';
import {
  ALL_SIGILS,
  SIGILS,
  getSigil,
  searchSigils,
  sigilSections,
  sigilsByCategory,
} from '../SigilRegistry';
import { SIGIL_CATEGORY_ORDER, SIGIL_CATEGORY_LABELS } from '../sigilTypes';

describe('sigil registry integrity', () => {
  it('carries the full ported library', () => {
    expect(ALL_SIGILS).toHaveLength(182);
  });

  it('has unique ids and a lookup entry for each', () => {
    const ids = ALL_SIGILS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const sigil of ALL_SIGILS) {
      expect(getSigil(sigil.id)).toBe(sigil);
    }
    expect(Object.keys(SIGILS)).toHaveLength(ALL_SIGILS.length);
  });

  it('every entry has drawable geometry', () => {
    for (const sigil of ALL_SIGILS) {
      expect(sigil.markup.trim(), sigil.id).not.toBe('');
      expect(sigil.viewBox, sigil.id).toMatch(/^-?[\d.]+ -?[\d.]+ [\d.]+ [\d.]+$/);
      expect(sigil.name.trim(), sigil.id).not.toBe('');
    }
  });

  it('ids are namespaced by category, so cross-library names cannot collide', () => {
    for (const sigil of ALL_SIGILS) {
      expect(sigil.id.startsWith(`${sigil.category}-`), sigil.id).toBe(true);
    }
    // 'Water' exists in both the spectrum and hermetic libraries.
    expect(getSigil('spectrum-water')).toBeDefined();
    expect(getSigil('hermetic-water')).toBeDefined();
  });

  it('carries no undecoded HTML entities in display text', () => {
    for (const sigil of ALL_SIGILS) {
      expect(sigil.name, sigil.id).not.toMatch(/&(amp|#39|nbsp|lt|gt);/);
      expect(sigil.section, sigil.id).not.toMatch(/&(amp|#39|nbsp|lt|gt);/);
    }
  });

  it('reports tintability from the markup itself', () => {
    for (const sigil of ALL_SIGILS) {
      const hasKnockout = sigil.markup.includes('var(--sigil-bg)');
      expect(sigil.tintable, sigil.id).toBe(!hasKnockout);
    }
    // The library is overwhelmingly single-colour; only knockouts opt out.
    expect(ALL_SIGILS.filter((s) => !s.tintable).length).toBeLessThanOrEqual(4);
  });

  it('leaves no unresolved palette tokens beyond the background knockout', () => {
    for (const sigil of ALL_SIGILS) {
      const tokens = sigil.markup.match(/var\(--[a-z0-9-]+\)/g) ?? [];
      for (const token of tokens) {
        expect(token, sigil.id).toBe('var(--sigil-bg)');
      }
    }
  });

  it('covers every declared category', () => {
    for (const category of SIGIL_CATEGORY_ORDER) {
      expect(sigilsByCategory(category).length, category).toBeGreaterThan(0);
      expect(SIGIL_CATEGORY_LABELS[category]).toBeTruthy();
    }
    const declared = new Set(SIGIL_CATEGORY_ORDER);
    for (const sigil of ALL_SIGILS) {
      expect(declared.has(sigil.category), sigil.id).toBe(true);
    }
  });

  it('groups each category into named sections', () => {
    for (const category of SIGIL_CATEGORY_ORDER) {
      const sections = sigilSections(category);
      expect(sections.length, category).toBeGreaterThan(0);
      expect(sections.every((s) => s.trim() !== ''), category).toBe(true);
    }
  });
});

describe('palette search', () => {
  it('returns everything for an empty query', () => {
    expect(searchSigils('')).toHaveLength(ALL_SIGILS.length);
    expect(searchSigils('   ')).toHaveLength(ALL_SIGILS.length);
  });

  it('finds marks by name', () => {
    const hits = searchSigils('ouroboros');
    expect(hits.length).toBeGreaterThan(0);
    expect(hits[0].name.toLowerCase()).toContain('ouroboros');
  });

  it('ranks a name match above a section-only match', () => {
    const hits = searchSigils('zodiac');
    expect(hits.length).toBeGreaterThanOrEqual(12);
  });

  it('scopes to a category when asked', () => {
    const hits = searchSigils('water', 'hermetic');
    expect(hits.length).toBeGreaterThan(0);
    expect(hits.every((s) => s.category === 'hermetic')).toBe(true);
  });

  it('requires every term to match', () => {
    expect(searchSigils('ouroboros benzene')).toHaveLength(0);
  });

  it('returns nothing for a term no mark carries', () => {
    expect(searchSigils('zzzznotamark')).toHaveLength(0);
  });
});
