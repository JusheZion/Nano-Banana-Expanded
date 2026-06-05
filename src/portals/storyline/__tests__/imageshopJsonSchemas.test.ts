import { describe, expect, it } from 'vitest';
import {
  exportImageshopProductionConfig,
  normalizeImageshopJson,
} from '@/portals/storyline/imageshopJsonSchemas';
import { createDefaultImageshopPageConfig } from '@/portals/storyline/imageshopPromptComposer';
import { createImageshopIssueQueue } from '@/portals/storyline/imageshopPagePanelQueue';

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
    const panelQueue = createImageshopIssueQueue({
      source: 'writer-json',
      importedAt: '2026-06-05T12:00:00.000Z',
      issue: {
        id: 'issue-export',
        title: 'Reusable Canon',
      },
      pages: [
        {
          pageNumber: 1,
          panels: [
            {
              panelNumber: 1,
              action: 'Flux raises the Helios Key.',
              canonChips: [
                {
                  id: 'lore-helios-key',
                  title: 'Helios Key',
                  category: 'artifact',
                  source: 'obsidian',
                  summary: 'The key emits a narrow gold ring.',
                },
              ],
            },
          ],
        },
      ],
    });
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
      panelQueue,
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
    expect(batch.panelQueue?.pages[0].panels[0].canonChips[0]).toMatchObject({
      id: 'lore-helios-key',
      title: 'Helios Key',
    });
  });

  it('normalizes Writer issue-pack JSON with a page/panel queue', () => {
    const batch = normalizeImageshopJson({
      issue_id: 'issue-99',
      exported_at: '2026-06-01T15:00:00.000Z',
      series: { title: 'Arc School' },
      issue: { issue_number: 99, title: 'Doorway' },
      pages: [
        {
          page_number: 1,
          beats_json: {
            one_line_hook: 'The doorway opens.',
            characters: ['Kron'],
            locations: ['Dorm Room'],
            art_style: 'clean comic linework',
            panels: [
              {
                index: 1,
                action: 'Kron opens the glowing doorway.',
                lore_ids: ['lore-kron'],
                reference_ids: ['character-kron-cover'],
              },
            ],
          },
          script_text: null,
        },
      ],
    });

    expect(batch.kind).toBe('writer-issue-json');
    expect(batch.items[0]).toMatchObject({
      sourceKind: 'writer-panel',
      label: 'Page 1 Panel 1',
      prompt: 'Kron opens the glowing doorway.',
    });
    expect(batch.panelQueue?.issueId).toBe('issue-99');
    expect(batch.panelQueue?.pages[0].panels[0]).toMatchObject({
      characters: ['Kron'],
      locations: ['Dorm Room'],
      artStyle: 'clean comic linework',
      loreIds: ['lore-kron'],
      referenceIds: ['character-kron-cover'],
    });
    expect(batch.importDiagnostics).toEqual([]);
  });

  it('rejects unsupported JSON with a useful error', () => {
    expect(() => normalizeImageshopJson({ unknown: true })).toThrow(/Unsupported Imageshop JSON/);
  });
});
