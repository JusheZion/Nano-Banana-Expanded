import React, { useState, useEffect, useRef } from 'react';
import { useComicStore } from '../../../stores/comicStore';
import { GENRE_REGISTRY } from '../data/GenreRegistry';
import { TEXTURE_REGISTRY } from '../data/TextureRegistry';
import { FontSelect } from '../components/FontSelect';
import { AssetLibrary } from '../components/AssetLibrary';
import { LayerTree } from '../components/LayerTree';
import { ProjectSettingsSidebar } from '../components/ProjectSettingsSidebar';
import { PageNavigator } from '../components/PageNavigator';
import { MenuBar, type MenuId } from '../components/MenuBar';
import { ContextualRibbon } from '../components/ContextualRibbon';
import { CanvasContextMenu } from '../components/CanvasContextMenu';
import { FormatDialog, type FormatDialogTabId } from '../components/FormatDialog';
import { PagesTabIcon, LayersTabIcon, SettingsTabIcon, AssetsTabIcon } from '../components/TabbedDock';
import type { TabbedDockTabId } from '../components/TabbedDock';
import {
  PRIMARY_BG,
  PRIMARY_BG_FLAT,
  ACCENT_GOLD_GRADIENT,
  ACCENT_BLUE_GRADIENT,
  TEXT_ON_GOLD,
} from '../theme/Phase12DesignTokens';
import { PanelRightOpen } from 'lucide-react';

interface ComicLayoutProps {
  children: React.ReactNode;
}

