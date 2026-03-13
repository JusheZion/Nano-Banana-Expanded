import React from 'react';
import { BoxSelect } from 'lucide-react';
import { useComicStore } from '../../../stores/comicStore';
import { TEXTURE_REGISTRY } from '../data/TextureRegistry';
import { ACCENT_GOLD_GRADIENT, TEXT_ON_GOLD, TEXT_ON_BLUE } from '../theme/Phase12DesignTokens';
import { PrecisionSlider } from './PrecisionSlider';

/** Ribbon: same as TEXT_ON_BLUE for consistency; object toolbar lives in ribbon */
const RIBBON_MUTED = 'rgba(252,246,186,0.7)';
const RIBBON_BORDER = 'rgba(255,255,255,0.2)';

const ribbonIconBtn =
  'flex flex-col items-center justify-center gap-0.5 py-1 px-1.5 rounded-lg border border-white/20 min-w-[2.25rem] transition-all duration-150 shrink-0 hover:bg-[linear-gradient(45deg,#bf953f_0%,#fcf6ba_45%,#b38728_70%,#fbf5b7_85%,#aa771c_100%)] hover:text-[#000000] hover:border-white/30 active:scale-[0.98] active:shadow-inner';
const ribbonIconLabel = 'text-[9px] font-medium uppercase leading-tight';

interface ObjectToolbarProps {
    currentPageId: string;
    selectedElementIds: string[];
}

/** When nothing is selected, show same controls disabled so ribbon mirrors File/Edit/View. */
function ObjectToolbarPlaceholder() {
    const disabledBtn = `${ribbonIconBtn} opacity-50 pointer-events-none cursor-not-allowed`;
    const label = 'text-[9px] font-medium uppercase leading-tight opacity-80';
    return (
        <div className="flex flex-nowrap items-center gap-2 shrink-0 overflow-x-auto py-0.5 opacity-70 pointer-events-none select-none" aria-disabled>
            <button type="button" disabled className={disabledBtn} style={{ color: TEXT_ON_BLUE }}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect width="18" height="18" x="3" y="3" rx="2" /></svg><span className={label}>Rect</span></button>
            <button type="button" disabled className={disabledBtn} style={{ color: TEXT_ON_BLUE }}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /></svg><span className={label}>Ellipse</span></button>
            <div className="h-4 w-px bg-white/20 shrink-0" />
            <button type="button" disabled className={disabledBtn} style={{ color: TEXT_ON_BLUE }}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" /><line x1="3" y1="12" x2="21" y2="12" /></svg><span className={label}>Split H</span></button>
            <button type="button" disabled className={disabledBtn} style={{ color: TEXT_ON_BLUE }}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" /><line x1="12" y1="3" x2="12" y2="21" /></svg><span className={label}>Split V</span></button>
            <div className="h-4 w-px bg-white/20 shrink-0" />
            <button type="button" disabled className={disabledBtn} style={{ color: TEXT_ON_BLUE }}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="16 3 21 12 16 21" /><line x1="8" y1="3" x2="8" y2="21" /></svg><span className={label}>Flip H</span></button>
            <button type="button" disabled className={disabledBtn} style={{ color: TEXT_ON_BLUE }}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 16 12 21 21 16" /><line x1="3" y1="8" x2="21" y2="8" /></svg><span className={label}>Flip V</span></button>
            <div className="h-4 w-px bg-white/20 shrink-0" />
            <button type="button" disabled className={disabledBtn} style={{ color: TEXT_ON_BLUE }}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 8h8v8H8z" /><path d="M4 4h8v8H4z" strokeOpacity="0.5" /></svg><span className={label}>Front</span></button>
            <button type="button" disabled className={disabledBtn} style={{ color: TEXT_ON_BLUE }}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h8v8H4z" /><path d="M8 8h8v8H8z" strokeOpacity="0.5" /></svg><span className={label}>Back</span></button>
            <div className="h-4 w-px bg-white/20 shrink-0" />
            <span className={label} style={{ color: RIBBON_MUTED }}>Border · Shadow · Glow · Texture</span>
            <div className="h-4 w-px bg-white/20 shrink-0" />
            <button type="button" disabled className={disabledBtn} style={{ color: TEXT_ON_BLUE }}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg><span className={label}>Clone</span></button>
            <button type="button" disabled className={disabledBtn} style={{ color: TEXT_ON_BLUE }}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg><span className={label}>Delete</span></button>
        </div>
    );
}

