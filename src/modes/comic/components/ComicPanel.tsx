import React from 'react';

interface ComicPanelProps {
    imageUrl?: string;
    caption?: string;
    panelNumber: number;
}

export const ComicPanel: React.FC<ComicPanelProps> = ({ imageUrl, caption, panelNumber }) => {
    return (
        <div className="comic-panel relative group border-2 border-white/20 hover:border-crimson-500 transition-colors duration-300 rounded-sm overflow-hidden bg-neutral-800 aspect-[2/3]">
            {imageUrl ? (
                <img src={imageUrl} alt={`Panel ${panelNumber}`} className="w-full h-full object-cover" />
            ) : (
                <div className="flex items-center justify-center w-full h-full text-white/30">
                    <span>Panel {panelNumber} (Empty)</span>
                </div>
            )}

            {caption && (
                <div className="absolute bottom-0 left-0 w-full bg-black/70 p-2 text-sm text-white">
                    {caption}
                </div>
            )}

            <div className="absolute top-2 left-2 w-6 h-6 bg-black/50 rounded-full flex items-center justify-center text-xs font-bold border border-white/20">
                {panelNumber}
            </div>
        </div>
    );
};
