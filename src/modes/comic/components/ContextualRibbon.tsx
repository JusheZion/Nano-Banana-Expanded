import React from 'react';
import { useComicStore } from '../../../stores/comicStore';
import { ObjectToolbar } from './ObjectToolbar';
import { TextToolbar } from './TextToolbar';
import { BalloonRibbonContent } from './BalloonRibbonContent';
import { Tooltip } from '../../../components/ui/Tooltip';
import {
  Save,
  Image as ImageIcon,
  FileDown,
  Undo2,
  Redo2,
  ZoomIn,
  ZoomOut,
  Maximize2,
  LayoutGrid,
  Columns,
  Plus,
  Circle,
  Scissors,
  Pencil,
  ImagePlus,
  Pin,
  PinOff,
  Copy,
  Clipboard,
  Bold,
  Italic,
  Underline,
  Palette,
  Square,
  MessageCircle,
  Layers,
  CopyPlus,
  BoxSelect,
} from 'lucide-react';
import type { MenuId } from './MenuBar';
import type { FormatDialogTabId } from './FormatDialog';
import { FontSelect } from './FontSelect';
import { BALLOON_STYLES } from '../data/BalloonStyles';
import {
  ACCENT_BLUE_GRADIENT,
  ACCENT_GOLD_GRADIENT,
  TEXT_ON_GOLD,
  TEXT_ON_BLUE,
} from '../theme/Phase12DesignTokens';

const PLACEHOLDER_IMAGE_URL = 'https://via.placeholder.com/150';

const RIBBON_DIVIDER = <div className="h-5 w-px bg-white/20 shrink-0" aria-hidden />;

/** Last format category (Text vs Objects) chosen in the menu bar; drives which format ribbon shows when an object is selected. */
export type LastFormatCategory = 'text' | 'objects' | null;

export interface ContextualRibbonProps {
  activeMenu: MenuId;
  /** When set, format ribbon shows Text or Objects content based on selection + this (e.g. object selected + lastFormatCategory === 'objects' → Objects ribbon). */
  lastFormatCategory?: LastFormatCategory;
  hasPanelSelected: boolean;
  hasBalloonSelected: boolean;
  currentPageId: string | null;
  selectedElementIds: string[];
  /** Pin ribbon so it stays visible independent of menu/selection */
  ribbonPinned: boolean;
  onRibbonPinToggle: () => void;
  /** For Balloon ribbon */
  balloonTextExpanded: boolean;
  balloonShapeExpanded: boolean;
  onBalloonTextExpandedChange: (v: boolean) => void;
  onBalloonShapeExpandedChange: (v: boolean) => void;
  /** For View ribbon */
  zoomLevel: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomReset: () => void;
  onZoomFit: () => void;
  layoutMode: 'webtoon' | 'spread';
  onLayoutModeChange: (mode: 'webtoon' | 'spread') => void;
  onSave: () => void;
  onExportPng: () => void;
  onExportPdf: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onCut: () => void;
  onCopy: () => void;
  onPaste: () => void;
  /** Open Format dialog with optional tab and target (context-aware for Color button) */
  onOpenFormatDialog?: (tab: FormatDialogTabId, pageId?: string | null, balloonId?: string | null, panelId?: string | null) => void;
  /** Optional: switch active menu from ribbon (e.g. Format → Text/Objects) */
  onActiveMenuChange?: (id: MenuId) => void;
}

