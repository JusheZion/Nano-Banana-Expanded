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
  it('imports a three-panel edited layout with exact geometry, image URLs, and order', () => {
    const payload: GuidedComicLayoutHandoff = {
      source: 'guided-comic',
      target: 'advanced-comics-studio',
      pageId: 'guided-page-1',
      pageNumber: 1,
      layoutTemplate: 'auto',
      layoutIntent: 'feature',
      panelCount: 3,
      orderedPanelIds: ['page-1-panel-2', 'page-1-panel-1', 'page-1-panel-3'],
      normalizedPanelRects: [
        { panelId: 'page-1-panel-2', order: 0, rect: { x: 0.4, y: 0.04, width: 0.56, height: 0.32 } },
        { panelId: 'page-1-panel-1', order: 1, rect: { x: 0.04, y: 0.04, width: 0.32, height: 0.5 } },
        { panelId: 'page-1-panel-3', order: 2, rect: { x: 0.04, y: 0.58, width: 0.92, height: 0.38 } },
      ],
      panelGeometry: [
        { panelId: 'page-1-panel-2', x: 0.4, y: 0.04, w: 0.56, h: 0.32, order: 0 },
        { panelId: 'page-1-panel-1', x: 0.04, y: 0.04, w: 0.32, h: 0.5, order: 1 },
        { panelId: 'page-1-panel-3', x: 0.04, y: 0.58, w: 0.92, h: 0.38, order: 2 },
      ],
      panelArtImages: {
        'page-1-panel-1': { panelId: 'page-1-panel-1', imageId: 'image-1', imageUrl: 'https://example.com/one.png' },
        'page-1-panel-2': { panelId: 'page-1-panel-2', imageId: 'image-2', imageUrl: 'https://example.com/two.png' },
        'page-1-panel-3': { panelId: 'page-1-panel-3', imageId: 'image-3', imageUrl: 'https://example.com/three.png' },
      },
      panelShapeDefaults: {
        shapeType: 'rect',
        isVisible: true,
        isLocked: false,
      },
      requestedAt: '2026-05-01T00:00:00.000Z',
    };

    useComicStore.getState().replaceCurrentPageWithGuidedLayout(payload);

    const page = useComicStore.getState().pages[0];
    expect(page.panels).toHaveLength(3);
    expect(page.panels.map((panel) => panel.imageUrl)).toEqual([
      'https://example.com/two.png',
      'https://example.com/one.png',
      'https://example.com/three.png',
    ]);
    expect(page.panels[0]).toMatchObject({ x: 320, y: 48, width: 448, height: 384 });
    expect(page.panels[1]).toMatchObject({ x: 32, y: 48, width: 256, height: 600 });
    expect(page.panels[2]).toMatchObject({ x: 32, y: 696, width: 736, height: 456 });
    expect(page.layerOrder).toEqual(['test-panel-1', 'test-panel-2', 'test-panel-3']);
  });

  it('imports a four-panel edited layout without replacing it with template geometry', () => {
    const payload: GuidedComicLayoutHandoff = {
      source: 'guided-comic',
      target: 'advanced-comics-studio',
      pageId: 'guided-page-3',
      pageNumber: 3,
      layoutTemplate: 'four-panel',
      panelCount: 4,
      orderedPanelIds: ['page-3-panel-1', 'page-3-panel-2', 'page-3-panel-3', 'page-3-panel-4'],
      normalizedPanelRects: [
        { panelId: 'page-3-panel-1', order: 0, rect: { x: 0.04, y: 0.04, width: 0.6, height: 0.28 } },
        { panelId: 'page-3-panel-2', order: 1, rect: { x: 0.68, y: 0.04, width: 0.28, height: 0.28 } },
        { panelId: 'page-3-panel-3', order: 2, rect: { x: 0.04, y: 0.36, width: 0.42, height: 0.6 } },
        { panelId: 'page-3-panel-4', order: 3, rect: { x: 0.5, y: 0.36, width: 0.46, height: 0.6 } },
      ],
      panelGeometry: [],
      panelArtImages: {},
      requestedAt: '2026-05-01T00:00:00.000Z',
    };

    useComicStore.getState().replaceCurrentPageWithGuidedLayout(payload);

    const page = useComicStore.getState().pages[0];
    expect(page.panels).toHaveLength(4);
    expect(page.panels[0]).toMatchObject({ x: 32, y: 48, width: 480, height: 336 });
    expect(page.panels[1]).toMatchObject({ x: 544, y: 48, width: 224, height: 336 });
    expect(page.panels[2]).toMatchObject({ x: 32, y: 432, width: 336, height: 720 });
    expect(page.panels[3]).toMatchObject({ x: 400, y: 432, width: 368, height: 720 });
  });

  it('replaces the current page with the requested layout and panel images', () => {
    const payload: GuidedComicLayoutHandoff = {
      source: 'guided-comic',
      target: 'advanced-comics-studio',
      pageNumber: 4,
      layoutTemplate: 'three-panel',
      panelCount: 3,
      orderedPanelIds: ['page-4-panel-1', 'page-4-panel-2', 'page-4-panel-3'],
      panelGeometry: [
        { panelId: 'page-4-panel-1', x: 0, y: 0, w: 1, h: 0.32, order: 0 },
        {
          panelId: 'page-4-panel-2',
          x: 0,
          y: 0.34,
          w: 1,
          h: 0.32,
          order: 1,
          imageFit: 'cover',
          imageFocusX: 0.25,
          imageFocusY: 0.75,
          imageZoom: 1.35,
        },
        { panelId: 'page-4-panel-3', x: 0, y: 0.68, w: 1, h: 0.32, order: 2 },
      ],
      panelArtImages: {
        'page-4-panel-1': {
          panelId: 'page-4-panel-1',
          imageUrl: 'https://example.com/panel-1.png',
        },
        'page-4-panel-2': {
          panelId: 'page-4-panel-2',
          imageUrl: 'https://example.com/panel-2.png',
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
      x: 0,
      y: 0,
      width: 800,
      imageUrl: 'https://example.com/panel-1.png',
      prompt: 'Wide establishing shot.',
      imageFillMode: 'cover',
    });
    expect(page.panels[1]).toMatchObject({
      imageUrl: 'https://example.com/panel-2.png',
      imageFillMode: 'cover',
      imageFocusX: 0.25,
      imageFocusY: 0.75,
      imageScale: 1.35,
    });
    expect(page.panels[2]?.imageUrl).toBe('https://example.com/panel-3.png');
    expect(page.layerOrder).toEqual(['test-panel-1', 'test-panel-2', 'test-panel-3']);
    expect(useComicStore.getState().currentPageId).toBe('page-1');
  });

  it('imports a two-over-one-wide guided layout with all selected panel images', () => {
    const payload: GuidedComicLayoutHandoff = {
      source: 'guided-comic',
      target: 'advanced-comics-studio',
      pageNumber: 2,
      layoutTemplate: 'three-panel-wide-bottom',
      panelCount: 3,
      orderedPanelIds: ['page-2-panel-1', 'page-2-panel-2', 'page-2-panel-3'],
      panelGeometry: [
        { panelId: 'page-2-panel-1', x: 0.1, y: 0.1, w: 0.3, h: 0.25, order: 0 },
        { panelId: 'page-2-panel-2', x: 0.55, y: 0.1, w: 0.35, h: 0.25, order: 1 },
        { panelId: 'page-2-panel-3', x: 0.1, y: 0.45, w: 0.8, h: 0.4, order: 2 },
      ],
      panelArtImages: {
        'page-2-panel-1': {
          panelId: 'page-2-panel-1',
          imageUrl: 'https://example.com/panel-1.png',
        },
        'page-2-panel-2': {
          panelId: 'page-2-panel-2',
          imageUrl: 'https://example.com/panel-2.png',
        },
        'page-2-panel-3': {
          panelId: 'page-2-panel-3',
          imageUrl: 'https://example.com/panel-3.png',
        },
      },
      panelBeats: [
        { panelId: 'page-2-panel-1', panelNumber: 1, beatText: 'Left reaction.' },
        { panelId: 'page-2-panel-2', panelNumber: 2, beatText: 'Right reaction.' },
        { panelId: 'page-2-panel-3', panelNumber: 3, beatText: 'Wide bottom reveal.' },
      ],
      requestedAt: '2026-05-01T00:00:00.000Z',
    };

    useComicStore.getState().replaceCurrentPageWithGuidedLayout(payload);

    const page = useComicStore.getState().pages[0];
    expect(page.panels).toHaveLength(3);
    expect(page.panels.map((panel) => panel.imageUrl)).toEqual([
      'https://example.com/panel-1.png',
      'https://example.com/panel-2.png',
      'https://example.com/panel-3.png',
    ]);
    expect(page.panels[0]).toMatchObject({ x: 80, y: 120, width: 240, height: 300 });
    expect(page.panels[1]).toMatchObject({ x: 440, y: 120, width: 280, height: 300 });
    expect(page.panels[2]).toMatchObject({ x: 80, y: 540, width: 640, height: 480 });
  });

  it('keeps legacy template-only handoffs working until the new payload is manually proven', () => {
    const payload: GuidedComicLayoutHandoff = {
      source: 'guided-comic',
      target: 'advanced-comics-studio',
      pageNumber: 5,
      layoutTemplate: 'three-panel-wide-bottom',
      panelCount: 3,
      orderedPanelIds: ['legacy-panel-1', 'legacy-panel-2', 'legacy-panel-3'],
      panelGeometry: [],
      panelArtImages: {
        'legacy-panel-2': {
          panelId: 'legacy-panel-2',
          imageUrl: 'https://example.com/legacy-2.png',
        },
      },
      requestedAt: '2026-05-01T00:00:00.000Z',
    };

    useComicStore.getState().replaceCurrentPageWithGuidedLayout(payload);

    const page = useComicStore.getState().pages[0];
    expect(page.panels).toHaveLength(3);
    expect(page.panels.map((panel) => panel.shapeType)).toEqual(['rect', 'rect', 'rect']);
    expect(page.panels[1]?.imageUrl).toBe('https://example.com/legacy-2.png');
    expect(page.panels.every((panel) => panel.width > 0 && panel.height > 0)).toBe(true);
    expect(page.layerOrder).toEqual(['test-panel-1', 'test-panel-2', 'test-panel-3']);
  });
});
