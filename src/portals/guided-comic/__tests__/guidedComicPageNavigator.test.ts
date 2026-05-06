import { describe, expect, it } from 'vitest';
import {
  getGuidedPageNavigatorButtonLabel,
  shouldRenderGuidedPageNavigator,
} from '@/portals/guided-comic/GuidedComicFlow';

describe('guided comic page navigator', () => {
  it('only renders during Pages or Layout when pages exist', () => {
    expect(shouldRenderGuidedPageNavigator('pages', 1)).toBe(true);
    expect(shouldRenderGuidedPageNavigator('layout', 2)).toBe(true);
    expect(shouldRenderGuidedPageNavigator('art', 2)).toBe(false);
    expect(shouldRenderGuidedPageNavigator('pages', 0)).toBe(false);
  });

  it('uses compact numeric labels for page buttons', () => {
    expect(getGuidedPageNavigatorButtonLabel(12)).toBe('12');
  });
});
