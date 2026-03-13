/**
 * Shared generation engine for Character Studio and Assets Studio.
 * Returns tag library, normalized categories for the left panel, and system prompt by context.
 */
import type { GenerationContextType } from '@/data/systemPrompts';
import { getSystemPrompt } from '@/data/systemPrompts';
import characterTagLibrary from '@/data/character_tag_library.json';
import assetTagLibrary from '@/data/asset_tag_library.json';

export interface TagLibraryCategory {
  categoryName: string;
  options: string[];
}

type TagLibraryShape = Record<string, Record<string, string[]>>;

function normalizeCharacterLibrary(): TagLibraryCategory[] {
  const lib = (characterTagLibrary as { tag_library: TagLibraryShape }).tag_library;
  const out: TagLibraryCategory[] = [];
  for (const [, val] of Object.entries(lib)) {
    if (val && typeof val === 'object' && !Array.isArray(val)) {
      for (const [cat, options] of Object.entries(val)) {
        if (Array.isArray(options)) {
          out.push({ categoryName: cat.replace(/_/g, ' '), options });
        }
      }
    }
  }
  return out;
}

function normalizeAssetLibrary(): TagLibraryCategory[] {
  const lib = (assetTagLibrary as { tag_library: TagLibraryShape }).tag_library;
  const out: TagLibraryCategory[] = [];
  for (const [, groupVal] of Object.entries(lib)) {
    if (groupVal && typeof groupVal === 'object' && !Array.isArray(groupVal)) {
      for (const [cat, options] of Object.entries(groupVal)) {
        if (Array.isArray(options)) {
          out.push({ categoryName: cat, options });
        }
      }
    }
  }
  return out;
}

export function useGenerationEngine(contextType: GenerationContextType) {
  const tagLibrary = contextType === 'character' ? characterTagLibrary : assetTagLibrary;
  const tagLibraryCategories =
    contextType === 'character' ? normalizeCharacterLibrary() : normalizeAssetLibrary();
  const systemPrompt = getSystemPrompt(contextType);

  return { tagLibrary, tagLibraryCategories, systemPrompt };
}
