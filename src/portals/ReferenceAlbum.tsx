import React, { useEffect, useState } from 'react';
import { useTheme } from '@/shared/context/ThemeContext';
import { AssetVault } from '@/components/ui/AssetVault';
import { CharacterVault } from '@/components/ui/CharacterVault';
import { NpcVault } from '@/components/ui/NpcVault';
import { useGuidedComicVaultBridge } from '@/stores/guidedComicVaultBridge';
import { Boxes, Sparkles, UserRound, Users } from 'lucide-react';

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

    const tabItems = [
        { id: 'character' as const, label: 'Characters', Icon: Users },
        { id: 'asset' as const, label: 'Assets', Icon: Boxes },
        { id: 'supporting' as const, label: 'NPC Vault', Icon: UserRound },
    ];
    const activeMeta = {
        character: {
            title: 'Character Vault',
            description: 'Album covers are gold-starred or fall back to the newest generation.',
        },
        asset: {
            title: 'Asset Vault',
            description: 'Collections keep reusable locations, props, and visual assets ready for comic planning.',
        },
        supporting: {
            title: 'NPC Vault',
            description: 'One-off NPCs, cameo characters, and mood references saved from Illustrator’s Imageshop.',
        },
    }[tab];

    const portalNav = (
        <div className="flex flex-wrap gap-3">
            {tabItems.map(({ id, label, Icon }) => {
                const selected = tab === id;
                return (
                    <button
                        key={id}
                        type="button"
                        onClick={() => setTab(id)}
                        className={[
                            'inline-flex items-center gap-3 rounded-2xl border px-5 py-3 text-sm font-black transition',
                            selected
                                ? 'border-[#FBBF24]/70 bg-[linear-gradient(135deg,#D4AF37,#FBF5D4)] text-black shadow-lg shadow-black/20'
                                : 'border-[#D4AF37]/35 bg-black/25 text-[#FBF5D4] hover:border-[#FBBF24]/65 hover:bg-black/35',
                        ].join(' ')}
                    >
                        <Icon className="h-5 w-5" aria-hidden />
                        {label}
                    </button>
                );
            })}
        </div>
    );

    return (
        <div className="relative isolate h-full min-h-0 overflow-y-auto custom-scrollbar text-white bg-[linear-gradient(135deg,#230006_0%,#7d0c22_36%,#f43f5e_56%,#3a000d_100%)]">
            <div
                className="pointer-events-none absolute inset-0 z-0 opacity-85"
                style={{
                    background:
                        'radial-gradient(circle at 28% 12%, rgba(255,255,255,0.28), transparent 26%), radial-gradient(circle at 68% 30%, rgba(255,213,128,0.22), transparent 32%), linear-gradient(135deg, transparent 0%, rgba(255,255,255,0.18) 48%, transparent 62%)',
                }}
                aria-hidden
            />
            <div className="relative z-10 min-h-screen pb-12">
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
                <header className="border-b border-black/20 bg-[linear-gradient(135deg,#8f6b13_0%,#d4af37_18%,#fbf5d4_34%,#b78628_50%,#f7e7a3_66%,#a4771d_82%,#fbf5d4_100%)] px-8 py-8 text-black shadow-2xl">
                    <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
                        <div className="min-w-0">
                            <div className="inline-flex items-center gap-2 rounded-full border border-black/20 bg-black/10 px-4 py-2">
                                <Sparkles className="h-4 w-4" aria-hidden />
                                <span className="text-xs font-black uppercase tracking-[0.35em] text-black/80">
                                    ARCS Image Vault
                                </span>
                            </div>
                            <h1 className="mt-4 bg-[linear-gradient(135deg,#000000_0%,#273143_38%,#000000_72%,#4b5563_100%)] bg-clip-text text-4xl font-black uppercase tracking-[0.18em] text-transparent sm:text-5xl">
                                {activeMeta.title}
                            </h1>
                            <p className="mt-2 max-w-3xl text-sm font-semibold leading-relaxed text-black/70">
                                {activeMeta.description}
                            </p>
                        </div>
                        {portalNav}
                    </div>
                </header>

                {tab === 'character' ? (
                    <CharacterVault />
                ) : tab === 'asset' ? (
                    <AssetVault />
                ) : (
                    <NpcVault />
                )}
            </div>
        </div>
    );
};
