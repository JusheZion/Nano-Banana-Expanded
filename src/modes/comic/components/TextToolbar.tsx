import React, { useState } from 'react';
import { useComicStore } from '../../../stores/comicStore';
import type { BalloonInstance } from '../../../types/balloon';
import { TEXTURE_REGISTRY } from '../data/TextureRegistry';
import { Tooltip } from '../../../components/ui/Tooltip';
import { FontSelect } from './FontSelect';
import {
    Maximize2,
    Type,
    Box,
    Waves,
    AlignHorizontalSpaceAround,
    Circle,
    CircleDot,
    Square,
    Moon,
    Sparkles,
    RefreshCw,
    ArrowLeftRight,
    Image as ImageIcon,
    ChevronDown,
    ChevronRight,
} from 'lucide-react';

const iconBtn = 'w-8 h-8 flex items-center justify-center rounded-lg border border-white/[0.08] bg-[#1A1A1E] text-white/80 transition-colors hover:text-[#00D1FF] hover:bg-[#00D1FF]/10';
const iconBtnActive = 'text-[#00D1FF] bg-[#00D1FF]/15 border-[#00D1FF]/40';

const FONT_SIZE_PRESETS = [8, 10, 12, 14, 16, 18, 20, 24, 28, 36, 48, 72];
const FONT_SIZE_OTHER = '__other';

type BalloonRowProps = {
    balloon: BalloonInstance & { shadowColor?: string; shadowBlur?: number; shadowOpacity?: number; shadowOffsetX?: number; shadowOffsetY?: number; glowColor?: string; glowBlur?: number; glowSpread?: number; glowOpacity?: number; textureId?: string; textureOpacity?: number };
    currentPageId: string;
    selectedBubbleId: string;
    onOverrides: (o: Record<string, unknown>) => void;
    onUpdate: (pageId: string, bubbleId: string, patch: Record<string, unknown>) => void;
};

