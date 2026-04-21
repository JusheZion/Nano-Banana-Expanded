import { describe, expect, it } from 'vitest';
import { buildImageshopImportPrompt } from '../imageshopImportPrompt';

describe('buildImageshopImportPrompt', () => {
  it('includes base preservation and reference instructions', () => {
    const s = buildImageshopImportPrompt({
      retouch: false,
      stylePreset: '',
      styleExtra: '',
      userNote: '',
    });
    expect(s).toContain('reference image');
    expect(s).toContain('Preserve the main subject');
  });

  it('adds retouch block when retouch is true', () => {
    const s = buildImageshopImportPrompt({
      retouch: true,
      stylePreset: '',
      styleExtra: '',
      userNote: '',
    });
    expect(s).toContain('light retouch');
    expect(s).toContain('noise');
  });

  it('includes style preset when set', () => {
    const s = buildImageshopImportPrompt({
      retouch: false,
      stylePreset: 'Watercolor',
      styleExtra: '',
      userNote: '',
    });
    expect(s).toContain('Watercolor');
    expect(s).toContain('art style');
  });

  it('includes style extra and user note when non-empty', () => {
    const s = buildImageshopImportPrompt({
      retouch: false,
      stylePreset: '',
      styleExtra: 'softer shadows',
      userNote: 'golden hour',
    });
    expect(s).toContain('softer shadows');
    expect(s).toContain('golden hour');
  });
});
