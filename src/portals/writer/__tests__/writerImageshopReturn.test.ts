import { describe, expect, it } from 'vitest';
import { mergeImageshopImageMapIntoWriterBeats } from '@/portals/writer/writerImageshopReturn';

describe('mergeImageshopImageMapIntoWriterBeats', () => {
  it('merges Imageshop image and provenance metadata into the matching panel', () => {
    const result = mergeImageshopImageMapIntoWriterBeats({
      beatsJson: {
        one_line_hook: 'Flux reaches the observatory.',
        panels: [
          {
            index: 1,
            action: 'Flux enters.',
          },
          {
            index: 2,
            action: 'The engine ignites.',
          },
        ],
      },
      imageMapPanel: {
        queue_item_id: 'issue-return-page-1-panel-2',
        writer_panel_id: 'panel-two',
        panel_number: 2,
        image_url: 'data:image/png;base64,returned',
        status: 'approved',
        version_id: 'version-2',
        prompt: 'The engine ignites.',
        model: 'pro',
        seed: 42,
        canon_used: [
          {
            id: 'canon-engine',
            title: 'Sky engine',
            category: 'lore',
            source: 'obsidian',
            summary: 'The engine emits gold light.',
          },
        ],
        references_used: [],
      },
      returnedAt: '2026-06-05T14:00:00.000Z',
    });

    expect(result.panels).toEqual([
      expect.objectContaining({
        index: 1,
        action: 'Flux enters.',
      }),
      expect.objectContaining({
        index: 2,
        action: 'The engine ignites.',
        imageshop_output: expect.objectContaining({
          image_url: 'data:image/png;base64,returned',
          status: 'approved',
          version_id: 'version-2',
          model: 'pro',
          seed: 42,
          returned_at: '2026-06-05T14:00:00.000Z',
          canon_used: [expect.objectContaining({ id: 'canon-engine' })],
        }),
      }),
    ]);
  });

  it('creates a panels list when the page does not have panel beats yet', () => {
    const result = mergeImageshopImageMapIntoWriterBeats({
      beatsJson: null,
      imageMapPanel: {
        queue_item_id: 'issue-return-page-3-panel-1',
        panel_number: 1,
        image_url: 'data:image/png;base64,returned',
        status: 'generated',
        canon_used: [],
        references_used: [],
      },
      returnedAt: '2026-06-05T14:00:00.000Z',
    });

    expect(result.panels).toEqual([
      expect.objectContaining({
        index: 1,
        imageshop_output: expect.objectContaining({
          image_url: 'data:image/png;base64,returned',
        }),
      }),
    ]);
  });
});
