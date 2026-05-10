import { describe, expect, it } from 'vitest';
import {
  isComicAssetObject,
  isComicBalloonObject,
  isComicPanelObject,
  isComicTextObject,
  normalizeLegacyComicObject,
} from '../comicObjects';
import { normalizeLegacyComicPage, serializeComicPageForLegacyStore } from '../comicSerialization';

describe('canonical comic object compatibility helpers', () => {
  it('guards canonical panel, balloon, text, and asset objects', () => {
    expect(
      isComicPanelObject({
        id: 'panel-1',
        kind: 'panel',
        type: 'panel',
        geometry: {
          shapeType: 'rect',
          coordinateSpace: 'absolute',
          bounds: { x: 0, y: 0, width: 100, height: 120 },
        },
      }),
    ).toBe(true);
    expect(isComicBalloonObject({ id: 'balloon-1', kind: 'balloon', type: 'balloon', text: 'Hello' })).toBe(
      true,
    );
    expect(isComicTextObject({ id: 'text-1', kind: 'text', type: 'text', text: 'Caption' })).toBe(true);
    expect(isComicAssetObject({ id: 'asset-1', kind: 'asset', type: 'image', src: 'https://example.com/a.png' })).toBe(
      true,
    );
    expect(isComicPanelObject({ id: 'panel-1', type: 'panel' })).toBe(false);
  });

  it('normalizes a legacy panel object while preserving its existing fields', () => {
    const legacyPanel = {
      id: 'panel-1',
      type: 'panel',
      shapeType: 'rect',
      x: 10,
      y: 20,
      width: 300,
      height: 220,
      rotation: 12,
      flipX: true,
      imageUrl: 'https://example.com/panel.png',
      imageFillMode: 'contain',
      imageFocusX: 0.25,
      imageFocusY: 0.75,
      imageScale: 1.35,
      prompt: 'Wide establishing shot.',
      strokeColor: '#111111',
    };

    const normalized = normalizeLegacyComicObject(legacyPanel);

    expect(normalized).not.toBe(legacyPanel);
    expect(isComicPanelObject(normalized)).toBe(true);
    expect(normalized).toMatchObject({
      id: 'panel-1',
      kind: 'panel',
      type: 'panel',
      shapeType: 'rect',
      x: 10,
      strokeColor: '#111111',
      geometry: {
        shapeType: 'rect',
        coordinateSpace: 'absolute',
        bounds: { x: 10, y: 20, width: 300, height: 220 },
      },
      transform: { x: 10, y: 20, width: 300, height: 220, rotation: 12, flipX: true },
      image: {
        url: 'https://example.com/panel.png',
        fit: 'contain',
        focusX: 0.25,
        focusY: 0.75,
        scale: 1.35,
        prompt: 'Wide establishing shot.',
      },
    });
  });

  it('normalizes and serializes a legacy comic page without dropping legacy arrays', () => {
    const legacyPage = {
      id: 'page-1',
      background: '#ffffff',
      isCover: true,
      panels: [
        {
          id: 'panel-1',
          type: 'panel',
          shapeType: 'ellipse',
          x: 0,
          y: 0,
          width: 400,
          height: 300,
          imageUrl: 'https://example.com/panel.png',
        },
      ],
      balloons: [
        {
          id: 'balloon-1',
          type: 'balloon',
          text: 'Go!',
          x: 32,
          y: 40,
          width: 120,
          height: 80,
          hasTail: true,
          tailBasePoint: { x: 60, y: 80 },
          tailTip: { x: 95, y: 140 },
          styleId: 'speech_round',
        },
      ],
      drawings: [{ id: 'drawing-1', type: 'drawing', points: [0, 0, 10, 10], stroke: '#000000', strokeWidth: 2 }],
      overlays: [{ id: 'overlay-1', type: 'image', src: 'https://example.com/overlay.png', x: 5, y: 6, rotation: 0, scaleX: 1, scaleY: 1, zIndex: 9 }],
      layerOrder: ['panel-1', 'balloon-1', 'drawing-1'],
    };

    const normalized = normalizeLegacyComicPage(legacyPage);

    expect(normalized).not.toBeNull();
    expect(normalized?.objects.map((object) => object.id)).toEqual(['panel-1', 'balloon-1', 'drawing-1', 'overlay-1']);
    expect(normalized?.layers.map((layer) => layer.objectId)).toEqual(['panel-1', 'balloon-1', 'drawing-1', 'overlay-1']);
    expect(normalized?.panels[0]?.geometry.bounds).toEqual({ x: 0, y: 0, width: 400, height: 300 });
    expect(normalized?.overlays[0]).toMatchObject({ kind: 'asset', type: 'image', src: 'https://example.com/overlay.png' });

    const legacyStorePage = serializeComicPageForLegacyStore(normalized);

    expect(legacyStorePage).toMatchObject({
      id: 'page-1',
      background: '#ffffff',
      isCover: true,
      layerOrder: ['panel-1', 'balloon-1', 'drawing-1'],
      panels: [expect.objectContaining({ id: 'panel-1', type: 'panel', imageUrl: 'https://example.com/panel.png' })],
      balloons: [expect.objectContaining({ id: 'balloon-1', type: 'balloon', text: 'Go!' })],
      drawings: [expect.objectContaining({ id: 'drawing-1', type: 'drawing' })],
      overlays: [expect.objectContaining({ id: 'overlay-1', type: 'image', src: 'https://example.com/overlay.png' })],
    });
    expect('objects' in legacyStorePage).toBe(false);
    expect('layers' in legacyStorePage).toBe(false);
  });
});
