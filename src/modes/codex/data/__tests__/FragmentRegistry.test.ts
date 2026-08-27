import { describe, expect, it } from 'vitest';
import {
  ALL_FRAGMENTS,
  FRAGMENT_CATEGORY_ORDER,
  fragmentsByCategory,
  fragmentSections,
  getFragment,
  searchFragments,
} from '../FragmentRegistry';
import { getSigil } from '../SigilRegistry';
import type { CodexObject } from '../../types/codexObjects';

/** Fragments that add objects to the plate, as opposed to dressing the plate. */
const OBJECT_FRAGMENTS = ALL_FRAGMENTS.filter((f) => !f.plate);
/** Fragments that patch the plate itself — grounds. */
const PLATE_FRAGMENTS = ALL_FRAGMENTS.filter((f) => f.plate);

describe('fragment registry', () => {
  it('carries the composed half of the library', () => {
    expect(ALL_FRAGMENTS).toHaveLength(50);
  });

  it('has no duplicate ids', () => {
    const ids = ALL_FRAGMENTS.map((f) => f.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('fills every category', () => {
    for (const category of FRAGMENT_CATEGORY_ORDER) {
      expect(fragmentsByCategory(category).length).toBeGreaterThan(0);
    }
  });

  it('groups each category into named sections', () => {
    for (const category of FRAGMENT_CATEGORY_ORDER) {
      const sections = fragmentSections(category);
      expect(sections.length).toBeGreaterThan(0);
      expect(sections.every((s) => s.trim().length > 0)).toBe(true);
    }
  });

  it('looks fragments up by id', () => {
    expect(getFragment('divider-hairline')?.name).toBe('Hairline Rule');
    expect(getFragment('nope')).toBeUndefined();
  });
});

describe('fragment builds', () => {
  it('every object fragment produces at least one object', () => {
    expect(OBJECT_FRAGMENTS.length).toBeGreaterThan(0);
    for (const f of OBJECT_FRAGMENTS) {
      expect(f.build(0, 0).length, f.id).toBeGreaterThan(0);
    }
  });

  it('mints fresh ids on every build, so placing one twice does not collide', () => {
    for (const f of OBJECT_FRAGMENTS) {
      const a = f.build(0, 0).map((o) => o.id);
      const b = f.build(0, 0).map((o) => o.id);
      expect(a.some((id) => b.includes(id)), f.id).toBe(false);
    }
  });

  it('gives every object in a group a unique id', () => {
    for (const f of OBJECT_FRAGMENTS) {
      const ids = f.build(0, 0).map((o) => o.id);
      expect(new Set(ids).size, f.id).toBe(ids.length);
    }
  });

  it('honours the placement origin', () => {
    for (const f of OBJECT_FRAGMENTS) {
      const at0 = f.build(0, 0);
      const at100 = f.build(100, 40);
      at0.forEach((obj, i) => {
        expect(at100[i].x - obj.x, `${f.id} x`).toBe(100);
        expect(at100[i].y - obj.y, `${f.id} y`).toBe(40);
      });
    }
  });

  it('every sigil a fragment references exists in the registry', () => {
    for (const f of OBJECT_FRAGMENTS) {
      for (const obj of f.build(0, 0)) {
        if (obj.kind === 'sigil') {
          expect(getSigil(obj.sigilId), `${f.id} → ${obj.sigilId}`).toBeDefined();
        }
      }
    }
  });

  it('never emits a zero or negative dimension', () => {
    for (const f of OBJECT_FRAGMENTS) {
      for (const obj of f.build(0, 0)) {
        expect(obj.width, `${f.id} ${obj.name} width`).toBeGreaterThan(0);
        expect(obj.height, `${f.id} ${obj.name} height`).toBeGreaterThan(0);
      }
    }
  });

  it('never sets both a flat fill and a fill gradient on a frame', () => {
    for (const f of OBJECT_FRAGMENTS) {
      for (const obj of f.build(0, 0) as CodexObject[]) {
        if (obj.kind === 'frame' && obj.fillGradient) {
          expect(obj.fill, `${f.id} ${obj.name}`).toBeUndefined();
        }
      }
    }
  });

  it('substantially fills the footprint it declares, so previews are not mostly empty', () => {
    for (const f of OBJECT_FRAGMENTS) {
      const objects = f.build(0, 0);
      const right = Math.max(...objects.map((o) => o.x + o.width));
      const bottom = Math.max(...objects.map((o) => o.y + o.height));
      expect(right / f.width, `${f.id} fills width`).toBeGreaterThan(0.6);
      expect(bottom / f.height, `${f.id} fills height`).toBeGreaterThan(0.6);
    }
  });

  it('declares a footprint that matches what it builds', () => {
    for (const f of OBJECT_FRAGMENTS) {
      const objects = f.build(0, 0);
      const right = Math.max(...objects.map((o) => o.x + o.width));
      const bottom = Math.max(...objects.map((o) => o.y + o.height));
      // Declared size is nominal, but it should not understate the group.
      expect(right, `${f.id} width`).toBeLessThanOrEqual(f.width + 1);
      expect(bottom, `${f.id} height`).toBeLessThanOrEqual(f.height + 1);
    }
  });
});

describe('searchFragments', () => {
  it('returns the whole pool for an empty query', () => {
    expect(searchFragments('')).toHaveLength(ALL_FRAGMENTS.length);
  });

  it('ranks a name-prefix match above a tag match', () => {
    const results = searchFragments('rank');
    expect(results[0].name).toBe('Rank Pill');
  });

  it('finds by tag', () => {
    expect(searchFragments('hud').map((f) => f.id)).toContain('panel-hud-readout');
  });

  it('narrows to a category when asked', () => {
    const results = searchFragments('rule', 'divider');
    expect(results.length).toBeGreaterThan(0);
    expect(results.every((f) => f.category === 'divider')).toBe(true);
  });

  it('returns nothing for a query that matches no fragment', () => {
    expect(searchFragments('zzzznope')).toEqual([]);
  });
});

describe('plate-target fragments', () => {
  it('is exactly the grounds — they are backgrounds, not objects', () => {
    expect(PLATE_FRAGMENTS.length).toBeGreaterThan(0);
    expect(PLATE_FRAGMENTS.every((f) => f.category === 'ground')).toBe(true);
    expect(fragmentsByCategory('ground').every((f) => !!f.plate)).toBe(true);
  });

  it('adds no objects, so a ground can never bury the artwork', () => {
    for (const f of PLATE_FRAGMENTS) {
      expect(f.build(0, 0), f.id).toEqual([]);
    }
  });

  it('carries a usable background gradient', () => {
    for (const f of PLATE_FRAGMENTS) {
      const g = f.plate?.backgroundGradient;
      expect(g, f.id).toBeDefined();
      expect(g!.stops.length, f.id).toBeGreaterThan(1);
      expect(g!.stops.every((s) => /^#[0-9a-f]{3,8}$/i.test(s.color)), f.id).toBe(true);
    }
  });
});
