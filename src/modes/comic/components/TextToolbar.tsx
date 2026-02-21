import React from 'react';
import { useComicStore } from '../../../stores/comicStore';

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
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 bg-zinc-900 border border-white/20 rounded-full px-4 py-2 flex items-center gap-4 shadow-2xl z-50 animate-in fade-in slide-in-from-bottom-4 duration-200">

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
                <button
                    onClick={() => handleOverrides({ fontSize: Math.max(8, (balloon.overrides?.fontSize || 16) - 2) })}
                    className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 text-white/70 hover:text-white transition-colors"
                    title="Decrease Size"
                >
                    -
                </button>
                <span className="text-white text-sm w-8 text-center">{balloon.overrides?.fontSize || 16}</span>
                <button
                    onClick={() => handleOverrides({ fontSize: Math.min(72, (balloon.overrides?.fontSize || 16) + 2) })}
                    className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 text-white/70 hover:text-white transition-colors"
                    title="Increase Size"
                >
                    +
                </button>
            </div>

            <div className="w-px h-6 bg-white/10" />

            {/* Text Color */}
            <div className="relative group" title="Text Color">
                <input
                    type="color"
                    value={balloon.overrides?.textColor || '#000000'}
                    onChange={(e) => handleOverrides({ textColor: e.target.value })}
                    className="w-8 h-8 rounded-full overflow-hidden border-2 border-white/20 cursor-pointer p-0 bg-transparent"
                />
            </div>

            <div className="w-px h-6 bg-white/10" />

            {/* Bubble Fill */}
            <div className="relative group" title="Bubble Fill">
                <div className="absolute inset-0 rounded-full border border-white/10 pointer-events-none" />
                <input
                    type="color"
                    value={balloon.overrides?.fill || '#ffffff'}
                    onChange={(e) => handleOverrides({ fill: e.target.value })}
                    className="w-8 h-8 rounded-full overflow-hidden border-2 border-white/20 cursor-pointer p-0 bg-transparent"
                />
            </div>

            {/* Bubble Stroke */}
            <div className="relative group" title="Bubble Border">
                <div className="absolute inset-0 rounded-full border-2 border-white/10 pointer-events-none" />
                <input
                    type="color"
                    value={balloon.overrides?.stroke || '#000000'}
                    onChange={(e) => handleOverrides({ stroke: e.target.value })}
                    className="w-8 h-8 rounded-full overflow-hidden border-2 border-white/20 cursor-pointer p-0 bg-transparent"
                />
            </div>

            {/* Stroke Width */}
            <div className="flex items-center gap-2" title="Border Width">
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

            <div className="w-px h-6 bg-white/10" />

            {/* Tail Flip Toggle */}
            <button
                onClick={() => handleOverrides({ tailFlip: !balloon.overrides?.tailFlip })}
                className={`w-8 h-8 flex items-center justify-center rounded-full transition-colors ${balloon.overrides?.tailFlip ? 'bg-gold-500/20 text-gold-400' : 'hover:bg-white/10 text-white/70 hover:text-white'}`}
                title="Flip Tail Direction"
            >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 12h14" />
                    <path d="m13 8 4 4-4 4" />
                    <path d="M21 12v.01" />
                </svg>
            </button>

        </div>
    );
};

