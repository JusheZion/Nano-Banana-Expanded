import React, { useState, useEffect, useRef } from 'react';
import { useComicStore, type Panel } from '../../../stores/comicStore';
import { GENRE_REGISTRY, type GenreId } from '../data/GenreRegistry';
import { TEXTURE_REGISTRY } from '../data/TextureRegistry';
import { FontSelect } from '../components/FontSelect';
import { AssetLibrary } from '../components/AssetLibrary';
import { ObjectToolbar } from '../components/ObjectToolbar';
import { TextToolbar } from '../components/TextToolbar';
import { LayerTree } from '../components/LayerTree';
import { ProjectSettingsSidebar } from '../components/ProjectSettingsSidebar';
import { PageNavigator } from '../components/PageNavigator';
import { Tooltip } from '../../../components/ui/Tooltip';
import { ZoomIn, ZoomOut, Maximize } from 'lucide-react';

interface ComicLayoutProps {
  children: React.ReactNode;
}

export const ComicLayout: React.FC<ComicLayoutProps> = ({ children }) => {
  const triggerExport = useComicStore(state => state.triggerExport);
  const currentGenreId = useComicStore(state => state.currentGenreId);
  const setGenre = useComicStore(state => state.setGenre);
  const applyGenreToAll = useComicStore(state => state.applyGenreToAll);
  const customGenre = useComicStore(state => state.customGenre);
  const updateCustomGenre = useComicStore(state => state.updateCustomGenre);
  const {
    pages,
    currentPageId,
    selectedElementIds,
    deleteSelected,
    copySelected,
    pasteClipboard,
    serializeProject,
    loadProject,
    zoomLevel,
    setZoomLevel,
    layoutMode
  } = useComicStore();

  const undo = () => useComicStore.temporal.getState().undo();
  const redo = () => useComicStore.temporal.getState().redo();

  const [isGenreOpen, setIsGenreOpen] = useState(false);
  const currentGenre = GENRE_REGISTRY.find(g => g.id === currentGenreId) || GENRE_REGISTRY[0];

  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [isLayerTreeOpen, setIsLayerTreeOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isPageNavOpen, setIsPageNavOpen] = useState(true);

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

          <div className="flex gap-2 mr-2 border-r border-white/10 pr-4 items-center relative">

            {/* Genre Selector */}
            <div className="relative">
              <button
                onClick={() => setIsGenreOpen(!isGenreOpen)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-all border ${isGenreOpen
                  ? 'bg-zinc-800 border-zinc-600 outline outline-1 outline-gold-500/50'
                  : 'bg-white/5 border-white/10 hover:bg-white/10'
                  }`}
              >
                <span className="text-white/50 text-xs uppercase tracking-wider font-bold">Theme:</span>
                <span className={`font-medium tracking-wide bg-clip-text text-transparent bg-gradient-to-r ${currentGenre.uiAccent}`}>
                  {currentGenre.label}
                </span>
                <span className="text-white/40 text-xs ml-1">▼</span>
              </button>

              {isGenreOpen && (
                <div className="absolute top-12 left-0 w-80 bg-zinc-900 border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="px-4 py-3 bg-zinc-950 border-b border-white/5">
                    <h3 className="text-sm font-bold text-white/90">Studio Themes</h3>
                    <p className="text-xs text-white/50 mt-1">Updates default fonts, colors, and AI biases globally.</p>
                  </div>
                  <div className="max-h-96 overflow-y-auto p-2 no-scrollbar">
                    {GENRE_REGISTRY.map(genre => (
                      <button
                        key={genre.id}
                        onClick={() => {
                          setGenre(genre.id);
                          setIsGenreOpen(false);
                        }}
                        className={`w-full text-left p-3 rounded-lg flex flex-col gap-2 transition-all ${currentGenreId === genre.id
                          ? 'bg-white/10 outline outline-1 outline-gold-500/30'
                          : 'hover:bg-white/5 block'
                          }`}
                      >
                        <div className="flex justify-between items-center">
                          <span className={`font-bold bg-clip-text text-transparent bg-gradient-to-r ${genre.uiAccent}`}>
                            {genre.label}
                          </span>
                          <div className="flex rounded-full overflow-hidden border border-white/20 h-4 w-12">
                            <div className="h-full w-1/3" style={{ backgroundColor: genre.palette.border }} />
                            <div className="h-full w-1/3" style={{ backgroundColor: genre.palette.background }} />
                            <div className="h-full w-1/3" style={{ backgroundColor: genre.palette.glow === '#00000000' ? '#555' : genre.palette.glow }} />
                          </div>
                        </div>
                        <p className="text-xs text-zinc-400 leading-relaxed max-w-[90%]">
                          {genre.description}
                        </p>
                        <div className="text-[10px] uppercase text-zinc-500 font-mono tracking-widest mt-1 opacity-70" style={{ fontFamily: genre.fontFamily }}>
                          Aa Bb Cc - Sample Font
                        </div>
                      </button>
                    ))}

                    {currentGenreId === 'custom' && customGenre && (
                      <div className="mt-2 p-3 rounded-lg bg-zinc-950/80 border border-white/10 space-y-3">
                        <h4 className="text-xs font-semibold text-white/70 uppercase tracking-wider">
                          Custom Theme Controls
                        </h4>
                        <p className="text-[11px] text-white/50">
                          Adjust palette, font, and texture. Use &quot;Apply to Existing Pages&quot; below to propagate.
                        </p>

                        <div className="grid grid-cols-3 gap-3 mt-2">
                          <label className="flex flex-col gap-1 text-[11px] text-white/60">
                            Border
                            <input
                              type="color"
                              value={customGenre.palette.border}
                              onChange={(e) =>
                                updateCustomGenre(
                                  {},
                                  { border: e.target.value }
                                )
                              }
                              className="h-8 w-full rounded border border-white/20 bg-transparent cursor-pointer"
                            />
                          </label>
                          <label className="flex flex-col gap-1 text-[11px] text-white/60">
                            Background
                            <input
                              type="color"
                              value={customGenre.palette.background}
                              onChange={(e) =>
                                updateCustomGenre(
                                  {},
                                  { background: e.target.value }
                                )
                              }
                              className="h-8 w-full rounded border border-white/20 bg-transparent cursor-pointer"
                            />
                          </label>
                          <label className="flex flex-col gap-1 text-[11px] text-white/60">
                            Glow
                            <input
                              type="color"
                              value={customGenre.palette.glow}
                              onChange={(e) =>
                                updateCustomGenre(
                                  {},
                                  { glow: e.target.value }
                                )
                              }
                              className="h-8 w-full rounded border border-white/20 bg-transparent cursor-pointer"
                            />
                          </label>
                        </div>

                        <div className="space-y-2">
                          <label className="flex flex-col gap-1 text-[11px] text-white/60">
                            Font family
                            <FontSelect
                              value={customGenre.fontFamily}
                              onChange={(val) => updateCustomGenre({ fontFamily: val })}
                              allowCustom
                            />
                          </label>

                          <label className="flex flex-col gap-1 text-[11px] text-white/60">
                            Texture overlay
                            <select
                              value={customGenre.textureId ?? ''}
                              onChange={(e) =>
                                updateCustomGenre({
                                  textureId: e.target.value || undefined
                                })
                              }
                              className="w-full rounded-md border border-white/15 bg-black/40 px-2 py-1 text-xs text-white focus:outline-none focus:ring-1 focus:ring-gold-500/60"
                            >
                              <option value="">None</option>
                              {TEXTURE_REGISTRY.map(texture => (
                                <option key={texture.id} value={texture.id}>
                                  {texture.name}
                                </option>
                              ))}
                            </select>
                          </label>

                          <label className="flex flex-col gap-1 text-[11px] text-white/60">
                            Texture strength
                            <div className="flex items-center gap-2">
                              <input
                                type="range"
                                min={0}
                                max={1}
                                step={0.05}
                                value={customGenre.textureOpacity ?? 0.5}
                                onChange={(e) =>
                                  updateCustomGenre({
                                    textureOpacity: Number(e.target.value)
                                  })
                                }
                                className="flex-1 accent-gold-500"
                              />
                              <span className="w-10 text-right text-[11px] text-white/50">
                                {Math.round((customGenre.textureOpacity ?? 0.5) * 100)}%
                              </span>
                            </div>
                          </label>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Global Theme Action */}
                  <div className="p-3 bg-zinc-950 border-t border-white/5">
                    <button
                      onClick={() => {
                        applyGenreToAll();
                        setIsGenreOpen(false);
                      }}
                      className="w-full py-2 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white text-xs font-bold rounded flex items-center justify-center gap-2 transition-colors uppercase tracking-wider"
                    >
                      Apply to Existing Pages
                    </button>
                  </div>

                </div>
              )}
            </div>

            <div className="w-px h-6 bg-white/10 mx-2" />

            <Tooltip content="Save Project as JSON">
              <button onClick={serializeProject} className="px-3 py-1.5 rounded-lg text-sm bg-blue-600/30 hover:bg-blue-600/50 text-blue-300 border border-blue-500/30 transition-colors">Save JSON</button>
            </Tooltip>
            <Tooltip content="Load Project from JSON">
              <button onClick={() => fileInputRef.current?.click()} className="px-3 py-1.5 rounded-lg text-sm bg-green-600/30 hover:bg-green-600/50 text-green-300 border border-green-500/30 transition-colors">Load JSON</button>
            </Tooltip>
            <input type="file" ref={fileInputRef} className="hidden" accept=".json" onChange={handleFileUpload} />
          </div>

          <div className="flex gap-2 mr-2 border-r border-white/10 pr-4 items-center">
            <Tooltip content="Export Current Page as PNG (300 DPI)">
              <button onClick={() => triggerExport('png')} className="px-3 py-1.5 rounded-lg text-sm bg-purple-600/30 hover:bg-purple-600/50 text-purple-300 border border-purple-500/30 transition-colors">Export PNG</button>
            </Tooltip>
            <Tooltip content="Export All Pages as PDF (300 DPI)">
              <button onClick={() => triggerExport('pdf')} className="px-3 py-1.5 rounded-lg text-sm bg-purple-600/30 hover:bg-purple-600/50 text-purple-300 border border-purple-500/30 transition-colors">Export PDF</button>
            </Tooltip>
          </div>

          <div className="flex gap-2.5 mr-2 border-r border-white/10 pr-4 items-center">
            <Tooltip content="Zoom Out">
              <button
                onClick={() => setZoomLevel((z: number) => Math.max(0.1, z - 0.1))}
                className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 flex items-center justify-center transition-colors border border-white/5"
              >
                <ZoomOut size={16} />
              </button>
            </Tooltip>

            <button
              onClick={() => setZoomLevel(1)}
              className="px-2 py-1 text-xs font-mono text-gold-400 hover:text-gold-300 hover:bg-white/10 rounded transition-colors w-14 text-center"
              title="Reset Zoom to 100%"
            >
              {Math.round(zoomLevel * 100)}%
            </button>

            <Tooltip content="Zoom In">
              <button
                onClick={() => setZoomLevel((z: number) => Math.min(3, z + 0.1))}
                className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 flex items-center justify-center transition-colors border border-white/5"
              >
                <ZoomIn size={16} />
              </button>
            </Tooltip>

            <Tooltip content="Fit Page to Screen">
              <button
                onClick={() => {
                  const viewportWidth = window.innerWidth - 300;
                  const targetWidth = layoutMode === 'spread' && pages.length > 1 ? 1640 : 840;
                  setZoomLevel(Math.min(1.5, Math.max(0.2, viewportWidth / targetWidth)));
                }}
                className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 flex items-center justify-center transition-colors border border-white/5 ml-1"
              >
                <Maximize size={16} />
              </button>
            </Tooltip>
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

          <Tooltip content="Toggle Pages">
            <button
              onClick={() => setIsPageNavOpen(!isPageNavOpen)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${isPageNavOpen ? 'bg-gold-500 text-black' : 'bg-white/5 hover:bg-white/10 text-gold-400 border border-gold-500/30'}`}
            >
              {isPageNavOpen ? 'Close Pages' : 'Pages'}
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

          <Tooltip content="Export Full Comic Book as Print PDF">
            <button
              onClick={() => triggerExport('pdf')}
              className="px-4 py-2 bg-gradient-to-r from-gold-500 to-amber-600 hover:from-gold-400 hover:to-amber-500 text-obsidian font-bold rounded-lg shadow-lg shadow-gold-500/20 transition-all transform hover:scale-105 active:scale-95"
            >
              Export PDF
            </button>
          </Tooltip>
        </div>
      </header>

      {/* Dynamic Contextual Ribbon */}
      {((isPanelSelected && currentPageId && selectedElementIds.length > 0) || (selectedTextId && currentPageId)) && (
        <div className="w-full bg-zinc-900 border-b border-white/10 px-4 py-2 z-40 flex flex-wrap items-center gap-x-6 gap-y-2 shadow-sm shrink-0 no-scrollbar">
          {isPanelSelected && currentPageId && selectedElementIds.length > 0 && (
            <ObjectToolbar
              currentPageId={currentPageId}
              selectedElementIds={selectedElementIds}
            />
          )}

          {isPanelSelected && selectedTextId && currentPageId && selectedElementIds.length > 0 && (
            <div className="w-px h-6 bg-white/10 hidden md:block" />
          )}

          {selectedTextId && currentPageId && (
            <TextToolbar
              currentPageId={currentPageId}
              selectedBubbleId={selectedTextId}
            />
          )}
        </div>
      )}

      {/* Asset Library Sidebar */}
      <AssetLibrary isOpen={isLibraryOpen} onClose={() => setIsLibraryOpen(false)} />

      {/* Layer Tree Sidebar */}
      <LayerTree isOpen={isLayerTreeOpen} onClose={() => setIsLayerTreeOpen(false)} />

      {/* Page Navigator Sidebar */}
      <PageNavigator isOpen={isPageNavOpen} onClose={() => setIsPageNavOpen(false)} />

      {/* Project Settings Sidebar */}
      <ProjectSettingsSidebar isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />

      {/* Main Content Area */}
      <main className="relative z-10 h-[calc(100vh-64px)]">
        {children}
      </main>
    </div>
  );
};
