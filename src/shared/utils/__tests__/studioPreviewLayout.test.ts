import { describe, it, expect } from 'vitest';
import {
  studioPreviewAspectCss,
  studioPreviewFrameStyle,
  studioPreviewMaxHeightCss,
} from '../studioPreviewLayout';

describe('studioPreviewLayout', () => {
  it('maps aspect ids to CSS aspect-ratio strings', () => {
    expect(studioPreviewAspectCss('9:16')).toBe('9 / 16');
    expect(studioPreviewAspectCss('1:1')).toBe('1 / 1');
    expect(studioPreviewAspectCss('21:9')).toBe('21 / 9');
  });

  it('returns max-height expressions for each aspect', () => {
    expect(studioPreviewMaxHeightCss('21:9')).toContain('vh');
    expect(studioPreviewMaxHeightCss('9:16')).toContain('vh');
    expect(studioPreviewMaxHeightCss('1:1')).toContain('vh');
  });

  it('uses shorter max-height in compare mode', () => {
    expect(studioPreviewMaxHeightCss('9:16', 'compare')).toContain('76vh');
    expect(studioPreviewMaxHeightCss('9:16', 'single')).toContain('86vh');
  });

  it('studioPreviewFrameStyle sets height equal to maxHeight for stable aspect box', () => {
    const s = studioPreviewFrameStyle('9:16', 'single');
    expect(s.aspectRatio).toBe('9 / 16');
    expect(s.maxHeight).toBeDefined();
    expect(s.height).toBe(s.maxHeight);
    expect(s.width).toBe('auto');
    expect(s.maxWidth).toBe('100%');
    expect(s.position).toBe('relative');
  });
});
