import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { AssetLibrary, ASSETS } from '@/modes/comic/components/AssetLibrary';
import { useComicStore } from '@/stores/comicStore';

const initialState = useComicStore.getState();

beforeEach(() => {
  let id = 0;
  vi.spyOn(crypto, 'randomUUID').mockImplementation(() => `asset-panel-${id += 1}` as `${string}-${string}-${string}-${string}-${string}`);
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
  });
});

describe('Advanced Studio AssetLibrary', () => {
  it('inserts a clicked stored asset without waiting on image load events', () => {
    render(<AssetLibrary embedded isOpen onClose={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: /Anunnaki Anubis/i }));

    const page = useComicStore.getState().pages[0];
    expect(page.panels).toHaveLength(1);
    expect(page.panels[0]).toMatchObject({
      id: 'asset-panel-1',
      imageUrl: ASSETS[0],
      width: 300,
      height: 300,
    });
    expect(page.layerOrder).toEqual(['asset-panel-1']);
  });

  it('imports a local image file into the current comic workspace', async () => {
    render(<AssetLibrary embedded isOpen onClose={vi.fn()} />);

    const input = screen.getByLabelText('Import image into Advanced Studio workspace');
    const file = new File(['test image bytes'], 'local-panel.png', { type: 'image/png' });
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      const page = useComicStore.getState().pages[0];
      expect(page.panels).toHaveLength(1);
      expect(page.panels[0].imageUrl).toMatch(/^data:image\/png;base64,/);
    });
  });
});
