import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useGenerationEngine } from '../useGenerationEngine';

describe('useGenerationEngine', () => {
  it('returns character tag library and system prompt when contextType is character', () => {
    const { result } = renderHook(() => useGenerationEngine('character'));

    const { tagLibrary, tagLibraryCategories, systemPrompt } = result.current;

    // Character library has tier_1_global, tier_2_architecture, tier_3_details
    const lib = tagLibrary as { tag_library?: Record<string, unknown> };
    expect(lib.tag_library).toBeDefined();
    expect(lib.tag_library?.tier_1_global).toBeDefined();
    expect(lib.tag_library?.tier_2_architecture).toBeDefined();

    // Normalized categories include character-specific categories
    const categoryNames = tagLibraryCategories.map((c) => c.categoryName);
    expect(categoryNames).toContain('ethnicity');
    expect(categoryNames).toContain('gender');
    expect(categoryNames).toContain('face shape');

    // Character system prompt
    expect(systemPrompt).toContain('Character Designer');
    expect(systemPrompt).toContain('DNA');
  });

  it('returns asset tag library and system prompt when contextType is asset', () => {
    const { result } = renderHook(() => useGenerationEngine('asset'));

    const { tagLibrary, tagLibraryCategories, systemPrompt } = result.current;

    const lib = tagLibrary as { tag_library?: Record<string, unknown> };
    expect(lib.tag_library).toBeDefined();
    const keys = Object.keys(lib.tag_library ?? {});
    expect(keys.some((k) => k.startsWith('setting_') || k.startsWith('architectural'))).toBe(true);

    const categoryNames = tagLibraryCategories.map((c) => c.categoryName);
    expect(categoryNames).toContain('Place type');
    expect(categoryNames).toContain('Architecture');
    expect(categoryNames).toContain('Lighting');
    expect(categoryNames).toContain('Materials');

    // Asset system prompt
    expect(systemPrompt).toContain('Concept Artist');
    expect(systemPrompt).toContain('world-building');
  });

  it('does not return character categories when contextType is asset', () => {
    const { result } = renderHook(() => useGenerationEngine('asset'));
    const categoryNames = result.current.tagLibraryCategories.map((c) => c.categoryName);
    expect(categoryNames).not.toContain('ethnicity');
    expect(categoryNames).not.toContain('gender');
  });

  it('does not return asset categories when contextType is character', () => {
    const { result } = renderHook(() => useGenerationEngine('character'));
    const categoryNames = result.current.tagLibraryCategories.map((c) => c.categoryName);
    expect(categoryNames).not.toContain('Architecture');
    expect(categoryNames).not.toContain('Place type');
  });
});
