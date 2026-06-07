import { describe, expect, it } from 'vitest';
import type { PageBeatsJson } from '@/shared/writer/types';
import { buildImageWorkshopDraftFromWriterSelection } from '@/portals/storyline/imageWorkshopPlanning';

const pageBeats: PageBeatsJson = {
  one_line_hook: 'Nyx enters the Crystal Hangar while the Sentinel Bike powers up.',
  panels: [
    {
      action: 'Nyx walks through the Crystal Hangar',
      composition: 'Wide shot of the glowing dock',
    },
    {
      action: 'The Sentinel Bike unfolds from standby mode',
      composition: 'Low angle on the vehicle frame',
    },
  ],
};

describe('buildImageWorkshopDraftFromWriterSelection', () => {
  it('routes a matched recurring character to existing vault refs', () => {
    const draft = buildImageWorkshopDraftFromWriterSelection({
      source: {
        sourceLabel: 'Issue #3 · Page 4',
        issueTitle: 'The Crystal Hangar',
        issueSynopsis: 'Nyx races to the dock before dawn.',
        pageNumber: 4,
      },
      pageBeats,
      loreCards: [
        {
          id: 'lore-nyx',
          title: 'Nyx',
          category: 'character',
          body: 'Lead pilot.',
          include_in_prompt: true,
        },
      ],
      characterAlbums: [
        {
          profileName: 'Nyx',
          items: [
            {
              id: 'char-nyx',
              image_url: 'https://img/nyx.png',
              profile_name: 'Nyx',
              cast_name: 'Nyx',
            },
          ],
          coverId: 'char-nyx',
        },
      ],
      assetAlbums: [],
    });

    expect(draft.items).toHaveLength(1);
    expect(draft.items[0]).toMatchObject({
      label: 'Nyx',
      entityKind: 'character',
      group: 'matched',
      recommendedAction: 'match_existing',
      matchedCharacterId: 'char-nyx',
    });
  });

  it('routes recurring unmatched props and locations to Asset Studio', () => {
    const draft = buildImageWorkshopDraftFromWriterSelection({
      source: {
        sourceLabel: 'Issue #3 · Page 4',
        issueTitle: 'The Crystal Hangar',
        issueSynopsis: 'Nyx races to the dock before dawn.',
        pageNumber: 4,
      },
      pageBeats,
      loreCards: [
        {
          id: 'lore-bike',
          title: 'Sentinel Bike',
          category: 'vehicle asset',
          body: 'Recurring pursuit vehicle.',
          include_in_prompt: true,
        },
        {
          id: 'lore-hangar',
          title: 'Crystal Hangar',
          category: 'location',
          body: 'Recurring launch bay.',
          include_in_prompt: true,
        },
      ],
      characterAlbums: [],
      assetAlbums: [],
    });

    expect(draft.items.map((item) => item.recommendedAction)).toEqual([
      'open_asset_studio',
      'open_asset_studio',
    ]);
    expect(draft.items.every((item) => item.group === 'needs_studio')).toBe(true);
  });

  it('routes one-off cameos to quick ref generation', () => {
    const draft = buildImageWorkshopDraftFromWriterSelection({
      source: {
        sourceLabel: 'Issue #3 · Page 4',
        issueTitle: 'The Crystal Hangar',
        issueSynopsis: 'Nyx races to the dock before dawn.',
        pageNumber: 4,
      },
      pageBeats: {
        panels: [{ action: 'A Dock Guard watches Nyx from the catwalk' }],
      },
      loreCards: [
        {
          id: 'lore-guard',
          title: 'Dock Guard',
          category: 'npc cameo',
          body: 'Minor background character.',
          include_in_prompt: false,
        },
      ],
      characterAlbums: [],
      assetAlbums: [],
    });

    expect(draft.items).toHaveLength(1);
    expect(draft.items[0]).toMatchObject({
      label: 'Dock Guard',
      recurrence: 'one_off',
      group: 'quick_ref',
      recommendedAction: 'quick_ref',
      saveTarget: 'supporting_reference',
    });
  });

  it('creates a scene fallback item when no lore card matches the page context', () => {
    const draft = buildImageWorkshopDraftFromWriterSelection({
      source: {
        sourceLabel: 'Issue #8 · Page 2',
        issueTitle: 'Empty Temple',
        issueSynopsis: 'The heroes enter the abandoned shrine.',
        pageNumber: 2,
      },
      pageBeats: {
        one_line_hook: 'The abandoned shrine is lit only by moonlight.',
        panels: [{ action: 'The doors of the shrine open into a misty hall.' }],
      },
      loreCards: [],
      characterAlbums: [],
      assetAlbums: [],
    });

    expect(draft.items).toHaveLength(1);
    expect(draft.items[0]).toMatchObject({
      entityKind: 'location',
      group: 'quick_ref',
      recommendedAction: 'quick_ref',
      label: 'Scene reference',
    });
    expect(draft.moodboardPrompts.length).toBeGreaterThan(0);
  });

  it('preserves selected Writer page provenance and page beat prompts for Imageshop handoff', () => {
    const draft = buildImageWorkshopDraftFromWriterSelection({
      source: {
        sourceLabel: 'Issue #6 · Page 9',
        issueTitle: 'The Observatory Door',
        issueSynopsis: 'Mara and Sol reach the observatory.',
        issueId: 'writer-issue-6',
        seriesId: 'writer-series-1',
        pageId: 'writer-page-9',
        pageNumber: 9,
      },
      pageBeats: {
        one_line_hook: 'Mara opens the observatory door while Sol guards the bridge.',
        characters: ['Mara', 'Sol'],
        locations: ['Observatory bridge'],
        art_style: 'ink wash',
        panels: [
          {
            action: 'Mara opens the observatory door.',
            composition: 'Wide panel with the bridge behind her.',
          },
          {
            action: 'Sol raises the gold lantern.',
            composition: 'Low angle on the lantern flare.',
          },
        ],
      },
      scriptText: 'MARA: Stay close.\nSOL: The lantern is reacting.',
      loreCards: [],
      characterAlbums: [],
      assetAlbums: [],
    });

    expect(draft.source).toMatchObject({
      issueId: 'writer-issue-6',
      seriesId: 'writer-series-1',
      pageId: 'writer-page-9',
      pageNumber: 9,
    });
    expect(draft.moodboardPrompts).toEqual(
      expect.arrayContaining([
        'Mara opens the observatory door while Sol guards the bridge.',
        'Mara opens the observatory door.',
        'MARA: Stay close.\nSOL: The lantern is reacting.',
      ]),
    );
    expect(draft.items[0]).toMatchObject({
      label: 'Scene reference',
      recommendedAction: 'quick_ref',
    });
    expect(draft.panelQueue).toMatchObject({
      source: 'writer-json',
      seriesId: 'writer-series-1',
      issueId: 'writer-issue-6',
      issueTitle: 'The Observatory Door',
      issueNumber: 6,
      pages: [
        {
          id: 'writer-page-9',
          pageNumber: 9,
          summary: 'Mara opens the observatory door while Sol guards the bridge.',
          panels: [
            {
              pageId: 'writer-page-9',
              pageNumber: 9,
              panelNumber: 1,
              action: 'Mara opens the observatory door.',
              composition: 'Wide panel with the bridge behind her.',
              characters: ['Mara', 'Sol'],
              locations: ['Observatory bridge'],
              artStyle: 'ink wash',
              status: 'draft',
            },
            {
              pageId: 'writer-page-9',
              pageNumber: 9,
              panelNumber: 2,
              action: 'Sol raises the gold lantern.',
              composition: 'Low angle on the lantern flare.',
              characters: ['Mara', 'Sol'],
              locations: ['Observatory bridge'],
              artStyle: 'ink wash',
              status: 'draft',
            },
          ],
        },
      ],
    });
  });
});
