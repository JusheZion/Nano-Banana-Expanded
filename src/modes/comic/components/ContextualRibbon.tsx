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
  Scissors,
  Pencil,
  ImagePlus,
  Pin,
  PinOff,
} from 'lucide-react';
import type { MenuId } from './MenuBar';
import {
  ACCENT_BLUE_GRADIENT,
  ACCENT_GOLD_GRADIENT,
  TEXT_ON_GOLD,
  TEXT_ON_BLUE,
} from '../theme/Phase12DesignTokens';

const PLACEHOLDER_IMAGE_URL = 'https://via.placeholder.com/150';

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
  /** Optional: switch active menu from ribbon (e.g. Format → Text/Objects) */
  onActiveMenuChange?: (id: MenuId) => void;
}

export const ContextualRibbon: React.FC<ContextualRibbonProps> = (props) => {
  const {
    pages,
    currentPageId,
    selectedElementIds,
    addPanel,
    updatePanel,
    setKnifeMode,
    isKnifeMode,
    toggleDrawingMode,
    isDrawingMode,
    splitPanel,
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
  const showFileRibbon = props.activeMenu === 'file';
  const showEditRibbon = props.activeMenu === 'edit';
  const hasContext = props.activeMenu != null || props.hasPanelSelected || props.hasBalloonSelected;
  const showPanelRibbon = (props.activeMenu === 'panel') || (props.activeMenu === null && (props.hasPanelSelected || (props.ribbonPinned && !hasContext)));
  const showBalloonRibbon = (props.activeMenu === 'balloon' || (props.activeMenu === null && props.hasBalloonSelected)) && !showPanelRibbon;

  const ribbonVisible =
    props.ribbonPinned ||
    hasContext ||
    showTextRibbon ||
    showObjectsRibbon;

  const ribbonBtnBase = 'rounded-lg border border-white/20 flex flex-col items-center justify-center gap-0.5 py-1.5 px-2 min-w-[2.5rem] transition-all duration-150 shrink-0 hover:bg-[linear-gradient(45deg,#bf953f_0%,#fcf6ba_45%,#b38728_70%,#fbf5b7_85%,#aa771c_100%)] hover:text-[#000000] hover:border-white/30 active:scale-[0.98] active:shadow-inner';
  const ribbonBtnStyle = (active?: boolean) =>
    active ? { background: ACCENT_GOLD_GRADIENT, color: TEXT_ON_GOLD } : { background: 'transparent', color: TEXT_ON_BLUE };
  const RibbonButton = ({ label, icon, active, onClick, disabled, title }: { label: string; icon: React.ReactNode; active?: boolean; onClick: () => void; disabled?: boolean; title: string }) => (
    <Tooltip content={title}>
      <button type="button" onClick={onClick} disabled={disabled} className={ribbonBtnBase} style={ribbonBtnStyle(active)} aria-pressed={active}>
        {icon}
        <span className="text-[9px] font-medium uppercase tracking-wide leading-tight">{label}</span>
      </button>
    </Tooltip>
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

  const handleAddPanel = () => {
    if (!currentPage) return;
    setKnifeMode(false);
    addPanel(currentPage.id, {
      shapeType: 'polygon',
      x: 100, y: 100, width: 200, height: 200,
      points: [{ x: 0, y: 0 }, { x: 200, y: 0 }, { x: 200, y: 200 }, { x: 0, y: 200 }],
    });
  };

  const handleInsertImage = () => {
    pages.forEach(page => {
      page.panels.filter(p => selectedElementIds.includes(p.id)).forEach(p =>
        updatePanel(page.id, p.id, { imageUrl: PLACEHOLDER_IMAGE_URL }));
    });
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
          <RibbonButton label="Add Panel" icon={<Plus size={16} />} onClick={handleAddPanel} title="Add Panel" />
          <RibbonButton label="Split H" icon={<SplitIconH />} onClick={() => selectedPanels.forEach(p => splitPanel(currentPageId!, p.id, 'horizontal', 0))} disabled={!selectedPanels.length} title={selectedPanels.length ? 'Split horizontal' : 'Select a panel'} />
          <RibbonButton label="Split V" icon={<SplitIconV />} onClick={() => selectedPanels.forEach(p => splitPanel(currentPageId!, p.id, 'vertical', 0))} disabled={!selectedPanels.length} title={selectedPanels.length ? 'Split vertical' : 'Select a panel'} />
          <RibbonButton label="Slant R" icon={<SplitIconSlantRow />} onClick={() => selectedPanels.forEach(p => splitPanel(currentPageId!, p.id, 'horizontal', 40))} disabled={!selectedPanels.length} title={selectedPanels.length ? 'Split slant row' : 'Select a panel'} />
          <RibbonButton label="Slant C" icon={<SplitIconSlantCol />} onClick={() => selectedPanels.forEach(p => splitPanel(currentPageId!, p.id, 'vertical', 40))} disabled={!selectedPanels.length} title={selectedPanels.length ? 'Split slant column' : 'Select a panel'} />
          <RibbonButton label="Knife" icon={<Scissors size={16} />} active={isKnifeMode} onClick={() => setKnifeMode(!isKnifeMode)} title={isKnifeMode ? 'Exit Knife' : 'Knife (split by line)'} />
          <RibbonButton label="Draw" icon={<Pencil size={16} />} active={isDrawingMode} onClick={() => toggleDrawingMode(!isDrawingMode)} title={isDrawingMode ? 'Exit Draw' : 'Draw'} />
          <RibbonButton label="Insert Image" icon={<ImagePlus size={16} />} onClick={handleInsertImage} disabled={!selectedElementIds.length} title="Insert image into selected panel(s)" />
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

      {showFileRibbon && (
        <div className="flex items-center gap-2 shrink-0">
          <RibbonButton label="Save" icon={<Save size={16} />} onClick={props.onSave} title="Save" />
          <RibbonButton label="PNG" icon={<ImageIcon size={16} />} onClick={props.onExportPng} title="Export PNG" />
          <RibbonButton label="PDF" icon={<FileDown size={16} />} onClick={props.onExportPdf} title="Export PDF" />
        </div>
      )}

      {showEditRibbon && (
        <div className="flex items-center gap-2 shrink-0">
          <RibbonButton label="Undo" icon={<Undo2 size={16} />} onClick={props.onUndo} title="Undo" />
          <RibbonButton label="Redo" icon={<Redo2 size={16} />} onClick={props.onRedo} title="Redo" />
        </div>
      )}

      <div className="ml-auto h-5 w-px bg-white/20 shrink-0" />
      <RibbonButton label={props.ribbonPinned ? 'Unpin' : 'Pin'} icon={props.ribbonPinned ? <PinOff size={16} /> : <Pin size={16} />} active={props.ribbonPinned} onClick={props.onRibbonPinToggle} title={props.ribbonPinned ? 'Unpin ribbon' : 'Pin ribbon'} />
    </div>
  );
};