export const ContextualRibbon: React.FC<ContextualRibbonProps> = (props) => {
  const {
    pages,
    currentPageId,
    selectedElementIds,
    addPanel,
    addBalloon,
    lastCanvasPosition,
    updatePanel,
    updateBalloon,
    setKnifeMode,
    isKnifeMode,
    toggleDrawingMode,
    isDrawingMode,
    splitPanel,
    bringToFront,
    sendToBack,
    cloneElement,
  } = useComicStore();

  const currentPage = pages.find(p => p.id === currentPageId);
  const selectedPanels = currentPage?.panels.filter(p => selectedElementIds.includes(p.id)) || [];
  const selectedBalloons = currentPage?.balloons.filter(b => selectedElementIds.includes(b.id)) || [];
  const selectedTextId = selectedBalloons.length > 0 ? selectedBalloons[0].id : null;

  const lastFormat = props.lastFormatCategory ?? null;

  // Format ribbon (Text vs Objects): show when that menu is active, OR when an object is selected and that was the last chosen format category (per user guidelines).
  const showTextRibbon =
    props.activeMenu === 'text' ||
    (lastFormat === 'text' && props.hasBalloonSelected && props.activeMenu !== 'objects');
  const showObjectsRibbon =
    props.activeMenu === 'objects' ||
    (lastFormat === 'objects' && (props.hasPanelSelected || props.hasBalloonSelected) && props.activeMenu !== 'text');

  const showViewRibbon = props.activeMenu === 'view';
  const showHomeRibbon = props.activeMenu === 'home';
  const showEditRibbon = props.activeMenu === 'edit';
  const hasContext = props.activeMenu != null || props.hasPanelSelected || props.hasBalloonSelected;
  const showPanelRibbon = (props.activeMenu === 'panel') || (props.activeMenu === null && (props.hasPanelSelected || (props.ribbonPinned && !hasContext)));
  const showBalloonRibbon = (props.activeMenu === 'balloon' || (props.activeMenu === null && props.hasBalloonSelected)) && !showPanelRibbon;

  const ribbonVisible =
    props.ribbonPinned ||
    hasContext ||
    showTextRibbon ||
    showObjectsRibbon ||
    showHomeRibbon;

  const ribbonBtnBase = 'rounded-lg border border-white/20 flex flex-col items-center justify-center gap-0.5 py-1.5 px-2 min-w-[2.5rem] transition-all duration-150 shrink-0 hover:bg-[linear-gradient(45deg,#bf953f_0%,#fcf6ba_45%,#b38728_70%,#fbf5b7_85%,#aa771c_100%)] hover:text-[#000000] hover:border-white/30 active:scale-[0.98] active:shadow-inner';
  const ribbonBtnStyle = (active?: boolean) =>
    active ? { background: ACCENT_GOLD_GRADIENT, color: TEXT_ON_GOLD } : { background: 'transparent', color: TEXT_ON_BLUE };
  const RibbonButton = ({ label, icon, active, onClick, onMouseDown, disabled, title }: { label: string; icon: React.ReactNode; active?: boolean; onClick: () => void; onMouseDown?: (e: React.MouseEvent) => void; disabled?: boolean; title: string }) => (
    <button type="button" title={title} onClick={onClick} onMouseDown={onMouseDown} disabled={disabled} className={ribbonBtnBase} style={ribbonBtnStyle(active)} aria-pressed={active}>
      {icon}
      <span className="text-[9px] font-medium uppercase tracking-wide leading-tight">{label}</span>
    </button>
  );

  // When unpinned and no context: show only a slim bar with thumbtack to pin
  if (!ribbonVisible) {
    return (
      <div
        className="h-9 border-b border-white/15 flex items-center justify-end px-3 z-40 shrink-0"
        style={{ background: ACCENT_BLUE_GRADIENT }}
        role="toolbar"
        aria-label="Ribbon pin"
      >
        <Tooltip content="Pin ribbon">
          <button
            type="button"
            onClick={props.onRibbonPinToggle}
            className={`${ribbonBtnBase} flex-row min-w-0 py-1 px-2`}
            style={{ background: 'transparent', color: TEXT_ON_BLUE }}
            aria-pressed={false}
          >
            <Pin size={14} />
            <span className="text-[9px] ml-1">Pin</span>
          </button>
        </Tooltip>
      </div>
    );
  }

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
    const pageId = currentPageId ?? pages[0]?.id;
    const w = 200;
    const h = 200;
    const pos = lastCanvasPosition && lastCanvasPosition.pageId === pageId ? lastCanvasPosition : null;
    if (pageId && pos) {
      addPanel(pageId, addPanelPayload(shape, pos.x - w / 2, pos.y - h / 2, w, h));
      return;
    }
    if (pageId) {
      const cx = 400;
      const cy = 600;
      addPanel(pageId, addPanelPayload(shape, cx - w / 2, cy - h / 2, w, h));
    }
  };

  const handleInsertImage = () => {
    const pageId = currentPageId ?? pages[0]?.id;
    if (!pageId) return;
    const page = pages.find(p => p.id === pageId);
    if (!page) return;
    const selectedPanelsInPage = page.panels.filter(p => selectedElementIds.includes(p.id));
    if (selectedPanelsInPage.length > 0) {
      selectedPanelsInPage.forEach(p => updatePanel(pageId, p.id, { imageUrl: PLACEHOLDER_IMAGE_URL }));
    } else {
      addPanel(pageId, { shapeType: 'rect', x: 50, y: 50, width: 300, height: 300, imageUrl: PLACEHOLDER_IMAGE_URL });
    }
  };

  const SplitIconH = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" /><line x1="3" y1="12" x2="21" y2="12" /></svg>;
  const SplitIconV = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" /><line x1="12" y1="3" x2="12" y2="21" /></svg>;
  const SplitIconSlantRow = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" /><line x1="3" y1="16" x2="21" y2="8" /></svg>;
  const SplitIconSlantCol = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" /><line x1="16" y1="3" x2="8" y2="21" /></svg>;

  return (
    <div
      className="min-h-[5rem] py-2 border-b border-white/15 flex items-center px-3 gap-2 flex-nowrap overflow-x-auto z-40 shrink-0"
      style={{ background: ACCENT_BLUE_GRADIENT }}
      role="toolbar"
      aria-label="Contextual ribbon"
    >
      {showPanelRibbon && (
        <div className="flex items-center gap-1.5 shrink-0">
          <RibbonButton label="Add Panel" icon={<Plus size={16} />} onClick={() => handleAddPanel('polygon')} title="Add rectangle at cursor or center" />
          <RibbonButton label="Add circle" icon={<Circle size={16} />} onClick={() => handleAddPanel('ellipse')} title="Add circle at cursor or center" />
          <RibbonButton label="Half" icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2 A10 10 0 0 1 22 12 L2 12 A10 10 0 0 1 12 2 Z" /></svg>} onClick={() => handleAddPanel('halfCircle')} title="Add half-circle at cursor or center" />
          <RibbonButton label="Quarter" icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 12 L22 12 A10 10 0 0 1 12 22 Z" /></svg>} onClick={() => handleAddPanel('quarterCircle')} title="Add quarter-circle at cursor or center" />
          <RibbonButton label="Sector" icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 12 L22 12 A10 10 0 0 1 16 20 Z" /></svg>} onClick={() => handleAddPanel('sector')} title="Add sector at cursor or center" />
          <RibbonButton label="Split H" icon={<SplitIconH />} onClick={() => selectedPanels.forEach(p => splitPanel(currentPageId!, p.id, 'horizontal', 0))} disabled={!selectedPanels.length} title={selectedPanels.length ? 'Split horizontal' : 'Select a panel'} />
          <RibbonButton label="Split V" icon={<SplitIconV />} onClick={() => selectedPanels.forEach(p => splitPanel(currentPageId!, p.id, 'vertical', 0))} disabled={!selectedPanels.length} title={selectedPanels.length ? 'Split vertical' : 'Select a panel'} />
          <RibbonButton label="Slant R" icon={<SplitIconSlantRow />} onClick={() => selectedPanels.forEach(p => splitPanel(currentPageId!, p.id, 'horizontal', 40))} disabled={!selectedPanels.length} title={selectedPanels.length ? 'Split slant row' : 'Select a panel'} />
          <RibbonButton label="Slant C" icon={<SplitIconSlantCol />} onClick={() => selectedPanels.forEach(p => splitPanel(currentPageId!, p.id, 'vertical', 40))} disabled={!selectedPanels.length} title={selectedPanels.length ? 'Split slant column' : 'Select a panel'} />
          <RibbonButton label="Knife" icon={<Scissors size={16} />} active={isKnifeMode} onClick={() => setKnifeMode(!isKnifeMode)} title={isKnifeMode ? 'Exit Knife' : 'Knife (split by line)'} />
          <RibbonButton label="Draw" icon={<Pencil size={16} />} active={isDrawingMode} onClick={() => toggleDrawingMode(!isDrawingMode)} title={isDrawingMode ? 'Exit Draw' : 'Draw'} />
          <RibbonButton
            label="Insert Image"
            icon={<ImagePlus size={16} />}
            onClick={handleInsertImage}
            onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); handleInsertImage(); }}
            title="Insert image into selected panel(s) or add new panel with image"
          />
        </div>
      )}

      {showBalloonRibbon && !showPanelRibbon && currentPageId && (
        <div className="flex-1 min-w-0 overflow-x-auto flex items-center">
          <BalloonRibbonContent
            currentPageId={currentPageId}
            selectedBalloonId={selectedTextId}
          />
        </div>
      )}

      {/* Text ribbon: one horizontal row, same height as File/Edit/View */}
      {showTextRibbon && (
        <div className="flex items-center flex-nowrap gap-2 min-w-0 flex-1 overflow-x-auto" style={{ color: TEXT_ON_BLUE }} data-ribbon="text" role="region" aria-label="Text ribbon">
          <TextToolbar
            variant="format-text"
            currentPageId={currentPageId ?? ''}
            selectedBubbleId={selectedTextId}
            textExpanded={props.balloonTextExpanded}
            shapeExpanded={props.balloonShapeExpanded}
            onTextExpandedChange={props.onBalloonTextExpandedChange}
            onShapeExpandedChange={props.onBalloonShapeExpandedChange}
          />
        </div>
      )}

      {/* Objects ribbon: one horizontal row, same height as File/Edit/View */}
      {showObjectsRibbon && (
        <div className="flex items-center flex-nowrap gap-2 min-w-0 flex-1 overflow-x-auto" style={{ color: TEXT_ON_BLUE }} data-ribbon="objects" role="region" aria-label="Objects ribbon">
          <ObjectToolbar currentPageId={currentPageId ?? ''} selectedElementIds={selectedElementIds} />
          {currentPageId && (
            <TextToolbar
              variant="format-objects"
              currentPageId={currentPageId}
              selectedBubbleId={selectedTextId}
              textExpanded={props.balloonTextExpanded}
              shapeExpanded={props.balloonShapeExpanded}
              onTextExpandedChange={props.onBalloonTextExpandedChange}
              onShapeExpandedChange={props.onBalloonShapeExpandedChange}
            />
          )}
        </div>
      )}

      {showViewRibbon && (
        <div className="flex items-center gap-2 shrink-0">
          <RibbonButton label="Zoom out" icon={<ZoomOut size={16} />} onClick={props.onZoomOut} title="Zoom out" />
          <Tooltip content="Zoom level">
            <button type="button" onClick={props.onZoomReset} className={`${ribbonBtnBase} min-w-[2.5rem]`} style={ribbonBtnStyle()}>{Math.round(props.zoomLevel * 100)}%</button>
          </Tooltip>
          <RibbonButton label="Zoom in" icon={<ZoomIn size={16} />} onClick={props.onZoomIn} title="Zoom in" />
          <RibbonButton label="Fit" icon={<Maximize2 size={16} />} onClick={props.onZoomFit} title="Fit to screen" />
          <div className="h-5 w-px bg-white/20 shrink-0" />
          <RibbonButton label="Webtoon" icon={<LayoutGrid size={16} />} active={props.layoutMode === 'webtoon'} onClick={() => props.onLayoutModeChange('webtoon')} title="Webtoon" />
          <RibbonButton label="Spread" icon={<Columns size={16} />} active={props.layoutMode === 'spread'} onClick={() => props.onLayoutModeChange('spread')} title="Spread" />
        </div>
      )}

      {showHomeRibbon && (
        <>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-[8px] font-bold uppercase tracking-wider opacity-70 px-1" style={{ color: TEXT_ON_BLUE }}>Revise</span>
            <RibbonButton label="Undo" icon={<Undo2 size={16} />} onClick={props.onUndo} onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); props.onUndo(); }} title="Undo" />
            <RibbonButton label="Redo" icon={<Redo2 size={16} />} onClick={props.onRedo} onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); props.onRedo(); }} title="Redo" />
          </div>
          {RIBBON_DIVIDER}
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-[8px] font-bold uppercase tracking-wider opacity-70 px-1" style={{ color: TEXT_ON_BLUE }}>Clipboard</span>
            <RibbonButton label="Copy" icon={<Copy size={16} />} onClick={props.onCopy} onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); props.onCopy(); }} title="Copy" />
            <RibbonButton label="Cut" icon={<Scissors size={16} />} onClick={props.onCut} onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); props.onCut(); }} title="Cut" />
            <RibbonButton label="Paste" icon={<Clipboard size={16} />} onClick={props.onPaste} onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); props.onPaste(); }} title="Paste" />
          </div>
          {RIBBON_DIVIDER}
          <div className="flex items-center gap-1.5 shrink-0" style={{ color: TEXT_ON_BLUE }}>
            <span className="text-[8px] font-bold uppercase tracking-wider opacity-70 px-1">Font</span>
            {props.hasBalloonSelected && selectedBalloons[0] && currentPageId ? (
              <>
                <div className="min-w-[90px]">
                  <FontSelect
                    value={selectedBalloons[0].overrides?.fontFamily ?? selectedBalloons[0].fontFamily}
                    onChange={(v) => updateBalloon(currentPageId, selectedBalloons[0].id, { overrides: { ...(selectedBalloons[0].overrides || {}), fontFamily: v } })}
                    compact
                    selectClassName="rounded border border-white/20 bg-black/30 px-1.5 py-1 text-[10px] text-white min-h-0"
                  />
                </div>
                <select
                  value={selectedBalloons[0].overrides?.fontSize ?? BALLOON_STYLES.find(s => s.id === selectedBalloons[0].styleId)?.fontSize ?? 16}
                  onChange={(e) => updateBalloon(currentPageId, selectedBalloons[0].id, { overrides: { ...(selectedBalloons[0].overrides || {}), fontSize: Number(e.target.value) } })}
                  className="w-12 rounded border border-white/20 bg-black/30 px-1 py-1 text-[10px] text-center"
                  style={{ color: TEXT_ON_BLUE }}
                  title="Font size"
                >
                  {[10, 12, 14, 16, 18, 20, 24, 28, 32, 36].map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
                <Tooltip content="Bold">
                  <button type="button" onClick={() => updateBalloon(currentPageId, selectedBalloons[0].id, { overrides: { ...(selectedBalloons[0].overrides || {}), fontWeight: (selectedBalloons[0].overrides?.fontWeight === 'bold' ? 'normal' : 'bold') } })} className={ribbonBtnBase} style={ribbonBtnStyle(selectedBalloons[0].overrides?.fontWeight === 'bold')}><Bold size={16} /></button>
                </Tooltip>
                <Tooltip content="Italic">
                  <button type="button" onClick={() => updateBalloon(currentPageId, selectedBalloons[0].id, { overrides: { ...(selectedBalloons[0].overrides || {}), fontStyle: (selectedBalloons[0].overrides?.fontStyle === 'italic' ? 'normal' : 'italic') } })} className={ribbonBtnBase} style={ribbonBtnStyle(selectedBalloons[0].overrides?.fontStyle === 'italic')}><Italic size={16} /></button>
                </Tooltip>
                <Tooltip content="Underline">
                  <button type="button" onClick={() => updateBalloon(currentPageId, selectedBalloons[0].id, { overrides: { ...(selectedBalloons[0].overrides || {}), textDecoration: (selectedBalloons[0].overrides?.textDecoration === 'underline' ? 'none' : 'underline') } })} className={ribbonBtnBase} style={ribbonBtnStyle(selectedBalloons[0].overrides?.textDecoration === 'underline')}><Underline size={16} /></button>
                </Tooltip>
              </>
            ) : (
              <span className="text-[9px] opacity-70 px-1">Select text</span>
            )}
          </div>
          {RIBBON_DIVIDER}
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-[8px] font-bold uppercase tracking-wider opacity-70 px-1" style={{ color: TEXT_ON_BLUE }}>Color</span>
            <RibbonButton
              label="Format"
              icon={<Palette size={16} />}
              onClick={() => props.onOpenFormatDialog?.(props.hasBalloonSelected ? 'text' : props.hasPanelSelected ? 'panel' : 'object', currentPageId ?? undefined, selectedTextId ?? undefined, selectedPanels[0]?.id)}
              title="Color / Format (opens dialog by selection)"
            />
          </div>
          {RIBBON_DIVIDER}
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-[8px] font-bold uppercase tracking-wider opacity-70 px-1" style={{ color: TEXT_ON_BLUE }}>Panels</span>
            <RibbonButton label="Add Square" icon={<Square size={16} />} onClick={() => handleAddPanel('polygon')} title="Add rectangle panel" />
            <RibbonButton label="Split H" icon={<SplitIconH />} onClick={() => selectedPanels.forEach(p => splitPanel(currentPageId!, p.id, 'horizontal', 0))} disabled={!selectedPanels.length} title={selectedPanels.length ? 'Split horizontal' : 'Select a panel'} />
            <RibbonButton label="Split V" icon={<SplitIconV />} onClick={() => selectedPanels.forEach(p => splitPanel(currentPageId!, p.id, 'vertical', 0))} disabled={!selectedPanels.length} title={selectedPanels.length ? 'Split vertical' : 'Select a panel'} />
          </div>
          {RIBBON_DIVIDER}
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-[8px] font-bold uppercase tracking-wider opacity-70 px-1" style={{ color: TEXT_ON_BLUE }}>Images</span>
            <RibbonButton label="Insert Image" icon={<ImagePlus size={16} />} onClick={handleInsertImage} onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); handleInsertImage(); }} title="Insert image" />
          </div>
          {RIBBON_DIVIDER}
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-[8px] font-bold uppercase tracking-wider opacity-70 px-1" style={{ color: TEXT_ON_BLUE }}>Balloons</span>
            {(['speech_round', 'speech_rounded_rectangle', 'thought_cloud'] as const).map((styleId) => {
              const style = BALLOON_STYLES.find(s => s.id === styleId);
              const label = style?.label ?? styleId;
              return (
                <RibbonButton
                  key={styleId}
                  label={label.replace(/ .*/, '')}
                  icon={<MessageCircle size={16} />}
                  onClick={() => {
                    const pageId = currentPageId ?? pages[0]?.id;
                    if (!pageId) return;
                    const pos = lastCanvasPosition?.pageId === pageId ? lastCanvasPosition : null;
                    const x = pos ? pos.x - 125 : 400; const y = pos ? pos.y - 75 : 600;
                    addBalloon(pageId, {
                      x, y, width: 250, height: 150,
                      hasTail: true, tailBasePoint: { x: 0, y: 0 }, tailTip: { x: -50, y: 100 },
                      styleId, text: '...',
                    });
                  }}
                  title={`Add ${label}`}
                />
              );
            })}
          </div>
          {RIBBON_DIVIDER}
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-[8px] font-bold uppercase tracking-wider opacity-70 px-1" style={{ color: TEXT_ON_BLUE }}>Layout</span>
            <RibbonButton label="Front" icon={<Layers size={16} />} onClick={() => currentPageId && selectedElementIds.forEach(id => bringToFront(currentPageId, id))} disabled={!selectedElementIds.length} title="Bring to front" />
            <RibbonButton label="Back" icon={<Layers size={16} />} onClick={() => currentPageId && selectedElementIds.forEach(id => sendToBack(currentPageId, id))} disabled={!selectedElementIds.length} title="Send to back" />
            <Tooltip content="Group (coming soon)">
              <button type="button" disabled className={ribbonBtnBase} style={{ ...ribbonBtnStyle(), opacity: 0.6 }}><BoxSelect size={16} /><span className="text-[9px]">Group</span></button>
            </Tooltip>
            <RibbonButton label="Clone" icon={<CopyPlus size={16} />} onClick={() => currentPageId && selectedElementIds.forEach(id => cloneElement(currentPageId, id))} disabled={!selectedElementIds.length} title="Clone" />
          </div>
          {RIBBON_DIVIDER}
          <div className="flex items-center gap-1.5 shrink-0">
            <RibbonButton label="Save" icon={<Save size={16} />} onClick={props.onSave} title="Save" />
            <RibbonButton label="PNG" icon={<ImageIcon size={16} />} onClick={props.onExportPng} title="Export PNG" />
            <RibbonButton label="PDF" icon={<FileDown size={16} />} onClick={props.onExportPdf} title="Export PDF" />
          </div>
        </>
      )}

      {showEditRibbon && (
        <div className="flex items-center gap-2 shrink-0">
          <RibbonButton label="Undo" icon={<Undo2 size={16} />} onClick={props.onUndo} onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); props.onUndo(); }} title="Undo" />
          <RibbonButton label="Redo" icon={<Redo2 size={16} />} onClick={props.onRedo} onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); props.onRedo(); }} title="Redo" />
        </div>
      )}

      <div className="ml-auto h-5 w-px bg-white/20 shrink-0" />
      <RibbonButton label={props.ribbonPinned ? 'Unpin' : 'Pin'} icon={props.ribbonPinned ? <PinOff size={16} /> : <Pin size={16} />} active={props.ribbonPinned} onClick={props.onRibbonPinToggle} title={props.ribbonPinned ? 'Unpin ribbon' : 'Pin ribbon'} />
    </div>
  );
};
