import React, { useRef } from 'react';
import { useComicStore } from '../../../stores/comicStore';
import { generatePrompt } from '../utils/promptMiddleware';

export const ASSETS = [
    '/assets/images/Anunnaki Anubis.png',
    '/assets/images/Anunnaki Sphinx.png',
    '/assets/images/Aquarius Sphere.jpg',
    '/assets/images/Aries - Profile Shot.png',
    '/assets/images/Aries Approaches the Observatory.png',
    '/assets/images/Aries Attended.png',
    '/assets/images/Aries Facial Shot.jpeg',
    '/assets/images/Aries In the Observatory.jpeg',
    '/assets/images/Aries Obsevatory.jpg',
    '/assets/images/Aries Palace.jpg',
    '/assets/images/Aries Pampered by Attendants.png',
    '/assets/images/Aries Profie Shot.jpeg',
    '/assets/images/Aries Profile.png',
    '/assets/images/Aries Struck Down By Knight.png',
    '/assets/images/Astral Flow Manipulating Spacetime & Multiverses.png',
    '/assets/images/Attendees.jpeg',
    '/assets/images/Babe the Blue Ox Unmasked.jpeg',
    '/assets/images/City of Aquarius.jpg',
    '/assets/images/City of Capricorn.jpg',
    '/assets/images/City of Maries.jpg',
    '/assets/images/Fire Magic Circle .jpg',
    '/assets/images/Fire Magic Circle Explosion .jpg',
    '/assets/images/Flow Leading Wellness Session.jpeg',
    '/assets/images/Flow at Harlem Corner.png',
    "/assets/images/Flow's CEO Photo.png",
    '/assets/images/Flux Magician Calculator.png',
    '/assets/images/Flux Overlooking the Bathhouse.png',
    '/assets/images/Flux Profile.png',
    '/assets/images/Flux and Stretcher.png',
    '/assets/images/Flux as the Opportune Magician.png',
    "/assets/images/Flux's Empty Room.jpeg",
    '/assets/images/Glowing Energy Man.jpeg',
    '/assets/images/Ivy, Attendant.jpeg',
    '/assets/images/King Flow the Alpha.png',
    '/assets/images/Maries Innermost Sanctum.jpeg',
    '/assets/images/Maries Observatory.jpg',
    '/assets/images/Maries.jpg',
    '/assets/images/NEW_PROJECT - Scene 1 - end.png',
    '/assets/images/Palace of Pisces.jpg',
    '/assets/images/Palace of Sagittarius.jpg',
    '/assets/images/Ram Form On Hind Legs.jpeg',
    '/assets/images/Shade.jpg',
    '/assets/images/Shadow Work copy.png',
    '/assets/images/Temple of Aquarius.jpg',
    '/assets/images/Temple of Pisces.jpg',
    '/assets/images/Trading Game Snippet.png',
    '/assets/images/temple of sagittarius.jpg',
];

interface AssetLibraryProps {
    isOpen: boolean;
    onClose: () => void;
    /** When true, render only inner content for use inside ComicPanelStack (no wrapper, no header). */
    embedded?: boolean;
}

