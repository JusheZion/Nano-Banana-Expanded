import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Palette, LayoutGrid as LayoutIcon, Columns, Plus, Scissors, Pencil, ImagePlus, Sparkles, Type, Circle, Box, Waves, Moon, Image as ImageIcon, RefreshCw, ArrowLeftRight, AlignLeft, BoxSelect } from 'lucide-react';
import { Tooltip } from '../../../components/ui/Tooltip';
import { BALLOON_STYLES } from '../data/BalloonStyles';
import type { BalloonStyleId } from '../../../types/balloon';
import { useComicStore } from '../../../stores/comicStore';
import { ACCENT_GOLD_GRADIENT, ACCENT_BLUE_GRADIENT, ACCENT_GOLD_LIGHT } from '../theme/Phase12DesignTokens';

/** Solid dark blue for menu bar text (gold bar) when not hovered */
const MENU_BAR_TEXT_BLUE = '#001a4d';
/** Gold for hover text so it's readable on both gold bar and blue hover background */
const HOVER_TEXT_GOLD = ACCENT_GOLD_LIGHT;
const PLACEHOLDER_IMAGE_URL = 'https://via.placeholder.com/150';
const SFX_OPTIONS = ['BOOM', 'ZAP', 'CRASH', 'POW', 'BAM', 'WHAM', 'SLAM', 'KAPOW', 'BANG'];

export type MenuId = 'file' | 'edit' | 'view' | 'panel' | 'balloon' | 'text' | 'objects' | null;

export interface MenuBarProps {
  /** Which menu is open; used to drive contextual ribbon */
  activeMenu: MenuId;
  onActiveMenuChange: (id: MenuId) => void;
  themeLabel: string;
  onThemeClick: () => void;
  onSave: () => void;
  onLoad: () => void;
  onExportPng: () => void;
  onExportPdf: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onCut: () => void;
  onCopy: () => void;
  onPaste: () => void;
  zoomLevel: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomReset: () => void;
  onZoomFit: () => void;
  layoutMode: 'webtoon' | 'spread';
  onLayoutModeChange: (mode: 'webtoon' | 'spread') => void;
  /** Panel selected: enable Insert Image, Split submenu */
  hasPanelSelected: boolean;
  /** Open the Format dialog with the given tab (from Text / Objects menu items) */
  onOpenFormatDialog?: (tab: 'text' | 'object') => void;
}

