import React, { useEffect, useState } from 'react';
import { useTheme } from '@/shared/context/ThemeContext';
import { AssetVault } from '@/components/ui/AssetVault';
import { CharacterVault } from '@/components/ui/CharacterVault';

type ArchiveTab = 'character' | 'asset' | 'supporting';

export const ReferenceAlbum: React.FC = () => {
    const { setTheme } = useTheme();
    const [tab, setTab] = useState<ArchiveTab>('character');

    useEffect(() => {
        setTheme('purple');
    }, [setTheme]);

    return (
        <div className="min-h-screen text-white pt-20 pb-12">
            {/* Characters | Assets (Image Vault) */}
            <div className="flex justify-center gap-2 mb-4 px-8">
                <button
                    type="button"
                    onClick={() => setTab('character')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                        tab === 'character'
                            ? 'bg-amber-500/20 border-amber-500/50 text-amber-200'
                            : 'border-white/20 text-white/70 hover:border-white/40 hover:text-white/90'
                    }`}
                >
                    Characters
                </button>
                <button
                    type="button"
                    onClick={() => setTab('asset')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                        tab === 'asset'
                            ? 'bg-violet-500/20 border-violet-500/50 text-violet-200'
                            : 'border-white/20 text-white/70 hover:border-white/40 hover:text-white/90'
                    }`}
                >
                    Assets
                </button>
                <button
                    type="button"
                    onClick={() => setTab('supporting')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                        tab === 'supporting'
                            ? 'bg-fuchsia-500/20 border-fuchsia-500/50 text-fuchsia-200'
                            : 'border-white/20 text-white/70 hover:border-white/40 hover:text-white/90'
                    }`}
                >
                    NPC Vault
                </button>
            </div>
            {tab === 'character' ? (
                <CharacterVault />
            ) : tab === 'asset' ? (
                <AssetVault />
            ) : (
                <div className="mx-auto w-full max-w-4xl rounded-2xl border border-white/10 bg-black/25 p-6 text-white/80">
                    <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-fuchsia-200/70">
                        Illustrator’s Imageshop lane
                    </p>
                    <h2 className="mt-2 text-lg font-semibold text-white">NPC Vault</h2>
                    <p className="mt-2 text-sm leading-relaxed text-white/70">
                        This vault holds quick refs coming out of Illustrator’s Imageshop: one-off NPCs, cameo characters,
                        exploratory environments, and mood-board images that should stay separate from long-lived
                        Character and Asset vault records.
                    </p>
                    <p className="mt-3 text-sm leading-relaxed text-white/60">
                        Storage and promotion flows are being wired incrementally. Until then, use Illustrator’s Imageshop
                        to generate NPC refs and promote only the images that need full Character Studio or Asset Studio
                        continuity.
                    </p>
                </div>
            )}
        </div>
    );
};
