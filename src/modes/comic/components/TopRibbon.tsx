import React, { useRef, useEffect } from 'react';
import { Tooltip } from '../../../components/ui/Tooltip';
import {
  ChevronDown,
  ChevronUp,
  Undo2,
  Redo2,
  Palette,
  Save,
  Upload,
  Image as ImageIcon,
  FileDown,
  ZoomIn,
  ZoomOut,
  Maximize2,
  FileText,
} from 'lucide-react';

/** Phase 12: Royal Blue primary, Glitter Gold accent. Ribbon icons/outlines/dividers = #80aaff for visibility. */
import { PRIMARY_BG_FLAT, PRIMARY_BG_LIGHT, ACCENT_GOLD_GRADIENT, TEXT_ON_GOLD, SECONDARY_TEXT } from '../theme/Phase12DesignTokens';

const RIBBON_ACCENT = '#80aaff'; // icon color, button outline, vertical dividers
const iconButton = 'w-9 h-9 rounded-lg border flex items-center justify-center transition-colors top-ribbon-btn-pages';

export interface TopRibbonProps {
  collapsed: boolean;
  onToggleCollapse: () => void;

  onUndo: () => void;
  onRedo: () => void;

  isThemeOpen: boolean;
  onToggleTheme: () => void;
  themeLabel: string;
  themeDropdown: React.ReactNode;

  onSaveJson: () => void;
  onLoadJson: () => void;
  loadInputRef: React.RefObject<HTMLInputElement | null>;

  onExportPng: () => void;
  onExportPdf: () => void;

  zoomLevel: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomReset: () => void;
  onZoomFit: () => void;


  /** When a panel or balloon is selected, render this in the ribbon’s right-side gap (before Export PDF). */
  contextualSlot?: React.ReactNode;
}

