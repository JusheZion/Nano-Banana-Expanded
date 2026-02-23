import React, { useState, useEffect, useRef } from 'react';
import { useComicStore } from '../../../stores/comicStore';
import { AssetLibrary } from '../components/AssetLibrary';
import { ObjectToolbar } from '../components/ObjectToolbar';
import { TextToolbar } from '../components/TextToolbar';
import { LayerTree } from '../components/LayerTree';
import { ProjectSettingsSidebar } from '../components/ProjectSettingsSidebar';
import { Tooltip } from '../../../components/ui/Tooltip';

interface ComicLayoutProps {
  children: React.ReactNode;
}

export const ComicLayout: React.FC<ComicLayoutProps> = ({ children }) => {
  const triggerExport = useComicStore(state => state.triggerExport);
  const {
    pages,
    currentPageId,
    selectedElementIds,
    deleteSelected,
    copySelected,
    pasteClipboard,
    serializeProject,
    loadProject
  } = useComicStore();

  const undo = () => useComicStore.temporal.getState().undo();
  const redo = () => useComicStore.temporal.getState().redo();

  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [isLayerTreeOpen, setIsLayerTreeOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) loadProject(content);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Determine selected element type
  const currentPage = pages.find(p => p.id === currentPageId);
  const selectedPanels = currentPage?.panels.filter(p => selectedElementIds.includes(p.id)) || [];
  const selectedBalloons = currentPage?.balloons.filter(b => selectedElementIds.includes(b.id)) || [];
  const isPanelSelected = selectedPanels.length > 0;
  const selectedTextId = selectedBalloons.length > 0 ? selectedBalloons[0].id : null;

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Avoid firing shortcuts when actively typing in an input
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return;

      // Undo / Redo
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
        return;
      }

      // Copy
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c') {
        e.preventDefault();
        copySelected();
      }

      // Paste
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v') {
        e.preventDefault();
        pasteClipboard();
      }

      // Cut
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'x') {
        e.preventDefault();
        copySelected();
        deleteSelected();
      }

      if (!currentPageId || selectedElementIds.length === 0) return;

      // Delete / Backspace
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        deleteSelected();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentPageId, selectedElementIds, deleteSelected, copySelected, pasteClipboard]);


  return (
    <div className="comic-layout min-h-screen bg-obsidian text-white relative overflow-hidden">
      {/* Ambient Background Gradients */}
      <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-purple-900/40 via-purple-900/10 to-transparent pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-gradient-to-t from-gold-500/10 to-transparent pointer-events-none rounded-full blur-3xl" />

      {/* Header */}
      <header className="h-16 border-b border-white/10 flex items-center justify-between px-6 bg-obsidian/80 backdrop-blur-sm relative z-30">
        <div className="flex items-center gap-4">
          <div className="w-8 h-8 bg-gradient-to-br from-gold-400 to-amber-600 rounded-lg shadow-lg shadow-gold-500/20 transform rotate-3" />
          <h1 className="text-xl font-bold tracking-wider bg-clip-text text-transparent bg-gradient-to-r from-white to-white/70">
            COMIC MODE
          </h1>
        </div>

        {/* Toolbar actions */}
        <div className="flex gap-4">
          <div className="flex gap-2 mr-2 border-r border-white/10 pr-4 items-center">
            <Tooltip content="Undo (Cmd+Z)">
              <button onClick={undo} className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 flex items-center justify-center transition-colors border border-white/5">↶</button>
            </Tooltip>
            <Tooltip content="Redo (Cmd+Shift+Z)">
              <button onClick={redo} className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 flex items-center justify-center transition-colors border border-white/5">↷</button>
            </Tooltip>
          </div>

          <div className="flex gap-2 mr-2 border-r border-white/10 pr-4 items-center">
            <div className="text-xs text-white/50 mr-2 uppercase tracking-wider font-bold">Project State</div>
          </div>

          <div className="flex gap-2 mr-2 border-r border-white/10 pr-4 items-center">
            <Tooltip content="Save Project as JSON">
              <button onClick={serializeProject} className="px-3 py-1.5 rounded-lg text-sm bg-blue-600/30 hover:bg-blue-600/50 text-blue-300 border border-blue-500/30 transition-colors">Save JSON</button>
            </Tooltip>
            <Tooltip content="Load Project from JSON">
              <button onClick={() => fileInputRef.current?.click()} className="px-3 py-1.5 rounded-lg text-sm bg-green-600/30 hover:bg-green-600/50 text-green-300 border border-green-500/30 transition-colors">Load JSON</button>
            </Tooltip>
            <input type="file" ref={fileInputRef} className="hidden" accept=".json" onChange={handleFileUpload} />
          </div>

          <Tooltip content="Toggle Asset Library">
            <button
              onClick={() => setIsLibraryOpen(!isLibraryOpen)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${isLibraryOpen ? 'bg-gold-500 text-black' : 'bg-white/5 hover:bg-white/10 text-gold-400 border border-gold-500/30'}`}
            >
              {isLibraryOpen ? 'Close Library' : 'Open Library'}
            </button>
          </Tooltip>

          <Tooltip content="Toggle Layers">
            <button
              onClick={() => setIsLayerTreeOpen(!isLayerTreeOpen)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${isLayerTreeOpen ? 'bg-gold-500 text-black' : 'bg-white/5 hover:bg-white/10 text-gold-400 border border-gold-500/30'}`}
            >
              {isLayerTreeOpen ? 'Close Layers' : 'Layers'}
            </button>
          </Tooltip>

          <Tooltip content="Toggle Project Settings">
            <button
              onClick={() => setIsSettingsOpen(!isSettingsOpen)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${isSettingsOpen ? 'bg-gold-500 text-black' : 'bg-white/5 hover:bg-white/10 text-gold-400 border border-gold-500/30'}`}
            >
              {isSettingsOpen ? 'Close Settings' : 'Settings'}
            </button>
          </Tooltip>

          <Tooltip content="Export Comic to Image">
            <button
              onClick={triggerExport}
              className="px-4 py-2 bg-gradient-to-r from-gold-500 to-amber-600 hover:from-gold-400 hover:to-amber-500 text-obsidian font-bold rounded-lg shadow-lg shadow-gold-500/20 transition-all transform hover:scale-105 active:scale-95"
            >
              Export
            </button>
          </Tooltip>
        </div>
      </header>

      {/* Contextual Toolbars - Moved outside header */}
      {isPanelSelected && currentPageId && selectedElementIds.length > 0 && (
        <ObjectToolbar
          currentPageId={currentPageId}
          selectedElementIds={selectedElementIds}
        />
      )}

      {selectedTextId && currentPageId && (
        <TextToolbar
          currentPageId={currentPageId}
          selectedBubbleId={selectedTextId}
        />
      )}

      {/* Asset Library Sidebar */}
      <AssetLibrary isOpen={isLibraryOpen} onClose={() => setIsLibraryOpen(false)} />

      {/* Layer Tree Sidebar */}
      <LayerTree isOpen={isLayerTreeOpen} onClose={() => setIsLayerTreeOpen(false)} />

      {/* Project Settings Sidebar */}
      <ProjectSettingsSidebar isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />

      {/* Main Content Area */}
      <main className="relative z-10 h-[calc(100vh-64px)]">
        {children}
      </main>
    </div>
  );
};
