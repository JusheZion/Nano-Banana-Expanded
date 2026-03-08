import React, { useState, useRef, useEffect } from 'react';
import { FileText, ChevronDown, Palette, LayoutGrid, Columns } from 'lucide-react';
import { Tooltip } from '../../../components/ui/Tooltip';
import {
  PRIMARY_BG_FLAT,
  PRIMARY_BG_LIGHT,
  ACCENT_GOLD_GRADIENT,
  TEXT_ON_GOLD,
  TEXT_ON_BLUE,
} from '../theme/Phase12DesignTokens';

const MENU_ACCENT = '#80aaff';

export interface ApplicationMenuProps {
  onSave: () => void;
  onLoad: () => void;
  onExportPng: () => void;
  onExportPdf: () => void;
  onThemeClick: () => void;
  themeLabel: string;
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
}

export const ApplicationMenu: React.FC<ApplicationMenuProps> = (props) => {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open]);

  const menuItem = (label: string, shortcut?: string, onClick?: () => void, disabled?: boolean) => (
    <button
      type="button"
      onClick={() => {
        onClick?.();
        setOpen(false);
      }}
      disabled={disabled}
      className="w-full text-left px-3 py-2 text-sm flex items-center justify-between gap-4 rounded hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
      style={{ color: TEXT_ON_BLUE }}
    >
      <span>{label}</span>
      {shortcut && <span className="text-xs opacity-70 font-mono">{shortcut}</span>}
    </button>
  );

  return (
    <div ref={menuRef} className="relative flex items-stretch">
      <Tooltip content="Comic — File, Edit, View">
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="h-12 px-4 flex items-center gap-2 border-r transition-colors rounded-none"
          style={{
            background: open ? ACCENT_GOLD_GRADIENT : PRIMARY_BG_LIGHT,
            color: open ? TEXT_ON_GOLD : MENU_ACCENT,
            borderColor: MENU_ACCENT,
          }}
          aria-expanded={open}
          aria-haspopup="true"
          aria-label="Application menu"
        >
          <FileText size={20} />
          <span className="font-semibold text-sm uppercase tracking-wider hidden sm:inline">Comic</span>
          <ChevronDown size={16} className={open ? 'rotate-180' : ''} />
        </button>
      </Tooltip>

      {open && (
        <div
          className="absolute top-full left-0 mt-0 min-w-[220px] rounded-b-lg shadow-2xl border border-white/10 overflow-hidden z-[100]"
          style={{ background: PRIMARY_BG_FLAT }}
        >
          <div className="py-1">
            {/* File */}
            <div className="px-2 pt-2 pb-1">
              <div className="text-[10px] font-bold uppercase tracking-widest px-2 mb-1 opacity-70" style={{ color: TEXT_ON_BLUE }}>File</div>
              {menuItem('Open…', '⌘O', props.onLoad)}
              {menuItem('Save', '⌘S', props.onSave)}
              <div className="my-1 border-t border-white/10" />
              {menuItem('Export as PNG', undefined, props.onExportPng)}
              {menuItem('Export as PDF', undefined, props.onExportPdf)}
              <div className="my-1 border-t border-white/10" />
              <button
                type="button"
                onClick={() => {
                  props.onThemeClick();
                  setOpen(false);
                }}
                className="w-full text-left px-3 py-2 text-sm flex items-center justify-between gap-4 rounded hover:bg-white/10"
                style={{ color: TEXT_ON_BLUE }}
              >
                <span>Theme / Studio look</span>
                <Palette size={14} />
              </button>
              <div className="text-[10px] px-2 mt-1 opacity-60 truncate" style={{ color: TEXT_ON_BLUE }}>{props.themeLabel}</div>
            </div>
            {/* Edit */}
            <div className="px-2 pt-2 pb-1">
              <div className="text-[10px] font-bold uppercase tracking-widest px-2 mb-1 opacity-70" style={{ color: TEXT_ON_BLUE }}>Edit</div>
              {menuItem('Undo', '⌘Z', props.onUndo)}
              {menuItem('Redo', '⌘⇧Z', props.onRedo)}
              <div className="my-1 border-t border-white/10" />
              {menuItem('Cut', '⌘X', props.onCut)}
              {menuItem('Copy', '⌘C', props.onCopy)}
              {menuItem('Paste', '⌘V', props.onPaste)}
            </div>
            {/* View */}
            <div className="px-2 pt-2 pb-2">
              <div className="text-[10px] font-bold uppercase tracking-widest px-2 mb-1 opacity-70" style={{ color: TEXT_ON_BLUE }}>View</div>
              {menuItem('Zoom In', undefined, props.onZoomIn)}
              {menuItem('Zoom Out', undefined, props.onZoomOut)}
              {menuItem('Reset 100%', undefined, props.onZoomReset)}
              {menuItem('Fit to screen', undefined, props.onZoomFit)}
              <div className="my-1 border-t border-white/10" />
              <div className="px-2 py-1.5 text-[10px] font-bold uppercase tracking-widest opacity-70" style={{ color: TEXT_ON_BLUE }}>Layout</div>
              <button
                type="button"
                onClick={() => { props.onLayoutModeChange('webtoon'); setOpen(false); }}
                className="w-full text-left px-3 py-2 text-sm flex items-center gap-2 rounded hover:bg-white/10"
                style={{ color: props.layoutMode === 'webtoon' ? undefined : TEXT_ON_BLUE, background: props.layoutMode === 'webtoon' ? 'rgba(252,246,186,0.15)' : undefined }}
              >
                <LayoutGrid size={14} />
                Webtoon
              </button>
              <button
                type="button"
                onClick={() => { props.onLayoutModeChange('spread'); setOpen(false); }}
                className="w-full text-left px-3 py-2 text-sm flex items-center gap-2 rounded hover:bg-white/10"
                style={{ color: props.layoutMode === 'spread' ? undefined : TEXT_ON_BLUE, background: props.layoutMode === 'spread' ? 'rgba(252,246,186,0.15)' : undefined }}
              >
                <Columns size={14} />
                Spread
              </button>
              <div className="px-2 pt-1 text-[10px] opacity-60" style={{ color: TEXT_ON_BLUE }}>{Math.round(props.zoomLevel * 100)}%</div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