export const ComicLayout: React.FC<ComicLayoutProps> = ({ children }) => {
  const triggerExport = useComicStore(state => state.triggerExport);
  const flushAutoSave = useComicStore(state => state.flushAutoSave);
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
    layoutMode,
    setLayoutMode,
    placePanelAtNextClick,
    placePanelShape,
  } = useComicStore();

  // Auto-save project state to localStorage every 30s
  useEffect(() => {
    const id = setInterval(() => flushAutoSave(), 30_000);
    return () => clearInterval(id);
  }, [flushAutoSave]);

  const undo = () => useComicStore.temporal.getState().undo();
  const redo = () => useComicStore.temporal.getState().redo();

  const [isGenreOpen, setIsGenreOpen] = useState(false);
  const currentGenre = GENRE_REGISTRY.find(g => g.id === currentGenreId) || GENRE_REGISTRY[0];

  const [isDockOpen, setIsDockOpen] = useState(true);
  const [activeDockTab, setActiveDockTab] = useState<TabbedDockTabId>('pages');
  const [activeMenu, setActiveMenu] = useState<MenuId>(null);
  /** Last format category chosen (Text vs Objects); drives which format ribbon shows when an object is selected. */
  const [lastFormatCategory, setLastFormatCategory] = useState<'text' | 'objects' | null>(null);
  const [ribbonPinned, setRibbonPinned] = useState(() => useComicStore.getState().projectSettings.ribbonPinnedDefault);
  const [balloonTextExpanded, setBalloonTextExpanded] = useState(false);
  const [balloonShapeExpanded, setBalloonShapeExpanded] = useState(false);
  const [formatDialogOpen, setFormatDialogOpen] = useState(false);
  const [formatDialogTab, setFormatDialogTab] = useState<FormatDialogTabId>('text');
  const [formatDialogTarget, setFormatDialogTarget] = useState<{ pageId?: string | null; balloonId?: string | null; panelId?: string | null }>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const themeDropdownRef = useRef<HTMLDivElement>(null);

  const currentPage = pages.find(p => p.id === currentPageId);
  const hasPanelSelected = Boolean(currentPage?.panels.some(p => selectedElementIds.includes(p.id)));
  const hasBalloonSelected = Boolean(currentPage?.balloons.some(b => selectedElementIds.includes(b.id)));

  /** When user picks Text or Objects in the menu bar, update active menu and last format category so the correct ribbon shows (and stays when selection changes). */
  const handleActiveMenuChange = (id: MenuId) => {
    setActiveMenu(id);
    if (id === 'text') setLastFormatCategory('text');
    else if (id === 'objects') setLastFormatCategory('objects');
  };

  const openFormatDialog = (tab: FormatDialogTabId, pageId?: string | null, balloonId?: string | null, panelId?: string | null) => {
    setFormatDialogTab(tab);
    setFormatDialogTarget({ pageId: pageId ?? undefined, balloonId: balloonId ?? undefined, panelId: panelId ?? undefined });
    setFormatDialogOpen(true);
  };

  useEffect(() => {
    if (!isGenreOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (themeDropdownRef.current && !themeDropdownRef.current.contains(e.target as Node)) {
        setIsGenreOpen(false);
      }
    };
    const handleEscape = (e: KeyboardEvent) => { if (e.key === 'Escape') setIsGenreOpen(false); };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isGenreOpen]);

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

  const dockTabs: { id: TabbedDockTabId; label: string; icon: React.ReactNode; children: React.ReactNode }[] = [
    { id: 'pages', label: 'Pages', icon: <PagesTabIcon />, children: <PageNavigator embedded isOpen={activeDockTab === 'pages'} onClose={() => setActiveDockTab('pages')} /> },
    { id: 'layers', label: 'Layers', icon: <LayersTabIcon />, children: <LayerTree embedded isOpen={activeDockTab === 'layers'} onClose={() => setActiveDockTab('layers')} /> },
    { id: 'settings', label: 'Settings', icon: <SettingsTabIcon />, children: <ProjectSettingsSidebar embedded isOpen={activeDockTab === 'settings'} onClose={() => setActiveDockTab('settings')} /> },
    { id: 'assets', label: 'Assets', icon: <AssetsTabIcon />, children: <AssetLibrary embedded isOpen={activeDockTab === 'assets'} onClose={() => setActiveDockTab('assets')} /> },
  ];
  const activeDockContent = dockTabs.find(t => t.id === activeDockTab)?.children;

  return (
    <div
      className="comic-layout flex h-screen text-white relative overflow-hidden min-h-0"
      style={{ background: PRIMARY_BG }}
    >
      <div className="flex flex-col flex-1 min-w-0 min-h-0">
        {/* Top row: File, Edit, View, Panel, Balloon menus (level with dock tabs) + Studio + Dock tabs — Golden gradient bar, blue text */}
        <header className="h-10 border-b border-white/15 flex items-stretch shrink-0 z-50" style={{ background: ACCENT_GOLD_GRADIENT }}>
          <MenuBar
            activeMenu={activeMenu}
            onActiveMenuChange={handleActiveMenuChange}
            themeLabel={currentGenre.id === 'custom' ? 'Theme' : currentGenre.label}
            onThemeClick={() => setIsGenreOpen(!isGenreOpen)}
            onSave={serializeProject}
            onLoad={() => fileInputRef.current?.click()}
            onExportPng={() => triggerExport('png')}
            onExportPdf={() => triggerExport('pdf')}
            onUndo={undo}
            onRedo={redo}
            onCut={() => { copySelected(); deleteSelected(); }}
            onCopy={copySelected}
            onPaste={pasteClipboard}
            zoomLevel={zoomLevel}
            onZoomIn={() => setZoomLevel((z: number) => Math.min(3, z + 0.1))}
            onZoomOut={() => setZoomLevel((z: number) => Math.max(0.1, z - 0.1))}
            onZoomReset={() => setZoomLevel(1)}
            onZoomFit={() => {
              const viewportWidth = window.innerWidth - (isDockOpen ? 320 : 0);
              const targetWidth = layoutMode === 'spread' && pages.length > 1 ? 1640 : 840;
              setZoomLevel(Math.min(1.5, Math.max(0.2, viewportWidth / targetWidth)));
            }}
            layoutMode={layoutMode}
            onLayoutModeChange={setLayoutMode}
            hasPanelSelected={hasPanelSelected}
            onOpenFormatDialog={openFormatDialog}
          />
          <div className="flex-1 min-w-0" />
          <button
            type="button"
            onClick={() => setIsDockOpen(!isDockOpen)}
            className="h-10 px-3 flex items-center gap-1.5 border-l border-white/15 transition-all duration-150 shrink-0 hover:bg-[#002366] hover:text-[#fcf6ba] active:scale-[0.98] active:shadow-inner"
            style={isDockOpen ? { background: ACCENT_BLUE_GRADIENT, color: TEXT_ON_GOLD } : { color: '#001a4d' }}
            aria-pressed={isDockOpen}
            aria-label="Studio panels"
          >
            <PanelRightOpen size={16} />
            <span className="font-semibold text-xs uppercase tracking-wider hidden sm:inline">Studio</span>
          </button>
          {isDockOpen && dockTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveDockTab(tab.id)}
              className="h-10 px-3 flex items-center justify-center gap-1.5 border-l border-white/15 min-w-0 shrink-0 transition-all duration-150 hover:bg-[#002366] hover:text-[#fcf6ba] active:scale-[0.98] active:shadow-inner"
              style={activeDockTab === tab.id ? { background: ACCENT_BLUE_GRADIENT, color: TEXT_ON_GOLD } : { color: '#001a4d' }}
              aria-pressed={activeDockTab === tab.id}
              aria-label={tab.label}
            >
              {tab.icon}
              <span className="text-xs font-semibold uppercase tracking-wider hidden md:inline truncate">{tab.label}</span>
            </button>
          ))}
        </header>

        {isGenreOpen && (
          <div ref={themeDropdownRef} className="fixed left-4 top-10 z-[100]" role="dialog" aria-label="Studio themes">
            {themeDropdownContent}
          </div>
        )}

        <input ref={fileInputRef} type="file" accept=".json" className="hidden" aria-hidden onChange={handleFileUpload} />

        {/* Right-click context menu (canvas) + Format dialog */}
        <CanvasContextMenu onOpenFormatDialog={openFormatDialog} />
        <FormatDialog
          open={formatDialogOpen}
          onClose={() => setFormatDialogOpen(false)}
          initialTab={formatDialogTab}
          pageId={formatDialogTarget.pageId}
          balloonId={formatDialogTarget.balloonId}
          panelId={formatDialogTarget.panelId}
        />

        {/* Contextual ribbon (Panel / Balloon / View / File / Edit) — only when that menu is active or relevant object selected */}
        <ContextualRibbon
          activeMenu={activeMenu}
          lastFormatCategory={lastFormatCategory}
          hasPanelSelected={hasPanelSelected}
          hasBalloonSelected={hasBalloonSelected}
          currentPageId={currentPageId}
          selectedElementIds={selectedElementIds}
          ribbonPinned={ribbonPinned}
          onRibbonPinToggle={() => setRibbonPinned(p => !p)}
          balloonTextExpanded={balloonTextExpanded}
          balloonShapeExpanded={balloonShapeExpanded}
          onBalloonTextExpandedChange={setBalloonTextExpanded}
          onBalloonShapeExpandedChange={setBalloonShapeExpanded}
          zoomLevel={zoomLevel}
          onZoomIn={() => setZoomLevel((z: number) => Math.min(3, z + 0.1))}
          onZoomOut={() => setZoomLevel((z: number) => Math.max(0.1, z - 0.1))}
          onZoomReset={() => setZoomLevel(1)}
          onZoomFit={() => {
            const viewportWidth = window.innerWidth - (isDockOpen ? 320 : 0);
            const targetWidth = layoutMode === 'spread' && pages.length > 1 ? 1640 : 840;
            setZoomLevel(Math.min(1.5, Math.max(0.2, viewportWidth / targetWidth)));
          }}
          layoutMode={layoutMode}
          onLayoutModeChange={setLayoutMode}
          onSave={serializeProject}
          onExportPng={() => triggerExport('png')}
          onExportPdf={() => triggerExport('pdf')}
          onUndo={undo}
          onRedo={redo}
          onActiveMenuChange={handleActiveMenuChange}
        />

        {/* Main content (banner + canvas) | Dock on the right */}
        <div className="flex flex-1 min-h-0 min-w-0">
          <div className="flex flex-1 min-h-0 min-w-0 flex-col min-w-0">
            {placePanelAtNextClick && (
              <div className="shrink-0 px-3 py-2 text-center text-sm font-medium" style={{ background: ACCENT_BLUE_GRADIENT, color: TEXT_ON_GOLD }}>
                Click on the canvas to place the new panel{placePanelShape === 'ellipse' ? ' (circle)' : ''}.
              </div>
            )}
            <main className="relative z-10 flex-1 min-h-0 min-w-0" style={{ background: PRIMARY_BG }}>
              {children}
            </main>
          </div>
          {isDockOpen && activeDockContent && (
            <aside className="w-[300px] border-l border-white/10 flex flex-col shrink-0 overflow-hidden bg-[#F5F5DC]" style={{ color: PRIMARY_BG_FLAT }}>
              {activeDockContent}
            </aside>
          )}
        </div>
      </div>
    </div>
  );
};
