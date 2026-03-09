import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useComicStore } from '../../../stores/comicStore';
import { FontSelect } from './FontSelect';
import { ColorWheelPicker } from './ColorWheelPicker';
import { GradientBuilder } from './GradientBuilder';
import { X } from 'lucide-react';
import { ACCENT_BLUE_GRADIENT, TEXT_ON_BLUE } from '../theme/Phase12DesignTokens';
import { ASSETS } from './AssetLibrary';

export type FormatDialogTabId = 'text' | 'object' | 'panel' | 'image';

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
  { id: 'image', label: 'Image' },
];

export const FormatDialog: React.FC<FormatDialogProps> = ({
  open,
  onClose,
  initialTab = 'text',
  pageId: propPageId,
  balloonId: propBalloonId,
  panelId: propPanelId,
}) => {
  const { pages, currentPageId, selectedElementIds, updateBalloon, updatePanel, setPageSettings, addColorToRecentlyUsed } = useComicStore();
  const [activeTab, setActiveTab] = React.useState<FormatDialogTabId>(initialTab);

  const page = propPageId
    ? pages.find((p) => p.id === propPageId)
    : pages.find((p) => p.id === currentPageId);
  const targetBalloonId = propBalloonId ?? page?.balloons?.find((b) => selectedElementIds.includes(b.id))?.id;
  const balloon = page && targetBalloonId ? page.balloons?.find((b) => b.id === targetBalloonId) : null;

  // Resolve panel for Panel tab: (1) propPanelId + propPageId, (2) propPanelId on any page, (3) selected panel (current page first, then any page)
  const targetPanelEntry = (() => {
    if (propPanelId) {
      const fromPropPage = propPageId && pages.find((p) => p.id === propPageId)?.panels.find((pa) => pa.id === propPanelId);
      if (fromPropPage && propPageId) return { pageId: propPageId, panel: fromPropPage };
      for (const p of pages) {
        const pan = p.panels.find((pa) => pa.id === propPanelId);
        if (pan) return { pageId: p.id, panel: pan };
      }
    }
    // Prefer selected panel on current page, then any page
    if (currentPageId && selectedElementIds.length > 0) {
      const curPage = pages.find((p) => p.id === currentPageId);
      const pan = curPage?.panels.find((pa) => selectedElementIds.includes(pa.id));
      if (pan && curPage) return { pageId: curPage.id, panel: pan };
    }
    for (const p of pages) {
      const pan = p.panels.find((pa) => selectedElementIds.includes(pa.id));
      if (pan) return { pageId: p.id, panel: pan };
    }
    return null;
  })();
  const panel = targetPanelEntry?.panel ?? null;
  const panelPage = targetPanelEntry ? pages.find((p) => p.id === targetPanelEntry.pageId) ?? null : null;

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
                    <ColorWheelPicker
                      value={balloon.overrides?.textColor ?? '#000000'}
                      onChange={(hex) => { handleOverrides({ textColor: hex }); addColorToRecentlyUsed(hex); }}
                      onApply={(hex) => { handleOverrides({ textColor: hex }); addColorToRecentlyUsed(hex); }}
                      showSwatches={true}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider opacity-90 mb-1.5">
                      Text gradient (optional)
                    </label>
                    <GradientBuilder
                      value={balloon.overrides?.textColorGradient ?? { type: 'linear', angle: 90, stops: [{ offset: 0, color: '#000000' }, { offset: 1, color: '#333333' }] }}
                      onChange={(g) => handleOverrides({ textColorGradient: g })}
                    />
                  </div>
                </>
              )}
            </div>
          )}
          {activeTab === 'object' && (
            <div className="space-y-4">
              {!balloon || !page ? (
                <p className="text-sm opacity-80">Select a balloon to format (fill, stroke, gradient).</p>
              ) : (
                <>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider opacity-90 mb-1.5">Fill color</label>
                    <ColorWheelPicker
                      value={balloon.overrides?.fill ?? '#ffffff'}
                      onChange={(hex) => { handleOverrides({ fill: hex }); addColorToRecentlyUsed(hex); }}
                      onApply={(hex) => { handleOverrides({ fill: hex }); addColorToRecentlyUsed(hex); }}
                      showSwatches={true}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider opacity-90 mb-1.5">Fill gradient</label>
                    <GradientBuilder
                      value={balloon.overrides?.fillGradient ?? { type: 'linear', angle: 90, stops: [{ offset: 0, color: '#ffffff' }, { offset: 1, color: '#eeeeee' }] }}
                      onChange={(g) => handleOverrides({ fillGradient: g })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider opacity-90 mb-1.5">Stroke color</label>
                    <ColorWheelPicker
                      value={balloon.overrides?.stroke ?? '#000000'}
                      onChange={(hex) => { handleOverrides({ stroke: hex }); addColorToRecentlyUsed(hex); }}
                      showSwatches={true}
                    />
                  </div>
                </>
              )}
            </div>
          )}
          {activeTab === 'panel' && (
            <div className="space-y-6">
              {!panel || !panelPage ? (
                <p className="text-sm opacity-80">Select a panel to format (fill and border).</p>
              ) : (
                <>
                  {/* Fill section: solid + gradient, same options as Line */}
                  <section className="rounded-lg border border-white/25 p-3" style={{ background: 'rgba(0,0,0,0.15)' }}>
                    <h3 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: TEXT_ON_BLUE }}>Fill</h3>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-[10px] font-semibold uppercase tracking-wider opacity-90 mb-1">Solid fill</label>
                        <ColorWheelPicker
                          value={panel.fillGradient?.stops?.length ? (panel.fillGradient.stops[0]?.color ?? '#f0f0f0') : '#f0f0f0'}
                          onChange={(hex) => updatePanel(panelPage.id, panel.id, { fillGradient: { type: 'linear', angle: 90, stops: [{ offset: 0, color: hex }, { offset: 1, color: hex }] } })}
                          onApply={(hex) => { updatePanel(panelPage.id, panel.id, { fillGradient: { type: 'linear', angle: 90, stops: [{ offset: 0, color: hex }, { offset: 1, color: hex }] } }); addColorToRecentlyUsed(hex); }}
                          showSwatches={true}
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold uppercase tracking-wider opacity-90 mb-1">Fill gradient</label>
                        <GradientBuilder
                          value={panel.fillGradient ?? { type: 'linear', angle: 90, stops: [{ offset: 0, color: '#ffffff' }, { offset: 1, color: '#f0f0f0' }] }}
                          onChange={(g) => updatePanel(panelPage.id, panel.id, { fillGradient: g })}
                        />
                      </div>
                    </div>
                  </section>
                  {/* Line (border) section: solid + gradient, same options as Fill */}
                  <section className="rounded-lg border border-white/25 p-3" style={{ background: 'rgba(0,0,0,0.15)' }}>
                    <h3 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: TEXT_ON_BLUE }}>Line (border)</h3>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-[10px] font-semibold uppercase tracking-wider opacity-90 mb-1">Solid line</label>
                        <ColorWheelPicker
                          value={panel.strokeColor ?? '#000000'}
                          onChange={(hex) => updatePanel(panelPage.id, panel.id, { strokeColor: hex })}
                          onApply={(hex) => { updatePanel(panelPage.id, panel.id, { strokeColor: hex }); addColorToRecentlyUsed(hex); }}
                          showSwatches={true}
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold uppercase tracking-wider opacity-90 mb-1">Line gradient</label>
                        <GradientBuilder
                          value={panel.strokeGradient ?? { type: 'linear', angle: 90, stops: [{ offset: 0, color: '#000000' }, { offset: 1, color: '#333333' }] }}
                          onChange={(g) => updatePanel(panelPage.id, panel.id, { strokeGradient: g })}
                        />
                      </div>
                    </div>
                  </section>
                </>
              )}
            </div>
          )}
          {activeTab === 'image' && (
            <div className="space-y-3">
              {!page ? (
                <p className="text-sm opacity-80">No page in context.</p>
              ) : (
                <>
                  <p className="text-xs opacity-80">
                    {propPanelId
                      ? 'Click an image to set it as the panel image.'
                      : 'Click an image to set it as the page background.'}
                  </p>
                  <div className="grid grid-cols-3 gap-2 max-h-[280px] overflow-y-auto">
                    {ASSETS.map((asset, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => {
                          if (propPanelId) {
                            updatePanel(page.id, propPanelId, { imageUrl: asset });
                          } else {
                            setPageSettings({ backgroundImage: asset });
                          }
                          onClose();
                        }}
                        className="rounded-lg overflow-hidden border border-white/20 hover:border-white/50 hover:shadow-lg transition-all aspect-square"
                      >
                        <img
                          src={asset}
                          alt=""
                          className="w-full h-full object-cover"
                          loading="lazy"
                          draggable={false}
                        />
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
};
