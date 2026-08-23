import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Palette, LayoutGrid as LayoutIcon, Columns, Plus, Scissors, Pencil, ImagePlus, Sparkles, Type, Circle, Box, Waves, Moon, Image as ImageIcon, RefreshCw, ArrowLeftRight, BoxSelect } from 'lucide-react';
import { Tooltip } from '@/shared/components/Tooltip';
import { BALLOON_STYLES } from '../data/BalloonStyles';
import type { BalloonStyleId } from '../../../types/balloon';
import { useComicStore } from '../../../stores/comicStore';
import { ACCENT_GOLD_GRADIENT, ACCENT_BLUE_GRADIENT, ACCENT_GOLD_LIGHT } from '../theme/Phase12DesignTokens';
import { useShallow } from 'zustand/react/shallow';
import type { ComicDocumentCommands, ComicViewportControls } from './comicCommands';

/** Solid dark blue for menu bar text (gold bar) when not hovered */
const MENU_BAR_TEXT_BLUE = '#001a4d';
/** Gold for hover text so it's readable on both gold bar and blue hover background */
const HOVER_TEXT_GOLD = ACCENT_GOLD_LIGHT;
const FIRST_STORED_IMAGE_URL = '/assets/images/Anunnaki Anubis.png';
const SFX_OPTIONS = ['BOOM', 'ZAP', 'CRASH', 'POW', 'BAM', 'WHAM', 'SLAM', 'KAPOW', 'BANG'];

export type MenuId = 'home' | 'edit' | 'view' | 'panel' | 'balloon' | 'text' | 'objects' | 'workflow' | null;

export interface MenuBarProps {
  /** Which menu is open; used to drive contextual ribbon */
  activeMenu: MenuId;
  onActiveMenuChange: (id: MenuId) => void;
  themeLabel: string;
  onThemeClick: () => void;
  commands: ComicDocumentCommands;
  viewport: ComicViewportControls;
  /** Panel selected: enable Insert Image, Split submenu */
  hasPanelSelected: boolean;
  /** Open the Format dialog with the given tab (from Text / Objects menu items) */
  onOpenFormatDialog?: (tab: import('./FormatDialog').FormatDialogTabId) => void;
  guidedWorkflowSteps?: Array<{ id: string; label: string }>;
  onOpenGuidedWorkflowStep?: (stepId: string) => void;
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
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const {
    pages,
    currentPageId,
    selectedElementIds,
    addPanel,
    lastCanvasPosition,
    addBalloon,
    addOverlay,
    insertImageIntoWorkspace,
    updatePanel,
    setKnifeMode,
    isKnifeMode,
    toggleDrawingMode,
    isDrawingMode,
    splitPanel,
    toggleFlip,
    bringToFront,
    sendToBack,
    createGroup,
    ungroup,
    getGroupMembers,
  } = useComicStore(
    useShallow((s) => ({
      pages: s.pages,
      currentPageId: s.currentPageId,
      selectedElementIds: s.selectedElementIds,
      addPanel: s.addPanel,
      lastCanvasPosition: s.lastCanvasPosition,
      addBalloon: s.addBalloon,
      addOverlay: s.addOverlay,
      insertImageIntoWorkspace: s.insertImageIntoWorkspace,
      updatePanel: s.updatePanel,
      setKnifeMode: s.setKnifeMode,
      isKnifeMode: s.isKnifeMode,
      toggleDrawingMode: s.toggleDrawingMode,
      isDrawingMode: s.isDrawingMode,
      splitPanel: s.splitPanel,
      toggleFlip: s.toggleFlip,
      bringToFront: s.bringToFront,
      sendToBack: s.sendToBack,
      createGroup: s.createGroup,
      ungroup: s.ungroup,
      getGroupMembers: s.getGroupMembers,
    })),
  );