function useCloseOnOutside(ref: React.RefObject<HTMLDivElement | null>, open: boolean, onClose: () => void) {
  useEffect(() => {
    if (!open) return;
    const handle = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [open, onClose, ref]);
}

export const MenuBar: React.FC<MenuBarProps> = (props) => {
  const [openMenu, setOpenMenu] = useState<MenuId>(null);
  const [hoveredMenu, setHoveredMenu] = useState<MenuId>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const {
    pages,
    currentPageId,
    selectedElementIds,
    addPanel,
    addBalloon,
    addOverlay,
    updatePanel,
    setKnifeMode,
    isKnifeMode,
    toggleDrawingMode,
    isDrawingMode,
    splitPanel,
  } = useComicStore();

  const currentPage = pages.find(p => p.id === currentPageId);
  const selectedPanels = currentPage?.panels.filter(p => selectedElementIds.includes(p.id)) || [];

  // Close dropdown and clear active menu when clicking outside (hover already closes on leave)
  useCloseOnOutside(barRef, openMenu !== null, () => {
    setOpenMenu(null);
    props.onActiveMenuChange(null);
  });
  useEffect(() => {
    const onEscape = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpenMenu(null); };
    document.addEventListener('keydown', onEscape);
    return () => document.removeEventListener('keydown', onEscape);
  }, []);

  const close = () => setOpenMenu(null);

  const isOpen = (id: MenuId) => openMenu === id;
  const isHoveredOrOpen = (id: MenuId) => openMenu === id || hoveredMenu === id;
  const handleMenuBlockEnter = (id: MenuId) => {
    setHoveredMenu(id);
    setOpenMenu(id);
    props.onActiveMenuChange(id);
  };
  const handleMenuBlockLeave = () => {
    setHoveredMenu(null);
    setOpenMenu(null);
    // Do not clear activeMenu here: when the dropdown closes (e.g. after clicking an item), the
    // mouse may leave the block and we would otherwise reset the ribbon to Panel. Keep the last
    // chosen menu (File, Edit, View, Text, Objects, etc.) so the correct ribbon stays visible.
    // activeMenu is only cleared on outside click (useCloseOnOutside) or when entering another menu.
  };
  const menuBtn = (id: MenuId, label: string, _icon: React.ReactNode) => (
    <Tooltip content={label}>
      <button
        type="button"
        className="h-10 px-2.5 flex items-center gap-1.5 border-r border-white/15 transition-all duration-150 shrink-0 active:scale-[0.98] active:shadow-inner"
        style={{
          background: isOpen(id) ? ACCENT_BLUE_GRADIENT : 'transparent',
          color: isHoveredOrOpen(id) ? HOVER_TEXT_GOLD : MENU_BAR_TEXT_BLUE,
          borderColor: 'rgba(255,255,255,0.15)',
        }}
        aria-expanded={openMenu === id}
        aria-label={label}
      >
        <span className={`font-semibold text-xs uppercase tracking-wider ${id === 'text' || id === 'objects' ? 'inline' : 'hidden sm:inline'}`}>{label}</span>
        <ChevronDown size={12} className={openMenu === id ? 'rotate-180' : ''} />
      </button>
    </Tooltip>
  );

  const item = (label: string, shortcut?: string, onClick?: () => void, disabled?: boolean) => (
    <button
      type="button"
      onClick={() => { onClick?.(); close(); }}
      disabled={disabled}
      className="w-full text-left px-3 py-2 text-xs flex items-center justify-between gap-4 rounded transition-all duration-150 text-[#001a4d] hover:bg-[#002366] hover:text-[#fcf6ba] disabled:opacity-50 active:scale-[0.99]"
    >
      <span>{label}</span>
      {shortcut && <span className="text-[10px] opacity-70 font-mono">{shortcut}</span>}
    </button>
  );

  const handleAddPanel = () => {
    if (!currentPage) return;
    setKnifeMode(false);
    addPanel(currentPage.id, {
      shapeType: 'polygon',
      x: 100, y: 100, width: 200, height: 200,
      points: [{ x: 0, y: 0 }, { x: 200, y: 0 }, { x: 200, y: 200 }, { x: 0, y: 200 }],
    });
    close();
  };

  const handleAddCallout = (styleId: string) => {
    const style = BALLOON_STYLES.find(s => s.id === styleId);
    if (!style || !currentPage) return;
    const overrides: Record<string, unknown> = {};
    if (style.textWarp) overrides.textWarp = style.textWarp;
    if (style.textStroke) overrides.textStroke = style.textStroke;
    if (style.textStrokeWidth) overrides.textStrokeWidth = style.textStrokeWidth;
    if (style.secondaryTextStroke) overrides.secondaryTextStroke = style.secondaryTextStroke;
    if (style.secondaryTextStrokeWidth) overrides.secondaryTextStrokeWidth = style.secondaryTextStrokeWidth;
    if (style.text3DExtrusion) overrides.text3DExtrusion = style.text3DExtrusion;
    if (style.text3DExtrusionColor) overrides.text3DExtrusionColor = style.text3DExtrusionColor;
    addBalloon(currentPage.id, {
      x: 400, y: 600, width: 250, height: 150,
      hasTail: style.hasTail, tailBasePoint: { x: 0, y: 0 }, tailTip: { x: -50, y: 100 },
      styleId: styleId as BalloonStyleId,
      text: style.kind === 'shout' && styleId.includes('sound_effect') ? 'BOOM!' : 'Text...',
      overrides: Object.keys(overrides).length > 0 ? overrides : undefined,
    });
    close();
  };

  const handleInsertImage = () => {
    pages.forEach(page => {
      page.panels.filter(p => selectedElementIds.includes(p.id)).forEach(p =>
        updatePanel(page.id, p.id, { imageUrl: PLACEHOLDER_IMAGE_URL }));
    });
    close();
  };

  const handleSplit = (dir: 'horizontal' | 'vertical', slant?: number) => {
    selectedPanels.forEach(p => splitPanel(currentPageId!, p.id, dir, slant));
    close();
  };

  const handleAddSfx = (text: string) => {
    if (currentPageId) addOverlay(currentPageId, { type: 'sfx', text, src: '', x: 350, y: 180, rotation: 0, scaleX: 1, scaleY: 1, zIndex: 0 });
    close();
  };

  const dropdownPanelClass = 'absolute top-full left-0 mt-0 min-w-[200px] rounded-b-lg shadow-2xl border border-white/15 overflow-hidden z-[100] py-1 transition-all duration-150';
  const dropdownPanelStyle = { background: ACCENT_GOLD_GRADIENT };
  const dropdownItemClass = 'w-full text-left px-3 py-2 text-xs flex items-center gap-2 rounded transition-all duration-150 text-[#001a4d] hover:bg-[#002366] hover:text-[#fcf6ba] disabled:opacity-50 active:scale-[0.99]';
  const dropdownItemStyle = {};
  const dropdownHeadingStyle = { color: MENU_BAR_TEXT_BLUE };

  const menuWithDropdown = (id: MenuId, label: string, _icon: React.ReactNode, dropdown: React.ReactNode) => (
    <div
      key={id}
      className="relative flex items-stretch"
      onMouseEnter={() => handleMenuBlockEnter(id)}
      onMouseLeave={handleMenuBlockLeave}
    >
      {menuBtn(id, label, null)}
      {openMenu === id && dropdown}
    </div>
  );

  return (
    <div ref={barRef} className="flex items-stretch h-full">
      {menuWithDropdown('file', 'File', null, (
        <div className={dropdownPanelClass} style={dropdownPanelStyle}>
          {item('Open…', '⌘O', props.onLoad)}
          {item('Save', '⌘S', props.onSave)}
          <div className="my-1 border-t border-white/15" />
          {item('Export as PNG', undefined, props.onExportPng)}
          {item('Export as PDF', undefined, props.onExportPdf)}
          <div className="my-1 border-t border-white/15" />
          <button type="button" onClick={() => { props.onThemeClick(); close(); }} className={`${dropdownItemClass} justify-between`} style={dropdownItemStyle}>
            <span>Theme / Studio look</span>
            <Palette size={12} />
          </button>
          <div className="px-3 py-1 text-[10px] opacity-60 truncate" style={dropdownHeadingStyle}>{props.themeLabel}</div>
        </div>
      ))}
      {menuWithDropdown('edit', 'Edit', null, (
        <div className={dropdownPanelClass} style={dropdownPanelStyle}>
          {item('Undo', '⌘Z', props.onUndo)}
          {item('Redo', '⌘⇧Z', props.onRedo)}
          <div className="my-1 border-t border-white/15" />
          {item('Cut', '⌘X', props.onCut)}
          {item('Copy', '⌘C', props.onCopy)}
          {item('Paste', '⌘V', props.onPaste)}
        </div>
      ))}
      {menuWithDropdown('view', 'View', null, (
        <div className={`${dropdownPanelClass} min-w-[220px]`} style={dropdownPanelStyle}>
          {item('Zoom In', undefined, props.onZoomIn)}
          {item('Zoom Out', undefined, props.onZoomOut)}
          {item('Reset 100%', undefined, props.onZoomReset)}
          {item('Fit to screen', undefined, props.onZoomFit)}
          <div className="my-1 border-t border-white/15" />
          <div className="px-3 py-1.5 text-[10px] font-bold uppercase opacity-70" style={dropdownHeadingStyle}>Layout</div>
          <button type="button" onClick={() => { props.onLayoutModeChange('webtoon'); close(); }} className={dropdownItemClass} style={{ ...dropdownItemStyle, background: props.layoutMode === 'webtoon' ? 'rgba(0,35,102,0.4)' : undefined }}>
            <LayoutIcon size={12} /> Webtoon
          </button>
          <button type="button" onClick={() => { props.onLayoutModeChange('spread'); close(); }} className={dropdownItemClass} style={{ ...dropdownItemStyle, background: props.layoutMode === 'spread' ? 'rgba(0,35,102,0.4)' : undefined }}>
            <Columns size={12} /> Spread
          </button>
          <div className="px-3 pt-1 text-[10px] opacity-60" style={dropdownHeadingStyle}>{Math.round(props.zoomLevel * 100)}%</div>
        </div>
      ))}
      {menuWithDropdown('panel', 'Panel', null, (
        <div className={`${dropdownPanelClass} min-w-[240px] max-h-[80vh] overflow-y-auto`} style={dropdownPanelStyle}>
          <button type="button" onClick={handleAddPanel} className={dropdownItemClass} style={dropdownItemStyle}><Plus size={12} /> Add Panel</button>
          <button type="button" onClick={() => { toggleDrawingMode(!isDrawingMode); close(); }} className={dropdownItemClass} style={dropdownItemStyle}><Pencil size={12} /> {isDrawingMode ? 'Exit Draw' : 'Draw'}</button>
          <button type="button" onClick={() => { setKnifeMode(!isKnifeMode); close(); }} className={dropdownItemClass} style={dropdownItemStyle}><Scissors size={12} /> {isKnifeMode ? 'Exit Knife' : 'Knife (split by line)'}</button>
          <button type="button" onClick={handleInsertImage} disabled={!props.hasPanelSelected} className={dropdownItemClass} style={dropdownItemStyle}><ImagePlus size={12} /> Insert Image</button>
          <div className="my-1 border-t border-white/15" />
          <div className="px-3 py-1.5 text-[10px] font-bold uppercase opacity-70" style={dropdownHeadingStyle}>Split selected panel</div>
          <button type="button" onClick={() => handleSplit('horizontal', 0)} disabled={selectedPanels.length === 0} className={dropdownItemClass} style={dropdownItemStyle}>Horizontal (row)</button>
          <button type="button" onClick={() => handleSplit('vertical', 0)} disabled={selectedPanels.length === 0} className={dropdownItemClass} style={dropdownItemStyle}>Vertical (column)</button>
          <button type="button" onClick={() => handleSplit('horizontal', 40)} disabled={selectedPanels.length === 0} className={dropdownItemClass} style={dropdownItemStyle}>Slant row</button>
          <button type="button" onClick={() => handleSplit('vertical', 40)} disabled={selectedPanels.length === 0} className={dropdownItemClass} style={dropdownItemStyle}>Slant column</button>
        </div>
      ))}
      {menuWithDropdown('balloon', 'Balloon', null, (
        <div className={`${dropdownPanelClass} min-w-[260px] max-h-[80vh] overflow-y-auto`} style={dropdownPanelStyle}>
          <div className="px-3 py-1.5 text-[10px] font-bold uppercase opacity-70" style={dropdownHeadingStyle}>Speech & Thought</div>
          {BALLOON_STYLES.filter(s => !s.id.startsWith('sound_effect')).map((s) => (
            <button key={s.id} type="button" onClick={() => handleAddCallout(s.id)} className={dropdownItemClass} style={dropdownItemStyle}>{s.label}</button>
          ))}
          <div className="my-1 border-t border-white/15" />
          <div className="px-3 py-1.5 text-[10px] font-bold uppercase opacity-70" style={dropdownHeadingStyle}>Word Art & SFX</div>
          {BALLOON_STYLES.filter(s => s.id.startsWith('sound_effect')).map((s) => (
            <button key={s.id} type="button" onClick={() => handleAddCallout(s.id)} className={dropdownItemClass} style={dropdownItemStyle}>{s.label}</button>
          ))}
          <div className="my-1 border-t border-white/15" />
          <div className="px-3 py-1.5 text-[10px] font-bold uppercase opacity-70" style={dropdownHeadingStyle}>SFX stamp</div>
          {SFX_OPTIONS.map((t) => (
            <button key={t} type="button" onClick={() => handleAddSfx(t)} className={dropdownItemClass} style={dropdownItemStyle}><Sparkles size={10} className="inline mr-2" />{t}</button>
          ))}
        </div>
      ))}
      {menuWithDropdown('text', 'Text', null, (
        <div className={`${dropdownPanelClass} min-w-[240px]`} style={dropdownPanelStyle}>
          <div className="px-3 py-1.5 text-[10px] font-bold uppercase opacity-70" style={dropdownHeadingStyle}>Formatting text</div>
          <button type="button" onClick={() => { props.onOpenFormatDialog?.('text'); props.onActiveMenuChange('text'); close(); }} className={dropdownItemClass} style={dropdownItemStyle}><Type size={12} /> Font & size</button>
          <button type="button" onClick={() => { props.onOpenFormatDialog?.('text'); props.onActiveMenuChange('text'); close(); }} className={dropdownItemClass} style={dropdownItemStyle}><Palette size={12} /> Color, stroke, outline</button>
          <button type="button" onClick={() => { props.onOpenFormatDialog?.('text'); props.onActiveMenuChange('text'); close(); }} className={dropdownItemClass} style={dropdownItemStyle}><Box size={12} /> 3D extrusion</button>
          <button type="button" onClick={() => { props.onOpenFormatDialog?.('text'); props.onActiveMenuChange('text'); close(); }} className={dropdownItemClass} style={dropdownItemStyle}><Waves size={12} /> Warp (arc, wave)</button>
          <button type="button" onClick={() => { props.onOpenFormatDialog?.('text'); props.onActiveMenuChange('text'); close(); }} className={dropdownItemClass} style={dropdownItemStyle}><BoxSelect size={12} /> Padding</button>
          <button type="button" onClick={() => { props.onOpenFormatDialog?.('text'); props.onActiveMenuChange('text'); close(); }} className={dropdownItemClass} style={dropdownItemStyle}><AlignLeft size={12} /> Alignment</button>
          <div className="my-1 border-t border-white/15" />
          <div className="px-3 py-1 text-[10px] opacity-70" style={dropdownHeadingStyle}>Ribbon below shows font, color, alignment. Select a balloon to edit.</div>
        </div>
      ))}
      {menuWithDropdown('objects', 'Objects', null, (
        <div className={`${dropdownPanelClass} min-w-[260px] max-h-[80vh] overflow-y-auto`} style={dropdownPanelStyle}>
          <div className="px-3 py-1.5 text-[10px] font-bold uppercase opacity-70" style={dropdownHeadingStyle}>Shape & transform</div>
          <button type="button" onClick={() => { props.onOpenFormatDialog?.('object'); props.onActiveMenuChange('objects'); close(); }} className={dropdownItemClass} style={dropdownItemStyle}><BoxSelect size={12} /> Shape (Rect / Ellipse)</button>
          <button type="button" onClick={() => { props.onActiveMenuChange('objects'); close(); }} className={dropdownItemClass} style={dropdownItemStyle}><Scissors size={12} /> Split panel</button>
          <button type="button" onClick={() => { props.onActiveMenuChange('objects'); close(); }} className={dropdownItemClass} style={dropdownItemStyle}><ArrowLeftRight size={12} /> Flip H / Flip V</button>
          <button type="button" onClick={() => { props.onActiveMenuChange('objects'); close(); }} className={dropdownItemClass} style={dropdownItemStyle}>Bring to front / Send to back</button>
          <div className="my-1 border-t border-white/15" />
          <div className="px-3 py-1.5 text-[10px] font-bold uppercase opacity-70" style={dropdownHeadingStyle}>Formatting objects</div>
          <button type="button" onClick={() => { props.onOpenFormatDialog?.('object'); props.onActiveMenuChange('objects'); close(); }} className={dropdownItemClass} style={dropdownItemStyle}><Circle size={12} /> Fill & border</button>
          <button type="button" onClick={() => { props.onOpenFormatDialog?.('object'); props.onActiveMenuChange('objects'); close(); }} className={dropdownItemClass} style={dropdownItemStyle}><Moon size={12} /> Shadow</button>
          <button type="button" onClick={() => { props.onOpenFormatDialog?.('object'); props.onActiveMenuChange('objects'); close(); }} className={dropdownItemClass} style={dropdownItemStyle}><Sparkles size={12} /> Glow</button>
          <button type="button" onClick={() => { props.onOpenFormatDialog?.('object'); props.onActiveMenuChange('objects'); close(); }} className={dropdownItemClass} style={dropdownItemStyle}><ImageIcon size={12} /> Texture</button>
          <button type="button" onClick={() => { props.onOpenFormatDialog?.('object'); props.onActiveMenuChange('objects'); close(); }} className={dropdownItemClass} style={dropdownItemStyle}><RefreshCw size={12} /> Sync style · Flip tail</button>
          <div className="my-1 border-t border-white/15" />
          <div className="px-3 py-1 text-[10px] opacity-70" style={dropdownHeadingStyle}>Ribbon below shows fill, border, shadow, texture. Select a balloon or panel.</div>
        </div>
      ))}
    </div>
  );
};
