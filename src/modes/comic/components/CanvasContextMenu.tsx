import React, { useEffect, useRef } from 'react';
import { useComicStore } from '../../../stores/comicStore';
import { Type, Circle, Square, ClipboardPaste, Plus, MessageCircle, Trash2, ImagePlus } from 'lucide-react';
import { ACCENT_GOLD_GRADIENT } from '../theme/Phase12DesignTokens';

export type FormatDialogTab = 'text' | 'object' | 'panel' | 'image';

export interface CanvasContextMenuProps {
  onOpenFormatDialog: (tab: FormatDialogTab, pageId?: string | null, balloonId?: string | null, panelId?: string | null) => void;
}

export const CanvasContextMenu: React.FC<CanvasContextMenuProps> = ({ onOpenFormatDialog }) => {
  const { contextMenu, closeContextMenu, pasteClipboard, removeElement, addPanel, addBalloon, updatePanel } = useComicStore();
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!contextMenu.open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) closeContextMenu();
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeContextMenu();
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [contextMenu.open, closeContextMenu]);

  if (!contextMenu.open) return null;

  const itemClass =
    'w-full text-left px-3 py-2 text-xs flex items-center gap-2 rounded transition-colors text-[#001a4d] hover:bg-[#002366] hover:text-[#fcf6ba] disabled:opacity-50 active:scale-[0.99]';

  const handleFormat = (tab: FormatDialogTab) => {
    onOpenFormatDialog(tab, contextMenu.pageId, contextMenu.balloonId, contextMenu.panelId);
    closeContextMenu();
  };

  const handlePaste = () => {
    pasteClipboard();
    closeContextMenu();
  };

  const handleDelete = () => {
    if (contextMenu.pageId && (contextMenu.balloonId || contextMenu.panelId)) {
      removeElement(contextMenu.pageId, contextMenu.balloonId ?? contextMenu.panelId!);
    }
    closeContextMenu();
  };

  const handleAddPanel = () => {
    if (contextMenu.pageId) {
      const w = 200;
      const h = 200;
      const cx = contextMenu.pageLocalX ?? 100;
      const cy = contextMenu.pageLocalY ?? 100;
      addPanel(contextMenu.pageId, {
        shapeType: 'polygon',
        x: cx - w / 2,
        y: cy - h / 2,
        width: w,
        height: h,
        points: [{ x: 0, y: 0 }, { x: w, y: 0 }, { x: w, y: h }, { x: 0, y: h }],
      });
    }
    closeContextMenu();
  };

  const handleAddBalloon = () => {
    if (contextMenu.pageId) {
      addBalloon(contextMenu.pageId, {
        x: 400,
        y: 600,
        width: 250,
        height: 150,
        hasTail: true,
        tailBasePoint: { x: 0, y: 0 },
        tailTip: { x: -50, y: 100 },
        styleId: 'speech_rounded_rectangle',
        text: 'Text...',
      });
    }
    closeContextMenu();
  };

  return (
    <div
      ref={menuRef}
      className="fixed z-[200] min-w-[200px] rounded-lg shadow-2xl border border-white/15 overflow-hidden py-1"
      style={{ left: contextMenu.x, top: contextMenu.y, background: ACCENT_GOLD_GRADIENT }}
      role="menu"
      aria-label="Canvas context menu"
    >
      {contextMenu.context === 'balloon' && (
        <>
          <button type="button" onClick={() => handleFormat('text')} className={itemClass}>
            <Type size={12} /> Format text…
          </button>
          <button type="button" onClick={() => handleFormat('object')} className={itemClass}>
            <Circle size={12} /> Format balloon…
          </button>
          <div className="my-1 border-t border-white/15" />
          <button type="button" onClick={handleDelete} className={itemClass}>
            <Trash2 size={12} /> Delete
          </button>
        </>
      )}
      {contextMenu.context === 'panel' && contextMenu.pageId && contextMenu.panelId && (
        <>
          <button type="button" onClick={() => handleFormat('panel')} className={itemClass}>
            <Square size={12} /> Format panel…
          </button>
          <button type="button" onClick={() => handleFormat('image')} className={itemClass}>
            <ImagePlus size={12} /> Insert image…
          </button>
          <div className="my-1 border-t border-white/15" />
          <div className="px-3 py-1 text-[10px] font-bold uppercase opacity-70 text-[#001a4d]">Change shape</div>
          <button type="button" onClick={() => { updatePanel(contextMenu.pageId!, contextMenu.panelId!, { shapeType: 'rect' }); closeContextMenu(); }} className={itemClass}>Rectangle</button>
          <button type="button" onClick={() => { updatePanel(contextMenu.pageId!, contextMenu.panelId!, { shapeType: 'ellipse' }); closeContextMenu(); }} className={itemClass}>Circle / Ellipse</button>
          <button type="button" onClick={() => { updatePanel(contextMenu.pageId!, contextMenu.panelId!, { shapeType: 'halfCircle' }); closeContextMenu(); }} className={itemClass}>Half-circle</button>
          <button type="button" onClick={() => { updatePanel(contextMenu.pageId!, contextMenu.panelId!, { shapeType: 'quarterCircle' }); closeContextMenu(); }} className={itemClass}>Quarter-circle</button>
          <button type="button" onClick={() => { updatePanel(contextMenu.pageId!, contextMenu.panelId!, { shapeType: 'sector', centralAngle: 90 }); closeContextMenu(); }} className={itemClass}>Sector</button>
          <div className="my-1 border-t border-white/15" />
          <button type="button" onClick={handleDelete} className={itemClass}>
            <Trash2 size={12} /> Delete
          </button>
        </>
      )}
      {contextMenu.context === 'empty' && (
        <>
          <button type="button" onClick={() => handleFormat('text')} className={itemClass}>
            <Type size={12} /> Format text…
          </button>
          <button type="button" onClick={() => handleFormat('object')} className={itemClass}>
            <Circle size={12} /> Format object…
          </button>
          <button type="button" onClick={() => handleFormat('image')} className={itemClass}>
            <ImagePlus size={12} /> Insert image…
          </button>
          <div className="my-1 border-t border-white/15" />
          <button type="button" onClick={handlePaste} className={itemClass}>
            <ClipboardPaste size={12} /> Paste
          </button>
          {contextMenu.pageId && (
            <>
              <div className="my-1 border-t border-white/15" />
              <button type="button" onClick={handleAddPanel} className={itemClass}>
                <Plus size={12} /> Add panel
              </button>
              <button type="button" onClick={handleAddBalloon} className={itemClass}>
                <MessageCircle size={12} /> Add balloon
              </button>
            </>
          )}
        </>
      )}
    </div>
  );
};
