import { describe, expect, it } from 'vitest';
import { shouldRenderGuidedPageNavigator } from '@/portals/guided-comic/GuidedComicFlow';

describe('guided comic page navigator', () => {
  it('only renders during Pages or Layout when pages exist', () => {
    expect(shouldRenderGuidedPageNavigator('pages', 1)).toBe(true);
    expect(shouldRenderGuidedPageNavigator('layout', 2)).toBe(true);
    expect(shouldRenderGuidedPageNavigator('art', 2)).toBe(false);
    expect(shouldRenderGuidedPageNavigator('pages', 0)).toBe(false);
  });
});
