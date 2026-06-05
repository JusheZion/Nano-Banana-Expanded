import { describe, expect, it } from 'vitest';
import { buildImageshopProductionBoard } from '@/portals/storyline/imageshopProductionBoard';
import { createImageshopIssueQueue } from '@/portals/storyline/imageshopPagePanelQueue';
import type { ImageshopProductionItem } from '@/stores/imageshopProductionStore';

describe('buildImageshopProductionBoard', () => {
  it('groups production versions under their Writer page and panel', () => {
    const queue = createImageshopIssueQueue({
      source: 'writer-json',
      importedAt: '2026-06-05T12:00:00.000Z',
      issue: {
        id: 'issue-board',
        title: 'Board Issue',
      },
      pages: [
        {
          pageNumber: 2,
          panels: [
            {
              panelNumber: 3,
              action: 'Flux reviews two versions.',
            },
          ],
        },
      ],
    });
    const queueItemId = queue.pages[0].panels[0].queueItemId;
    const item: ImageshopProductionItem = {
      id: 'production-1',
      sourceId: queueItemId,
      sourceKind: 'writer-panel',
      label: 'Page 2 Panel 3',
      prompt: 'Flux reviews two versions.',
      promptSections: {},
      status: 'refined',
      currentVersionId: 'version-1',
      versions: [
        {
          id: 'version-2',
          kind: 'refined',
          imageUrl: 'data:image/png;base64,second',
          seed: 22,
          prompt: 'Second pass.',
          createdAt: '2026-06-05T12:02:00.000Z',
          provenance: {
            source: 'imageshop-panel-queue',
            sourceQueueId: queue.id,
            sourcePanelId: queueItemId,
            capturedAt: '2026-06-05T12:02:00.000Z',
            writer: {
              issueTitle: 'Board Issue',
              pageNumber: 2,
              panelNumber: 3,
            },
            generation: {
              model: 'pro',
              aspectRatio: '9:16',
              destination: 'writer-panel',
            },
            prompt: {
              composed: 'Second pass.',
              sections: {},
            },
            canon: [],
            references: [],
          },
        },
        {
          id: 'version-1',
          kind: 'generated',
          imageUrl: 'data:image/png;base64,first',
          seed: 11,
          prompt: 'First pass.',
          createdAt: '2026-06-05T12:01:00.000Z',
        },
      ],
      createdAt: '2026-06-05T12:00:00.000Z',
      updatedAt: '2026-06-05T12:02:00.000Z',
    };

    const board = buildImageshopProductionBoard(queue, [item]);

    expect(board.pages).toHaveLength(1);
    expect(board.pages[0].panels[0]).toMatchObject({
      queueItemId,
      pageNumber: 2,
      panelNumber: 3,
      productionItemId: 'production-1',
      status: 'refined',
      currentVersionId: 'version-1',
    });
    expect(board.pages[0].panels[0].versions).toEqual([
      expect.objectContaining({
        id: 'version-2',
        model: 'pro',
        seed: 22,
      }),
      expect.objectContaining({
        id: 'version-1',
        seed: 11,
      }),
    ]);
  });
});
