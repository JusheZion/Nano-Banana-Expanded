import { describe, expect, it } from 'vitest';
import {
  buildImageshopWriterImageMapExport,
  normalizeImageshopWriterJson,
} from '@/portals/storyline/imageshopWriterImport';

describe('imageshopWriterImport', () => {
  it('imports Writer issue-pack JSON into a page/panel queue with lore and vault metadata', () => {
    const result = normalizeImageshopWriterJson({
      issue_id: 'issue-42',
      exported_at: '2026-06-01T14:00:00.000Z',
      series: {
        id: 'series-1',
        title: 'Twovestellium',
      },
      production_defaults: {
        art_style: 'celestial art nouveau comic',
      },
      issue: {
        issue_number: 42,
        title: 'The Observatory Door',
        synopsis: 'Flux enters the sky observatory.',
      },
      pages: [
        {
          id: 'writer-page-1',
          page_number: 1,
          beats_json: {
            page_number_ref: 1,
            one_line_hook: 'Flux reaches the observatory.',
            characters: ['Flux'],
            locations: ['Sky Observatory'],
            art_style: 'ornate gold linework',
            panels: [
              {
                id: 'beat-panel-1',
                index: 1,
                action: 'Flux opens a brass iris door.',
                composition: 'Low angle with astrolabe foreground.',
                dialogue_placeholder: 'This place remembers us.',
                sfx: 'KRRRNNG',
                lore_ids: ['lore-flux', 'lore-observatory'],
                reference_ids: ['character-flux-cover', 'asset-observatory-cover'],
                canon: [
                  {
                    id: 'lore-flux',
                    title: 'Flux',
                    category: 'character',
                    source: 'obsidian',
                    summary: 'Gold eyes, cobalt coat, white comet badge.',
                    source_path: 'Characters/Flux.md',
                  },
                ],
                references: [
                  {
                    id: 'character-flux-cover',
                    label: 'Flux identity',
                    lane: 'character-dna',
                    source_type: 'character',
                    image_url: 'https://example.test/flux.png',
                  },
                ],
              },
            ],
          },
          script_text: 'PANEL 1\nFLUX: This place remembers us.',
        },
      ],
    });

    expect(result.batch.kind).toBe('writer-issue-json');
    expect(result.batch.title).toBe('The Observatory Door');
    expect(result.batch.items[0]).toMatchObject({
      sourceId: 'issue-42-page-1-panel-1',
      sourceKind: 'writer-panel',
      label: 'Page 1 Panel 1',
      prompt: 'Flux opens a brass iris door.',
    });
    expect(result.queue).toMatchObject({
      source: 'writer-json',
      seriesId: 'series-1',
      seriesTitle: 'Twovestellium',
      issueId: 'issue-42',
      issueTitle: 'The Observatory Door',
      issueNumber: 42,
    });
    expect(result.queue.pages[0].panels[0]).toMatchObject({
      pageId: 'writer-page-1',
      beatId: 'beat-panel-1',
      queueItemId: 'issue-42-page-1-panel-1',
      prompt: 'Flux opens a brass iris door.',
      composition: 'Low angle with astrolabe foreground.',
      dialogue: 'This place remembers us.',
      sfx: 'KRRRNNG',
      characters: ['Flux'],
      locations: ['Sky Observatory'],
      artStyle: 'ornate gold linework',
      loreIds: ['lore-flux', 'lore-observatory'],
      referenceIds: ['character-flux-cover', 'asset-observatory-cover'],
    });
    expect(result.queue.pages[0].panels[0].canonChips[0]).toMatchObject({
      id: 'lore-flux',
      title: 'Flux',
      source: 'obsidian',
      provenance: {
        obsidianPath: 'Characters/Flux.md',
      },
    });
    expect(result.queue.pages[0].panels[0].referenceChips[0]).toMatchObject({
      id: 'character-flux-cover',
      lane: 'character-dna',
      sourceType: 'character',
      imageUrl: 'https://example.test/flux.png',
    });
    expect(result.diagnostics).toEqual([]);
  });

  it('returns workflow diagnostics for empty pages, malformed beats, and missing prompt text', () => {
    const result = normalizeImageshopWriterJson({
      issue_id: 'issue-diagnostics',
      exported_at: '2026-06-01T14:00:00.000Z',
      issue: {
        issue_number: 3,
        title: 'Diagnostics',
      },
      pages: [
        {
          page_number: 1,
          beats_json: null,
          script_text: null,
        },
        {
          page_number: 2,
          beats_json: {
            one_line_hook: 'Page has empty panels.',
            panels: [],
          },
          script_text: null,
        },
        {
          page_number: 3,
          beats_json: {
            one_line_hook: 'Panel exists without prompt text.',
            panels: [{ index: 1, action: '', composition: '' }],
          },
          script_text: null,
        },
      ],
    });

    expect(result.queue.pages).toHaveLength(3);
    expect(result.diagnostics).toEqual([
      {
        code: 'missing_page_beats',
        severity: 'warning',
        message: 'Page 1 has no beats_json panels to import.',
        pageNumber: 1,
      },
      {
        code: 'empty_page_panels',
        severity: 'warning',
        message: 'Page 2 has an empty panels array.',
        pageNumber: 2,
      },
      {
        code: 'missing_panel_prompt',
        severity: 'error',
        message: 'Page 3 Panel 1 has no action, composition, or prompt text.',
        pageNumber: 3,
        panelNumber: 1,
      },
    ]);
    expect(result.queue.pages[2].panels[0].queueItemId).toBe('issue-diagnostics-page-3-panel-1');
  });

  it('exports a Writer-compatible image map from approved/generated panel outputs', () => {
    const result = normalizeImageshopWriterJson({
      issue_id: 'issue-map',
      exported_at: '2026-06-01T14:00:00.000Z',
      issue: {
        issue_number: 5,
        title: 'Image Map',
      },
      pages: [
        {
          id: 'writer-page-9',
          page_number: 9,
          beats_json: {
            one_line_hook: 'The panel is ready.',
            characters: ['Mara'],
            locations: ['Engine Shrine'],
            art_style: 'diesel fantasy ink',
            panels: [{ id: 'panel-a', index: 2, action: 'Mara lifts a lantern engine.' }],
          },
          script_text: null,
        },
      ],
    });

    const imageMap = buildImageshopWriterImageMapExport({
      queue: result.queue,
      outputs: [
        {
          queueItemId: 'issue-map-page-9-panel-2',
          imageUrl: 'https://example.test/panel.png',
          status: 'approved',
          versionId: 'version-1',
          prompt: 'Mara lifts a lantern engine.',
          model: 'gemini-2.5-flash-image-preview',
          seed: 101,
        },
      ],
    });

    expect(imageMap).toMatchObject({
      source: 'imageshop',
      target: 'writers-workshop',
      kind: 'writer-image-map',
      writer_issue_id: 'issue-map',
      issue: {
        issue_number: 5,
        title: 'Image Map',
      },
      pages: [
        {
          page_number: 9,
          panels: [
            {
              queue_item_id: 'issue-map-page-9-panel-2',
              writer_page_id: 'writer-page-9',
              writer_panel_id: 'panel-a',
              panel_number: 2,
              image_url: 'https://example.test/panel.png',
              status: 'approved',
              version_id: 'version-1',
              prompt: 'Mara lifts a lantern engine.',
              model: 'gemini-2.5-flash-image-preview',
              seed: 101,
            },
          ],
        },
      ],
    });
  });
});
