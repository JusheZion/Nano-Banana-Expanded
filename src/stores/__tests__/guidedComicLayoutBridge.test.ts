import { beforeEach, describe, expect, it } from 'vitest';
import { useGuidedComicLayoutBridge } from '@/stores/guidedComicLayoutBridge';

beforeEach(() => {
  useGuidedComicLayoutBridge.setState({
    layoutHandoff: null,
  });
});

describe('useGuidedComicLayoutBridge', () => {
  it('stores a guided comic layout handoff for Advanced Comics Studio', () => {
    useGuidedComicLayoutBridge.getState().requestLayoutHandoff({
      pageId: 'guided-page-2',
      pageNumber: 2,
      layoutTemplate: 'three-panel',
      layoutIntent: 'wide',
      panelCount: 3,
      orderedPanelIds: ['page-2-panel-1', 'page-2-panel-2', 'page-2-panel-3'],
      normalizedPanelRects: [
        { panelId: 'page-2-panel-1', order: 0, rect: { x: 0, y: 0, width: 0.5, height: 0.35 } },
        { panelId: 'page-2-panel-2', order: 1, rect: { x: 0.5, y: 0, width: 0.5, height: 0.35 } },
        { panelId: 'page-2-panel-3', order: 2, rect: { x: 0, y: 0.35, width: 1, height: 0.65 } },
      ],
      panelGeometry: [
        { panelId: 'page-2-panel-1', x: 0, y: 0, w: 0.5, h: 0.35, order: 0 },
        { panelId: 'page-2-panel-2', x: 0.5, y: 0, w: 0.5, h: 0.35, order: 1 },
        { panelId: 'page-2-panel-3', x: 0, y: 0.35, w: 1, h: 0.65, order: 2 },
      ],
      panelArtImages: {
        'page-2-panel-1': {
          panelId: 'page-2-panel-1',
          imageId: 'vault-image-1',
          imageUrl: 'https://example.com/panel-1.png',
          source: 'vault',
        },
      },
      panelShapeDefaults: {
        shapeType: 'rect',
        isVisible: true,
        isLocked: false,
      },
      panelBeats: [
        {
          panelId: 'page-2-panel-1',
          panelNumber: 1,
          beatText: 'Opening image.',
        },
      ],
    });

    const payload = useGuidedComicLayoutBridge.getState().layoutHandoff;

    expect(payload).toMatchObject({
      source: 'guided-comic',
      target: 'advanced-comics-studio',
      pageId: 'guided-page-2',
      pageNumber: 2,
      layoutTemplate: 'three-panel',
      layoutIntent: 'wide',
      panelCount: 3,
      orderedPanelIds: ['page-2-panel-1', 'page-2-panel-2', 'page-2-panel-3'],
      normalizedPanelRects: [
        { panelId: 'page-2-panel-1', order: 0, rect: { x: 0, y: 0, width: 0.5, height: 0.35 } },
        { panelId: 'page-2-panel-2', order: 1, rect: { x: 0.5, y: 0, width: 0.5, height: 0.35 } },
        { panelId: 'page-2-panel-3', order: 2, rect: { x: 0, y: 0.35, width: 1, height: 0.65 } },
      ],
      panelGeometry: [
        { panelId: 'page-2-panel-1', x: 0, y: 0, w: 0.5, h: 0.35, order: 0 },
        { panelId: 'page-2-panel-2', x: 0.5, y: 0, w: 0.5, h: 0.35, order: 1 },
        { panelId: 'page-2-panel-3', x: 0, y: 0.35, w: 1, h: 0.65, order: 2 },
      ],
      panelArtImages: {
        'page-2-panel-1': {
          imageId: 'vault-image-1',
          imageUrl: 'https://example.com/panel-1.png',
        },
      },
      panelShapeDefaults: {
        shapeType: 'rect',
        isVisible: true,
        isLocked: false,
      },
    });
    expect(payload?.requestedAt).toEqual(expect.any(String));
  });

  it('consumes layout handoffs once', () => {
    useGuidedComicLayoutBridge.getState().requestLayoutHandoff({
      pageNumber: 1,
      layoutTemplate: 'splash',
      panelCount: 1,
      orderedPanelIds: ['page-1-panel-1'],
      panelGeometry: [{ panelId: 'page-1-panel-1', x: 0, y: 0, w: 1, h: 1, order: 0 }],
      panelArtImages: {},
    });

    expect(useGuidedComicLayoutBridge.getState().consumeLayoutHandoff()?.pageNumber).toBe(1);
    expect(useGuidedComicLayoutBridge.getState().layoutHandoff).toBeNull();
    expect(useGuidedComicLayoutBridge.getState().consumeLayoutHandoff()).toBeNull();
  });
});
