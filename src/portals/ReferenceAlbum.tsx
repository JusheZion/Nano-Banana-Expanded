import React, { useEffect, useState } from 'react';
import { useTheme } from '@/shared/context/ThemeContext';
import { AssetVault } from '@/components/ui/AssetVault';
import { CharacterVault } from '@/components/ui/CharacterVault';
import { NpcVault } from '@/components/ui/NpcVault';

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
                <NpcVault />
            )}
        </div>
    );
};
