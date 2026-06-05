import { describe, expect, it } from 'vitest';
import { createImageshopIssueQueue } from '@/portals/storyline/imageshopPagePanelQueue';
import {
  buildImageshopCanonContext,
  type ImageshopWriterLoreCandidate,
} from '@/portals/storyline/imageshopCanonContext';
import type { ImageshopPanelQueueItem } from '@/portals/storyline/imageshopPagePanelQueue';

const panel: ImageshopPanelQueueItem = {
  queueItemId: 'issue-canon-page-1-panel-1',
  pageNumber: 1,
  panelNumber: 1,
  prompt: 'Flux enters the Sky Observatory carrying the Golden Compass.',
  action: 'Flux enters the Sky Observatory carrying the Golden Compass.',
  composition: 'Wide establishing shot.',
  dialogue: '',
  sfx: '',
  characters: ['Flux'],
  locations: ['Sky Observatory'],
  artStyle: 'celestial ink',
  loreIds: ['lore-flux', 'lore-observatory', 'lore-compass'],
  referenceIds: [],
  canonChips: [],
  referenceChips: [
    {
      id: 'lore-flux',
      label: 'Flux Alternate',
      lane: 'character-dna',
      sourceType: 'character',
      referenceId: 'lore-flux',
      imageUrl: 'https://example.test/flux.png',
    },
  ],
  status: 'draft',
  createdAt: '2026-06-05T12:00:00.000Z',
  updatedAt: '2026-06-05T12:00:00.000Z',
};

const loreCards: ImageshopWriterLoreCandidate[] = [
  {
    id: 'lore-flux',
    seriesId: 'series-1',
    title: 'Flux',
    category: 'character',
    body: [
      '> Gold eyes, cobalt coat, and a white comet badge.',
      '',
      '# Flux',
      'Long private drafting notes that should not be copied wholesale into image prompts.',
      '',
      '<!-- ARCS_LORE_IMPORT_METADATA',
      JSON.stringify({
        source: 'obsidian',
        sourcePath: 'Characters/Flux.md',
        importDate: '2026-06-01T12:00:00.000Z',
        updatedAt: '2026-06-01T12:00:00.000Z',
        summary: 'Gold eyes, cobalt coat, and a white comet badge.',
        tags: ['cast', 'recurring'],
      }),
      '-->',
    ].join('\n'),
    includeInPrompt: true,
    updatedAt: '2026-06-01T12:00:00.000Z',
  },
  {
    id: 'lore-observatory',
    seriesId: 'series-1',
    title: 'Sky Observatory',
    category: 'location',
    body: 'A brass observatory with rotating iris doors and blue star maps.',
    includeInPrompt: true,
    updatedAt: '2026-06-01T12:00:00.000Z',
  },
  {
    id: 'lore-compass',
    seriesId: 'series-1',
    title: 'Golden Compass',
    category: 'artifact',
    body: 'A cracked gold compass whose north point glows white.',
    includeInPrompt: true,
    updatedAt: '2026-06-01T12:00:00.000Z',
  },
  {
    id: 'lore-unrelated',
    seriesId: 'series-1',
    title: 'Moon Council',
    category: 'faction',
    body: 'A faction not referenced by this panel.',
    includeInPrompt: true,
    updatedAt: '2026-06-01T12:00:00.000Z',
  },
];

describe('buildImageshopCanonContext', () => {
  it('attaches relevant Writer lore with prompt-safe Obsidian summaries and provenance', () => {
    const context = buildImageshopCanonContext({
      panel,
      loreCards,
    });

    expect(context.chips.map((chip) => chip.id)).toEqual([
      'lore-flux',
      'lore-observatory',
      'lore-compass',
    ]);
    expect(context.chips[0]).toMatchObject({
      title: 'Flux',
      category: 'character',
      source: 'obsidian',
      summary: 'Gold eyes, cobalt coat, and a white comet badge.',
      provenance: {
        obsidianPath: 'Characters/Flux.md',
        writerLoreCardId: 'lore-flux',
      },
    });
    expect(context.chips[0].summary).not.toContain('ARCS_LORE_IMPORT_METADATA');
    expect(context.chips[0].summary).not.toContain('Long private drafting notes');
    expect(context.promptSummary).toContain('Flux: Gold eyes, cobalt coat, and a white comet badge.');
    expect(context.promptSummary).toContain(
      'Sky Observatory: A brass observatory with rotating iris doors and blue star maps.',
    );
    expect(context.promptSummary).not.toContain('Moon Council');
  });

  it('reports conflicts when a vault reference sharing a lore id has a different label', () => {
    const context = buildImageshopCanonContext({
      panel,
      loreCards,
    });

    expect(context.conflicts).toContainEqual({
      code: 'vault-label-mismatch',
      severity: 'warning',
      loreCardId: 'lore-flux',
      message: 'Canon "Flux" conflicts with vault reference label "Flux Alternate".',
    });
  });

  it('attaches matching character and location cards when Writer JSON lacks lore ids', () => {
    const context = buildImageshopCanonContext({
      panel: {
        ...panel,
        loreIds: [],
        referenceChips: [],
      },
      loreCards,
    });

    expect(context.chips.map((chip) => chip.id)).toEqual(['lore-flux', 'lore-observatory', 'lore-compass']);
  });

  it('warns when distinct canon sources reuse a title with different summaries', () => {
    const queue = createImageshopIssueQueue({
      source: 'writer-json',
      importedAt: '2026-06-05T12:00:00.000Z',
      issue: {
        id: 'issue-duplicate-canon',
        title: 'Duplicate Canon',
      },
      pages: [
        {
          pageNumber: 1,
          panels: [
            {
              panelNumber: 1,
              action: 'Flux examines the Helios Key.',
              canonChips: [
                {
                  id: 'manual-helios-key',
                  title: 'Helios Key',
                  category: 'artifact',
                  source: 'manual',
                  summary: 'The key emits blue light.',
                },
              ],
            },
          ],
        },
      ],
    });

    const context = buildImageshopCanonContext({
      panel: queue.pages[0].panels[0],
      loreCards: [
        {
          id: 'obsidian-helios-key',
          title: 'Helios Key',
          category: 'artifact',
          body: 'The key emits a narrow gold ring.',
          includeInPrompt: true,
        },
      ],
    });

    expect(context.conflicts).toEqual([
      expect.objectContaining({
        code: 'duplicate-canon-title',
        loreCardId: 'obsidian-helios-key',
      }),
    ]);
  });
});
