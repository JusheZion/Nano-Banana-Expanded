import { describe, expect, it } from 'vitest';
import { buildImageshopReferenceContext } from '@/portals/storyline/imageshopReferenceContext';
import type { ImageshopPanelQueueItem } from '@/portals/storyline/imageshopPagePanelQueue';

const basePanel: ImageshopPanelQueueItem = {
  queueItemId: 'issue-1-page-1-panel-1',
  pageNumber: 1,
  panelNumber: 1,
  prompt: 'Flux crosses the observatory threshold.',
  action: 'Flux crosses the observatory threshold.',
  composition: 'Low angle with brass stars behind her.',
  dialogue: '',
  sfx: '',
  characters: ['Flux'],
  locations: ['Sky Observatory'],
  artStyle: 'celestial ink',
  loreIds: [],
  referenceIds: ['char-flux', 'asset-observatory', 'npc-witness', 'missing-ref'],
  canonChips: [],
  referenceChips: [
    {
      id: 'writer-style-ref',
      label: 'Writer style board',
      lane: 'style',
      sourceType: 'guided',
      referenceId: 'style-board-1',
      imageUrl: 'https://example.com/style.png',
      signedUrlStatus: 'ready',
    },
  ],
  status: 'draft',
  createdAt: '2026-06-01T20:00:00.000Z',
  updatedAt: '2026-06-01T20:00:00.000Z',
};

describe('buildImageshopReferenceContext', () => {
  it('builds labeled reference lanes from vault, guided, and approved Imageshop sources', () => {
    const context = buildImageshopReferenceContext({
      panel: basePanel,
      productionCast: [
        {
          vaultCharacterId: 'char-flux',
          profileName: 'Flux Profile',
          castName: 'Flux',
          displayName: 'Flux Solara',
          imageUrl: 'https://example.com/flux.png',
          tagSummary: 'silver coat, star pins, blue lens',
        },
      ],
      productionAssets: [
        {
          vaultAssetId: 'asset-observatory',
          collectionName: 'Sky Observatory',
          assetName: 'Brass iris door',
          imageUrl: 'https://example.com/observatory.png',
        },
      ],
      productionSupportingRefs: [
        {
          supportingRefId: 'npc-witness',
          label: 'Alley Witness',
          imageUrl: 'https://example.com/witness.png',
          createdAt: 1710000000000,
        },
      ],
      guidedHandoff: {
        source: 'guided-comic',
        currentStep: 'art',
        sourceLabel: 'Guided Comic Flow',
        pageNumber: 1,
        panelNumber: 1,
        characters: [
          {
            name: 'flux-guided',
            displayName: 'Flux guided pose',
            imageUrl: 'https://example.com/flux-guided.png',
            referenceId: 'guided-flux',
            sourceType: 'character',
          },
        ],
        locations: [],
        npcs: [],
        props: [
          {
            name: 'astrolabe',
            displayName: 'Portable astrolabe',
            imageUrl: 'https://example.com/astrolabe.png',
            referenceId: 'guided-astrolabe',
            sourceType: 'asset',
          },
        ],
      },
      approvedProductionItems: [
        {
          id: 'approved-panel-0',
          sourceKind: 'manual',
          label: 'Approved prior panel lighting',
          prompt: 'warm rim light',
          promptSections: {},
          status: 'approved',
          versions: [
            {
              id: 'version-1',
              kind: 'generated',
              imageUrl: 'https://example.com/approved-light.png',
              seed: 77,
              prompt: 'warm rim light',
              createdAt: '2026-06-01T20:10:00.000Z',
            },
          ],
          createdAt: '2026-06-01T20:10:00.000Z',
          updatedAt: '2026-06-01T20:10:00.000Z',
        },
      ],
    });

    expect(context.lanes.map((lane) => lane.label)).toEqual([
      'Character DNA',
      'Wardrobe',
      'Environment',
      'Props',
      'Style',
      'Lighting',
      'Canon',
    ]);

    expect(context.chips).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          label: 'Flux Solara',
          lane: 'character-dna',
          sourceType: 'character',
          referenceId: 'char-flux',
          imageUrl: 'https://example.com/flux.png',
          signedUrlStatus: 'ready',
        }),
        expect.objectContaining({
          label: 'Brass iris door',
          lane: 'environment',
          sourceType: 'asset',
          referenceId: 'asset-observatory',
        }),
        expect.objectContaining({
          label: 'Alley Witness',
          lane: 'character-dna',
          sourceType: 'npc',
          referenceId: 'npc-witness',
        }),
        expect.objectContaining({
          label: 'Portable astrolabe',
          lane: 'props',
          sourceType: 'guided',
          referenceId: 'guided-astrolabe',
        }),
        expect.objectContaining({
          label: 'Writer style board',
          lane: 'style',
          sourceType: 'guided',
        }),
        expect.objectContaining({
          label: 'Approved prior panel lighting',
          lane: 'lighting',
          sourceType: 'approved-output',
          referenceId: 'approved-panel-0',
        }),
      ]),
    );
    expect(context.missingReferenceIds).toEqual(['missing-ref']);
    expect(context.lanes.find((lane) => lane.lane === 'character-dna')?.chips).toHaveLength(3);
  });

  it('suggests resolution routes for unresolved Writer reference ids', () => {
    const context = buildImageshopReferenceContext({
      panel: {
        ...basePanel,
        referenceIds: ['char-missing-flux', 'asset-missing-observatory', 'npc-missing-witness', 'unknown-ref'],
        referenceChips: [],
      },
    });

    expect(context.missingReferenceRoutes).toEqual([
      {
        referenceId: 'char-missing-flux',
        destination: 'character-studio',
        label: 'Resolve char-missing-flux in Character Studio',
      },
      {
        referenceId: 'asset-missing-observatory',
        destination: 'asset-studio',
        label: 'Resolve asset-missing-observatory in Asset Studio',
      },
      {
        referenceId: 'npc-missing-witness',
        destination: 'supporting-reference',
        label: 'Create quick supporting reference for npc-missing-witness',
      },
      {
        referenceId: 'unknown-ref',
        destination: 'asset-studio',
        label: 'Resolve unknown-ref in Asset Studio',
      },
    ]);
  });
});
