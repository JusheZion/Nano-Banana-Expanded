import React, { useEffect, useRef } from 'react';
import { useComicStore } from '../../../stores/comicStore';
import { Type, Circle, Square, ClipboardPaste, Plus, MessageCircle, Trash2, ImagePlus, BoxSelect } from 'lucide-react';
import { elementsOverlapOrNear } from '../utils/snapping';
import { ACCENT_GOLD_GRADIENT } from '../theme/Phase12DesignTokens';
import type { FormatDialogTabId } from './FormatDialog';
import { useShallow } from 'zustand/react/shallow';

export interface CanvasContextMenuProps {
  onOpenFormatDialog: (tab: FormatDialogTabId, pageId?: string | null, balloonId?: string | null, panelId?: string | null) => void;
}

export const CanvasContextMenu: React.FC<CanvasContextMenuProps> = ({ onOpenFormatDialog }) => {
  const {
    contextMenu,
    closeContextMenu,
    pasteClipboard,
    removeElement,
    addPanel,
    addBalloon,
    updatePanel,
    pages,
    currentPageId,
    selectedElementIds,
    createGroup,
    ungroup,
    getGroupMembers,
  } = useComicStore(
    useShallow((s) => ({
      contextMenu: s.contextMenu,
      closeContextMenu: s.closeContextMenu,
      pasteClipboard: s.pasteClipboard,
      removeElement: s.removeElement,
      addPanel: s.addPanel,
      addBalloon: s.addBalloon,
      updatePanel: s.updatePanel,
      pages: s.pages,
      currentPageId: s.currentPageId,
      selectedElementIds: s.selectedElementIds,
      createGroup: s.createGroup,
      ungroup: s.ungroup,
      getGroupMembers: s.getGroupMembers,
    })),
  );
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

  const handleFormat = (tab: FormatDialogTabId) => {
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

  const handleInsertTextBox = () => {
    if (contextMenu.pageId) {
      const pageW = 800, pageH = 1200, bw = 250, bh = 150;
      const raw = contextMenu.pageLocalX != null && contextMenu.pageLocalY != null
        ? { x: contextMenu.pageLocalX - bw / 2, y: contextMenu.pageLocalY - bh / 2 }
        : { x: 400, y: 600 };
      const x = Math.max(0, Math.min(pageW - bw, raw.x));
      const y = Math.max(0, Math.min(pageH - bh, raw.y));
      addBalloon(contextMenu.pageId, {
        x,
        y,
        width: bw,
        height: bh,
        hasTail: false,
        tailBasePoint: { x: 0, y: 0 },
        tailTip: { x: 0, y: 0 },
        styleId: 'floating_text',
        text: 'Text...',
      });
    }
    closeContextMenu();
  };

  const currentPage = pages.find(p => p.id === currentPageId);
  const canShowGroup = currentPage && selectedElementIds.length >= 2 && elementsOverlapOrNear(currentPage, selectedElementIds);
  const groupOfFirst = currentPageId && selectedElementIds[0] ? getGroupMembers(currentPageId, selectedElementIds[0]) : null;
  const canShowUngroup = !!(currentPageId && selectedElementIds.length === 1 && groupOfFirst && groupOfFirst.length >= 2);

  return (
    <div
      ref={menuRef}
      className="fixed z-[200] min-w-[200px] rounded-lg shadow-2xl border border-white/15 overflow-hidden py-1"
      style={{ left: contextMenu.x, top: contextMenu.y, background: ACCENT_GOLD_GRADIENT }}
      role="menu"
      aria-label="Canvas context menu"
    >
      {(canShowGroup || canShowUngroup) && (
        <>
          {canShowGroup && (
            <button type="button" onClick={() => { currentPageId && createGroup(currentPageId, selectedElementIds); closeContextMenu(); }} className={itemClass}>
              <BoxSelect size={12} /> Group
            </button>
          )}
          {canShowUngroup && (
            <button type="button" onClick={() => { currentPageId && selectedElementIds[0] && ungroup(currentPageId, selectedElementIds[0]); closeContextMenu(); }} className={itemClass}>
              <BoxSelect size={12} /> Ungroup
            </button>
          )}
          <div className="my-1 border-t border-white/15" />
        </>
      )}
      {contextMenu.context === 'balloon' && (
        <>
          <button type="button" onClick={() => handleFormat('textBox')} className={itemClass}>
            <Type size={12} /> Format text…
          </button>
          <button type="button" onClick={() => handleFormat('fillLine')} className={itemClass}>
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
          <button type="button" onClick={() => handleFormat('fillLine')} className={itemClass}>
            <Square size={12} /> Format panel…
          </button>
          <button type="button" onClick={() => handleFormat('sizeProperties')} className={itemClass}>
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
          <button type="button" onClick={() => handleFormat('textBox')} className={itemClass}>
            <Type size={12} /> Format text…
          </button>
          <button type="button" onClick={() => handleFormat('fillLine')} className={itemClass}>
            <Circle size={12} /> Format object…
          </button>
          <button type="button" onClick={() => handleFormat('sizeProperties')} className={itemClass}>
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
              <button type="button" onClick={handleInsertTextBox} className={itemClass}>
                <Type size={12} /> Insert Text Box
              </button>
            </>
          )}
        </>
      )}
    </div>
  );
};