function BalloonTextOptionsRow({ balloon, currentPageId, selectedBubbleId, onOverrides, onUpdate }: BalloonRowProps) {
    return (
        <>
            {balloon.autoSize !== false && (
                <>
                    <Tooltip content="Padding">
                        <div className="flex items-center gap-1.5">
                            <span className="flex items-center justify-center w-8 h-8 rounded-lg border border-white/[0.08] bg-[#1A1A1E] text-white/70 shrink-0" aria-hidden><Box size={14} /></span>
                            <input type="range" min="0" max="100" step="5" value={balloon.padding ?? 20} onChange={(e) => onUpdate(currentPageId, selectedBubbleId, { padding: parseInt(e.target.value) })} className="w-14 h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#00D1FF] [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:h-2.5 [&::-webkit-slider-thumb]:bg-[#00D1FF] [&::-webkit-slider-thumb]:rounded-full" />
                            <span className="text-white/80 text-xs w-5 text-right tabular-nums">{balloon.padding ?? 20}</span>
                        </div>
                    </Tooltip>
                    <div className="w-px h-6 bg-white/10" />
                </>
            )}
            <Tooltip content="Text color, stroke, outer stroke">
                <div className="flex items-center gap-1 bg-[#1A1A1E] rounded-lg p-1.5 border border-white/[0.08]">
                    <Type size={14} className="text-white/60 shrink-0" aria-hidden />
                    <input type="color" value={balloon.overrides?.textColor || '#000000'} onChange={(e) => onOverrides({ textColor: e.target.value })} className="w-6 h-6 rounded overflow-hidden border border-white/20 cursor-pointer p-0 bg-transparent" title="Text color" />
                    <input type="color" value={balloon.overrides?.textStroke || '#000000'} onChange={(e) => onOverrides({ textStroke: e.target.value, textStrokeWidth: balloon.overrides?.textStrokeWidth || 2 })} className="w-6 h-6 rounded overflow-hidden border border-white/20 cursor-pointer p-0 bg-transparent" title="Stroke" />
                    <input type="number" min="0" max="20" value={balloon.overrides?.textStrokeWidth || 0} onChange={(e) => onOverrides({ textStrokeWidth: parseInt(e.target.value) || 0 })} className="w-8 bg-transparent text-white text-xs text-center border-none focus:outline-none tabular-nums" title="Stroke width" />
                    <input type="color" value={balloon.overrides?.secondaryTextStroke || '#ffffff'} onChange={(e) => onOverrides({ secondaryTextStroke: e.target.value, secondaryTextStrokeWidth: balloon.overrides?.secondaryTextStrokeWidth || 2 })} className="w-6 h-6 rounded overflow-hidden border border-white/20 cursor-pointer p-0 bg-transparent" title="Outer stroke" />
                    <input type="number" min="0" max="20" value={balloon.overrides?.secondaryTextStrokeWidth || 0} onChange={(e) => onOverrides({ secondaryTextStrokeWidth: parseInt(e.target.value) || 0 })} className="w-8 bg-transparent text-white text-xs text-center border-none focus:outline-none tabular-nums" title="Outer stroke width" />
                </div>
            </Tooltip>
            <div className="w-px h-6 bg-white/10" />
            <Tooltip content="3D extrusion">
                <div className="flex items-center gap-1 bg-[#1A1A1E] rounded-lg px-1.5 py-1 border border-white/[0.08]">
                    <Box size={14} className="text-white/60 shrink-0" aria-hidden />
                    <input type="color" value={balloon.overrides?.text3DExtrusionColor || '#000000'} onChange={(e) => onOverrides({ text3DExtrusionColor: e.target.value, text3DExtrusion: Math.max(1, balloon.overrides?.text3DExtrusion || 5) })} className="w-6 h-6 rounded overflow-hidden border border-white/20 cursor-pointer p-0 bg-transparent" title="Extrusion color" />
                    <input type="number" min="0" max="50" value={balloon.overrides?.text3DExtrusion || 0} onChange={(e) => onOverrides({ text3DExtrusion: parseInt(e.target.value) || 0 })} className="w-9 bg-transparent text-white text-xs text-center border-none focus:outline-none tabular-nums" title="Depth" />
                    {!!balloon.overrides?.text3DExtrusion && (
                        <>
                            <div className="w-px h-4 bg-white/10" />
                            <input type="number" min="-360" max="360" value={balloon.overrides?.text3DExtrusionAngle ?? 45} onChange={(e) => onOverrides({ text3DExtrusionAngle: parseInt(e.target.value) || 0 })} className="w-8 bg-transparent text-white text-xs text-center border-none focus:outline-none tabular-nums" title="Angle °" />
                        </>
                    )}
                </div>
            </Tooltip>
            <div className="w-px h-6 bg-white/10" />
            <Tooltip content="Warp effect">
                <div className="flex items-center gap-1.5">
                    <span className="flex items-center justify-center w-8 h-8 rounded-lg border border-white/[0.08] bg-[#1A1A1E] text-white/70 shrink-0" aria-hidden><Waves size={14} /></span>
                    <select value={balloon.overrides?.textWarp || 'none'} onChange={(e) => onOverrides({ textWarp: e.target.value as 'none' | 'arcUp' | 'arcDown' | 'wave' | 'circle' | 'arch' })} className="bg-[#1A1A1E] text-white text-xs py-1.5 pl-2 pr-6 rounded-lg border border-white/[0.08] outline-none cursor-pointer hover:border-[#00D1FF]/40 transition-colors">
                        <option value="none">None</option>
                        <option value="arcDown">Arc Down</option>
                        <option value="arcUp">Arc Up</option>
                        <option value="circle">Circle</option>
                        <option value="arch">Deep Arch</option>
                        <option value="wave">Wave</option>
                    </select>
                </div>
            </Tooltip>
            {balloon.overrides?.textWarp && balloon.overrides?.textWarp !== 'none' && (
                <Tooltip content="Warp intensity">
                    <div className="flex items-center gap-1.5">
                        <input type="range" min="0.1" max="3" step="0.1" value={balloon.overrides?.textWarpIntensity ?? 1} onChange={(e) => onOverrides({ textWarpIntensity: parseFloat(e.target.value) })} className="w-14 h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#00D1FF]" />
                        <span className="text-white/80 text-xs w-6 tabular-nums">{(balloon.overrides?.textWarpIntensity ?? 1).toFixed(1)}</span>
                    </div>
                </Tooltip>
            )}
            <div className="w-px h-6 bg-white/10" />
            <Tooltip content="Letter spacing">
                <div className="flex items-center gap-1.5 bg-[#1A1A1E] rounded-lg pl-2 pr-1 py-1 border border-white/[0.08]">
                    <AlignHorizontalSpaceAround size={14} className="text-white/60 shrink-0" aria-hidden />
                    <input type="number" min="-20" max="100" value={balloon.overrides?.textLetterSpacing || 0} onChange={(e) => onOverrides({ textLetterSpacing: parseInt(e.target.value) || 0 })} className="w-9 bg-transparent text-white text-xs text-center border-none focus:outline-none tabular-nums" />
                </div>
            </Tooltip>
        </>
    );
}

