import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useComicStore } from '@/stores/comicStore';

const initialState = useComicStore.getState();

beforeEach(() => {
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
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('comicStore project serialization', () => {
  it('serializes panel geometry, panel images, and balloon text/tail geometry', async () => {
    const serializedBlobs: Blob[] = [];
    const NativeBlob = Blob;
    class CapturingBlob extends NativeBlob {
      constructor(parts?: BlobPart[], options?: BlobPropertyBag) {
        super(parts, options);
        serializedBlobs.push(this);
      }
    }

    vi.stubGlobal('Blob', CapturingBlob);
    vi.stubGlobal('URL', {
      createObjectURL: vi.fn(() => 'blob:comic-project'),
      revokeObjectURL: vi.fn(),
    });
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);

    useComicStore.setState({
      ...useComicStore.getState(),
      pages: [
        {
          id: 'page-1',
          panels: [
            {
              id: 'panel-1',
              type: 'panel',
              shapeType: 'ellipse',
              x: 42,
              y: 84,
              width: 320,
              height: 240,
              imageUrl: 'https://example.com/panel.png',
              imageFillMode: 'cover',
              imageScale: 1.4,
              imageFocusX: 0.25,
              imageFocusY: 0.75,
              isVisible: true,
              isLocked: false,
            },
          ],
          balloons: [
            {
              id: 'balloon-1',
              type: 'balloon',
              x: 120,
              y: 160,
              width: 180,
              height: 96,
              hasTail: true,
              tailBasePoint: { x: 20, y: 40 },
              tailTip: { x: 250, y: 360 },
              styleId: 'speech_round',
              text: 'Still attached!',
              overrides: { fontSize: 24, textAlignHorizontal: 'center' },
              autoSize: false,
              padding: 20,
              isVisible: true,
              isLocked: false,
            },
          ],
          drawings: [],
          overlays: [],
          background: '#ffffff',
          layerOrder: ['panel-1', 'balloon-1'],
        },
      ],
    });

    useComicStore.getState().serializeProject();

    expect(serializedBlobs).toHaveLength(1);
    const serialized = JSON.parse(await serializedBlobs[0].text());
    expect(serialized).toMatchObject({
      version: '2.0',
      type: 'comic-project',
      pages: [
        {
          id: 'page-1',
          layerOrder: ['panel-1', 'balloon-1'],
          panels: [
            {
              id: 'panel-1',
              shapeType: 'ellipse',
              x: 42,
              y: 84,
              width: 320,
              height: 240,
              imageUrl: 'https://example.com/panel.png',
              imageScale: 1.4,
            },
          ],
          balloons: [
            {
              id: 'balloon-1',
              text: 'Still attached!',
              tailBasePoint: { x: 20, y: 40 },
              tailTip: { x: 250, y: 360 },
              overrides: { fontSize: 24, textAlignHorizontal: 'center' },
            },
          ],
        },
      ],
    });
  });

  it('loads legacy saved pages without dropping panel images or balloon records', () => {
    const legacyProject = {
      type: 'comic-project',
      pages: [
        {
          id: 'legacy-page',
          panels: [
            {
              id: 'legacy-panel',
              type: 'panel',
              shapeType: 'rect',
              x: 10,
              y: 20,
              width: 300,
              height: 220,
              imageUrl: 'https://example.com/legacy.png',
            },
          ],
          balloons: [
            {
              id: 'legacy-balloon',
              type: 'balloon',
              x: 140,
              y: 180,
              width: 160,
              height: 90,
              hasTail: true,
              tailBasePoint: { x: 10, y: 10 },
              tailTip: { x: 220, y: 300 },
              styleId: 'speech_round',
              text: 'Legacy text',
            },
          ],
          drawings: [],
          background: '#ffffff',
          layerOrder: ['legacy-panel', 'legacy-balloon'],
        },
      ],
    };

    useComicStore.getState().loadProject(JSON.stringify(legacyProject));

    const page = useComicStore.getState().pages[0];
    expect(page).toMatchObject({
      id: 'legacy-page',
      panels: [
        {
          id: 'legacy-panel',
          imageUrl: 'https://example.com/legacy.png',
          x: 10,
          y: 20,
          width: 300,
          height: 220,
        },
      ],
      balloons: [
        {
          id: 'legacy-balloon',
          text: 'Legacy text',
          tailTip: { x: 220, y: 300 },
        },
      ],
      layerOrder: ['legacy-panel', 'legacy-balloon'],
    });
  });

  it('preserves panel image fields when shape and geometry change', () => {
    useComicStore.setState({
      ...useComicStore.getState(),
      pages: [
        {
          id: 'page-1',
          panels: [
            {
              id: 'panel-1',
              type: 'panel',
              shapeType: 'rect',
              x: 40,
              y: 60,
              width: 300,
              height: 220,
              imageUrl: 'https://example.com/shape-safe.png',
              imageFillMode: 'cover',
              imageScale: 1.25,
              imageFocusX: 0.4,
              imageFocusY: 0.6,
              isVisible: true,
              isLocked: false,
            },
          ],
          balloons: [],
          drawings: [],
          overlays: [],
          background: '#ffffff',
          layerOrder: ['panel-1'],
        },
      ],
    });

    useComicStore.getState().updatePanel('page-1', 'panel-1', {
      shapeType: 'ellipse',
      x: 90,
      y: 120,
      width: 360,
      height: 280,
    });

    expect(useComicStore.getState().pages[0].panels[0]).toMatchObject({
      shapeType: 'ellipse',
      x: 90,
      y: 120,
      width: 360,
      height: 280,
      imageUrl: 'https://example.com/shape-safe.png',
      imageFillMode: 'cover',
      imageScale: 1.25,
      imageFocusX: 0.4,
      imageFocusY: 0.6,
    });
  });
});
