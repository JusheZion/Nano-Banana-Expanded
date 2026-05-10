import type { Genre, GenreId } from '../data/GenreRegistry';
import type { ComicObject } from './comicObjects';
import type { SerializedComicDocument, SerializedComicPage } from './comicSerialization';

export type ComicEditorMode = 'layout' | 'content' | 'lettering';
export type ComicExportFormat = 'png' | 'pdf';
export type ComicLayoutMode = 'webtoon' | 'spread';
export type ComicCanvasContext = 'balloon' | 'panel' | 'empty';
export type ComicPanelPlacementShape = 'polygon' | 'ellipse';

export interface ComicProjectSettings {
  inclusiveBiasEnabled: boolean;
  demographicFocus: string;
  ribbonPinnedDefault: boolean;
  defaultPageBackgroundColor: string;
}

export interface ComicPageSettings {
  backgroundColor: string;
  backgroundImage?: string;
  bgOpacity: number;
}

export interface ComicCanvasContextMenuState {
  open: boolean;
  x: number;
  y: number;
  context: ComicCanvasContext;
  pageId?: string;
  balloonId?: string;
  panelId?: string;
  pageLocalX?: number;
  pageLocalY?: number;
}

export interface ComicEditorPersistedState {
  pages: SerializedComicPage[];
  projectSettings: ComicProjectSettings;
  gutterSize: number;
  pageSettings: ComicPageSettings;
  layoutMode: ComicLayoutMode;
  currentGenreId: GenreId;
  customGenre: Genre;
  templates: unknown[];
  colorFavorites: string[];
  colorRecentlyUsed: string[];
  groupsByPage: Record<string, string[][]>;
}

export interface ComicEditorState extends ComicEditorPersistedState {
  currentPageId: string | null;
  zoomLevel: number;
  selectedElementIds: string[];
  clipboard: ComicObject[];
  mode: ComicEditorMode;
  exportFormat: ComicExportFormat | null;
  contextMenu: ComicCanvasContextMenuState;
  placePanelAtNextClick: boolean;
  placePanelShape: ComicPanelPlacementShape;
  lastCanvasPosition: { pageId: string; x: number; y: number } | null;
  textBoxEditBalloonId: string | null;
  isDrawingMode: boolean;
  brushColor: string;
  brushWidth: number;
  isKnifeMode: boolean;
}

export interface ComicEditorDocumentState {
  document: SerializedComicDocument;
  editor: ComicEditorState;
}
