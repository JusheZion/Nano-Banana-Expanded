import { describe, expect, it } from 'vitest';
import {
  addImageshopPanelReferenceChip,
  clearImageshopPanelReferenceChips,
  createImageshopGenerationProvenance,
  createImageshopIssueQueue,
  findImageshopPanelQueueItem,
  getImageshopQueueReadiness,
  replaceImageshopPanelReferenceChips,
  restoreImageshopPanelReferenceChips,
} from '@/portals/storyline/imageshopPagePanelQueue';

describe('imageshopPagePanelQueue', () => {
  it('preserves Writer issue, page, panel, canon, and vault reference metadata', () => {
    const queue = createImageshopIssueQueue({
      source: 'writer-json',
      importedAt: '2026-06-01T12:00:00.000Z',
      series: {
        id: 'series-1',
        title: 'Twovestellium',
      },
      issue: {
        id: 'issue-7',
        title: 'The Sky Observatory',
        issueNumber: 7,
      },
      pages: [
        {
          id: 'page-1',
          pageNumber: 1,
          summary: 'Flux enters the observatory.',
          panels: [
            {
              id: 'panel-1',
              panelNumber: 1,
              beatId: 'beat-1',
              action: 'Flux steps through a brass iris door.',
              composition: 'Low angle, glowing astrolabe foreground.',
              dialogue: 'This place remembers us.',
              sfx: 'KRRRNNG',
              characters: ['Flux'],
              locations: ['Sky Observatory'],
              artStyle: 'ornate celestial comic inks',
              loreIds: ['lore-flux', 'lore-observatory'],
              referenceIds: ['character-flux-cover', 'asset-observatory-cover'],
              canonChips: [
                {
                  id: 'lore-flux',
                  title: 'Flux',
                  category: 'character',
                  source: 'obsidian',
                  summary: 'Flux has gold eyes, a cobalt coat, and a white comet badge.',
                  provenance: {
                    obsidianPath: 'Characters/Flux.md',
                  },
                },
              ],
              referenceChips: [
                {
                  id: 'character-flux-cover',
                  label: 'Flux identity',
                  lane: 'character-dna',
                  sourceType: 'character',
                  referenceId: 'character-flux-cover',
                  imageUrl: 'https://example.test/flux.png',
                },
              ],
            },
          ],
        },
      ],
    });

    expect(queue).toMatchObject({
      source: 'writer-json',
      seriesId: 'series-1',
      seriesTitle: 'Twovestellium',
      issueId: 'issue-7',
      issueTitle: 'The Sky Observatory',
      issueNumber: 7,
    });
    expect(queue.pages[0].panels[0]).toMatchObject({
      id: 'panel-1',
      queueItemId: 'issue-7-page-1-panel-1',
      pageId: 'page-1',
      pageNumber: 1,
      panelNumber: 1,
      prompt: 'Flux steps through a brass iris door.',
      dialogue: 'This place remembers us.',
      sfx: 'KRRRNNG',
      artStyle: 'ornate celestial comic inks',
      loreIds: ['lore-flux', 'lore-observatory'],
      referenceIds: ['character-flux-cover', 'asset-observatory-cover'],
      status: 'draft',
    });
    expect(queue.pages[0].panels[0].canonChips[0].provenance?.obsidianPath).toBe('Characters/Flux.md');
    expect(queue.pages[0].panels[0].referenceChips[0].lane).toBe('character-dna');
  });

  it('computes queue readiness across prompt, canon, references, and statuses', () => {
    const queue = createImageshopIssueQueue({
      source: 'writer-json',
      importedAt: '2026-06-01T12:00:00.000Z',
      issue: {
        id: 'issue-8',
        title: 'The Broken Compass',
        issueNumber: 8,
      },
      pages: [
        {
          pageNumber: 1,
          panels: [
            {
              panelNumber: 1,
              action: 'A compass opens under moonlight.',
              loreIds: ['lore-compass'],
              referenceIds: ['asset-compass'],
              canonChips: [
                {
                  id: 'lore-compass',
                  title: 'Golden Compass',
                  category: 'artifact',
                  source: 'obsidian',
                  summary: 'The compass is cracked across the north point.',
                },
              ],
              referenceChips: [
                {
                  id: 'asset-compass',
                  label: 'Golden Compass',
                  lane: 'props',
                  sourceType: 'asset',
                },
              ],
            },
            {
              panelNumber: 2,
              action: '',
              status: 'failed',
            },
            {
              panelNumber: 3,
              action: 'Flux pockets the compass.',
              status: 'approved',
            },
          ],
        },
      ],
    });

    expect(getImageshopQueueReadiness(queue)).toEqual({
      totalPanels: 3,
      readyPanels: 2,
      missingPromptPanels: ['issue-8-page-1-panel-2'],
      generatedPanels: 0,
      approvedPanels: 1,
      failedPanels: 1,
      canonChipCount: 1,
      referenceChipCount: 1,
    });
  });

  it('creates generation provenance snapshots for a queue panel', () => {
    const queue = createImageshopIssueQueue({
      source: 'writer-json',
      importedAt: '2026-06-01T12:00:00.000Z',
      series: {
        id: 'series-2',
        title: 'Astra Vale',
      },
      issue: {
        id: 'issue-9',
        title: 'Lantern Engine',
        issueNumber: 9,
      },
      pages: [
        {
          id: 'page-4',
          pageNumber: 4,
          summary: 'The engine wakes.',
          panels: [
            {
              id: 'panel-2',
              panelNumber: 2,
              action: 'A lantern engine rises from the floor.',
              characters: ['Mara'],
              locations: ['Engine Shrine'],
              artStyle: 'inked diesel-fantasy comic',
              loreIds: ['lore-engine'],
              referenceIds: ['asset-engine'],
              canonChips: [
                {
                  id: 'lore-engine',
                  title: 'Lantern Engine',
                  category: 'artifact',
                  source: 'obsidian',
                  summary: 'Bronze piston core with blue glass ribs.',
                },
              ],
              referenceChips: [
                {
                  id: 'asset-engine',
                  label: 'Lantern Engine asset',
                  lane: 'props',
                  sourceType: 'asset',
                },
              ],
            },
          ],
        },
      ],
    });
    const panel = findImageshopPanelQueueItem(queue, 'issue-9-page-4-panel-2');

    const provenance = createImageshopGenerationProvenance({
      queue,
      panel,
      model: 'gemini-2.5-flash-image-preview',
      aspectRatio: '1:1',
      prompt: 'Final composed prompt',
      promptSections: {
        main: 'A lantern engine rises from the floor.',
        artStyle: 'inked diesel-fantasy comic',
      },
      destination: 'production-version',
    });

    expect(provenance).toMatchObject({
      source: 'imageshop-panel-queue',
      sourceQueueId: queue.id,
      sourcePanelId: 'issue-9-page-4-panel-2',
      writer: {
        seriesId: 'series-2',
        issueId: 'issue-9',
        issueNumber: 9,
        pageId: 'page-4',
        pageNumber: 4,
        panelNumber: 2,
      },
      generation: {
        model: 'gemini-2.5-flash-image-preview',
        aspectRatio: '1:1',
        destination: 'production-version',
      },
      prompt: {
        composed: 'Final composed prompt',
        sections: {
          main: 'A lantern engine rises from the floor.',
          artStyle: 'inked diesel-fantasy comic',
        },
      },
    });
    expect(provenance.canon.map((chip) => chip.id)).toEqual(['lore-engine']);
    expect(provenance.references.map((chip) => chip.id)).toEqual(['asset-engine']);
  });

  it('adds, replaces, clears, and restores panel reference chips with explicit destructive confirmation', () => {
    const queue = createImageshopIssueQueue({
      source: 'writer-json',
      importedAt: '2026-06-01T12:00:00.000Z',
      issue: {
        id: 'issue-reference-actions',
        title: 'Reference Actions',
      },
      pages: [
        {
          pageNumber: 1,
          panels: [
            {
              panelNumber: 1,
              action: 'Flux checks the sky map.',
              referenceChips: [
                {
                  id: 'character-flux',
                  label: 'Flux identity',
                  lane: 'character-dna',
                  sourceType: 'character',
                  referenceId: 'character-flux',
                },
              ],
            },
          ],
        },
      ],
    });
    const queueItemId = 'issue-reference-actions-page-1-panel-1';

    const added = addImageshopPanelReferenceChip(queue, queueItemId, {
      id: 'asset-map',
      label: 'Sky map',
      lane: 'props',
      sourceType: 'asset',
      referenceId: 'asset-map',
    });

    expect(findImageshopPanelQueueItem(added.queue, queueItemId)?.referenceChips.map((chip) => chip.id)).toEqual([
      'character-flux',
      'asset-map',
    ]);
    expect(added.undo?.previousReferenceChips.map((chip) => chip.id)).toEqual(['character-flux']);

    const duplicate = addImageshopPanelReferenceChip(added.queue, queueItemId, {
      id: 'asset-map',
      label: 'Sky map',
      lane: 'props',
      sourceType: 'asset',
      referenceId: 'asset-map',
    });

    expect(findImageshopPanelQueueItem(duplicate.queue, queueItemId)?.referenceChips.map((chip) => chip.id)).toEqual([
      'character-flux',
      'asset-map',
    ]);

    const blockedReplace = replaceImageshopPanelReferenceChips(added.queue, queueItemId, [], { confirmed: false });
    expect(blockedReplace.blockedReason).toBe('confirmation-required');
    expect(findImageshopPanelQueueItem(blockedReplace.queue, queueItemId)?.referenceChips).toHaveLength(2);

    const replaced = replaceImageshopPanelReferenceChips(
      added.queue,
      queueItemId,
      [
        {
          id: 'style-board',
          label: 'Issue style board',
          lane: 'style',
          sourceType: 'approved-output',
          referenceId: 'style-board',
        },
      ],
      { confirmed: true },
    );
    expect(findImageshopPanelQueueItem(replaced.queue, queueItemId)?.referenceChips.map((chip) => chip.id)).toEqual([
      'style-board',
    ]);

    const restored = restoreImageshopPanelReferenceChips(replaced.queue, replaced.undo!);
    expect(findImageshopPanelQueueItem(restored.queue, queueItemId)?.referenceChips.map((chip) => chip.id)).toEqual([
      'character-flux',
      'asset-map',
    ]);

    const blockedClear = clearImageshopPanelReferenceChips(restored.queue, queueItemId, { confirmed: false });
    expect(blockedClear.blockedReason).toBe('confirmation-required');
    expect(findImageshopPanelQueueItem(blockedClear.queue, queueItemId)?.referenceChips).toHaveLength(2);

    const cleared = clearImageshopPanelReferenceChips(restored.queue, queueItemId, { confirmed: true });
    expect(findImageshopPanelQueueItem(cleared.queue, queueItemId)?.referenceChips).toEqual([]);

    const clearUndo = restoreImageshopPanelReferenceChips(cleared.queue, cleared.undo!);
    expect(findImageshopPanelQueueItem(clearUndo.queue, queueItemId)?.referenceChips.map((chip) => chip.id)).toEqual([
      'character-flux',
      'asset-map',
    ]);
  });
});
