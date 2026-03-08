import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useComicStore } from '../../../stores/comicStore';
import { FontSelect } from './FontSelect';
import { X } from 'lucide-react';
import { ACCENT_BLUE_GRADIENT, TEXT_ON_BLUE } from '../theme/Phase12DesignTokens';

export type FormatDialogTabId = 'text' | 'object' | 'panel';

export interface FormatDialogProps {
  open: boolean;
  onClose: () => void;
  initialTab?: FormatDialogTabId;
  pageId?: string | null;
  balloonId?: string | null;
  panelId?: string | null;
}

const TABS: { id: FormatDialogTabId; label: string }[] = [
  { id: 'text', label: 'Text' },
  { id: 'object', label: 'Object' },
  { id: 'panel', label: 'Panel' },
];

export const FormatDialog: React.FC<FormatDialogProps> = ({
  open,
  onClose,
  initialTab = 'text',
  pageId: propPageId,
  balloonId: propBalloonId,
  panelId: _propPanelId,
}) => {
  const { pages, currentPageId, selectedElementIds, updateBalloon } = useComicStore();
  const [activeTab, setActiveTab] = React.useState<FormatDialogTabId>(initialTab);

  const page = propPageId
    ? pages.find((p) => p.id === propPageId)
    : pages.find((p) => p.id === currentPageId);
  const targetBalloonId = propBalloonId ?? page?.balloons?.find((b) => selectedElementIds.includes(b.id))?.id;
  const balloon = page && targetBalloonId ? page.balloons?.find((b) => b.id === targetBalloonId) : null;

  useEffect(() => {
    if (open) setActiveTab(initialTab);
  }, [open, initialTab]);

  useEffect(() => {
    if (!open) return;
    const onEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onEscape);
    return () => document.removeEventListener('keydown', onEscape);
  }, [open, onClose]);

  if (!open) return null;

  const handleOverrides = (overrides: Record<string, unknown>) => {
    if (!page || !balloon) return;
    updateBalloon(page.id, balloon.id, { overrides: { ...(balloon.overrides || {}), ...overrides } });
  };

  const content = (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Format"
    >
      <div
        className="absolute inset-0 bg-black/50"
        aria-hidden
        onClick={onClose}
      />
      <div
        className="relative w-full max-w-lg rounded-xl shadow-2xl border border-white/15 overflow-hidden flex flex-col max-h-[85vh]"
        style={{ background: ACCENT_BLUE_GRADIENT }}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/15 shrink-0">
          <h2 className="text-sm font-bold uppercase tracking-wider" style={{ color: TEXT_ON_BLUE }}>
            Format
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg transition-colors hover:bg-white/10"
            style={{ color: TEXT_ON_BLUE }}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>
        <div className="flex border-b border-white/15 shrink-0" style={{ background: 'rgba(0,0,0,0.2)' }}>
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider transition-colors"
              style={{
                color: activeTab === tab.id ? TEXT_ON_BLUE : 'rgba(252,246,186,0.6)',
                borderBottom: activeTab === tab.id ? `2px solid ${TEXT_ON_BLUE}` : '2px solid transparent',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="flex-1 overflow-y-auto p-4" style={{ color: TEXT_ON_BLUE }}>
          {activeTab === 'text' && (
            <div className="space-y-4">
              {!balloon || !page ? (
                <p className="text-sm opacity-80">Select a balloon to format text.</p>
              ) : (
                <>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider opacity-90 mb-1.5">
                      Font
                    </label>
                    <FontSelect
                      value={balloon.overrides?.fontFamily ?? balloon.fontFamily}
                      onChange={(v) => handleOverrides({ fontFamily: v })}
                      compact
                      selectClassName="w-full rounded-lg border border-white/20 bg-[#1A1A1E] px-3 py-2 text-sm text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider opacity-90 mb-1.5">
                      Size
                    </label>
                    <input
                      type="number"
                      min={8}
                      max={120}
                      value={balloon.overrides?.fontSize ?? 24}
                      onChange={(e) => handleOverrides({ fontSize: parseInt(e.target.value) || 24 })}
                      className="w-full rounded-lg border border-white/20 bg-[#1A1A1E] px-3 py-2 text-sm text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider opacity-90 mb-1.5">
                      Text color
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={balloon.overrides?.textColor ?? '#000000'}
                        onChange={(e) => handleOverrides({ textColor: e.target.value })}
                        className="w-10 h-10 rounded-lg border border-white/20 cursor-pointer p-0 bg-transparent"
                      />
                      <span className="text-xs opacity-70">
                        {balloon.overrides?.textColor ?? '#000000'}
                      </span>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
          {activeTab === 'object' && (
            <p className="text-sm opacity-80">Object formatting (fill, shadow, glow) — use the Objects ribbon or coming in a future update.</p>
          )}
          {activeTab === 'panel' && (
            <p className="text-sm opacity-80">Panel formatting — use the Objects ribbon or coming in a future update.</p>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
};
