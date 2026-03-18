import React, { useState, useEffect, useCallback } from 'react';
import { useTheme } from '@/shared/context/ThemeContext';
import { getCharactersGroupedByProfile } from '@/shared/api/arcsArchive';
import type { CharacterArchiveItem } from '@/shared/api/arcsArchive';
import { ArchiveThumbnailFocusModal } from '@/components/ui/ArchiveThumbnailFocusModal';

export const CinematicGallery: React.FC = () => {
    const [hoveredKey, setHoveredKey] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [grouped, setGrouped] = useState<Record<string, CharacterArchiveItem[]>>({});
    const [focusEditItem, setFocusEditItem] = useState<CharacterArchiveItem | null>(null);
    useTheme();

    const refreshArchive = useCallback(() => {
        void getCharactersGroupedByProfile().then(setGrouped);
    }, []);

    useEffect(() => {
        setLoading(true);
        getCharactersGroupedByProfile()
            .then(setGrouped)
            .finally(() => setLoading(false));
    }, []);

    const profileNames = Object.keys(grouped);
    const totalItems = profileNames.reduce((acc, k) => acc + grouped[k].length, 0);

    return (
        <div className="w-full px-8 py-8 animate-fade-in relative">
            {focusEditItem && (
                <ArchiveThumbnailFocusModal
                    item={focusEditItem}
                    onClose={() => setFocusEditItem(null)}
                    onSaved={refreshArchive}
                />
            )}
            {/* Header */}
            <div className="relative mb-10 mt-4">
                <h1 className="text-6xl font-extralight tracking-widest text-[#D4AF37] drop-shadow-lg leading-none">
                    CHARACTER
                    <br />
                    <span className="font-black text-transparent bg-clip-text bg-gradient-to-r from-[#D4AF37] via-[#FBF5D4] to-[#893741] tracking-[0.2em]">ARCHIVE</span>
                </h1>
                <p className="text-xl text-[#D4AF37]/60 mt-4 max-w-xl font-light tracking-wide flex items-center gap-2">
                    <span className="w-8 h-[1px] bg-[#D4AF37]/40"></span>
                    High-fidelity visual library. <span className="text-white/90 font-medium">Constrained for clarity.</span>
                </p>
            </div>

            {loading ? (
                <p className="text-white/50 text-center py-12">Loading archive…</p>
            ) : totalItems === 0 ? (
                <p className="text-white/50 text-center py-12">No character references yet. Save from Reference Character Studio.</p>
            ) : (
                <div className="space-y-12 pb-20">
                    {profileNames.map((profileName) => {
                        const items = grouped[profileName];
                        const sectionLabel = profileName || 'Unnamed';
                        return (
                            <section key={sectionLabel}>
                                <h2 className="text-2xl font-semibold text-[#D4AF37] tracking-wide mb-6 border-b border-[#D4AF37]/30 pb-2">
                                    {sectionLabel}
                                </h2>
                                <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-6">
                                    {items.map((item, index) => {
                                        const cardKey = `${item.id}-${index}`;
                                        const heightClass = index % 3 === 0 ? 'h-[380px]' : 'h-[280px]';
                                        const isHovered = hoveredKey === cardKey;
                                        const displayName = item.name ?? item.cast_name ?? 'Visual Reference';
                                        const fx = item.thumbnail_focus_x ?? 50;
                                        const fy = item.thumbnail_focus_y ?? 50;
                                        const fsc = item.thumbnail_scale ?? 1;
                                        const hoverMul = isHovered ? 1.1 : 1;
                                        return (
                                            <div
                                                key={cardKey}
                                                className={`
                                                    relative overflow-hidden rounded-[16px]
                                                    border border-[rgba(255,255,255,0.08)]
                                                    bg-white/[0.03] backdrop-blur-[16px]
                                                    ${heightClass}
                                                    transition-all duration-400 ease-[cubic-bezier(0.4,0,0.2,1)]
                                                    shadow-[0_4px_30px_rgba(0,0,0,0.1)]
                                                    group cursor-pointer
                                                    ${isHovered ? 'translate-y-[-4px] border-[#5F368E]/50 shadow-[0_10px_40px_-10px_rgba(95,54,142,0.3)] ring-1 ring-[#5F368E]/20' : ''}
                                                `}
                                                onMouseEnter={() => setHoveredKey(cardKey)}
                                                onMouseLeave={() => setHoveredKey(null)}
                                            >
                                                <button
                                                    type="button"
                                                    className="absolute top-3 right-3 z-20 px-2.5 py-1 rounded-lg text-[10px] font-bold tracking-wider uppercase bg-black/60 border border-[#D4AF37]/50 text-[#D4AF37] opacity-0 group-hover:opacity-100 hover:bg-[#D4AF37]/20 transition-opacity"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setFocusEditItem(item);
                                                    }}
                                                >
                                                    Framing
                                                </button>
                                                <img
                                                    src={item.image_url}
                                                    alt={displayName}
                                                    className={`
                                                        w-full h-full object-cover
                                                        transition-transform duration-700 ease-out
                                                        opacity-90 group-hover:opacity-100
                                                    `}
                                                    style={{
                                                        objectPosition: `${fx}% ${fy}%`,
                                                        transform: `scale(${fsc * hoverMul})`,
                                                        transformOrigin: `${fx}% ${fy}%`,
                                                    }}
                                                />
                                                <div className={`
                                                    absolute inset-0 bg-gradient-to-t from-[#5F368E]/80 via-transparent to-transparent
                                                    transition-opacity duration-300
                                                    ${isHovered ? 'opacity-100' : 'opacity-0'}
                                                `} />
                                                <div className={`
                                                    absolute bottom-0 left-0 p-6 w-full transform transition-all duration-300
                                                    ${isHovered ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}
                                                `}>
                                                    <div className="text-xs font-bold text-[#BF5AF2] tracking-widest mb-1">
                                                        {sectionLabel}
                                                    </div>
                                                    <div className="text-white font-bold text-lg leading-none">{displayName}</div>
                                                    {item.seed != null && (
                                                        <div className="text-[10px] text-white/70 font-mono mt-1">Seed: #{item.seed}</div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </section>
                        );
                    })}
                </div>
            )}
        </div>
    );
};