export const ObjectToolbar: React.FC<ObjectToolbarProps> = ({ currentPageId, selectedElementIds }) => {
    const {
        bringToFront,
        sendToBack,
        cloneElement,
        removeElement,
        toggleFlip,
        pages,
        updatePanel,
        splitPanel,
        createGroup,
        ungroup,
        getGroupMembers
    } = useComicStore();

    const selectedPanelEntries = pages.flatMap(p => p.panels.filter(panel => selectedElementIds.includes(panel.id)).map(panel => ({ pageId: p.id, panel })));
    const selectedPanels = selectedPanelEntries.map(x => x.panel);
    const effectivePageId = selectedPanelEntries[0]?.pageId ?? currentPageId;

    const groupOfFirst = currentPageId && selectedElementIds[0] ? getGroupMembers(currentPageId, selectedElementIds[0]) : null;
    const isSelectionOneGroup = !!(groupOfFirst && groupOfFirst.length >= 2 && selectedElementIds.length === 1);

    if (selectedElementIds.length === 0) return <ObjectToolbarPlaceholder />;

    const hasPanels = selectedPanels.length > 0;

    const shapeType = selectedPanels[0]?.shapeType ?? 'rect';

    return (
        <div className="flex flex-nowrap items-center gap-2 pointer-events-auto shrink-0 overflow-x-auto overflow-y-hidden min-h-0 py-0.5">

            {/* Shape Controls (Only for Panels) */}
            {hasPanels && (
                <div className="flex flex-nowrap items-center gap-1 border-r border-white/20 pr-2 mr-1 shrink-0">
                    <button
                        type="button"
                        title="Rectangle Shape"
                        onClick={() => selectedPanels.forEach(p => updatePanel(effectivePageId, p.id, { shapeType: 'rect' }))}
                        className={ribbonIconBtn}
                        style={shapeType === 'rect' ? { background: ACCENT_GOLD_GRADIENT, color: TEXT_ON_GOLD } : { color: TEXT_ON_BLUE }}
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" /></svg>
                        <span className={ribbonIconLabel}>Rect</span>
                    </button>
                    <button
                        type="button"
                        title="Ellipse Shape"
                        onClick={() => selectedPanels.forEach(p => updatePanel(effectivePageId, p.id, { shapeType: 'ellipse' }))}
                        className={ribbonIconBtn}
                        style={shapeType === 'ellipse' ? { background: ACCENT_GOLD_GRADIENT, color: TEXT_ON_GOLD } : { color: TEXT_ON_BLUE }}
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /></svg>
                        <span className={ribbonIconLabel}>Ellipse</span>
                    </button>
                    <button
                        type="button"
                        title="Half-Circle (arches upward)"
                        onClick={() => selectedPanels.forEach(p => updatePanel(effectivePageId, p.id, { shapeType: 'halfCircle' }))}
                        className={ribbonIconBtn}
                        style={shapeType === 'halfCircle' ? { background: ACCENT_GOLD_GRADIENT, color: TEXT_ON_GOLD } : { color: TEXT_ON_BLUE }}
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2 A10 10 0 0 1 22 12 L2 12 A10 10 0 0 1 12 2 Z" /></svg>
                        <span className={ribbonIconLabel}>Half</span>
                    </button>
                    <button
                        type="button"
                        title="Quarter-Circle (bottom-right)"
                        onClick={() => selectedPanels.forEach(p => updatePanel(effectivePageId, p.id, { shapeType: 'quarterCircle' }))}
                        className={ribbonIconBtn}
                        style={shapeType === 'quarterCircle' ? { background: ACCENT_GOLD_GRADIENT, color: TEXT_ON_GOLD } : { color: TEXT_ON_BLUE }}
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 12 L22 12 A10 10 0 0 1 12 22 Z" /></svg>
                        <span className={ribbonIconLabel}>Quarter</span>
                    </button>
                    <button
                        type="button"
                        title="Sector (variable angle)"
                        onClick={() => selectedPanels.forEach(p => updatePanel(effectivePageId, p.id, { shapeType: 'sector', centralAngle: p.shapeType === 'sector' ? (p.centralAngle ?? 90) : 90 }))}
                        className={ribbonIconBtn}
                        style={shapeType === 'sector' ? { background: ACCENT_GOLD_GRADIENT, color: TEXT_ON_GOLD } : { color: TEXT_ON_BLUE }}
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 12 L22 12 A10 10 0 0 1 16 20 Z" /></svg>
                        <span className={ribbonIconLabel}>Sector</span>
                    </button>

                    <div className="h-4 w-px mx-1 shrink-0" style={{ backgroundColor: RIBBON_BORDER }} />

                    <button type="button" title="Split Horizontally (Row)" onClick={() => selectedPanels.forEach(p => splitPanel(effectivePageId, p.id, 'horizontal', 0))} className={ribbonIconBtn} style={{ color: TEXT_ON_BLUE }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" /><line x1="3" y1="12" x2="21" y2="12" /></svg>
                        <span className={ribbonIconLabel}>Split H</span>
                    </button>
                    <button type="button" title="Split Vertically (Column)" onClick={() => selectedPanels.forEach(p => splitPanel(effectivePageId, p.id, 'vertical', 0))} className={ribbonIconBtn} style={{ color: TEXT_ON_BLUE }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" /><line x1="12" y1="3" x2="12" y2="21" /></svg>
                        <span className={ribbonIconLabel}>Split V</span>
                    </button>

                    <div className="h-4 w-px mx-1 shrink-0" style={{ backgroundColor: RIBBON_BORDER }} />

                    <button type="button" title="Split Slanted (Row)" onClick={() => selectedPanels.forEach(p => splitPanel(effectivePageId, p.id, 'horizontal', 40))} className={ribbonIconBtn} style={{ color: TEXT_ON_BLUE }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" /><line x1="3" y1="16" x2="21" y2="8" /></svg>
                        <span className={ribbonIconLabel}>Slant R</span>
                    </button>
                    <button type="button" title="Split Slanted (Column)" onClick={() => selectedPanels.forEach(p => splitPanel(effectivePageId, p.id, 'vertical', 40))} className={ribbonIconBtn} style={{ color: TEXT_ON_BLUE }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" /><line x1="16" y1="3" x2="8" y2="21" /></svg>
                        <span className={ribbonIconLabel}>Slant C</span>
                    </button>
                </div>
            )}

            {/* Z-Index & Transform Controls */}
            <div className="flex flex-nowrap items-center gap-1 border-r border-white/20 pr-2 mr-2 shrink-0">
                {hasPanels && (
                    <button type="button" title="Rotate (15°)" onClick={() => selectedPanels.forEach(p => updatePanel(effectivePageId, p.id, { rotation: ((p.rotation || 0) + 15) % 360 }))} className={ribbonIconBtn} style={{ color: TEXT_ON_BLUE }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12c0-5.523 4.477-10 10-10 5.523 0 10 4.477 10 10 0 1.638-.393 3.185-1.093 4.542M22 6V12h-6" /></svg>
                        <span className={ribbonIconLabel}>Rotate</span>
                    </button>
                )}
                <button type="button" title="Flip Horizontal" onClick={() => selectedElementIds.forEach(id => toggleFlip(effectivePageId, id, 'horizontal'))} className={ribbonIconBtn} style={{ color: TEXT_ON_BLUE }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 3 21 12 16 21" /><line x1="8" y1="3" x2="8" y2="21" /><polyline points="3 7 3 17" /></svg>
                    <span className={ribbonIconLabel}>Flip H</span>
                </button>
                <button type="button" title="Flip Vertical" onClick={() => selectedElementIds.forEach(id => toggleFlip(effectivePageId, id, 'vertical'))} className={ribbonIconBtn} style={{ color: TEXT_ON_BLUE }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 16 12 21 21 16" /><line x1="3" y1="8" x2="21" y2="8" /><polyline points="7 3 17 3" /></svg>
                    <span className={ribbonIconLabel}>Flip V</span>
                </button>
                <div className="h-4 w-px bg-white/10 mx-1" />
                <button type="button" title="Bring to Front" onClick={() => selectedElementIds.forEach(id => bringToFront(effectivePageId, id))} className={ribbonIconBtn} style={{ color: TEXT_ON_BLUE }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 8h8v8H8z" /><path d="M4 4h8v8H4z" strokeOpacity="0.5" /></svg>
                    <span className={ribbonIconLabel}>Front</span>
                </button>
                <button type="button" title="Send to Back" onClick={() => selectedElementIds.forEach(id => sendToBack(effectivePageId, id))} className={ribbonIconBtn} style={{ color: TEXT_ON_BLUE }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h8v8H4z" /><path d="M8 8h8v8H8z" strokeOpacity="0.5" /></svg>
                    <span className={ribbonIconLabel}>Back</span>
                </button>
                <div className="h-4 w-px bg-white/10 mx-1" />
                <button type="button" title="Group selected (2+ elements)" onClick={() => currentPageId && createGroup(currentPageId, selectedElementIds)} disabled={!currentPageId || selectedElementIds.length < 2} className={ribbonIconBtn} style={{ color: TEXT_ON_BLUE }}>
                    <BoxSelect className="w-3.5 h-3.5" />
                    <span className={ribbonIconLabel}>Group</span>
                </button>
                <button type="button" title="Ungroup selection" onClick={() => currentPageId && selectedElementIds[0] && ungroup(currentPageId, selectedElementIds[0])} disabled={!currentPageId || !selectedElementIds.length || !isSelectionOneGroup} className={ribbonIconBtn} style={{ color: TEXT_ON_BLUE }}>
                    <BoxSelect className="w-3.5 h-3.5" />
                    <span className={ribbonIconLabel}>Ungroup</span>
                </button>
            </div>

            {/* Border & FX Controls (Panels Only) — single row */}
            {hasPanels && (
                <div className="flex flex-nowrap items-center gap-2 border-r border-white/20 pr-2 mr-2 shrink-0">
                    {/* Border Color */}
                    <div className="flex flex-nowrap items-center gap-1 border-r border-white/20 pr-2 mr-1 shrink-0">
                        <div className="relative group" title="Border Color">
                            <input
                                type="color"
                                value={selectedPanels[0]?.strokeColor || '#893741'}
                                onChange={(e) => selectedPanels.forEach(p => updatePanel(effectivePageId, p.id, { strokeColor: e.target.value }))}
                                className="w-5 h-5 rounded-full overflow-hidden border border-white/20 cursor-pointer p-0 bg-transparent shrink-0"
                            />
                        </div>

                        <button
                            type="button"
                            title="Apply Border Color to All Panels"
                            onClick={() => {
                                const c = selectedPanels[0]?.strokeColor || '#893741';
                                pages.forEach(pg => {
                                    pg.panels.forEach(p => updatePanel(pg.id, p.id, { strokeColor: c }));
                                });
                            }}
                            className="px-2 py-1 rounded font-bold text-[10px] uppercase tracking-wider transition-colors hover:opacity-90"
                            style={{ color: TEXT_ON_BLUE, background: 'rgba(252,246,186,0.2)' }}
                        >
                            All
                        </button>
                    </div>

                    <div className="relative group shrink-0" title="Shadow Color">
                        <input
                            type="color"
                            value={selectedPanels[0]?.shadowColor || '#000000'}
                            onChange={(e) => selectedPanels.forEach(p => updatePanel(effectivePageId, p.id, { shadowColor: e.target.value }))}
                            className="w-5 h-5 rounded-full overflow-hidden border border-white/20 cursor-pointer p-0 bg-transparent"
                        />
                    </div>

                    <button
                        type="button"
                        title="Drop Shadow Preset"
                        onClick={() => selectedPanels.forEach(p => updatePanel(effectivePageId, p.id, { shadowBlur: 10, shadowOffsetX: 5, shadowOffsetY: 5, shadowOpacity: 0.5, shadowColor: '#000000' }))}
                        className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider transition-colors shrink-0"
                        style={{ color: TEXT_ON_BLUE }}
                    >
                        Shdw
                    </button>

                    <div className="flex flex-nowrap items-center gap-1 ml-1 shrink-0" title="Shadow Blur / Opacity">
                        <span className="text-[9px] w-5 shrink-0" style={{ color: RIBBON_MUTED }}>Blur</span>
                        <PrecisionSlider
                            min={0}
                            max={50}
                            step={1}
                            value={selectedPanels[0]?.shadowBlur ?? 10}
                            onChange={(v) => selectedPanels.forEach(p => updatePanel(effectivePageId, p.id, { shadowBlur: v }))}
                            width={90}
                            showPrecisionButtons={false}
                            showTicks={false}
                            aria-label="Shadow blur"
                        />
                        <span className="text-[9px] w-4 shrink-0" style={{ color: RIBBON_MUTED }}>Op</span>
                        <PrecisionSlider
                            min={0}
                            max={1}
                            step={0.1}
                            value={selectedPanels[0]?.shadowOpacity ?? 0.3}
                            onChange={(v) => selectedPanels.forEach(p => updatePanel(effectivePageId, p.id, { shadowOpacity: v }))}
                            width={90}
                            showPrecisionButtons={false}
                            showTicks={false}
                            aria-label="Shadow opacity"
                        />
                    </div>
                    <div className="flex flex-nowrap items-center gap-1 ml-1 shrink-0" title="Shadow Offset">
                        <span className="text-[9px] w-3 shrink-0" style={{ color: RIBBON_MUTED }}>X</span>
                        <PrecisionSlider
                            min={-50}
                            max={50}
                            step={1}
                            value={selectedPanels[0]?.shadowOffsetX ?? 5}
                            onChange={(v) => selectedPanels.forEach(p => updatePanel(effectivePageId, p.id, { shadowOffsetX: v }))}
                            width={70}
                            showPrecisionButtons={false}
                            showTicks={false}
                            aria-label="Shadow offset X"
                        />
                        <span className="text-[9px] w-3 shrink-0" style={{ color: RIBBON_MUTED }}>Y</span>
                        <PrecisionSlider
                            min={-50}
                            max={50}
                            step={1}
                            value={selectedPanels[0]?.shadowOffsetY ?? 5}
                            onChange={(v) => selectedPanels.forEach(p => updatePanel(effectivePageId, p.id, { shadowOffsetY: v }))}
                            width={70}
                            showPrecisionButtons={false}
                            showTicks={false}
                            aria-label="Shadow offset Y"
                        />
                    </div>

                    {/* Glow Controls — single row */}
                    <div className="flex flex-nowrap items-center gap-2 border-l border-white/20 pl-2 ml-1 shrink-0">
                        <button
                            onClick={() => selectedPanels.forEach(p => updatePanel(effectivePageId, p.id, { glowBlur: 20, glowSpread: 5, glowOpacity: 1, glowColor: '#3B82F6' }))}
                            className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider transition-colors shrink-0"
                            style={{ color: TEXT_ON_BLUE }}
                            title="Blue Glow Preset"
                        >
                            Glow
                        </button>
                        <div className="relative group shrink-0" title="Glow Color">
                            <input
                                type="color"
                                value={selectedPanels[0]?.glowColor || '#3B82F6'}
                                onChange={(e) => selectedPanels.forEach(p => updatePanel(effectivePageId, p.id, { glowColor: e.target.value }))}
                                className="w-5 h-5 rounded-full overflow-hidden border border-white/20 cursor-pointer p-0 bg-transparent"
                            />
                        </div>
                        <div className="flex flex-nowrap items-center gap-1 ml-1 shrink-0">
                            <span className="text-[9px] w-5 shrink-0" style={{ color: RIBBON_MUTED }}>Size</span>
                            <PrecisionSlider min={0} max={50} step={1} value={selectedPanels[0]?.glowSpread ?? 0} onChange={(v) => selectedPanels.forEach(p => updatePanel(effectivePageId, p.id, { glowSpread: v }))} width={90} showPrecisionButtons={false} showTicks={false} aria-label="Glow size" />
                            <span className="text-[9px] w-4 shrink-0" style={{ color: RIBBON_MUTED }}>Blur</span>
                            <PrecisionSlider min={0} max={50} step={1} value={selectedPanels[0]?.glowBlur ?? 0} onChange={(v) => selectedPanels.forEach(p => updatePanel(effectivePageId, p.id, { glowBlur: v }))} width={90} showPrecisionButtons={false} showTicks={false} aria-label="Glow blur" />
                            <span className="text-[9px] w-4 shrink-0" style={{ color: RIBBON_MUTED }}>Op</span>
                            <PrecisionSlider min={0} max={1} step={0.1} value={selectedPanels[0]?.glowOpacity ?? 0} onChange={(v) => selectedPanels.forEach(p => updatePanel(effectivePageId, p.id, { glowOpacity: v }))} width={90} showPrecisionButtons={false} showTicks={false} aria-label="Glow opacity" />
                        </div>
                    </div>

                    {/* Texture Overlay */}
                    <div className="flex flex-nowrap items-center gap-1 border-l border-white/20 pl-2 ml-1 shrink-0" title="Texture Overlay">
                        <select
                            value={selectedPanels[0]?.textureId || ''}
                            onChange={(e) => selectedPanels.forEach(p => updatePanel(effectivePageId, p.id, { textureId: e.target.value }))}
                            className="text-[10px] font-medium border border-white/20 rounded px-1 min-w-[56px] outline-none cursor-pointer shrink-0 bg-white/10"
                            style={{ color: TEXT_ON_BLUE }}
                        >
                            <option value="">No Texture</option>
                            {TEXTURE_REGISTRY.map(t => (
                                <option key={t.id} value={t.id}>{t.name}</option>
                            ))}
                        </select>
                        {selectedPanels[0]?.textureId && (
                            <PrecisionSlider min={0.1} max={1} step={0.1} value={selectedPanels[0]?.textureOpacity ?? 0.5} onChange={(v) => selectedPanels.forEach(p => updatePanel(effectivePageId, p.id, { textureOpacity: v }))} width={90} showPrecisionButtons={false} showTicks={false} aria-label="Texture opacity" />
                        )}
                    </div>
                </div>
            )}

            {/* Image Fill Controls (Panels with Image Only) */}
            {hasPanels && selectedPanels[0]?.imageUrl && (
                <div className="flex flex-nowrap items-center gap-2 border-r border-white/20 pr-2 mr-2 shrink-0">
                    <select
                        value={selectedPanels[0]?.imageFillMode || 'cover'}
                        onChange={(e) => selectedPanels.forEach(p => updatePanel(effectivePageId, p.id, { imageFillMode: e.target.value as any }))}
                        className="text-[10px] font-medium border border-white/20 rounded px-1 min-w-[56px] outline-none cursor-pointer shrink-0 bg-white/10"
                        style={{ color: TEXT_ON_BLUE }}
                        title="Image Fill Mode"
                    >
                        <option value="center">Center</option>
                        <option value="cover">Cover</option>
                        <option value="decal">Decal</option>
                        <option value="stretch">Stretch</option>
                    </select>

                    {selectedPanels[0]?.imageFillMode === 'decal' && (
                        <div className="flex flex-nowrap items-center gap-1 ml-1 shrink-0">
                            <span className="text-[9px] w-3 shrink-0" style={{ color: RIBBON_MUTED }}>S</span>
                            <PrecisionSlider min={0.1} max={3} step={0.1} value={selectedPanels[0]?.imageScale ?? 1} onChange={(v) => selectedPanels.forEach(p => updatePanel(effectivePageId, p.id, { imageScale: v }))} width={90} showPrecisionButtons={false} showTicks={false} aria-label="Image scale" />
                            <span className="text-[9px] w-4 shrink-0" style={{ color: RIBBON_MUTED }}>XY</span>
                            <PrecisionSlider min={-500} max={500} step={10} value={selectedPanels[0]?.imageOffsetX ?? 0} onChange={(v) => selectedPanels.forEach(p => updatePanel(effectivePageId, p.id, { imageOffsetX: v }))} width={60} showPrecisionButtons={false} showTicks={false} aria-label="Offset X" />
                            <PrecisionSlider min={-500} max={500} step={10} value={selectedPanels[0]?.imageOffsetY ?? 0} onChange={(v) => selectedPanels.forEach(p => updatePanel(effectivePageId, p.id, { imageOffsetY: v }))} width={60} showPrecisionButtons={false} showTicks={false} aria-label="Offset Y" />
                        </div>
                    )}
                </div>
            )}

            {/* Lifecycle Controls */}
            <div className="flex flex-nowrap items-center gap-1 shrink-0">
                <button type="button" title="Clone (Ctrl+D)" onClick={() => selectedElementIds.forEach(id => cloneElement(effectivePageId, id))} className={ribbonIconBtn} style={{ color: TEXT_ON_BLUE }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
                    <span className={ribbonIconLabel}>Clone</span>
                </button>
                <button type="button" title="Delete (Backspace)" onClick={() => selectedElementIds.forEach(id => removeElement(effectivePageId, id))} className={`${ribbonIconBtn} hover:bg-red-500/30`} style={{ color: TEXT_ON_BLUE }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
                    <span className={ribbonIconLabel}>Delete</span>
                </button>
            </div>
        </div>
    );
};
