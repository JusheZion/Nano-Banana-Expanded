import React, { useState, useEffect } from 'react';
import { useComicStore } from '../../../stores/comicStore';
import { AssetLibrary } from '../components/AssetLibrary';
import { ObjectToolbar } from '../components/ObjectToolbar';

interface ComicLayoutProps {
  children: React.ReactNode;
}

export const ComicLayout: React.FC<ComicLayoutProps> = ({ children }) => {
  const triggerExport = useComicStore(state => state.triggerExport);
  const {
    currentPageId,
    selectedElementId,
    removeElement,
    cloneElement
  } = useComicStore();

  const [isLibraryOpen, setIsLibraryOpen] = useState(false);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!selectedElementId || !currentPageId) return;

      // Delete / Backspace
      if (e.key === 'Delete' || e.key === 'Backspace') {
        removeElement(currentPageId, selectedElementId);
      }

      // Ctrl+D / Cmd+D (Clone)
      if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
        e.preventDefault();
        cloneElement(currentPageId, selectedElementId);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedElementId, currentPageId, removeElement, cloneElement]);


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
          <button
            onClick={() => setIsLibraryOpen(!isLibraryOpen)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${isLibraryOpen ? 'bg-gold-500 text-black' : 'bg-white/5 hover:bg-white/10 text-gold-400 border border-gold-500/30'}`}
          >
            {isLibraryOpen ? 'Close Library' : 'Open Library'}
          </button>

          <button
            onClick={triggerExport}
            className="px-4 py-2 bg-gradient-to-r from-gold-500 to-amber-600 hover:from-gold-400 hover:to-amber-500 text-obsidian font-bold rounded-lg shadow-lg shadow-gold-500/20 transition-all transform hover:scale-105 active:scale-95"
          >
            Export
          </button>
        </div>
      </header>

      {/* Object Toolbar (Contextual) - Moved outside header */}
      {selectedElementId && currentPageId && (
        <ObjectToolbar
          currentPageId={currentPageId}
          selectedElementId={selectedElementId}
        />
      )}

      {/* Asset Library Sidebar */}
      <AssetLibrary isOpen={isLibraryOpen} onClose={() => setIsLibraryOpen(false)} />

      {/* Main Content Area */}
      <main className="relative z-10 h-[calc(100vh-64px)]">
        {children}
      </main>
    </div>
  );
};