  const currentPage = pages.find(p => p.id === currentPageId);
  const groupOfFirst = currentPageId && selectedElementIds[0] ? getGroupMembers(currentPageId, selectedElementIds[0]) : null;
  const isSelectionOneGroup = !!(groupOfFirst && groupOfFirst.length >= 2 && selectedElementIds.length === 1);
  const selectedPanelEntries = pages.flatMap(p => p.panels.filter(panel => selectedElementIds.includes(panel.id)).map(panel => ({ pageId: p.id, panel })));
  const selectedPanels = selectedPanelEntries.map(x => x.panel);
  const effectivePageIdForSelection = selectedPanelEntries[0]?.pageId ?? currentPageId;

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
  const handleMenuBlockLeave = (e: React.MouseEvent) => {
    const related = e.relatedTarget;
    if (related instanceof Node && dropdownRef.current?.contains(related)) return;
    setHoveredMenu(null);
    setOpenMenu(null);
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
        <span className={`font-semibold text-xs uppercase tracking-wider ${id === 'text' || id === 'objects' || id === 'workflow' ? 'inline' : 'hidden sm:inline'}`}>{label}</span>
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

  type AddPanelShape = 'polygon' | 'ellipse' | 'halfCircle' | 'quarterCircle' | 'sector';
  const addPanelPayload = (shape: AddPanelShape, x: number, y: number, w: number, h: number) => {
    const base = { x, y, width: w, height: h };
    if (shape === 'ellipse') return { ...base, shapeType: 'ellipse' as const };
    if (shape === 'halfCircle') return { ...base, shapeType: 'halfCircle' as const };
    if (shape === 'quarterCircle') return { ...base, shapeType: 'quarterCircle' as const };
    if (shape === 'sector') return { ...base, shapeType: 'sector' as const, centralAngle: 90 };
    return { ...base, shapeType: 'polygon' as const, points: [{ x: 0, y: 0 }, { x: w, y: 0 }, { x: w, y: h }, { x: 0, y: h }] };
  };

  const handleAddPanel = (shape: AddPanelShape = 'polygon') => {
    setKnifeMode(false);
    const pageId = currentPageId ?? currentPage?.id ?? pages[0]?.id;
    const w = 200;
    const h = 200;
    const pos = lastCanvasPosition && lastCanvasPosition.pageId === pageId ? lastCanvasPosition : null;
    if (pageId && pos) {
      addPanel(pageId, addPanelPayload(shape, pos.x - w / 2, pos.y - h / 2, w, h));
      close();
      return;
    }
    if (pageId) {
      const cx = 400;
      const cy = 600;
      addPanel(pageId, addPanelPayload(shape, cx - w / 2, cy - h / 2, w, h));
    }
    close();
  };

  const handleAddPanelAtCenter = () => {
    if (!currentPage) return;
    setKnifeMode(false);
    const w = 200;
    const h = 200;
    const pageW = 800;
    const pageH = 1200;
    addPanel(currentPage.id, {
      shapeType: 'polygon',
      x: pageW / 2 - w / 2,
      y: pageH / 2 - h / 2,
      width: w,
      height: h,
      points: [{ x: 0, y: 0 }, { x: w, y: 0 }, { x: w, y: h }, { x: 0, y: h }],
    });
    close();
  };

  const handleSetPanelShape = (shapeType: 'rect' | 'ellipse' | 'halfCircle' | 'quarterCircle' | 'sector') => {
    if (!effectivePageIdForSelection || selectedPanels.length === 0) return;
    selectedPanels.forEach(p => updatePanel(effectivePageIdForSelection, p.id, {
      shapeType,
      ...(shapeType === 'sector' && { centralAngle: 90 }),
    }));
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
    const isFloatingText = styleId === 'floating_text';
    const pos = isFloatingText && lastCanvasPosition?.pageId === currentPage.id ? lastCanvasPosition : null;
    const pageW = 800, pageH = 1200, bw = 250, bh = 150;
    const rawX = pos ? pos.x - bw / 2 : 400;
    const rawY = pos ? pos.y - bh / 2 : 600;
    const x = isFloatingText ? Math.max(0, Math.min(pageW - bw, rawX)) : rawX;
    const y = isFloatingText ? Math.max(0, Math.min(pageH - bh, rawY)) : rawY;
    addBalloon(currentPage.id, {
      x, y, width: 250, height: 150,
      hasTail: style.hasTail, tailBasePoint: { x: 0, y: 0 }, tailTip: { x: -50, y: 100 },
      styleId: styleId as BalloonStyleId,
      text: style.kind === 'shout' && styleId.includes('sound_effect') ? 'BOOM!' : 'Text...',
      overrides: Object.keys(overrides).length > 0 ? overrides : undefined,
    });
    close();
  };

  const handleInsertImage = () => {
    insertImageIntoWorkspace(FIRST_STORED_IMAGE_URL, { sourceLabel: 'Anunnaki Anubis.png' });
    close();
  };

  const handleSplit = (dir: 'horizontal' | 'vertical', slant?: number) => {
    if (!effectivePageIdForSelection || selectedPanels.length === 0) return;
    selectedPanels.forEach(p => splitPanel(effectivePageIdForSelection, p.id, dir, slant));
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
      {openMenu === id && (
        <div ref={dropdownRef} onMouseEnter={() => handleMenuBlockEnter(id)} className="absolute top-full left-0 z-[100]">
          {dropdown}
        </div>
      )}
    </div>
  );

  return (
    <div ref={barRef} className="flex items-stretch h-full">
      {menuWithDropdown('home', 'Home', null, (
        <div className={dropdownPanelClass} style={dropdownPanelStyle}>
          {item('Open…', '⌘O', props.commands.load)}
          {item('Import image…', undefined, props.commands.importImage)}
          {item('Save', '⌘S', props.commands.save)}
          <div className="my-1 border-t border-white/15" />
          {item('Export current page (PNG)', undefined, props.commands.exportPng)}
          {item('Export all pages (PDF)', undefined, props.commands.exportPdf)}
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
          {/* onMouseDown so action runs before mousedown-outside closes dropdown (same as Insert Image) */}
          <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); props.commands.undo(); close(); }}
            className="w-full text-left px-3 py-2 text-xs flex items-center justify-between gap-4 rounded transition-all duration-150 text-[#001a4d] hover:bg-[#002366] hover:text-[#fcf6ba] active:scale-[0.99]"
          >
            <span>Undo</span>
            <span className="text-[10px] opacity-70 font-mono">⌘Z</span>
          </button>
          <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); props.commands.redo(); close(); }}
            className="w-full text-left px-3 py-2 text-xs flex items-center justify-between gap-4 rounded transition-all duration-150 text-[#001a4d] hover:bg-[#002366] hover:text-[#fcf6ba] active:scale-[0.99]"
          >
            <span>Redo</span>
            <span className="text-[10px] opacity-70 font-mono">⌘⇧Z</span>
          </button>
          <div className="my-1 border-t border-white/15" />
          {item('Cut', '⌘X', props.commands.cut)}
          {item('Copy', '⌘C', props.commands.copy)}
          {item('Paste', '⌘V', props.commands.paste)}
        </div>
      ))}
      {menuWithDropdown('view', 'View', null, (
        <div className={`${dropdownPanelClass} min-w-[220px]`} style={dropdownPanelStyle}>
          {item('Zoom In', undefined, props.viewport.zoomIn)}
          {item('Zoom Out', undefined, props.viewport.zoomOut)}
          {item('Reset 100%', undefined, props.viewport.zoomReset)}
          {item('Fit to screen', undefined, props.viewport.zoomFit)}
          <div className="my-1 border-t border-white/15" />
          <div className="px-3 py-1.5 text-[10px] font-bold uppercase opacity-70" style={dropdownHeadingStyle}>Layout</div>
          <button type="button" onClick={() => { props.viewport.setLayoutMode('webtoon'); close(); }} className={dropdownItemClass} style={{ ...dropdownItemStyle, background: props.viewport.layoutMode === 'webtoon' ? 'rgba(0,35,102,0.4)' : undefined }}>
            <LayoutIcon size={12} /> Webtoon
          </button>
          <button type="button" onClick={() => { props.viewport.setLayoutMode('spread'); close(); }} className={dropdownItemClass} style={{ ...dropdownItemStyle, background: props.viewport.layoutMode === 'spread' ? 'rgba(0,35,102,0.4)' : undefined }}>
            <Columns size={12} /> Spread
          </button>
          <div className="px-3 pt-1 text-[10px] opacity-60" style={dropdownHeadingStyle}>{Math.round(props.viewport.zoomLevel * 100)}%</div>
        </div>
      ))}
      {menuWithDropdown('panel', 'Panel', null, (
        <div className={`${dropdownPanelClass} min-w-[260px] max-h-[80vh] overflow-y-auto`} style={dropdownPanelStyle}>
          <div className="px-3 py-1.5 text-[10px] font-bold uppercase opacity-70" style={dropdownHeadingStyle}>Add panel</div>
          <button type="button" onClick={() => handleAddPanel('polygon')} className={dropdownItemClass} style={dropdownItemStyle}><Plus size={12} /> Add panel (rectangle)</button>
          <button type="button" onClick={() => handleAddPanel('ellipse')} className={dropdownItemClass} style={dropdownItemStyle}><Plus size={12} /> Add panel (circle)</button>
          <button type="button" onClick={() => handleAddPanel('halfCircle')} className={dropdownItemClass} style={dropdownItemStyle}><Plus size={12} /> Add panel (half-circle)</button>
          <button type="button" onClick={() => handleAddPanel('quarterCircle')} className={dropdownItemClass} style={dropdownItemStyle}><Plus size={12} /> Add panel (quarter-circle)</button>
          <button type="button" onClick={() => handleAddPanel('sector')} className={dropdownItemClass} style={dropdownItemStyle}><Plus size={12} /> Add panel (sector)</button>
          <button type="button" onClick={handleAddPanelAtCenter} className={dropdownItemClass} style={dropdownItemStyle}><Plus size={12} /> Add panel at center</button>
          <div className="my-1 border-t border-white/15" />
          <div className="px-3 py-1.5 text-[10px] font-bold uppercase opacity-70" style={dropdownHeadingStyle}>Panel shape (selected)</div>
          <button type="button" onClick={() => handleSetPanelShape('rect')} className={dropdownItemClass} style={dropdownItemStyle}>Rectangle</button>
          <button type="button" onClick={() => handleSetPanelShape('ellipse')} className={dropdownItemClass} style={dropdownItemStyle}>Circle / Ellipse</button>
          <button type="button" onClick={() => handleSetPanelShape('halfCircle')} className={dropdownItemClass} style={dropdownItemStyle}>Half-circle</button>
          <button type="button" onClick={() => handleSetPanelShape('quarterCircle')} className={dropdownItemClass} style={dropdownItemStyle}>Quarter-circle</button>
          <button type="button" onClick={() => handleSetPanelShape('sector')} className={dropdownItemClass} style={dropdownItemStyle}>Sector</button>
          <div className="my-1 border-t border-white/15" />
          <button type="button" onClick={() => { toggleDrawingMode(!isDrawingMode); close(); }} className={dropdownItemClass} style={dropdownItemStyle}><Pencil size={12} /> {isDrawingMode ? 'Exit Draw' : 'Draw'}</button>
          <button type="button" onClick={() => { setKnifeMode(!isKnifeMode); close(); }} className={dropdownItemClass} style={dropdownItemStyle}><Scissors size={12} /> {isKnifeMode ? 'Exit Knife' : 'Knife (split by line)'}</button>
          <button type="button" onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); handleInsertImage(); }} className={dropdownItemClass} style={dropdownItemStyle}><ImagePlus size={12} /> Insert stored image</button>
          <button type="button" onClick={() => { props.commands.importImage(); close(); }} className={dropdownItemClass} style={dropdownItemStyle}><ImagePlus size={12} /> Import image…</button>
          <div className="my-1 border-t border-white/15" />
          <div className="px-3 py-1.5 text-[10px] font-bold uppercase opacity-70" style={dropdownHeadingStyle}>Split selected panel</div>
          <button type="button" onClick={() => handleSplit('horizontal', 0)} className={dropdownItemClass} style={dropdownItemStyle}>Horizontal (row)</button>
          <button type="button" onClick={() => handleSplit('vertical', 0)} className={dropdownItemClass} style={dropdownItemStyle}>Vertical (column)</button>
          <button type="button" onClick={() => handleSplit('horizontal', 40)} className={dropdownItemClass} style={dropdownItemStyle}>Slant row</button>
          <button type="button" onClick={() => handleSplit('vertical', 40)} className={dropdownItemClass} style={dropdownItemStyle}>Slant column</button>
          {selectedPanels.length > 0 && selectedPanels[0].shapeType === 'sector' && (
            <>
              <div className="my-1 border-t border-white/15" />
              <div className="px-3 py-1.5 text-[10px] font-bold uppercase opacity-70" style={dropdownHeadingStyle}>Sector angle</div>
              <div className="flex items-center gap-1 px-3 py-1">
                <button type="button" onClick={() => { selectedPanels.forEach(p => updatePanel(effectivePageIdForSelection!, p.id, { centralAngle: Math.max(1, (p.centralAngle ?? 90) - 15) })); close(); }} className={`${dropdownItemClass} flex-1`} style={dropdownItemStyle}>- 15°</button>
                <span className="text-[10px] opacity-80" style={dropdownHeadingStyle}>{selectedPanels[0].centralAngle ?? 90}°</span>
                <button type="button" onClick={() => { selectedPanels.forEach(p => updatePanel(effectivePageIdForSelection!, p.id, { centralAngle: Math.min(360, (p.centralAngle ?? 90) + 15) })); close(); }} className={`${dropdownItemClass} flex-1`} style={dropdownItemStyle}>+ 15°</button>
              </div>
            </>
          )}
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
          <button type="button" onClick={() => handleAddCallout('floating_text')} className={dropdownItemClass} style={dropdownItemStyle}>
            <Type size={12} /> Insert Text Box
          </button>
          <div className="my-1 border-t border-white/15" />
          <div className="px-3 py-1.5 text-[10px] font-bold uppercase opacity-70" style={dropdownHeadingStyle}>Formatting text</div>
          <button type="button" onClick={() => { props.onOpenFormatDialog?.('textBox'); props.onActiveMenuChange('text'); close(); }} className={dropdownItemClass} style={dropdownItemStyle}><Type size={12} /> Font & size</button>
          <button type="button" onClick={() => { props.onOpenFormatDialog?.('textBox'); props.onActiveMenuChange('text'); close(); }} className={dropdownItemClass} style={dropdownItemStyle}><Palette size={12} /> Color, stroke, outline</button>
          <button type="button" onClick={() => { props.onOpenFormatDialog?.('effects'); props.onActiveMenuChange('text'); close(); }} className={dropdownItemClass} style={dropdownItemStyle}><Box size={12} /> 3D extrusion</button>
          {/* SYS-7: Warp/Padding/Alignment all opened the same Text Box dialog — collapsed into one honest item. */}
          <button type="button" onClick={() => { props.onOpenFormatDialog?.('textBox'); props.onActiveMenuChange('text'); close(); }} className={dropdownItemClass} style={dropdownItemStyle}><Waves size={12} /> Warp, padding &amp; alignment</button>
          <div className="my-1 border-t border-white/15" />
          <div className="px-3 py-1 text-[10px] opacity-70" style={dropdownHeadingStyle}>Ribbon below shows font, color, alignment. Select a balloon to edit.</div>
        </div>
      ))}
      {menuWithDropdown('objects', 'Objects', null, (
        <div className={`${dropdownPanelClass} min-w-[260px] max-h-[80vh] overflow-y-auto`} style={dropdownPanelStyle}>
          <div className="px-3 py-1.5 text-[10px] font-bold uppercase opacity-70" style={dropdownHeadingStyle}>Shape & transform</div>
          <button type="button" onClick={() => { props.onOpenFormatDialog?.('fillLine'); props.onActiveMenuChange('objects'); close(); }} className={dropdownItemClass} style={dropdownItemStyle}><BoxSelect size={12} /> Shape (Rect / Ellipse)</button>
          <button type="button" disabled={!effectivePageIdForSelection || !selectedPanels.length} onClick={() => { if (effectivePageIdForSelection) selectedPanels.forEach(p => splitPanel(effectivePageIdForSelection, p.id, 'horizontal', 0)); props.onActiveMenuChange('objects'); close(); }} className={dropdownItemClass} style={dropdownItemStyle}><Scissors size={12} /> Split panel</button>
          <div className="flex items-center gap-1 px-3 py-1">
            <button type="button" disabled={!effectivePageIdForSelection || !selectedElementIds.length} onClick={() => { if (effectivePageIdForSelection) selectedElementIds.forEach(id => toggleFlip(effectivePageIdForSelection, id, 'horizontal')); }} className={`${dropdownItemClass} flex-1`} style={dropdownItemStyle}><ArrowLeftRight size={12} /> Flip H</button>
            <button type="button" disabled={!effectivePageIdForSelection || !selectedElementIds.length} onClick={() => { if (effectivePageIdForSelection) selectedElementIds.forEach(id => toggleFlip(effectivePageIdForSelection, id, 'vertical')); }} className={`${dropdownItemClass} flex-1`} style={dropdownItemStyle}><ArrowLeftRight size={12} className="rotate-90" /> Flip V</button>
          </div>
          <div className="flex items-center gap-1 px-3 py-1">
            <button type="button" disabled={!effectivePageIdForSelection || !selectedElementIds.length} onClick={() => { if (effectivePageIdForSelection) selectedElementIds.forEach(id => bringToFront(effectivePageIdForSelection, id)); }} className={`${dropdownItemClass} flex-1`} style={dropdownItemStyle}>Bring to front</button>
            <button type="button" disabled={!effectivePageIdForSelection || !selectedElementIds.length} onClick={() => { if (effectivePageIdForSelection) selectedElementIds.forEach(id => sendToBack(effectivePageIdForSelection, id)); }} className={`${dropdownItemClass} flex-1`} style={dropdownItemStyle}>Send to back</button>
          </div>
          <button type="button" onClick={() => { currentPageId && createGroup(currentPageId, selectedElementIds); props.onActiveMenuChange('objects'); close(); }} disabled={!currentPageId || selectedElementIds.length < 2} className={dropdownItemClass} style={dropdownItemStyle}><BoxSelect size={12} /> Group</button>
          <button type="button" onClick={() => { currentPageId && selectedElementIds[0] && ungroup(currentPageId, selectedElementIds[0]); props.onActiveMenuChange('objects'); close(); }} disabled={!currentPageId || !selectedElementIds.length || !isSelectionOneGroup} className={dropdownItemClass} style={dropdownItemStyle}><BoxSelect size={12} /> Ungroup</button>
          <div className="my-1 border-t border-white/15" />
          <div className="px-3 py-1.5 text-[10px] font-bold uppercase opacity-70" style={dropdownHeadingStyle}>Formatting objects</div>
          <button type="button" onClick={() => { props.onOpenFormatDialog?.('fillLine'); props.onActiveMenuChange('objects'); close(); }} className={dropdownItemClass} style={dropdownItemStyle}><Circle size={12} /> Fill & border</button>
          <button type="button" onClick={() => { props.onOpenFormatDialog?.('effects'); props.onActiveMenuChange('objects'); close(); }} className={dropdownItemClass} style={dropdownItemStyle}><Moon size={12} /> Shadow</button>
          <button type="button" onClick={() => { props.onOpenFormatDialog?.('effects'); props.onActiveMenuChange('objects'); close(); }} className={dropdownItemClass} style={dropdownItemStyle}><Sparkles size={12} /> Glow</button>
          <button type="button" onClick={() => { props.onOpenFormatDialog?.('fillLine'); props.onActiveMenuChange('objects'); close(); }} className={dropdownItemClass} style={dropdownItemStyle}><ImageIcon size={12} /> Texture</button>
          <button type="button" onClick={() => { props.onOpenFormatDialog?.('fillLine'); props.onActiveMenuChange('objects'); close(); }} className={dropdownItemClass} style={dropdownItemStyle}><RefreshCw size={12} /> Sync style · Flip tail</button>
          <div className="my-1 border-t border-white/15" />
          <div className="px-3 py-1 text-[10px] opacity-70" style={dropdownHeadingStyle}>Ribbon below shows fill, border, shadow, texture. Select a balloon or panel.</div>
        </div>
      ))}
      {props.guidedWorkflowSteps?.length && props.onOpenGuidedWorkflowStep ? menuWithDropdown('workflow', 'Workflow', null, (
        <div className={`${dropdownPanelClass} min-w-[240px]`} style={dropdownPanelStyle}>
          <div className="px-3 py-1.5 text-[10px] font-bold uppercase opacity-70" style={dropdownHeadingStyle}>Guided Comics focus flow</div>
          {props.guidedWorkflowSteps.map((step) => (
            <button
              key={step.id}
              type="button"
              onClick={() => {
                props.onOpenGuidedWorkflowStep?.(step.id);
                close();
              }}
              className={dropdownItemClass}
              style={dropdownItemStyle}
            >
              {step.label}
            </button>
          ))}
        </div>
      )) : null}
    </div>
  );
};
