import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MenuBar } from '@/modes/comic/components/MenuBar';
import { useComicStore } from '@/stores/comicStore';

const initialState = useComicStore.getState();

function renderMenuBar(onImportImage = vi.fn()) {
  render(
    <MenuBar
      activeMenu={null}
      onActiveMenuChange={vi.fn()}
      themeLabel="Theme"
      onThemeClick={vi.fn()}
      commands={{
        save: vi.fn(),
        load: vi.fn(),
        importImage: onImportImage,
        exportPng: vi.fn(),
        exportPdf: vi.fn(),
        undo: vi.fn(),
        redo: vi.fn(),
        cut: vi.fn(),
        copy: vi.fn(),
        paste: vi.fn(),
      }}
      viewport={{
        zoomLevel: 1,
        zoomIn: vi.fn(),
        zoomOut: vi.fn(),
        zoomReset: vi.fn(),
        zoomFit: vi.fn(),
        layoutMode: 'webtoon',
        setLayoutMode: vi.fn(),
      }}
      hasPanelSelected={false}
    />,
  );
}

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
  });
});

describe('Advanced Studio MenuBar image commands', () => {
  it('exposes local image import from the Home and Panel menus', () => {
    const onImportImage = vi.fn();
    renderMenuBar(onImportImage);

    fireEvent.mouseEnter(screen.getByRole('button', { name: 'Home' }));
    fireEvent.click(screen.getByRole('button', { name: 'Import image…' }));
    expect(onImportImage).toHaveBeenCalledTimes(1);

    fireEvent.mouseEnter(screen.getByRole('button', { name: 'Panel' }));
    expect(screen.getByRole('button', { name: /Insert stored image/ })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Import image…/ }));
    expect(onImportImage).toHaveBeenCalledTimes(2);
  });

  it('updates each selected sector on the page that owns it', () => {
    useComicStore.setState({
      pages: [
        {
          id: 'page-1',
          panels: [{ id: 'sector-1', type: 'panel', shapeType: 'sector', x: 0, y: 0, width: 100, height: 100, centralAngle: 90 }],
          balloons: [],
          drawings: [],
          overlays: [],
          background: '#ffffff',
          layerOrder: ['sector-1'],
        },
        {
          id: 'page-2',
          panels: [{ id: 'sector-2', type: 'panel', shapeType: 'sector', x: 0, y: 0, width: 100, height: 100, centralAngle: 90 }],
          balloons: [],
          drawings: [],
          overlays: [],
          background: '#ffffff',
          layerOrder: ['sector-2'],
        },
      ],
      currentPageId: 'page-1',
      selectedElementIds: ['sector-1', 'sector-2'],
    });
    renderMenuBar();

    fireEvent.mouseEnter(screen.getByRole('button', { name: 'Panel' }));
    fireEvent.click(screen.getByRole('button', { name: '+ 15°' }));

    const [firstPage, secondPage] = useComicStore.getState().pages;
    expect(firstPage?.panels[0]?.centralAngle).toBe(105);
    expect(secondPage?.panels[0]?.centralAngle).toBe(105);

    fireEvent.mouseEnter(screen.getByRole('button', { name: 'Objects' }));
    fireEvent.click(screen.getByRole('button', { name: 'Flip H' }));
    const [flippedFirstPage, flippedSecondPage] = useComicStore.getState().pages;
    expect(flippedFirstPage?.panels[0]?.flipX).toBe(true);
    expect(flippedSecondPage?.panels[0]?.flipX).toBe(true);
  });
});