function BalloonShapeOptionsRow({ balloon, currentPageId, selectedBubbleId, onOverrides, onUpdate }: BalloonRowProps) {
    return (
        <>
            <Tooltip content="Bubble fill">
                <div className={`${iconBtn} flex items-center justify-center gap-1`}>
                    <Circle size={14} className="text-white/60" aria-hidden />
                    <input type="color" value={balloon.overrides?.fill || '#ffffff'} onChange={(e) => onOverrides({ fill: e.target.value })} className="w-5 h-5 rounded-full overflow-hidden border border-white/20 cursor-pointer p-0 bg-transparent" />
                </div>
            </Tooltip>
            <Tooltip content="Bubble border">
                <div className={`${iconBtn} flex items-center justify-center gap-1`}>
                    <CircleDot size={14} className="text-white/60" aria-hidden />
                    <input type="color" value={balloon.overrides?.stroke || '#000000'} onChange={(e) => onOverrides({ stroke: e.target.value })} className="w-5 h-5 rounded-full overflow-hidden border border-white/20 cursor-pointer p-0 bg-transparent" />
                </div>
            </Tooltip>
            <Tooltip content="Border width">
                <div className="flex items-center gap-1.5">
                    <span className="flex items-center justify-center w-8 h-8 rounded-lg border border-white/[0.08] bg-[#1A1A1E] text-white/70 shrink-0" aria-hidden><Square size={14} /></span>
                    <input type="range" min="0" max="10" step="1" value={balloon.overrides?.strokeWidth ?? 2} onChange={(e) => onOverrides({ strokeWidth: parseInt(e.target.value) })} className="w-14 h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#00D1FF] [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:h-2.5 [&::-webkit-slider-thumb]:bg-[#00D1FF] [&::-webkit-slider-thumb]:rounded-full" />
                    <span className="text-white/80 text-xs w-4 text-right tabular-nums">{balloon.overrides?.strokeWidth ?? 2}</span>
                </div>
            </Tooltip>
            <div className="w-px h-6 bg-white/10" />
            <Tooltip content="Shadow color"><div className={iconBtn}><input type="color" value={balloon.shadowColor || '#000000'} onChange={(e) => onUpdate(currentPageId, selectedBubbleId, { shadowColor: e.target.value })} className="w-5 h-5 rounded overflow-hidden border border-white/20 cursor-pointer p-0 bg-transparent" /></div></Tooltip>
            <Tooltip content="Drop shadow preset"><button type="button" onClick={() => onUpdate(currentPageId, selectedBubbleId, { shadowBlur: 10, shadowOffsetX: 5, shadowOffsetY: 5, shadowOpacity: 0.5, shadowColor: '#000000' })} className={iconBtn}><Moon size={16} /></button></Tooltip>
            <Tooltip content="Shadow blur / opacity / X / Y">
                <div className="flex items-center gap-1">
                    <input type="range" min="0" max="50" step="1" value={balloon.shadowBlur ?? 0} onChange={(e) => onUpdate(currentPageId, selectedBubbleId, { shadowBlur: parseInt(e.target.value) })} className="w-10 h-1 rounded accent-[#00D1FF]" />
                    <input type="range" min="0" max="1" step="0.1" value={balloon.shadowOpacity ?? 0} onChange={(e) => onUpdate(currentPageId, selectedBubbleId, { shadowOpacity: parseFloat(e.target.value) })} className="w-10 h-1 rounded accent-[#00D1FF]" />
                    <input type="range" min="-50" max="50" step="1" value={balloon.shadowOffsetX ?? 0} onChange={(e) => onUpdate(currentPageId, selectedBubbleId, { shadowOffsetX: parseInt(e.target.value) })} className="w-8 h-1 rounded accent-[#00D1FF]" />
                    <input type="range" min="-50" max="50" step="1" value={balloon.shadowOffsetY ?? 0} onChange={(e) => onUpdate(currentPageId, selectedBubbleId, { shadowOffsetY: parseInt(e.target.value) })} className="w-8 h-1 rounded accent-[#00D1FF]" />
                </div>
            </Tooltip>
            <div className="w-px h-6 bg-white/10" />
            <Tooltip content="Glow preset"><button type="button" onClick={() => onUpdate(currentPageId, selectedBubbleId, { glowBlur: 20, glowSpread: 5, glowOpacity: 1, glowColor: '#10B981' })} className={`${iconBtn} hover:text-emerald-400 hover:bg-emerald-500/10`}><Sparkles size={16} /></button></Tooltip>
            <Tooltip content="Glow color"><div className={iconBtn}><input type="color" value={balloon.glowColor || '#10B981'} onChange={(e) => onUpdate(currentPageId, selectedBubbleId, { glowColor: e.target.value })} className="w-5 h-5 rounded overflow-hidden border border-white/20 cursor-pointer p-0 bg-transparent" /></div></Tooltip>
            <Tooltip content="Glow size / blur / opacity">
                <div className="flex items-center gap-1">
                    <input type="range" min="0" max="50" step="1" value={balloon.glowSpread ?? 0} onChange={(e) => onUpdate(currentPageId, selectedBubbleId, { glowSpread: parseInt(e.target.value) })} className="w-10 h-1 rounded accent-[#00D1FF]" />
                    <input type="range" min="0" max="50" step="1" value={balloon.glowBlur ?? 0} onChange={(e) => onUpdate(currentPageId, selectedBubbleId, { glowBlur: parseInt(e.target.value) })} className="w-10 h-1 rounded accent-[#00D1FF]" />
                    <input type="range" min="0" max="1" step="0.1" value={balloon.glowOpacity ?? 0} onChange={(e) => onUpdate(currentPageId, selectedBubbleId, { glowOpacity: parseFloat(e.target.value) })} className="w-10 h-1 rounded accent-[#00D1FF]" />
                </div>
            </Tooltip>
            <div className="w-px h-6 bg-white/10" />
            <Tooltip content="Texture overlay">
                <div className="flex items-center gap-1">
                    <ImageIcon size={14} className="text-white/60 shrink-0" aria-hidden />
                    <select value={balloon.textureId || ''} onChange={(e) => onUpdate(currentPageId, selectedBubbleId, { textureId: e.target.value })} className="bg-[#1A1A1E] text-white text-xs py-1 pl-1.5 pr-5 rounded-lg border border-white/[0.08] outline-none cursor-pointer min-w-0 max-w-[72px]">
                        <option value="">None</option>
                        {TEXTURE_REGISTRY.map(t => (<option key={t.id} value={t.id}>{t.name}</option>))}
                    </select>
                    {balloon.textureId && <input type="range" min="0.1" max="1" step="0.1" value={balloon.textureOpacity ?? 0.5} onChange={(e) => onUpdate(currentPageId, selectedBubbleId, { textureOpacity: parseFloat(e.target.value) })} className="w-12 h-1 rounded accent-[#00D1FF]" title="Texture opacity" />}
                </div>
            </Tooltip>
            <div className="w-px h-6 bg-white/10" />
            <Tooltip content="Apply these colors and border to all balloons of this shape"><button type="button" onClick={() => useComicStore.getState().syncBalloonStyle(selectedBubbleId)} className={iconBtn}><RefreshCw size={16} /></button></Tooltip>
            <Tooltip content="Flip tail direction"><button type="button" onClick={() => onOverrides({ tailFlip: !balloon.overrides?.tailFlip })} className={`${iconBtn} ${balloon.overrides?.tailFlip ? iconBtnActive : ''}`}><ArrowLeftRight size={16} /></button></Tooltip>
        </>
    );
}

