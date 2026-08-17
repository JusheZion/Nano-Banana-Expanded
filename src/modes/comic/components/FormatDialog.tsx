import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useComicStore } from '../../../stores/comicStore';
import { FontSelect } from './FontSelect';
import { ColorWheelPicker } from './ColorWheelPicker';
import { GradientBuilder } from './GradientBuilder';
import { X } from 'lucide-react';
import { ACCENT_BLUE_GRADIENT, TEXT_ON_BLUE } from '../theme/Phase12DesignTokens';
import { ASSETS } from './AssetLibrary';
import type { TextWarpId } from '../../../types/balloon';
import { PrecisionSlider } from './PrecisionSlider';
import { useShallow } from 'zustand/react/shallow';

export type FormatDialogTabId = 'fillLine' | 'effects' | 'textBox' | 'sizeProperties';

export interface FormatDialogProps {
  open: boolean;
  onClose: () => void;
  initialTab?: FormatDialogTabId;
  pageId?: string | null;
  balloonId?: string | null;
  panelId?: string | null;
}

const TABS: { id: FormatDialogTabId; label: string }[] = [
  { id: 'fillLine', label: 'Fill & Line' },
  { id: 'effects', label: 'Effects' },
  { id: 'textBox', label: 'Text Box' },
  { id: 'sizeProperties', label: 'Size & Properties' },
];

