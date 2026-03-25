import { describe, it, expect } from 'vitest';
import { getEffectiveGeminiAspectRatioForAsset } from '../assetGenerationPromptWrappers';

describe('getEffectiveGeminiAspectRatioForAsset', () => {
  it('maps Wide-angle to 21:9 when aspect is portrait default', () => {
    expect(getEffectiveGeminiAspectRatioForAsset('9:16', 'Wide-angle')).toBe('21:9');
  });

  it('keeps 1:1 when user explicitly chose square', () => {
    expect(getEffectiveGeminiAspectRatioForAsset('1:1', 'Wide-angle')).toBe('1:1');
  });

  it('passes through 21:9 with Wide-angle', () => {
    expect(getEffectiveGeminiAspectRatioForAsset('21:9', 'Wide-angle')).toBe('21:9');
  });

  it('ignores angle when not wide-angle', () => {
    expect(getEffectiveGeminiAspectRatioForAsset('9:16', 'Low')).toBe('9:16');
  });
});
