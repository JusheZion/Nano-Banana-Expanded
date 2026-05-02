import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useComicStore } from '@/stores/comicStore';
import type { GuidedComicLayoutHandoff } from '@/stores/guidedComicLayoutBridge';

const initialState = useComicStore.getState();

beforeEach(() => {
  let id = 0;
  vi.spyOn(crypto, 'randomUUID').mockImplementation(() => `test-panel-${id += 1}` as `${string}-${string}-${string}-${string}-${string}`);
  useComicStore.setState({
    ...initialState,
    pages: [
      {
        id: 'page-1',
        panels: [],
        balloons: [],
        drawings: [],
        overlays: [],
        background: '#ffffff',
        layerOrder: [],
      },
    ],
    currentPageId: 'page-1',
    selectedElementIds: [],
    groupsByPage: {},
    gutterSize: 16,
  });
});

describe('guided comic layout import', () => {
  it('replaces the current page with the requested layout and panel images', () => {
    const payload: GuidedComicLayoutHandoff = {
      source: 'guided-comic',
      target: 'advanced-comics-studio',
      pageNumber: 4,
      layoutTemplate: 'three-panel',
      orderedPanelIds: ['page-4-panel-1', 'page-4-panel-2', 'page-4-panel-3'],
      panelArtImages: {
        'page-4-panel-1': {
          panelId: 'page-4-panel-1',
          imageUrl: 'https://example.com/panel-1.png',
        },
        'page-4-panel-3': {
          panelId: 'page-4-panel-3',
          imageUrl: 'https://example.com/panel-3.png',
        },
      },
      panelBeats: [
        {
          panelId: 'page-4-panel-1',
          panelNumber: 1,
          beatText: 'Wide establishing shot.',
        },
      ],
      requestedAt: '2026-05-01T00:00:00.000Z',
    };

    useComicStore.getState().replaceCurrentPageWithGuidedLayout(payload);

    const page = useComicStore.getState().pages[0];
    expect(page.panels).toHaveLength(3);
    expect(page.panels[0]).toMatchObject({
      id: 'test-panel-1',
      shapeType: 'rect',
      x: 16,
      y: 16,
      width: 768,
      imageUrl: 'https://example.com/panel-1.png',
      prompt: 'Wide establishing shot.',
      imageFillMode: 'cover',
    });
    expect(page.panels[1]?.imageUrl).toBeUndefined();
    expect(page.panels[2]?.imageUrl).toBe('https://example.com/panel-3.png');
    expect(page.layerOrder).toEqual(['test-panel-1', 'test-panel-2', 'test-panel-3']);
    expect(useComicStore.getState().currentPageId).toBe('page-1');
  });
});
