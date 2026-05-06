import React, { useEffect, useState } from 'react';
import { useTheme } from '@/shared/context/ThemeContext';
import { AssetVault } from '@/components/ui/AssetVault';
import { CharacterVault } from '@/components/ui/CharacterVault';
import { NpcVault } from '@/components/ui/NpcVault';
import { useGuidedComicVaultBridge } from '@/stores/guidedComicVaultBridge';
import { GuidedVaultModePanel } from '@/components/ui/VaultChrome';
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
        setTab(
            pendingGuidedTarget.type === 'character'
                ? 'character'
                : pendingGuidedTarget.type === 'npc'
                  ? 'supporting'
                  : 'asset',
        );
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
            shell:
                'linear-gradient(180deg, rgba(251,245,212,0.11), transparent 20%), radial-gradient(circle at 18% 8%, rgba(255,77,126,0.20), transparent 34%), radial-gradient(circle at 72% 18%, rgba(212,175,55,0.17), transparent 32%), linear-gradient(135deg, rgba(20,0,3,0.98), rgba(78,6,16,0.96) 45%, rgba(116,13,28,0.88) 68%, rgba(18,2,5,0.98))',
            header: 'border-[#D4AF37]/30',
            headerBackground:
                'linear-gradient(180deg, rgba(251,245,212,0.20) 0%, rgba(212,175,55,0.13) 28%, rgba(32,0,4,0.92) 78%), linear-gradient(118deg, rgba(255,255,255,0.09), transparent 28%, rgba(255,255,255,0.05) 56%, transparent 82%), linear-gradient(135deg, rgba(32,0,4,0.94), rgba(90,7,18,0.86) 56%, rgba(30,0,4,0.94))',
            titleTone: 'text-[#FBF5D4]',
            descriptionTone: 'text-[#FBF5D4]/70',
        },
        asset: {
            title: 'Asset Vault',
            description: 'Collections keep reusable locations, props, and visual assets ready for comic planning.',
            shell:
                'linear-gradient(180deg, rgba(251,245,212,0.12), transparent 20%), radial-gradient(circle at 18% 8%, rgba(173,196,113,0.24), transparent 34%), radial-gradient(circle at 72% 18%, rgba(212,175,55,0.18), transparent 32%), linear-gradient(135deg, rgba(7,20,7,0.98), rgba(31,63,25,0.96) 43%, rgba(66,107,42,0.90) 66%, rgba(6,19,6,0.98))',
            header: 'border-[#D4AF37]/30',
            headerBackground:
                'linear-gradient(180deg, rgba(251,245,212,0.22) 0%, rgba(212,175,55,0.14) 28%, rgba(7,20,7,0.90) 78%), linear-gradient(118deg, rgba(255,255,255,0.10), transparent 28%, rgba(255,255,255,0.06) 56%, transparent 82%), linear-gradient(135deg, rgba(7,20,7,0.92), rgba(31,63,25,0.88) 54%, rgba(66,107,42,0.82))',
            titleTone: 'text-[#ECFCCB]',
            descriptionTone: 'text-[#ECFCCB]/68',
        },
        supporting: {
            title: 'NPC Vault',
            description: 'One-off NPCs, cameo characters, and mood references saved from Illustrator’s Imageshop.',
            shell:
                'linear-gradient(180deg, rgba(251,245,212,0.12), transparent 20%), radial-gradient(circle at 18% 8%, rgba(168,85,247,0.20), transparent 34%), radial-gradient(circle at 72% 18%, rgba(212,175,55,0.16), transparent 32%), linear-gradient(135deg, rgba(12,9,28,0.98), rgba(47,24,75,0.94) 48%, rgba(12,9,28,0.98))',
            header: 'border-[#D4AF37]/26',
            headerBackground:
                'linear-gradient(180deg, rgba(251,245,212,0.22) 0%, rgba(212,175,55,0.14) 28%, rgba(18,9,31,0.90) 78%), linear-gradient(118deg, rgba(255,255,255,0.09), transparent 28%, rgba(255,255,255,0.05) 56%, transparent 82%), linear-gradient(135deg, rgba(18,9,31,0.92), rgba(47,24,75,0.86))',
            titleTone: 'text-[#FBF5D4]',
            descriptionTone: 'text-[#FBF5D4]/65',
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
                            'inline-flex items-center gap-3 rounded-xl border px-4 py-2.5 text-sm font-black transition',
                            selected
                                ? 'border-amber-300/80 bg-[linear-gradient(135deg,#D4AF37,#FBF5D4)] text-black shadow-lg shadow-black/20'
                                : 'border-white/10 bg-white/[0.04] text-white/72 hover:border-amber-300/45 hover:bg-white/[0.08]',
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
        <div className="relative isolate h-full min-h-0 overflow-y-auto custom-scrollbar bg-[#120005] text-white">
            <div
                className="pointer-events-none absolute inset-0 z-0 opacity-90"
                style={{
                    background: activeMeta.shell,
                }}
                aria-hidden
            />
            <div className="relative z-10 min-h-screen pb-12">
                {pendingGuidedTarget ? (
                    <div className="px-4 pt-4 sm:px-8">
                        <GuidedVaultModePanel target={pendingGuidedTarget} onCancel={cancelAndReturnToComic} />
                    </div>
                ) : null}
                <header
                    className={['border-b px-6 py-6 shadow-2xl backdrop-blur-xl sm:px-8', activeMeta.header].join(' ')}
                    style={{ background: activeMeta.headerBackground }}
                >
                    <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
                        <div className="min-w-0">
                            <div className="inline-flex items-center gap-2 rounded-full border border-amber-200/20 bg-amber-200/10 px-4 py-2 text-amber-100">
                                <Sparkles className="h-4 w-4" aria-hidden />
                                <span className="text-xs font-black uppercase tracking-[0.26em] text-amber-100/80">
                                    ARCS Image Vault
                                </span>
                            </div>
                            <h1 className={['mt-4 text-3xl font-black uppercase tracking-[0.16em] sm:text-4xl', activeMeta.titleTone].join(' ')}>
                                {activeMeta.title}
                            </h1>
                            <p className={['mt-2 max-w-3xl text-sm font-semibold leading-relaxed', activeMeta.descriptionTone].join(' ')}>
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
