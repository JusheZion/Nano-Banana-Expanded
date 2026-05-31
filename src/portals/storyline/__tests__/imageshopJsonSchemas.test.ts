import { describe, expect, it } from 'vitest';
import {
  exportImageshopProductionConfig,
  normalizeImageshopJson,
} from '@/portals/storyline/imageshopJsonSchemas';
import { createDefaultImageshopPageConfig } from '@/portals/storyline/imageshopPromptComposer';

describe('normalizeImageshopJson', () => {
  it('normalizes story beat JSON into production batch items', () => {
    const batch = normalizeImageshopJson({
      title: 'Issue 1 sequence',
      beats: [
        {
          id: 'beat-1',
          title: 'Arrival',
          prompt: 'Flux arrives at the observatory.',
          characters: ['Flux'],
          environment: 'Sky Observatory',
        },
      ],
    });

    expect(batch.kind).toBe('story-beat-json');
    expect(batch.title).toBe('Issue 1 sequence');
    expect(batch.items).toHaveLength(1);
    expect(batch.items[0]).toMatchObject({
      sourceId: 'beat-1',
      label: 'Arrival',
      sourceKind: 'story-beat',
      prompt: 'Flux arrives at the observatory.',
    });
    expect(batch.items[0].promptSections.character).toBe('Flux');
    expect(batch.items[0].promptSections.environment).toBe('Sky Observatory');
  });

  it('normalizes comic page JSON with panel dialogue and SFX', () => {
    const batch = normalizeImageshopJson({
      kind: 'comic-page-json',
      title: 'Page package',
      pages: [
        {
          pageNumber: 2,
          pageType: 'splash-page',
          summary: 'The engine wakes.',
          panels: [
            {
              panelNumber: 1,
              prompt: 'Huge engine burst.',
              dialogue: 'FLUX: It is alive.',
              sfx: 'KRAK',
            },
          ],
        },
      ],
    });

    expect(batch.kind).toBe('comic-page-json');
    expect(batch.items[0]).toMatchObject({
      label: 'Page 2 Panel 1',
      sourceKind: 'comic-page',
      prompt: 'Huge engine burst.',
    });
    expect(batch.items[0].promptSections.main).toContain('Huge engine burst.');
    expect(batch.items[0].promptSections.main).toContain('FLUX: It is alive.');
    expect(batch.items[0].promptSections.main).toContain('KRAK');
    expect(batch.items[0].pageConfig?.pageType).toBe('splash-page');
  });

  it('round-trips exported production config through the normalized ARCS shape', () => {
    const exported = exportImageshopProductionConfig({
      title: 'Reusable config',
      mode: 'comic-pages',
      pageConfig: {
        ...createDefaultImageshopPageConfig(),
        pageType: 'cover',
      },
      artStyles: [
        {
          id: 'custom-ink',
          name: 'Custom Ink',
          description: 'Heavy ink style.',
          prompt: 'Heavy black ink, clean flats.',
        },
      ],
      selectedArtStyleId: 'custom-ink',
      items: [
        {
          id: 'item-1',
          label: 'Cover',
          prompt: 'Hero cover pose.',
        },
      ],
    });

    const batch = normalizeImageshopJson(JSON.parse(exported));

    expect(batch.kind).toBe('arcs-page-json');
    expect(batch.title).toBe('Reusable config');
    expect(batch.artStyles?.[0]).toMatchObject({
      id: 'custom-ink',
      name: 'Custom Ink',
      prompt: 'Heavy black ink, clean flats.',
    });
    expect(batch.selectedArtStyleId).toBe('custom-ink');
    expect(batch.items[0].pageConfig?.pageType).toBe('cover');
    expect(batch.items[0].prompt).toBe('Hero cover pose.');
  });

  it('rejects unsupported JSON with a useful error', () => {
    expect(() => normalizeImageshopJson({ unknown: true })).toThrow(/Unsupported Imageshop JSON/);
  });
});
