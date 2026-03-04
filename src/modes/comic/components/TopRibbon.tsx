import React from 'react';
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
  Library,
  Layers,
  LayoutGrid,
  Settings,
  FileText,
} from 'lucide-react';

/** Obsidian Tech design: #0F0F12 bg, #1A1A1E surface, #00D1FF accent */
const ribbonBg = 'bg-[#0F0F12]';
const surface = 'bg-[#1A1A1E]';
const border = 'border-white/[0.08]';
const accentHover = 'hover:text-[#00D1FF] hover:bg-[#00D1FF]/10';
const iconButton = `w-9 h-9 rounded-lg ${surface} ${border} border flex items-center justify-center text-white/80 transition-colors ${accentHover}`;
const iconButtonActive = 'text-[#00D1FF] bg-[#00D1FF]/15 border-[#00D1FF]/40';

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

  isLibraryOpen: boolean;
  onToggleLibrary: () => void;
  isLayersOpen: boolean;
  onToggleLayers: () => void;
  isPagesOpen: boolean;
  onTogglePages: () => void;
  isSettingsOpen: boolean;
  onToggleSettings: () => void;

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
    isLibraryOpen,
    onToggleLibrary,
    isLayersOpen,
    onToggleLayers,
    isPagesOpen,
    onTogglePages,
    isSettingsOpen,
    onToggleSettings,
    contextualSlot,
  } = props;

  return (
    <header
      className={`${ribbonBg} border-b ${border} flex items-stretch transition-all duration-200 relative z-30 ${
        collapsed ? 'h-12' : 'h-16'
      }`}
    >
      {/* Left: Brand + Collapse */}
      <div className="flex items-center gap-2 pl-3 pr-2 border-r border-white/[0.08]">
        <Tooltip content={collapsed ? 'Expand ribbon' : 'Collapse ribbon'}>
          <button
            type="button"
            onClick={onToggleCollapse}
            className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${accentHover}`}
            aria-label={collapsed ? 'Expand ribbon' : 'Collapse ribbon'}
          >
            {collapsed ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
          </button>
        </Tooltip>
        <div className="w-7 h-7 rounded bg-[#00D1FF]/20 border border-[#00D1FF]/40 flex items-center justify-center shrink-0">
          <FileText size={14} className="text-[#00D1FF]" />
        </div>
        {!collapsed && (
          <span className="text-xs font-semibold tracking-wider text-white/90 uppercase hidden sm:inline">
            Comic
          </span>
        )}
      </div>

      {!collapsed && (
        <>
          {/* Undo / Redo */}
          <div className="flex items-center gap-1 pl-2 pr-2 border-r border-white/[0.08]">
            <Tooltip content="Undo (Cmd+Z)">
              <button type="button" onClick={onUndo} className={iconButton} aria-label="Undo">
                <Undo2 size={16} />
              </button>
            </Tooltip>
            <Tooltip content="Redo (Cmd+Shift+Z)">
              <button type="button" onClick={onRedo} className={iconButton} aria-label="Redo">
                <Redo2 size={16} />
              </button>
            </Tooltip>
          </div>

          {/* Theme */}
          <div className="flex items-center pl-2 pr-2 border-r border-white/[0.08] relative">
            <Tooltip content="Studio theme & custom palette">
              <button
                type="button"
                onClick={onToggleTheme}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all border ${surface} ${border} ${
                  isThemeOpen ? iconButtonActive : `text-white/80 ${accentHover}`
                }`}
                aria-label="Theme"
                aria-expanded={isThemeOpen}
              >
                <Palette size={14} className="shrink-0" />
                <span className="max-w-[64px] truncate">{themeLabel}</span>
              </button>
            </Tooltip>
            {isThemeOpen && themeDropdown}
          </div>

          {/* Save / Load */}
          <div className="flex items-center gap-1 pl-2 pr-2 border-r border-white/[0.08]">
            <Tooltip content="Save project as JSON">
              <button type="button" onClick={onSaveJson} className={iconButton} aria-label="Save JSON">
                <Save size={16} />
              </button>
            </Tooltip>
            <Tooltip content="Load project from JSON">
              <button type="button" onClick={onLoadJson} className={iconButton} aria-label="Load JSON">
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

          {/* Export */}
          <div className="flex items-center gap-1 pl-2 pr-2 border-r border-white/[0.08]">
            <Tooltip content="Export current page as PNG (300 DPI)">
              <button type="button" onClick={onExportPng} className={iconButton} aria-label="Export PNG">
                <ImageIcon size={16} />
              </button>
            </Tooltip>
            <Tooltip content="Export all pages as PDF (300 DPI)">
              <button type="button" onClick={onExportPdf} className={iconButton} aria-label="Export PDF">
                <FileDown size={16} />
              </button>
            </Tooltip>
          </div>

          {/* Zoom */}
          <div className="flex items-center gap-1 pl-2 pr-2 border-r border-white/[0.08]">
            <Tooltip content="Zoom out">
              <button type="button" onClick={onZoomOut} className={iconButton} aria-label="Zoom out">
                <ZoomOut size={16} />
              </button>
            </Tooltip>
            <Tooltip content="Reset zoom to 100%">
              <button
                type="button"
                onClick={onZoomReset}
                className="min-w-[3rem] px-1.5 py-1.5 rounded text-xs font-mono text-[#00D1FF] hover:bg-[#00D1FF]/10 border border-transparent hover:border-[#00D1FF]/30 transition-colors"
                aria-label="Reset zoom"
              >
                {Math.round(zoomLevel * 100)}%
              </button>
            </Tooltip>
            <Tooltip content="Zoom in">
              <button type="button" onClick={onZoomIn} className={iconButton} aria-label="Zoom in">
                <ZoomIn size={16} />
              </button>
            </Tooltip>
            <Tooltip content="Fit page to screen">
              <button type="button" onClick={onZoomFit} className={iconButton} aria-label="Fit to screen">
                <Maximize2 size={16} />
              </button>
            </Tooltip>
          </div>

          {/* Library, Layers, Pages, Settings */}
          <div className="flex items-center gap-1 pl-2 pr-2 border-r border-white/[0.08]">
            <Tooltip content={isLibraryOpen ? 'Close Library' : 'Open Library'}>
              <button
                type="button"
                onClick={onToggleLibrary}
                className={`${iconButton} ${isLibraryOpen ? iconButtonActive : ''}`}
                aria-label="Library"
                aria-pressed={isLibraryOpen}
              >
                <Library size={16} />
              </button>
            </Tooltip>
            <Tooltip content={isLayersOpen ? 'Close Layers' : 'Layers'}>
              <button
                type="button"
                onClick={onToggleLayers}
                className={`${iconButton} ${isLayersOpen ? iconButtonActive : ''}`}
                aria-label="Layers"
                aria-pressed={isLayersOpen}
              >
                <Layers size={16} />
              </button>
            </Tooltip>
            <Tooltip content={isPagesOpen ? 'Close Pages' : 'Pages'}>
              <button
                type="button"
                onClick={onTogglePages}
                className={`${iconButton} ${isPagesOpen ? iconButtonActive : ''}`}
                aria-label="Pages"
                aria-pressed={isPagesOpen}
              >
                <LayoutGrid size={16} />
              </button>
            </Tooltip>
            <Tooltip content={isSettingsOpen ? 'Close Settings' : 'Project Settings'}>
              <button
                type="button"
                onClick={onToggleSettings}
                className={`${iconButton} ${isSettingsOpen ? iconButtonActive : ''}`}
                aria-label="Settings"
                aria-pressed={isSettingsOpen}
              >
                <Settings size={16} />
              </button>
            </Tooltip>
          </div>

          {/* Balloon/Object toolbar slot — font, size, auto-fit, Text/Shape icon buttons only */}
          {contextualSlot && (
            <div className="flex-1 min-w-0 flex items-center justify-end gap-2 pl-2 pr-2 border-r border-white/[0.08] overflow-x-auto overflow-y-hidden">
              {contextualSlot}
            </div>
          )}

          {/* Primary CTA: Export PDF */}
          <div className="flex items-center pl-2 pr-4 shrink-0">
            <Tooltip content="Export full comic as print PDF">
              <button
                type="button"
                onClick={onExportPdf}
                className="px-3 py-2 rounded-lg bg-[#00D1FF]/20 text-[#00D1FF] border border-[#00D1FF]/40 font-semibold text-xs uppercase tracking-wider hover:bg-[#00D1FF]/30 transition-colors flex items-center gap-2"
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
  );
};
