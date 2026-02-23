import React from 'react';
import { useComicStore } from '../../../stores/comicStore';
import { TEXTURE_REGISTRY } from '../data/TextureRegistry';
import { Tooltip } from '../../../components/ui/Tooltip';

interface TextToolbarProps {
    currentPageId: string;
    selectedBubbleId: string;
}

export const TextToolbar: React.FC<TextToolbarProps> = ({ currentPageId, selectedBubbleId }) => {
    const { pages, updateBalloon } = useComicStore();

    const page = pages.find(p => p.id === currentPageId);
    const balloon = page?.balloons.find(b => b.id === selectedBubbleId);

    if (!balloon) return null;

    const handleOverrides = (newOverrides: Record<string, any>) => {
        updateBalloon(currentPageId, selectedBubbleId, {
            overrides: { ...(balloon.overrides || {}), ...newOverrides }
        });
    };

    return (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 max-w-[95vw] overflow-x-auto bg-zinc-900 border border-white/20 rounded-2xl px-4 py-2 flex items-center gap-4 shadow-2xl z-50 animate-in fade-in slide-in-from-bottom-4 duration-200">

            {/* Font Family */}
            <select
                value={balloon.overrides?.fontFamily || 'Bangers'}
                onChange={(e) => handleOverrides({ fontFamily: e.target.value })}
                className="bg-transparent text-white text-sm font-medium border-none outline-none cursor-pointer hover:text-gold-400 transition-colors"
                style={{ fontFamily: balloon.overrides?.fontFamily || 'Bangers' }}
            >
                <option value="Bangers" className="bg-zinc-800 text-white font-[Bangers]">Bangers</option>
                <option value="Orbitron" className="bg-zinc-800 text-white font-[Orbitron]">Orbitron</option>
                <option value="Roboto" className="bg-zinc-800 text-white font-[Roboto]">Roboto</option>
            </select>

            <div className="w-px h-6 bg-white/10" />

            {/* Font Size */}
            <div className="flex items-center gap-1">
                <Tooltip content="Decrease Size">
                    <button
                        onClick={() => handleOverrides({ fontSize: Math.max(8, (balloon.overrides?.fontSize || 16) - 2) })}
                        className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 text-white/70 hover:text-white transition-colors"
                    >
                        -
                    </button>
                </Tooltip>
                <span className="text-white text-sm w-8 text-center">{balloon.overrides?.fontSize || 16}</span>
                <Tooltip content="Increase Size">
                    <button
                        onClick={() => handleOverrides({ fontSize: Math.min(72, (balloon.overrides?.fontSize || 16) + 2) })}
                        className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 text-white/70 hover:text-white transition-colors"
                    >
                        +
                    </button>
                </Tooltip>
            </div>

            <div className="w-px h-6 bg-white/10" />

            {/* Auto-Size Toggle */}
            <Tooltip content="Auto-Size to Fit Text">
                <button
                    onClick={() => updateBalloon(currentPageId, selectedBubbleId, { autoSize: !(balloon.autoSize !== false) })}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${balloon.autoSize !== false ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30' : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white'}`}
                >
                    Auto-Fit
                </button>
            </Tooltip>

            {/* Padding Slider (Only if Auto-Size is ON) */}
            {balloon.autoSize !== false && (
                <React.Fragment>
                    <div className="w-px h-6 bg-white/10" />
                    <Tooltip content="Padding">
                        <div className="flex items-center gap-2">
                            <span className="text-white/50 text-xs text-nowrap">Pad:</span>
                            <input
                                type="range"
                                min="0"
                                max="100"
                                step="5"
                                value={balloon.padding ?? 20}
                                onChange={(e) => updateBalloon(currentPageId, selectedBubbleId, { padding: parseInt(e.target.value) })}
                                className="w-16 h-1 bg-white/10 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-indigo-500 [&::-webkit-slider-thumb]:rounded-full"
                            />
                            <span className="text-white text-xs w-5 text-right">{balloon.padding ?? 20}</span>
                        </div>
                    </Tooltip>
                </React.Fragment>
            )}

            <div className="w-px h-6 bg-white/10" />

            {/* Text Color */}
            <Tooltip content="Text Color">
                <div className="relative group">
                    <input
                        type="color"
                        value={balloon.overrides?.textColor || '#000000'}
                        onChange={(e) => handleOverrides({ textColor: e.target.value })}
                        className="w-8 h-8 rounded-full overflow-hidden border-2 border-white/20 cursor-pointer p-0 bg-transparent"
                    />
                </div>
            </Tooltip>

            <div className="w-px h-6 bg-white/10" />

            {/* Bubble Fill */}
            <Tooltip content="Bubble Fill">
                <div className="relative group">
                    <div className="absolute inset-0 rounded-full border border-white/10 pointer-events-none" />
                    <input
                        type="color"
                        value={balloon.overrides?.fill || '#ffffff'}
                        onChange={(e) => handleOverrides({ fill: e.target.value })}
                        className="w-8 h-8 rounded-full overflow-hidden border-2 border-white/20 cursor-pointer p-0 bg-transparent"
                    />
                </div>
            </Tooltip>

            {/* Bubble Stroke */}
            <Tooltip content="Bubble Border">
                <div className="relative group">
                    <div className="absolute inset-0 rounded-full border-2 border-white/10 pointer-events-none" />
                    <input
                        type="color"
                        value={balloon.overrides?.stroke || '#000000'}
                        onChange={(e) => handleOverrides({ stroke: e.target.value })}
                        className="w-8 h-8 rounded-full overflow-hidden border-2 border-white/20 cursor-pointer p-0 bg-transparent"
                    />
                </div>
            </Tooltip>

            {/* Stroke Width */}
            <Tooltip content="Border Width">
                <div className="flex items-center gap-2">
                    <span className="text-white/50 text-xs text-nowrap">Border:</span>
                    <input
                        type="range"
                        min="0"
                        max="10"
                        step="1"
                        value={balloon.overrides?.strokeWidth ?? 2}
                        onChange={(e) => handleOverrides({ strokeWidth: parseInt(e.target.value) })}
                        className="w-16 h-1 bg-white/10 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-gold-500 [&::-webkit-slider-thumb]:rounded-full"
                    />
                    <span className="text-white text-xs w-3">{balloon.overrides?.strokeWidth ?? 2}</span>
                </div>
            </Tooltip>

            <div className="w-px h-6 bg-white/10" />

            {/* FX Controls (Balloons) */}
            <div className="flex items-center gap-2">
                <Tooltip content="Shadow Color">
                    <div className="relative group">
                        <input
                            type="color"
                            value={balloon.shadowColor || '#000000'}
                            onChange={(e) => updateBalloon(currentPageId, selectedBubbleId, { shadowColor: e.target.value })}
                            className="w-6 h-6 rounded-full overflow-hidden border-2 border-white/20 cursor-pointer p-0 bg-transparent"
                        />
                    </div>
                </Tooltip>

                <Tooltip content="Drop Shadow Preset">
                    <button
                        onClick={() => updateBalloon(currentPageId, selectedBubbleId, { shadowBlur: 10, shadowOffsetX: 5, shadowOffsetY: 5, shadowOpacity: 0.5, shadowColor: '#000000' })}
                        className="px-2 py-1 hover:bg-white/10 rounded text-white/70 hover:text-white font-bold text-[10px] uppercase tracking-wider transition-colors"
                    >
                        Shdw
                    </button>
                </Tooltip>
                <div className="flex flex-col gap-1 ml-1">
                    <div className="flex items-center gap-1" title="Shadow Blur">
                        <span className="text-white/50 text-[9px] w-6">Blur</span>
                        <input
                            type="range"
                            min="0"
                            max="50"
                            step="1"
                            value={balloon.shadowBlur ?? 0}
                            onChange={(e) => updateBalloon(currentPageId, selectedBubbleId, { shadowBlur: parseInt(e.target.value) })}
                            className="w-12 h-1 bg-white/10 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2 [&::-webkit-slider-thumb]:h-2 [&::-webkit-slider-thumb]:bg-gold-500 [&::-webkit-slider-thumb]:rounded-full"
                        />
                    </div>
                    <div className="flex items-center gap-1" title="Shadow Opacity">
                        <span className="text-white/50 text-[9px] w-6">Opac</span>
                        <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.1"
                            value={balloon.shadowOpacity ?? 0}
                            onChange={(e) => updateBalloon(currentPageId, selectedBubbleId, { shadowOpacity: parseFloat(e.target.value) })}
                            className="w-12 h-1 bg-white/10 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2 [&::-webkit-slider-thumb]:h-2 [&::-webkit-slider-thumb]:bg-gold-500 [&::-webkit-slider-thumb]:rounded-full"
                        />
                    </div>
                </div>
                <div className="flex flex-col gap-1 ml-1" title="Shadow Offset">
                    <div className="flex items-center gap-1" title="Shadow X">
                        <span className="text-white/50 text-[9px] w-4">X</span>
                        <input
                            type="range"
                            min="-50"
                            max="50"
                            step="1"
                            value={balloon.shadowOffsetX ?? 0}
                            onChange={(e) => updateBalloon(currentPageId, selectedBubbleId, { shadowOffsetX: parseInt(e.target.value) })}
                            className="w-12 h-1 bg-white/10 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2 [&::-webkit-slider-thumb]:h-2 [&::-webkit-slider-thumb]:bg-gold-500 [&::-webkit-slider-thumb]:rounded-full"
                        />
                    </div>
                    <div className="flex items-center gap-1" title="Shadow Y">
                        <span className="text-white/50 text-[9px] w-4">Y</span>
                        <input
                            type="range"
                            min="-50"
                            max="50"
                            step="1"
                            value={balloon.shadowOffsetY ?? 0}
                            onChange={(e) => updateBalloon(currentPageId, selectedBubbleId, { shadowOffsetY: parseInt(e.target.value) })}
                            className="w-12 h-1 bg-white/10 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2 [&::-webkit-slider-thumb]:h-2 [&::-webkit-slider-thumb]:bg-gold-500 [&::-webkit-slider-thumb]:rounded-full"
                        />
                    </div>
                </div>

                {/* Glow Controls */}
                <div className="flex items-center gap-2 border-l border-white/10 pl-2 ml-1">
                    <Tooltip content="Green Glow Preset">
                        <button
                            onClick={() => updateBalloon(currentPageId, selectedBubbleId, { glowBlur: 20, glowSpread: 5, glowOpacity: 1, glowColor: '#10B981' })}
                            className="px-2 py-1 hover:bg-emerald-500/20 rounded text-emerald-400 font-bold text-[10px] uppercase tracking-wider transition-colors"
                        >
                            Glow
                        </button>
                    </Tooltip>
                    <Tooltip content="Glow Color">
                        <div className="relative group">
                            <input
                                type="color"
                                value={balloon.glowColor || '#10B981'}
                                onChange={(e) => updateBalloon(currentPageId, selectedBubbleId, { glowColor: e.target.value })}
                                className="w-6 h-6 rounded-full overflow-hidden border-2 border-white/20 cursor-pointer p-0 bg-transparent"
                            />
                        </div>
                    </Tooltip>
                    <div className="flex flex-col gap-1 ml-1">
                        <div className="flex items-center gap-1" title="Glow Size">
                            <span className="text-white/50 text-[9px] w-6">Size</span>
                            <input
                                type="range"
                                min="0"
                                max="50"
                                step="1"
                                value={balloon.glowSpread ?? 0}
                                onChange={(e) => updateBalloon(currentPageId, selectedBubbleId, { glowSpread: parseInt(e.target.value) })}
                                className="w-12 h-1 bg-white/10 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2 [&::-webkit-slider-thumb]:h-2 [&::-webkit-slider-thumb]:bg-cyan-500 [&::-webkit-slider-thumb]:rounded-full"
                            />
                        </div>
                        <div className="flex items-center gap-1" title="Glow Blur">
                            <span className="text-white/50 text-[9px] w-6">Blur</span>
                            <input
                                type="range"
                                min="0"
                                max="50"
                                step="1"
                                value={balloon.glowBlur ?? 0}
                                onChange={(e) => updateBalloon(currentPageId, selectedBubbleId, { glowBlur: parseInt(e.target.value) })}
                                className="w-12 h-1 bg-white/10 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2 [&::-webkit-slider-thumb]:h-2 [&::-webkit-slider-thumb]:bg-cyan-500 [&::-webkit-slider-thumb]:rounded-full"
                            />
                        </div>
                    </div>
                    <div className="flex flex-col gap-1 ml-1" title="Glow Opacity">
                        <div className="flex items-center gap-1">
                            <span className="text-white/50 text-[9px] w-6">Opac</span>
                            <input
                                type="range"
                                min="0"
                                max="1"
                                step="0.1"
                                value={balloon.glowOpacity ?? 0}
                                onChange={(e) => updateBalloon(currentPageId, selectedBubbleId, { glowOpacity: parseFloat(e.target.value) })}
                                className="w-12 h-1 bg-white/10 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2 [&::-webkit-slider-thumb]:h-2 [&::-webkit-slider-thumb]:bg-cyan-500 [&::-webkit-slider-thumb]:rounded-full"
                            />
                        </div>
                    </div>
                </div>

                {/* Texture Overlay */}
                <div className="flex items-center gap-1 border-l border-white/10 pl-2 ml-1" title="Texture Overlay">
                    <select
                        value={balloon.textureId || ''}
                        onChange={(e) => updateBalloon(currentPageId, selectedBubbleId, { textureId: e.target.value })}
                        className="bg-zinc-800 text-white text-[10px] font-medium border border-white/20 rounded px-1 min-w-[60px] outline-none cursor-pointer"
                    >
                        <option value="">No Texture</option>
                        {TEXTURE_REGISTRY.map(t => (
                            <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                    </select>
                    {balloon.textureId && (
                        <input
                            type="range"
                            min="0.1"
                            max="1"
                            step="0.1"
                            value={balloon.textureOpacity ?? 0.5}
                            onChange={(e) => updateBalloon(currentPageId, selectedBubbleId, { textureOpacity: parseFloat(e.target.value) })}
                            className="w-12 h-1 bg-white/10 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2 [&::-webkit-slider-thumb]:h-2 [&::-webkit-slider-thumb]:bg-gold-500 [&::-webkit-slider-thumb]:rounded-full"
                            title="Texture Opacity"
                        />
                    )}
                </div>
            </div>

            <div className="w-px h-6 bg-white/10" />

            <div className="w-px h-6 bg-white/10" />

            {/* Global Sync Toggle */}
            <Tooltip content="Apply these colors and border globally to all balloons of this shape!">
                <button
                    onClick={() => useComicStore.getState().syncBalloonStyle(selectedBubbleId)}
                    className="flex items-center gap-2 px-3 py-1.5 hover:bg-white/10 rounded-lg text-sm font-medium text-gold-400 transition-colors"
                >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 2v6h-6"></path>
                        <path d="M3 12a9 9 0 0 1 15-6.7L21 8"></path>
                        <path d="M3 22v-6h6"></path>
                        <path d="M21 12a9 9 0 0 1-15 6.7L3 16"></path>
                    </svg>
                    Sync All
                </button>
            </Tooltip>

            {/* Tail Flip Toggle */}
            <Tooltip content="Flip Tail Direction">
                <button
                    onClick={() => handleOverrides({ tailFlip: !balloon.overrides?.tailFlip })}
                    className={`w-8 h-8 flex items-center justify-center rounded-full transition-colors ${balloon.overrides?.tailFlip ? 'bg-gold-500/20 text-gold-400' : 'hover:bg-white/10 text-white/70 hover:text-white'}`}
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 12h14" />
                        <path d="m13 8 4 4-4 4" />
                        <path d="M21 12v.01" />
                    </svg>
                </button>
            </Tooltip>

        </div>
    );
};