export const TopRibbon: React.FC<TopRibbonProps> = (props) => {
  const {
    collapsed,
    onToggleCollapse,
    onUndo,
    onRedo,
    isThemeOpen,
    onToggleTheme,
    themeLabel,
    themeDropdown,
    onSaveJson,
    onLoadJson,
    loadInputRef,
    onExportPng,
    onExportPdf,
    zoomLevel,
    onZoomIn,
    onZoomOut,
    onZoomReset,
    onZoomFit,
    contextualSlot,
  } = props;

  const themeContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isThemeOpen) return;
    const handleMouseDown = (e: MouseEvent) => {
      if (themeContainerRef.current && !themeContainerRef.current.contains(e.target as Node)) {
        onToggleTheme();
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onToggleTheme();
    };
    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isThemeOpen, onToggleTheme]);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        .top-ribbon-btn-pages { border-color: #80aaff; }
        .top-ribbon-btn-pages:hover { background: linear-gradient(45deg, #bf953f 0%, #fcf6ba 45%, #b38728 70%, #fbf5b7 85%, #aa771c 100%) !important; color: #000 !important; }
      ` }} />
    <header
      className={`border-b flex items-stretch transition-all duration-200 relative z-30 ${
        collapsed ? 'h-12' : 'h-16'
      }`}
      style={{ background: PRIMARY_BG_FLAT, borderBottomColor: RIBBON_ACCENT }}
    >
      {/* Left: Collapse + Comic — icons/outlines/dividers #80aaff */}
      <div className="flex items-center gap-2 pl-3 pr-2 border-r" style={{ borderRightColor: RIBBON_ACCENT }}>
        <Tooltip content={collapsed ? 'Expand ribbon' : 'Collapse ribbon'}>
          <button
            type="button"
            onClick={onToggleCollapse}
            className={`w-9 h-9 rounded-lg border flex items-center justify-center transition-colors top-ribbon-btn-pages`}
            style={{ background: PRIMARY_BG_LIGHT, color: RIBBON_ACCENT, borderColor: RIBBON_ACCENT }}
            aria-label={collapsed ? 'Expand ribbon' : 'Collapse ribbon'}
          >
            {collapsed ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
          </button>
        </Tooltip>
        <Tooltip content="Comic workspace — current mode">
          <div className="w-7 h-7 rounded flex items-center justify-center shrink-0 top-ribbon-btn-pages border" style={{ background: PRIMARY_BG_LIGHT, color: RIBBON_ACCENT, borderColor: RIBBON_ACCENT }}>
            <FileText size={14} />
          </div>
        </Tooltip>
        {!collapsed && (
          <span className="text-xs font-semibold tracking-wider uppercase hidden sm:inline" style={{ color: SECONDARY_TEXT }}>
            Comic
          </span>
        )}
      </div>

      {!collapsed && (
        <>
          {/* Undo / Redo — #80aaff icons and outline */}
          <div className="flex items-center gap-1 pl-2 pr-2 border-r" style={{ borderRightColor: RIBBON_ACCENT }}>
            <Tooltip content="Undo (Cmd+Z)">
              <button type="button" onClick={onUndo} className={iconButton} style={{ background: PRIMARY_BG_LIGHT, color: RIBBON_ACCENT }} aria-label="Undo">
                <Undo2 size={16} />
              </button>
            </Tooltip>
            <Tooltip content="Redo (Cmd+Shift+Z)">
              <button type="button" onClick={onRedo} className={iconButton} style={{ background: PRIMARY_BG_LIGHT, color: RIBBON_ACCENT }} aria-label="Redo">
                <Redo2 size={16} />
              </button>
            </Tooltip>
          </div>

          {/* Theme — Gold when active; inactive = lighter blue + #80aaff text/outline */}
          <div ref={themeContainerRef} className="flex items-center pl-2 pr-2 border-r relative" style={{ borderRightColor: RIBBON_ACCENT }}>
            <Tooltip content="Studio theme & custom palette">
              <button
                type="button"
                onClick={onToggleTheme}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all border top-ribbon-btn-pages"
                style={isThemeOpen ? { background: ACCENT_GOLD_GRADIENT, color: TEXT_ON_GOLD } : { background: PRIMARY_BG_LIGHT, color: RIBBON_ACCENT, borderColor: RIBBON_ACCENT }}
                aria-label="Theme"
                aria-expanded={isThemeOpen}
              >
                <Palette size={14} className="shrink-0" />
                <span className="max-w-[64px] truncate">{themeLabel}</span>
              </button>
            </Tooltip>
            {isThemeOpen && themeDropdown}
          </div>

          {/* Save / Load — #80aaff icons and outline */}
          <div className="flex items-center gap-1 pl-2 pr-2 border-r" style={{ borderRightColor: RIBBON_ACCENT }}>
            <Tooltip content="Save project as JSON">
              <button type="button" onClick={onSaveJson} className={iconButton} style={{ background: PRIMARY_BG_LIGHT, color: RIBBON_ACCENT }} aria-label="Save JSON">
                <Save size={16} />
              </button>
            </Tooltip>
            <Tooltip content="Load project from JSON">
              <button type="button" onClick={onLoadJson} className={iconButton} style={{ background: PRIMARY_BG_LIGHT, color: RIBBON_ACCENT }} aria-label="Load JSON">
                <Upload size={16} />
              </button>
            </Tooltip>
            <input
              ref={loadInputRef}
              type="file"
              accept=".json"
              className="hidden"
              aria-hidden
            />
          </div>

          {/* Export — #80aaff icons and outline */}
          <div className="flex items-center gap-1 pl-2 pr-2 border-r" style={{ borderRightColor: RIBBON_ACCENT }}>
            <Tooltip content="Export current page as PNG (300 DPI)">
              <button type="button" onClick={onExportPng} className={iconButton} style={{ background: PRIMARY_BG_LIGHT, color: RIBBON_ACCENT }} aria-label="Export PNG">
                <ImageIcon size={16} />
              </button>
            </Tooltip>
            <Tooltip content="Export all pages as PDF (300 DPI)">
              <button type="button" onClick={onExportPdf} className={iconButton} style={{ background: PRIMARY_BG_LIGHT, color: RIBBON_ACCENT }} aria-label="Export PDF">
                <FileDown size={16} />
              </button>
            </Tooltip>
          </div>

          {/* Zoom — #80aaff icons and outline */}
          <div className="flex items-center gap-1 pl-2 pr-2 border-r" style={{ borderRightColor: RIBBON_ACCENT }}>
            <Tooltip content="Zoom out">
              <button type="button" onClick={onZoomOut} className={iconButton} style={{ background: PRIMARY_BG_LIGHT, color: RIBBON_ACCENT }} aria-label="Zoom out">
                <ZoomOut size={16} />
              </button>
            </Tooltip>
            <Tooltip content="Reset zoom to 100%">
              <button
                type="button"
                onClick={onZoomReset}
                className="min-w-[3rem] px-1.5 py-1.5 rounded text-xs font-mono border transition-colors top-ribbon-btn-pages"
                style={{ background: PRIMARY_BG_LIGHT, color: RIBBON_ACCENT }}
                aria-label="Reset zoom"
              >
                {Math.round(zoomLevel * 100)}%
              </button>
            </Tooltip>
            <Tooltip content="Zoom in">
              <button type="button" onClick={onZoomIn} className={iconButton} style={{ background: PRIMARY_BG_LIGHT, color: RIBBON_ACCENT }} aria-label="Zoom in">
                <ZoomIn size={16} />
              </button>
            </Tooltip>
            <Tooltip content="Fit page to screen">
              <button type="button" onClick={onZoomFit} className={iconButton} style={{ background: PRIMARY_BG_LIGHT, color: RIBBON_ACCENT }} aria-label="Fit to screen">
                <Maximize2 size={16} />
              </button>
            </Tooltip>
          </div>

          {/* Balloon/Object toolbar slot */}
          {contextualSlot && (
            <div className="flex-1 min-w-0 flex items-center justify-end gap-2 pl-2 pr-2 border-r overflow-x-auto overflow-y-hidden" style={{ borderRightColor: RIBBON_ACCENT }}>
              {contextualSlot}
            </div>
          )}

          {/* Export PDF — #80aaff text and outline; gold on hover */}
          <div className="flex items-center pl-2 pr-4 shrink-0">
            <Tooltip content="Export full comic as print PDF">
              <button
                type="button"
                onClick={onExportPdf}
                className="px-3 py-2 rounded-lg font-semibold text-xs uppercase tracking-wider transition-colors flex items-center gap-2 border top-ribbon-btn-pages"
                style={{ background: PRIMARY_BG_LIGHT, color: RIBBON_ACCENT, borderColor: RIBBON_ACCENT }}
                aria-label="Export PDF"
              >
                <FileDown size={14} />
                Export PDF
              </button>
            </Tooltip>
          </div>
        </>
      )}
    </header>
    </>
  );
};
