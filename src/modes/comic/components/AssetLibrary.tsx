import React from 'react';
import { useComicStore } from '../../../stores/comicStore';
import { generatePrompt } from '../utils/promptMiddleware';

const ASSETS = [
    '/assets/images/Anunnaki Anubis.png',
    '/assets/images/Anunnaki Sphinx.png',
    '/assets/images/Aquarius Sphere.jpg',
    '/assets/images/Aries Approaches the Observatory.png',
    '/assets/images/Aries Attended.png',
    '/assets/images/Aries Palace.jpg',
    '/assets/images/Aries Profile.png',
    '/assets/images/Astral Flow Manipulating Spacetime & Multiverses.png',
    '/assets/images/City of Aquarius.jpg',
    '/assets/images/City of Capricorn.jpg',
    '/assets/images/City of Maries.jpg',
    '/assets/images/Flow Leading Wellness Session.jpeg',
    '/assets/images/Flux Magician Calculator.png',
    '/assets/images/King Flow the Alpha.png',
    '/assets/images/Maries Innermost Sanctum.jpeg'
];

interface AssetLibraryProps {
    isOpen: boolean;
    onClose: () => void;
}

export const AssetLibrary: React.FC<AssetLibraryProps> = ({ isOpen, onClose }) => {
    const {
        currentPageId,
        selectedElementIds,
        updatePanel,
        addPanel,
        pages,
        projectSettings
    } = useComicStore();

    const handleAssetClick = (assetUrl: string) => {
        const currentPage = pages.find(p => p.id === currentPageId);
        if (!currentPage) return;

        // Load image to get dimensions
        const img = new Image();
        img.src = assetUrl;
        img.onload = () => {
            const aspectRatio = img.width / img.height;
            // Default max dimension 300px
            let width = 300;
            let height = 300;

            if (aspectRatio > 1) {
                // Landscape
                height = width / aspectRatio;
            } else {
                // Portrait
                width = height * aspectRatio;
            }

            if (selectedElementIds.length > 0) {
                // Check if selected element is a panel
                const selectedPanels = currentPage.panels.filter(p => selectedElementIds.includes(p.id));
                if (selectedPanels.length > 0) {
                    selectedPanels.forEach(panel => {
                        updatePanel(currentPage.id, panel.id, { imageUrl: assetUrl });
                    });
                } else {
                    addPanel(currentPage.id, { shapeType: 'rect', x: 50, y: 50, width, height, imageUrl: assetUrl });
                }
            } else {
                // No selection -> Create new panel
                addPanel(currentPage.id, { shapeType: 'rect', x: 50, y: 50, width, height, imageUrl: assetUrl });
            }
        };
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
            demographicFocus: projectSettings?.demographicFocus ?? ''
        });

        console.group('[MOCK AI]');
        console.log(`Original Prompt: "${promptToUse}"`);
        console.log(`Final Sent to LLM: "${finalPrompt}"`);

        const randomAsset = ASSETS[Math.floor(Math.random() * ASSETS.length)];
        console.log(`Returned Image: ${randomAsset}`);
        console.groupEnd();

        handleAssetClick(randomAsset);
    };

    return (
        <div
            className={`absolute top-0 right-0 h-full w-80 bg-obsidian-dark border-l border-white/10 shadow-2xl transition-transform duration-300 transform z-20 flex flex-col ${isOpen ? 'translate-x-0' : 'translate-x-full'
                }`}
        >
            <div className="p-4 border-b border-white/10 flex items-center justify-between bg-obsidian/50 backdrop-blur-md">
                <h2 className="text-white font-bold tracking-wide">ASSET LIBRARY</h2>
                <button onClick={onClose} className="text-white/50 hover:text-white transition-colors">
                    ✕
                </button>
            </div>

            <div className="p-4 border-b border-white/5">
                <button
                    onClick={handleMockAIGenerate}
                    className="w-full py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold rounded-lg shadow-lg shadow-purple-500/20 transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                    <span className="text-xl">✨</span> Mock Generate Image
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 pb-20 columns-2 gap-3 space-y-3">
                {ASSETS.map((asset, index) => (
                    <button
                        key={index}
                        className="w-full rounded-lg overflow-hidden border border-white/10 hover:border-gold-500/50 hover:shadow-[0_0_15px_rgba(212,175,55,0.2)] transition-all group relative break-inside-avoid bg-black/20"
                        onClick={() => handleAssetClick(asset)}
                    >
                        <img
                            src={asset}
                            alt={asset.split('/').pop()}
                            loading="lazy"
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
    );
};