export const AssetLibrary: React.FC<AssetLibraryProps> = ({ isOpen, onClose, embedded }) => {
    const imageImportInputRef = useRef<HTMLInputElement>(null);
    const {
        currentPageId,
        selectedElementIds,
        pages,
        projectSettings,
        currentGenreId,
        insertImageIntoWorkspace,
    } = useComicStore();

    const handleAssetClick = (assetUrl: string) => {
        insertImageIntoWorkspace(assetUrl, { sourceLabel: assetUrl.split('/').pop() });
    };

    const handleMockAIGenerate = () => {
        const currentPage = pages.find(p => p.id === currentPageId);
        if (!currentPage) return;

        // We look for a prompt in selected panels, or use a default
        let promptToUse = "A lone starship pilot";
        if (selectedElementIds.length > 0) {
            const selectedPanels = currentPage.panels.filter(p => selectedElementIds.includes(p.id));
            if (selectedPanels.length > 0 && selectedPanels[0].prompt) {
                promptToUse = selectedPanels[0].prompt;
            }
        }

        const finalPrompt = generatePrompt(promptToUse, {
            inclusiveBiasEnabled: projectSettings?.inclusiveBiasEnabled ?? true,
            demographicFocus: projectSettings?.demographicFocus ?? '',
            currentGenreId
        });

        console.group('[MOCK AI]');
        console.log(`Original Prompt: "${promptToUse}"`);
        console.log(`Final Sent to LLM: "${finalPrompt}"`);

        const randomAsset = ASSETS[Math.floor(Math.random() * ASSETS.length)];
        console.log(`Returned Image: ${randomAsset}`);
        console.groupEnd();

        handleAssetClick(randomAsset);
    };

    const handleInsertImage = () => {
        if (ASSETS.length === 0) return;
        handleAssetClick(ASSETS[0]);
    };

    const handleImageImport = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
            const result = typeof reader.result === 'string' ? reader.result : '';
            if (result) {
                insertImageIntoWorkspace(result, { sourceLabel: file.name || 'Imported image' });
            }
        };
        reader.readAsDataURL(file);
        event.target.value = '';
    };

    const content = (
        <>
            <div className="p-4 border-b border-white/[0.08] shrink-0 space-y-2 bg-[#0F0F12]/90">
                <input
                    ref={imageImportInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    aria-label="Import image into Advanced Studio workspace"
                    onChange={handleImageImport}
                />
                <button
                    type="button"
                    onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); handleInsertImage(); }}
                    className="w-full py-2.5 bg-[#00D1FF]/20 hover:bg-[#00D1FF]/30 text-[#00D1FF] border border-[#00D1FF]/40 font-bold rounded-lg transition-all active:scale-95 flex items-center justify-center gap-2"
                    aria-label="Insert first asset into selected panel or new panel"
                >
                    Insert Image
                </button>
                <button
                    type="button"
                    onClick={() => imageImportInputRef.current?.click()}
                    className="w-full py-2.5 bg-white/10 hover:bg-white/15 text-white/90 border border-white/25 font-bold rounded-lg transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                    Import local image
                </button>
                <button
                    type="button"
                    onClick={handleMockAIGenerate}
                    className="w-full py-2.5 bg-[#00D1FF]/20 hover:bg-[#00D1FF]/30 text-[#00D1FF] border border-[#00D1FF]/40 font-bold rounded-lg transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                    <span className="text-xl">✨</span> Mock Generate Image
                </button>
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/55">
                    {ASSETS.length} stored images - scroll down for the full library
                </p>
            </div>
            <div className="flex-1 overflow-y-auto p-4 pb-20 min-h-0 custom-scrollbar">
                <div className="grid grid-cols-2 gap-3">
                {ASSETS.map((asset, index) => (
                    <button
                        key={index}
                        type="button"
                        draggable
                        onDragStart={(e) => {
                            e.dataTransfer.setData('application/x-asset-url', asset);
                            e.dataTransfer.effectAllowed = 'copy';
                        }}
                        className="w-full rounded-lg overflow-hidden border border-white/10 hover:border-gold-500/50 hover:shadow-[0_0_15px_rgba(212,175,55,0.2)] transition-all group relative break-inside-avoid bg-black/20"
                        onClick={() => handleAssetClick(asset)}
                    >
                        <img
                            src={asset}
                            alt={asset.split('/').pop()}
                            loading="lazy"
                            draggable={false}
                            className="w-full h-auto object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
                            <span className="text-[10px] text-white/90 truncate w-full text-left">
                                {asset.split('/').pop()}
                            </span>
                        </div>
                    </button>
                ))}
                </div>
            </div>
        </>
    );

    if (embedded) {
        return <div className="flex flex-col flex-1 min-h-0 overflow-hidden">{content}</div>;
    }

    return (
        <div
            className={`absolute top-16 right-0 h-[calc(100vh-4rem)] w-80 bg-[#1A1A1E] border-l border-white/[0.08] shadow-2xl transition-transform duration-300 transform z-20 flex flex-col ${isOpen ? 'translate-x-0' : 'translate-x-full'
                }`}
        >
            <div className="p-4 border-b border-white/10 flex items-center justify-between bg-[#0F0F12]/80">
                <h2 className="text-white font-bold tracking-wide">ASSET LIBRARY</h2>
                <button type="button" onClick={onClose} className="text-white/50 hover:text-white transition-colors">
                    ✕
                </button>
            </div>
            {content}
        </div>
    );
};