export const FormatDialog: React.FC<FormatDialogProps> = ({
  open,
  onClose,
  initialTab = 'fillLine',
  pageId: propPageId,
  balloonId: propBalloonId,
  panelId: propPanelId,
}) => {
  const {
    pages,
    currentPageId,
    selectedElementIds,
    updateBalloon,
    updatePanel,
    setPageSettings,
    addColorToRecentlyUsed,
  } = useComicStore(
    useShallow((s) => ({
      pages: s.pages,
      currentPageId: s.currentPageId,
      selectedElementIds: s.selectedElementIds,
      updateBalloon: s.updateBalloon,
      updatePanel: s.updatePanel,
      setPageSettings: s.setPageSettings,
      addColorToRecentlyUsed: s.addColorToRecentlyUsed,
    })),
  );
  const [activeTab, setActiveTab] = React.useState<FormatDialogTabId>(initialTab);
  const [dragOffset, setDragOffset] = React.useState({ x: 0, y: 0 });
  const dragRef = React.useRef<{ startX: number; startY: number; startOffsetX: number; startOffsetY: number } | null>(null);

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
    if (open) {
      setActiveTab(initialTab);
      setDragOffset({ x: 0, y: 0 });
    }
  }, [open, initialTab]);

  const handleDragStart = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { startX: e.clientX, startY: e.clientY, startOffsetX: dragOffset.x, startOffsetY: dragOffset.y };
  };
  const handleDragMove = (e: React.PointerEvent) => {
    if (!dragRef.current) return;
    setDragOffset({
      x: dragRef.current.startOffsetX + (e.clientX - dragRef.current.startX),
      y: dragRef.current.startOffsetY + (e.clientY - dragRef.current.startY),
    });
  };
  const handleDragEnd = () => {
    dragRef.current = null;
  };

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
        style={{
          background: ACCENT_BLUE_GRADIENT,
          position: 'fixed',
          left: '50%',
          top: '50%',
          transform: `translate(calc(-50% + ${dragOffset.x}px), calc(-50% + ${dragOffset.y}px))`,
        }}
      >
        <div
          className="flex items-center justify-between px-4 py-3 border-b border-white/15 shrink-0 cursor-move select-none"
          style={{ color: TEXT_ON_BLUE }}
          onPointerDown={handleDragStart}
          onPointerMove={handleDragMove}
          onPointerUp={handleDragEnd}
          onPointerLeave={handleDragEnd}
          onPointerCancel={handleDragEnd}
        >
          <h2 className="text-sm font-bold uppercase tracking-wider">
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
          {activeTab === 'fillLine' && (
            <div className="space-y-4">
              {balloon && page ? (
                <>
                  <section className="rounded-lg border border-white/25 p-3" style={{ background: 'rgba(0,0,0,0.15)' }}>
                    <h3 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: TEXT_ON_BLUE }}>Balloon fill & line</h3>
                    <div className="space-y-3">
                      <div className="min-h-[260px]">
                        <label className="block text-[10px] font-semibold uppercase tracking-wider opacity-90 mb-1">Fill color</label>
                        <ColorWheelPicker
                          value={balloon.overrides?.fill ?? '#ffffff'}
                          onChange={(hex) => { handleOverrides({ fill: hex }); addColorToRecentlyUsed(hex); }}
                          onApply={(hex) => { handleOverrides({ fill: hex }); addColorToRecentlyUsed(hex); }}
                          showSwatches={true}
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold uppercase tracking-wider opacity-90 mb-1">Fill gradient</label>
                        <GradientBuilder
                          value={balloon.overrides?.fillGradient ?? { type: 'linear', angle: 90, stops: [{ offset: 0, color: '#ffffff' }, { offset: 1, color: '#eeeeee' }] }}
                          onChange={(g) => handleOverrides({ fillGradient: g })}
                        />
                      </div>
                      <div className="min-h-[260px]">
                        <label className="block text-[10px] font-semibold uppercase tracking-wider opacity-90 mb-1">Stroke color</label>
                        <ColorWheelPicker
                          value={balloon.overrides?.stroke ?? '#000000'}
                          onChange={(hex) => { handleOverrides({ stroke: hex }); addColorToRecentlyUsed(hex); }}
                          showSwatches={true}
                        />
                      </div>
                    </div>
                  </section>
                </>
              ) : panel && panelPage ? (
                <>
                  <section className="rounded-lg border border-white/25 p-3 min-h-0" style={{ background: 'rgba(0,0,0,0.15)' }}>
                    <h3 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: TEXT_ON_BLUE }}>Fill</h3>
                    <div className="space-y-3">
                      <div className="min-h-[260px]">
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
                  <section className="rounded-lg border border-white/25 p-3 min-h-0" style={{ background: 'rgba(0,0,0,0.15)' }}>
                    <h3 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: TEXT_ON_BLUE }}>Line (border)</h3>
                    <div className="space-y-3">
                      <div className="min-h-[260px]">
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
              ) : (
                <p className="text-sm opacity-80">Select a balloon or panel to format fill and line.</p>
              )}
            </div>
          )}
          {activeTab === 'effects' && (
            <div className="space-y-4">
              {balloon && page ? (
                <>
                  <section className="rounded-lg border border-white/25 p-3" style={{ background: 'rgba(0,0,0,0.15)' }}>
                    <h3 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: TEXT_ON_BLUE }}>Shadow</h3>
                    <div className="space-y-2">
                      <div>
                        <label className="block text-[10px] font-semibold uppercase tracking-wider opacity-90 mb-1">Blur</label>
                        <PrecisionSlider min={0} max={30} step={1} value={balloon.shadowBlur ?? 0} onChange={(v) => updateBalloon(page.id, balloon.id, { shadowBlur: v })} width={160} showPrecisionButtons={false} showTicks={false} aria-label="Shadow blur" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold uppercase tracking-wider opacity-90 mb-1">Opacity</label>
                        <PrecisionSlider min={0} max={1} step={0.1} value={balloon.shadowOpacity ?? 0.5} onChange={(v) => updateBalloon(page.id, balloon.id, { shadowOpacity: v })} width={160} showPrecisionButtons={false} showTicks={false} aria-label="Shadow opacity" />
                      </div>
                    </div>
                  </section>
                  <section className="rounded-lg border border-white/25 p-3" style={{ background: 'rgba(0,0,0,0.15)' }}>
                    <h3 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: TEXT_ON_BLUE }}>Glow</h3>
                    <div className="space-y-2">
                      <div>
                        <label className="block text-[10px] font-semibold uppercase tracking-wider opacity-90 mb-1">Blur</label>
                        <PrecisionSlider min={0} max={30} step={1} value={balloon.glowBlur ?? 0} onChange={(v) => updateBalloon(page.id, balloon.id, { glowBlur: v })} width={160} showPrecisionButtons={false} showTicks={false} aria-label="Glow blur" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold uppercase tracking-wider opacity-90 mb-1">Opacity</label>
                        <PrecisionSlider min={0} max={1} step={0.1} value={balloon.glowOpacity ?? 0} onChange={(v) => updateBalloon(page.id, balloon.id, { glowOpacity: v })} width={160} showPrecisionButtons={false} showTicks={false} aria-label="Glow opacity" />
                      </div>
                    </div>
                  </section>
                  <section className="rounded-lg border border-white/25 p-3" style={{ background: 'rgba(0,0,0,0.15)' }}>
                    <h3 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: TEXT_ON_BLUE }}>3D text extrusion</h3>
                    <div className="space-y-2">
                      <div>
                        <label className="block text-[10px] font-semibold uppercase tracking-wider opacity-90 mb-1">Depth</label>
                        <PrecisionSlider min={0} max={15} step={1} value={balloon.overrides?.text3DExtrusion ?? 0} onChange={(v) => handleOverrides({ text3DExtrusion: v })} width={160} showPrecisionButtons={false} showTicks={false} aria-label="3D depth" />
                      </div>
                    </div>
                  </section>
                </>
              ) : (
                <p className="text-sm opacity-80">Select a balloon to format effects (shadow, glow, 3D).</p>
              )}
            </div>
          )}
          {activeTab === 'textBox' && (
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
                  <div className="min-h-[260px]">
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
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider opacity-90 mb-1.5">
                      Transform (WordArt)
                    </label>
                    <select
                      value={balloon.overrides?.textWarp ?? 'none'}
                      onChange={(e) => handleOverrides({ textWarp: e.target.value as TextWarpId })}
                      className="w-full rounded-lg border border-white/20 bg-[#1A1A1E] px-3 py-2 text-sm text-white"
                    >
                      <option value="none">None</option>
                      <option value="arcUp">Arch Up</option>
                      <option value="arcDown">Arch Down</option>
                      <option value="circle">Circle</option>
                      <option value="arch">Deep Arch</option>
                      <option value="wave">Wave</option>
                      <option value="button">Button</option>
                      <option value="square">Square</option>
                      <option value="triangle">Triangle</option>
                      <option value="cascade">Cascade</option>
                      <option value="slant">Slant</option>
                      <option value="fade">Fade</option>
                    </select>
                    {(balloon.overrides?.textWarp ?? 'none') !== 'none' && (
                      <div className="mt-2">
                        <label className="block text-[10px] font-semibold uppercase tracking-wider opacity-80 mb-1">Intensity</label>
                        <PrecisionSlider
                          min={0.1}
                          max={3}
                          step={0.1}
                          value={balloon.overrides?.textWarpIntensity ?? 1}
                          onChange={(v) => handleOverrides({ textWarpIntensity: v })}
                          width={160}
                          showPrecisionButtons={false}
                          showTicks={false}
                          valueLabel={(balloon.overrides?.textWarpIntensity ?? 1).toFixed(1)}
                          aria-label="Warp intensity"
                        />
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
          {activeTab === 'sizeProperties' && (
            <div className="space-y-4">
              {balloon && page ? (
                <>
                  <section className="rounded-lg border border-white/25 p-3" style={{ background: 'rgba(0,0,0,0.15)' }}>
                    <h3 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: TEXT_ON_BLUE }}>Size</h3>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-semibold uppercase tracking-wider opacity-90 mb-1">Width</label>
                        <input type="number" min={20} value={Math.round(balloon.width)} onChange={(e) => updateBalloon(page.id, balloon.id, { width: Math.max(20, parseInt(e.target.value) || 20), autoSize: false })} className="w-full rounded-lg border border-white/20 bg-[#1A1A1E] px-2 py-1.5 text-sm text-white" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold uppercase tracking-wider opacity-90 mb-1">Height</label>
                        <input type="number" min={20} value={Math.round(balloon.height)} onChange={(e) => updateBalloon(page.id, balloon.id, { height: Math.max(20, parseInt(e.target.value) || 20), autoSize: false })} className="w-full rounded-lg border border-white/20 bg-[#1A1A1E] px-2 py-1.5 text-sm text-white" />
                      </div>
                    </div>
                    <div className="mt-2">
                      <label className="block text-[10px] font-semibold uppercase tracking-wider opacity-90 mb-1">Rotation (°)</label>
                      <input type="number" min={-360} max={360} value={Math.round(balloon.rotation ?? 0)} onChange={(e) => updateBalloon(page.id, balloon.id, { rotation: parseInt(e.target.value) || 0 })} className="w-full rounded-lg border border-white/20 bg-[#1A1A1E] px-2 py-1.5 text-sm text-white" />
                    </div>
                  </section>
                </>
              ) : panel && panelPage ? (
                <>
                  <section className="rounded-lg border border-white/25 p-3" style={{ background: 'rgba(0,0,0,0.15)' }}>
                    <h3 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: TEXT_ON_BLUE }}>Panel image</h3>
                    <p className="text-[10px] opacity-80 mb-2">Click an image to set as the panel image.</p>
                    <div className="grid grid-cols-3 gap-2 max-h-[200px] overflow-y-auto">
                      {ASSETS.map((asset, index) => (
                        <button
                          key={index}
                          type="button"
                          onClick={() => { updatePanel(panelPage.id, panel.id, { imageUrl: asset }); onClose(); }}
                          className="rounded-lg overflow-hidden border border-white/20 hover:border-white/50 hover:shadow-lg transition-all aspect-square"
                        >
                          <img src={asset} alt="" className="w-full h-full object-cover" loading="lazy" draggable={false} />
                        </button>
                      ))}
                    </div>
                  </section>
                </>
              ) : page ? (
                  <section className="rounded-lg border border-white/25 p-3" style={{ background: 'rgba(0,0,0,0.15)' }}>
                    <h3 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: TEXT_ON_BLUE }}>Page background image</h3>
                    <p className="text-[10px] opacity-80 mb-2">Click an image to set as the page background (applies to current page).</p>
                    <div className="grid grid-cols-3 gap-2 max-h-[200px] overflow-y-auto">
                      {ASSETS.map((asset, index) => (
                        <button
                          key={index}
                          type="button"
                          onClick={() => { setPageSettings({ backgroundImage: asset }); onClose(); }}
                          className="rounded-lg overflow-hidden border border-white/20 hover:border-white/50 hover:shadow-lg transition-all aspect-square"
                        >
                          <img src={asset} alt="" className="w-full h-full object-cover" loading="lazy" draggable={false} />
                        </button>
                      ))}
                    </div>
                  </section>
              ) : (
                <p className="text-sm opacity-80">Select a balloon or panel to edit size and properties, or use this tab when no selection to set page background image.</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
};
