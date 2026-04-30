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
    const clearPendingGuidedTarget = useGuidedComicVaultBridge((s) => s.clearPendingTarget);
    const [tab, setTab] = useState<ArchiveTab>('character');

    useEffect(() => {
        setTheme('purple');
    }, [setTheme]);

    useEffect(() => {
        if (!pendingGuidedTarget) return;
        setTab(pendingGuidedTarget.type === 'character' ? 'character' : 'asset');
    }, [pendingGuidedTarget]);

    return (
        <div className="min-h-screen text-white pt-20 pb-12">
            {pendingGuidedTarget ? (
                <div className="mx-auto mb-4 flex max-w-5xl flex-col gap-3 rounded-xl border border-amber-300/30 bg-amber-300/10 px-4 py-3 text-amber-50 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <p className="text-sm font-bold">Pick a vault image for {pendingGuidedTarget.name}</p>
                        <p className="mt-1 text-xs text-amber-100/75">
                            Open a {pendingGuidedTarget.type === 'character' ? 'character profile' : 'asset collection'} and choose “Use for guided flow.”
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={clearPendingGuidedTarget}
                        className="rounded-lg border border-amber-200/35 bg-black/20 px-3 py-2 text-xs font-bold text-amber-50 transition hover:bg-black/35"
                    >
                        Cancel guided pick
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
