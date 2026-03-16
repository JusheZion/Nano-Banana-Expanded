import React, { useState, useEffect } from 'react';
import { useTheme } from '@/shared/context/ThemeContext';
import { getAssetsGroupedByCollection } from '@/shared/api/arcsArchive';
import type { AssetArchiveItem } from '@/shared/api/arcsArchive';

/** Amethyst accent for asset archive (match Assets Studio). */
const AMETHYST = '#8B5CF6';
const AMETHYST_LIGHT = '#A78BFA';

export const AssetArchiveGallery: React.FC = () => {
    const [hoveredKey, setHoveredKey] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [grouped, setGrouped] = useState<Record<string, AssetArchiveItem[]>>({});
    useTheme();

    useEffect(() => {
        setLoading(true);
        getAssetsGroupedByCollection()
            .then(setGrouped)
            .finally(() => setLoading(false));
    }, []);

    const collectionNames = Object.keys(grouped);
    const totalItems = collectionNames.reduce((acc, k) => acc + grouped[k].length, 0);

    return (
        <div className="w-full px-8 py-8 animate-fade-in">
            {/* Header */}
            <div className="relative mb-10 mt-4">
                <h1 className="text-6xl font-extralight tracking-widest drop-shadow-lg leading-none" style={{ color: AMETHYST }}>
                    ASSET
                    <br />
                    <span className="font-black text-transparent bg-clip-text bg-gradient-to-r from-[#8B5CF6] via-[#A78BFA] to-[#C4B5FD] tracking-[0.2em]">ARCHIVE</span>
                </h1>
                <p className="text-xl mt-4 max-w-xl font-light tracking-wide flex items-center gap-2" style={{ color: `${AMETHYST}99` }}>
                    <span className="w-8 h-[1px] bg-white/40" style={{ backgroundColor: `${AMETHYST}66` }}></span>
                    Settings &amp; locations. <span className="text-white/90 font-medium">Grouped by collection.</span>
                </p>
            </div>

            {loading ? (
                <p className="text-white/50 text-center py-12">Loading archive…</p>
            ) : totalItems === 0 ? (
                <p className="text-white/50 text-center py-12">No assets yet. Save from Asset Reference Studio.</p>
            ) : (
                <div className="space-y-12 pb-20">
                    {collectionNames.map((collectionName) => {
                        const items = grouped[collectionName];
                        const sectionLabel = collectionName || 'Unnamed';
                        return (
                            <section key={sectionLabel}>
                                <h2 className="text-2xl font-semibold tracking-wide mb-6 border-b pb-2" style={{ color: AMETHYST, borderColor: `${AMETHYST}4D` }}>
                                    {sectionLabel}
                                </h2>
                                <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-6">
                                    {items.map((item, index) => {
                                        const cardKey = `${item.id}-${index}`;
                                        const heightClass = index % 3 === 0 ? 'h-[380px]' : 'h-[280px]';
                                        const isHovered = hoveredKey === cardKey;
                                        const displayName = item.name ?? item.asset_name ?? 'Asset';
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
                                                    ${isHovered ? 'translate-y-[-4px] border-violet-500/50 shadow-[0_10px_40px_-10px_rgba(139,92,246,0.3)] ring-1 ring-violet-500/20' : ''}
                                                `}
                                                onMouseEnter={() => setHoveredKey(cardKey)}
                                                onMouseLeave={() => setHoveredKey(null)}
                                            >
                                                <img
                                                    src={item.image_url}
                                                    alt={displayName}
                                                    className={`
                                                        w-full h-full object-cover
                                                        transition-transform duration-700 ease-out
                                                        opacity-90 group-hover:opacity-100
                                                        ${isHovered ? 'scale-110' : 'scale-100'}
                                                    `}
                                                />
                                                <div className={`
                                                    absolute inset-0 bg-gradient-to-t from-violet-600/80 via-transparent to-transparent
                                                    transition-opacity duration-300
                                                    ${isHovered ? 'opacity-100' : 'opacity-0'}
                                                `} />
                                                <div className={`
                                                    absolute bottom-0 left-0 p-6 w-full transform transition-all duration-300
                                                    ${isHovered ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}
                                                `}>
                                                    <div className="text-xs font-bold tracking-widest mb-1" style={{ color: AMETHYST_LIGHT }}>
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
