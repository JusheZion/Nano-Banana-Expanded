import { describe, expect, it } from 'vitest';
import { publicAssetUrl } from '../viteAssets';

describe('publicAssetUrl', () => {
  it('keeps public assets under Vite BASE_URL for subpath deployments', () => {
    expect(publicAssetUrl('/assets/images/card.png', '/arcs/')).toBe('/arcs/assets/images/card.png');
  });

  it('normalises missing and duplicate slashes', () => {
    expect(publicAssetUrl('assets/images/card.png', '/')).toBe('/assets/images/card.png');
    expect(publicAssetUrl('/assets/images/card.png', '/arcs')).toBe('/arcs/assets/images/card.png');
  });
});
