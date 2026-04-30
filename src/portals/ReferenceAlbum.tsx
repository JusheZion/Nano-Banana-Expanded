import React, { useEffect, useState } from 'react';
import { useTheme } from '@/shared/context/ThemeContext';
import { AssetVault } from '@/components/ui/AssetVault';
import { CharacterVault } from '@/components/ui/CharacterVault';
import { NpcVault } from '@/components/ui/NpcVault';
import { useGuidedComicVaultBridge } from '@/stores/guidedComicVaultBridge';

type ArchiveTab = 'character' | 'asset' | 'supporting';

export const ReferenceAlbum: React.FC = () => {
    const { setTheme } = useTheme();
    const pendingGuidedTarget = useGuidedComicVaultBridge((s) => s.pendingTarget);
    const cancelAndReturnToComic = useGuidedComicVaultBridge((s) => s.cancelAndReturnToComic);
    const [tab, setTab] = useState<ArchiveTab>('character');

    useEffect(() => {
        setTheme('purple');
    }, [setTheme]);

    useEffect(() => {
        if (!pendingGuidedTarget) return;
        setTab(pendingGuidedTarget.type === 'character' ? 'character' : 'asset');
    }, [pendingGuidedTarget]);

    return (
        <div className="min-h-screen text-white pt-20 pb-12 bg-[linear-gradient(135deg,#050816_0%,#0b1024_52%,#050816_100%)]">
            {pendingGuidedTarget ? (
                <div className="sticky top-4 z-30 mx-auto mb-6 flex max-w-6xl flex-col gap-3 rounded-2xl border border-amber-300/35 bg-[#07101f]/95 px-5 py-4 text-amber-50 shadow-2xl shadow-black/35 backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-amber-200/70">
                            Guided Comic Flow reference pick
                        </p>
                        <p className="mt-1 text-base font-black">
                            Select a vault image for {pendingGuidedTarget.type === 'character' ? 'character' : 'location / asset'}: {pendingGuidedTarget.name}
                        </p>
                        <p className="mt-1 text-xs leading-relaxed text-amber-100/75">
                            Open a {pendingGuidedTarget.type === 'character' ? 'character profile' : 'asset collection'}, then use the highlighted button in the card details panel.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={cancelAndReturnToComic}
                        className="rounded-xl border border-amber-200/40 bg-amber-300/15 px-4 py-2.5 text-xs font-black text-amber-50 transition hover:bg-amber-300/25"
                    >
                        Cancel and return
                    </button>
                </div>
            ) : null}
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
