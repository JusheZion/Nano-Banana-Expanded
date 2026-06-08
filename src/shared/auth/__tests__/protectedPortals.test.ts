import { describe, expect, it } from 'vitest';
import type { Portal } from '@/shared/portals';
import { isProtectedPortal, PROTECTED_PORTALS } from '@/shared/auth/protectedPortals';

describe('protected portals', () => {
  it('keeps public entry points open', () => {
    expect(isProtectedPortal('home')).toBe(false);
    expect(isProtectedPortal('wiki')).toBe(false);
  });

  it('protects creative workspace portals', () => {
    const protectedPortals: Portal[] = ['studio', 'reference', 'prompts', 'lab', 'comic', 'assets', 'writer'];
    protectedPortals.forEach((portal) => {
      expect(isProtectedPortal(portal)).toBe(true);
    });
  });

  it('covers every current non-public portal intentionally', () => {
    expect(Array.from(PROTECTED_PORTALS).sort()).toEqual([
      'assets',
      'comic',
      'lab',
      'prompts',
      'reference',
      'studio',
      'writer',
    ]);
  });
});
