import React, { useState, useEffect, useRef } from 'react';
import { useComicStore } from '../../../stores/comicStore';
import { GENRE_REGISTRY } from '../data/GenreRegistry';
import { TEXTURE_REGISTRY } from '../data/TextureRegistry';
import { FontSelect } from '../components/FontSelect';
import { AssetLibrary } from '../components/AssetLibrary';
import { ObjectToolbar } from '../components/ObjectToolbar';
import { TextToolbar } from '../components/TextToolbar';
import { LayerTree } from '../components/LayerTree';
import { ProjectSettingsSidebar } from '../components/ProjectSettingsSidebar';
import { PageNavigator } from '../components/PageNavigator';
import { TopRibbon } from '../components/TopRibbon';
import { ComicPanelStack, PagesIcon, LayersIcon, SettingsIcon, AssetsIcon } from '../components/ComicPanelStack';

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

  const [ribbonCollapsed, setRibbonCollapsed] = useState(false);
  const [isGenreOpen, setIsGenreOpen] = useState(false);
  const currentGenre = GENRE_REGISTRY.find(g => g.id === currentGenreId) || GENRE_REGISTRY[0];

  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [isLayerTreeOpen, setIsLayerTreeOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isPageNavOpen, setIsPageNavOpen] = useState(true);
  const [balloonTextExpanded, setBalloonTextExpanded] = useState(false);
  const [balloonShapeExpanded, setBalloonShapeExpanded] = useState(false);

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


  const themeDropdownContent = isGenreOpen ? (
    <div className="absolute top-full left-0 mt-1 w-80 bg-[#1A1A1E] border border-white/[0.08] rounded-xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
      <div className="px-4 py-3 bg-[#0F0F12] border-b border-white/[0.08]">
        <h3 className="text-sm font-bold text-white/90">Studio Themes</h3>
        <p className="text-xs text-white/50 mt-1">Updates default fonts, colors, and AI biases globally.</p>
      </div>
      <div className="max-h-96 overflow-y-auto p-2 no-scrollbar">
        {GENRE_REGISTRY.map(genre => (
          <button
            key={genre.id}
            type="button"
            onClick={() => {
              setGenre(genre.id);
              setIsGenreOpen(false);
            }}
            className={`w-full text-left p-3 rounded-lg flex flex-col gap-2 transition-all ${currentGenreId === genre.id
              ? 'bg-[#00D1FF]/10 outline outline-1 outline-[#00D1FF]/40'
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
          <div className="mt-2 p-3 rounded-lg bg-[#0F0F12]/80 border border-white/[0.08] space-y-3">
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
                  className="w-full rounded-md border border-white/15 bg-black/40 px-2 py-1 text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#00D1FF]/60"
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
                    className="flex-1 accent-[#00D1FF]"
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

      <div className="p-3 bg-[#0F0F12] border-t border-white/[0.08]">
        <button
          type="button"
          onClick={() => {
            applyGenreToAll();
            setIsGenreOpen(false);
          }}
          className="w-full py-2 bg-[#00D1FF]/10 hover:bg-[#00D1FF]/20 text-[#00D1FF] text-xs font-bold rounded flex items-center justify-center gap-2 transition-colors uppercase tracking-wider border border-[#00D1FF]/30"
        >
          Apply to Existing Pages
        </button>
      </div>
    </div>
  ) : null;

  return (
    <div className="comic-layout flex flex-col h-screen bg-[#0F0F12] text-white relative overflow-hidden">
      {/* Subtle Obsidian Tech accent glow */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-[#00D1FF]/5 rounded-full blur-3xl pointer-events-none" />

      <TopRibbon
        collapsed={ribbonCollapsed}
        onToggleCollapse={() => setRibbonCollapsed(!ribbonCollapsed)}
        onUndo={undo}
        onRedo={redo}
        isThemeOpen={isGenreOpen}
        onToggleTheme={() => setIsGenreOpen(!isGenreOpen)}
        themeLabel={currentGenre.id === 'custom' ? 'Theme' : currentGenre.label}
        themeDropdown={themeDropdownContent}
        onSaveJson={serializeProject}
        onLoadJson={() => fileInputRef.current?.click()}
        loadInputRef={fileInputRef}
        onExportPng={() => triggerExport('png')}
        onExportPdf={() => triggerExport('pdf')}
        zoomLevel={zoomLevel}
        onZoomIn={() => setZoomLevel((z: number) => Math.min(3, z + 0.1))}
        onZoomOut={() => setZoomLevel((z: number) => Math.max(0.1, z - 0.1))}
        onZoomReset={() => setZoomLevel(1)}
        onZoomFit={() => {
          const viewportWidth = window.innerWidth - 300;
          const targetWidth = layoutMode === 'spread' && pages.length > 1 ? 1640 : 840;
          setZoomLevel(Math.min(1.5, Math.max(0.2, viewportWidth / targetWidth)));
        }}
        isLibraryOpen={isLibraryOpen}
        onToggleLibrary={() => setIsLibraryOpen(!isLibraryOpen)}
        isLayersOpen={isLayerTreeOpen}
        onToggleLayers={() => setIsLayerTreeOpen(!isLayerTreeOpen)}
        isPagesOpen={isPageNavOpen}
        onTogglePages={() => setIsPageNavOpen(!isPageNavOpen)}
        isSettingsOpen={isSettingsOpen}
        onToggleSettings={() => setIsSettingsOpen(!isSettingsOpen)}
        contextualSlot={
          selectedTextId && currentPageId ? (
            <TextToolbar
              variant="ribbon"
              currentPageId={currentPageId}
              selectedBubbleId={selectedTextId}
              textExpanded={balloonTextExpanded}
              shapeExpanded={balloonShapeExpanded}
              onTextExpandedChange={setBalloonTextExpanded}
              onShapeExpandedChange={setBalloonShapeExpanded}
            />
          ) : undefined
        }
      />

      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        className="hidden"
        aria-hidden
        onChange={handleFileUpload}
      />

      {/* Second row: panel ObjectToolbar (full-width) when a panel is selected */}
      {isPanelSelected && currentPageId && selectedElementIds.length > 0 && (
        <div className="w-full bg-[#1A1A1E] border-b border-white/[0.08] px-4 py-1.5 z-40 flex flex-nowrap items-center overflow-x-auto shrink-0">
          <ObjectToolbar
            currentPageId={currentPageId}
            selectedElementIds={selectedElementIds}
          />
        </div>
      )}

      {/* Third row: full-width balloon Text/Shape options (starts from left when Text or Shape expanded from ribbon) */}
      {selectedTextId && currentPageId && (balloonTextExpanded || balloonShapeExpanded) && (
        <div className="w-full bg-[#1A1A1E] border-b border-white/[0.08] px-4 py-2 z-40 flex flex-nowrap items-center gap-x-4 overflow-x-auto shrink-0">
          <TextToolbar
            variant="expanded"
            currentPageId={currentPageId}
            selectedBubbleId={selectedTextId}
            textExpanded={balloonTextExpanded}
            shapeExpanded={balloonShapeExpanded}
          />
        </div>
      )}

      {/* Right-side vertical stack: Pages, Layers, Settings, Assets — below top ribbon only (contextual toolbar is now in ribbon) */}
      {(isPageNavOpen || isLayerTreeOpen || isSettingsOpen || isLibraryOpen) && (
        <ComicPanelStack
          topOffsetRem={4}
          panels={[
            {
              id: 'pages',
              label: 'Pages',
              icon: <PagesIcon />,
              isOpen: isPageNavOpen,
              onToggle: () => setIsPageNavOpen(!isPageNavOpen),
              children: <PageNavigator embedded isOpen={isPageNavOpen} onClose={() => setIsPageNavOpen(false)} />
            },
            {
              id: 'layers',
              label: 'Layers',
              icon: <LayersIcon />,
              isOpen: isLayerTreeOpen,
              onToggle: () => setIsLayerTreeOpen(!isLayerTreeOpen),
              children: <LayerTree embedded isOpen={isLayerTreeOpen} onClose={() => setIsLayerTreeOpen(false)} />
            },
            {
              id: 'settings',
              label: 'Settings',
              icon: <SettingsIcon />,
              isOpen: isSettingsOpen,
              onToggle: () => setIsSettingsOpen(!isSettingsOpen),
              children: <ProjectSettingsSidebar embedded isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
            },
            {
              id: 'assets',
              label: 'Assets',
              icon: <AssetsIcon />,
              isOpen: isLibraryOpen,
              onToggle: () => setIsLibraryOpen(!isLibraryOpen),
              children: <AssetLibrary embedded isOpen={isLibraryOpen} onClose={() => setIsLibraryOpen(false)} />
            }
          ]}
        />
      )}

      {/* Main Content Area — flex-1 so it shrinks when ribbon grows (e.g. Text/Shape expanded) */}
      <main className="relative z-10 flex-1 min-h-0">
        {children}
      </main>
    </div>
  );
};
