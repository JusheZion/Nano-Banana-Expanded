export interface ComicDocumentCommands {
  save: () => void;
  load: () => void;
  importImage: () => void;
  exportPng: () => void;
  exportPdf: () => void;
  undo: () => void;
  redo: () => void;
  cut: () => void;
  copy: () => void;
  paste: () => void;
}

export interface ComicViewportControls {
  zoomLevel: number;
  zoomIn: () => void;
  zoomOut: () => void;
  zoomReset: () => void;
  zoomFit: () => void;
  layoutMode: 'webtoon' | 'spread';
  setLayoutMode: (mode: 'webtoon' | 'spread') => void;
}