interface TextToolbarProps {
    currentPageId: string;
    selectedBubbleId: string;
    /** 'ribbon' = only first row (font, size, auto-fit, Text/Shape icon buttons). 'expanded' = only the Text/Shape option rows for the second bar. */
    variant?: 'ribbon' | 'expanded';
    /** When variant is 'ribbon' or 'expanded', control expand state from parent. */
    textExpanded?: boolean;
    shapeExpanded?: boolean;
    onTextExpandedChange?: (open: boolean) => void;
    onShapeExpandedChange?: (open: boolean) => void;
}

export const TextToolbar: React.FC<TextToolbarProps> = ({
    currentPageId,
    selectedBubbleId,
    variant,
    textExpanded: textExpandedProp,
    shapeExpanded: shapeExpandedProp,
    onTextExpandedChange,
    onShapeExpandedChange,
}) => {
    const { pages, updateBalloon } = useComicStore();
    const [internalText, setInternalText] = useState(false);
    const [internalShape, setInternalShape] = useState(false);
    const [fontSizeOther, setFontSizeOther] = useState(false);

    const textExpanded = variant ? (textExpandedProp ?? false) : internalText;
    const shapeExpanded = variant ? (shapeExpandedProp ?? false) : internalShape;
    const setTextExpanded = variant ? (onTextExpandedChange ?? (() => {})) : setInternalText;
    const setShapeExpanded = variant ? (onShapeExpandedChange ?? (() => {})) : setInternalShape;

    const page = pages.find(p => p.id === currentPageId);
    const balloon = page?.balloons.find(b => b.id === selectedBubbleId);

    if (!balloon) return null;

    const handleOverrides = (newOverrides: Record<string, any>) => {
        updateBalloon(currentPageId, selectedBubbleId, {
            overrides: { ...(balloon.overrides || {}), ...newOverrides }
        });
    };

    /* Expanded-only: second bar content is rendered in ComicLayout (full width); we render nothing here and ComicLayout will mount us with same props to get the rows) */
    if (variant === 'expanded') {
        return (
            <div className="flex flex-col gap-3 w-full">
                {textExpanded && (
                    <div className="flex items-center gap-3 flex-wrap" data-balloon-text-options>
                        <BalloonTextOptionsRow balloon={balloon} currentPageId={currentPageId} selectedBubbleId={selectedBubbleId} onOverrides={handleOverrides} onUpdate={updateBalloon} />
                    </div>
                )}
                {shapeExpanded && (
                    <div className="flex items-center gap-3 flex-wrap" data-balloon-shape-options>
                        <BalloonShapeOptionsRow balloon={balloon} currentPageId={currentPageId} selectedBubbleId={selectedBubbleId} onOverrides={handleOverrides} onUpdate={updateBalloon} />
                    </div>
                )}
            </div>
        );
    }

    const ribbonRow = (
        <div className="flex items-center gap-3 flex-wrap">
            <FontSelect
                value={balloon.overrides?.fontFamily || balloon.fontFamily || 'Bangers'}
                onChange={(val) => handleOverrides({ fontFamily: val })}
                allowCustom
                compact
                selectClassName="bg-[#1A1A1E] text-white text-xs font-medium border border-white/[0.08] rounded-lg px-2 py-1.5 outline-none cursor-pointer hover:border-[#00D1FF]/40 transition-colors min-w-0 max-w-[140px] h-8"
                inputClassName="ml-1.5 w-20 rounded border border-white/[0.08] bg-[#0F0F12] px-1.5 py-1 text-xs text-white placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-[#00D1FF]/60 h-7"
            />

            <div className="w-px h-6 bg-white/10" />

            <Tooltip content="Font size (preset or type any number)">
                <div className="flex items-center gap-1">
                    <select
                        value={FONT_SIZE_PRESETS.includes(balloon.overrides?.fontSize ?? 16) ? String(balloon.overrides?.fontSize ?? 16) : FONT_SIZE_OTHER}
                        onChange={(e) => {
                            const v = e.target.value;
                            if (v === FONT_SIZE_OTHER) {
                                setFontSizeOther(true);
                                return;
                            }
                            setFontSizeOther(false);
                            handleOverrides({ fontSize: parseInt(v, 10) });
                        }}
                        className="bg-[#1A1A1E] text-white text-xs font-medium border border-white/[0.08] rounded-lg pl-2 pr-6 py-1.5 outline-none cursor-pointer hover:border-[#00D1FF]/40 transition-colors h-8 min-w-[2.75rem] w-14 tabular-nums appearance-none"
                    >
                        {FONT_SIZE_PRESETS.map((n) => (
                            <option key={n} value={String(n)} className="bg-[#1A1A1E] text-white">{n}</option>
                        ))}
                        <option value={FONT_SIZE_OTHER} className="bg-[#1A1A1E] text-white">Other…</option>
                    </select>
                    {(fontSizeOther || !FONT_SIZE_PRESETS.includes(balloon.overrides?.fontSize ?? 16)) && (
                        <input
                            type="number"
                            min={8}
                            max={200}
                            value={balloon.overrides?.fontSize ?? 16}
                            onChange={(e) => handleOverrides({ fontSize: Math.min(200, Math.max(8, parseInt(e.target.value, 10) || 16)) })}
                            className="w-11 h-8 rounded border border-white/[0.08] bg-[#0F0F12] px-1 text-xs text-white text-center tabular-nums focus:outline-none focus:ring-1 focus:ring-[#00D1FF]/60"
                            aria-label="Font size"
                        />
                    )}
                </div>
            </Tooltip>

            <div className="w-px h-6 bg-white/10" />

            <Tooltip content="Auto-fit to text">
                <button
                    type="button"
                    onClick={() => updateBalloon(currentPageId, selectedBubbleId, { autoSize: !(balloon.autoSize !== false) })}
                    className={`${iconBtn} ${balloon.autoSize !== false ? iconBtnActive : ''}`}
                >
                    <Maximize2 size={16} />
                </button>
            </Tooltip>

            <div className="w-px h-6 bg-white/10" />

            {/* Text / Shape: icon-only in ribbon for more room; full label when not variant ribbon */}
            <Tooltip content={textExpanded ? 'Collapse text options' : 'Expand text options'}>
                <button
                    type="button"
                    onClick={() => setTextExpanded(!textExpanded)}
                    className={variant === 'ribbon'
                        ? `${iconBtn} ${textExpanded ? iconBtnActive : ''}`
                        : `flex items-center gap-1.5 px-2 py-1.5 rounded-lg border text-xs font-medium transition-colors ${textExpanded ? 'bg-[#00D1FF]/15 border-[#00D1FF]/40 text-[#00D1FF]' : 'border-white/[0.08] bg-[#1A1A1E] text-white/80 hover:bg-[#00D1FF]/10 hover:text-[#00D1FF]'}`}
                >
                    {variant === 'ribbon' ? <Type size={16} /> : <><Type size={14} /> Text {textExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}</>}
                </button>
            </Tooltip>
            <Tooltip content={shapeExpanded ? 'Collapse shape options' : 'Expand shape options'}>
                <button
                    type="button"
                    onClick={() => setShapeExpanded(!shapeExpanded)}
                    className={variant === 'ribbon'
                        ? `${iconBtn} ${shapeExpanded ? iconBtnActive : ''}`
                        : `flex items-center gap-1.5 px-2 py-1.5 rounded-lg border text-xs font-medium transition-colors ${shapeExpanded ? 'bg-[#00D1FF]/15 border-[#00D1FF]/40 text-[#00D1FF]' : 'border-white/[0.08] bg-[#1A1A1E] text-white/80 hover:bg-[#00D1FF]/10 hover:text-[#00D1FF]'}`}
                >
                    {variant === 'ribbon' ? <Circle size={16} /> : <><Circle size={14} /> Shape {shapeExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}</>}
                </button>
            </Tooltip>
        </div>
    );

    /* Ribbon-only: just the first row */
    if (variant === 'ribbon') {
        return <div className="flex items-center gap-3 pointer-events-auto shrink-0">{ribbonRow}</div>;
    }

    return (
        <div className="flex flex-col gap-2 pointer-events-auto shrink-0">
            {ribbonRow}

            {/* Row 2: Text options (collapsible) */}
            {textExpanded && (
                <div className="flex items-center gap-3 flex-wrap">
                    <BalloonTextOptionsRow balloon={balloon} currentPageId={currentPageId} selectedBubbleId={selectedBubbleId} onOverrides={handleOverrides} onUpdate={updateBalloon} />
                </div>
            )}

            {/* Row 3: Shape options (collapsible) */}
            {shapeExpanded && (
                <div className="flex items-center gap-3 flex-wrap">
                    <BalloonShapeOptionsRow balloon={balloon} currentPageId={currentPageId} selectedBubbleId={selectedBubbleId} onOverrides={handleOverrides} onUpdate={updateBalloon} />
                </div>
            )}

        </div>
    );
};

