import React, { useState, type KeyboardEvent } from 'react';
import type { ChipTag } from '../utils/PromptCompiler';
import { PromptCompiler } from '../utils/PromptCompiler';
// import { useTheme } from '../context/ThemeContext';

interface HybridTagBarProps {
    tags: ChipTag[];
    setTags: (tags: ChipTag[]) => void;
    onManualInput?: (text: string) => void;
}

export const HybridTagBar: React.FC<HybridTagBarProps> = ({ tags, setTags, onManualInput }) => {
    const [inputValue, setInputValue] = useState('');
    // const { activeTheme } = useTheme(); // activeTheme was unused in fixed version

    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            addTag();
        }
    };

    const addTag = () => {
        const text = inputValue.trim();
        if (!text) return;

        const newTag: ChipTag = {
            id: crypto.randomUUID(),
            text: PromptCompiler.hyphenate(text),
            polarity: 'positive',
        };

        setTags([...tags, newTag]);
        setInputValue('');
    };

    const togglePolarity = (id: string) => {
        setTags(tags.map(tag => {
            if (tag.id !== id) return tag;

            // Cycle: Positive -> Negative -> Neutral (Off) -> Positive
            // But maybe "Neutral" means removed? Or just greyed out?
            // User requirement: "3-tier polarity tables". "Clickable chips".
            // Usually Tier 1: Pos (Green), Tier 2: Neg (Red), Tier 3: Off/Neutral (Grey outline).
            // Assuming neutral means "inactive but still in list"? Or removed?
            // If removed, user can't cycle back. So better to keep it as "inactive".

            if (tag.polarity === 'positive') return { ...tag, polarity: 'negative' };
            if (tag.polarity === 'negative') return { ...tag, polarity: 'neutral' };
            return { ...tag, polarity: 'positive' };
        }));
    };

    const removeTag = (id: string, e: React.MouseEvent) => {
        e.stopPropagation(); // prevent toggle
        setTags(tags.filter(t => t.id !== id));
    };

    const getChipStyle = (polarity: ChipTag['polarity']) => {
        switch (polarity) {
            case 'positive':
                return 'bg-emerald-600 border-emerald-600 text-white shadow-[0_0_10px_rgba(16,185,129,0.4)] hover:bg-emerald-500';
            case 'negative':
                return 'bg-red-600 border-red-600 text-white shadow-[0_0_10px_rgba(239,68,68,0.4)] hover:bg-red-500';
            case 'neutral':
            default:
                return 'bg-transparent border-white/20 text-white/50 hover:border-white/50 hover:text-white';
        }
    };

    return (
        <div className="w-full glass-panel rounded-2xl p-4 flex flex-col gap-3">
            {/* Chips Area */}
            <div className="flex flex-wrap gap-2 min-h-[40px]">
                {tags.map(tag => (
                    <div
                        key={tag.id}
                        onClick={() => togglePolarity(tag.id)}
                        className={`
              cursor-pointer px-3 py-1 rounded-full border transition-all duration-200 flex items-center gap-2 select-none
              ${getChipStyle(tag.polarity)}
            `}
                    >
                        <span>{tag.text}</span>
                        {/* Tiny indicator or remove button? Requirement says "clickable chips". */}
                        {/* 3-tier: Pos, Neg, Off. Maybe 'x' to remove completely? */}
                        <button
                            onClick={(e) => removeTag(tag.id, e)}
                            className="hover:text-white/80 opacity-60 hover:opacity-100"
                        >
                            ×
                        </button>
                    </div>
                ))}
            </div>

            {/* Input Area */}
            <input
                type="text"
                value={inputValue}
                onChange={(e) => {
                    setInputValue(e.target.value);
                    onManualInput?.(e.target.value); // Pass up for real-time compilation if needed
                }}
                onKeyDown={handleKeyDown}
                placeholder="Type tag and press Enter..."
                className="w-full bg-black/30 text-white placeholder-white/30 px-4 py-2 rounded-xl border border-white/10 focus:outline-none focus:border-[var(--theme-accent)] transition-colors font-mono"
            />
        </div>
    );
};
