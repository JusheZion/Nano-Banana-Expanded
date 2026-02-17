import React from 'react';
import { useComicStore } from '../../../stores/comicStore';

export const ComicCanvas: React.FC = () => {
    const { pages, currentPageId } = useComicStore();
    const currentPage = pages.find(p => p.id === currentPageId);

    if (!currentPage) return <div>No page selected</div>;

    return (
        <div className="comic-canvas-stage w-full h-full bg-neutral-900/50 flex items-center justify-center p-8 overflow-auto">
            <div
                className="comic-page-paper relative shadow-2xl transition-transform duration-200 ease-in-out"
                style={{
                    width: '800px', // Standard comic page width
                    height: '1200px', // Standard comic page height
                    backgroundColor: currentPage.background,
                }}
            >
                {/* Interaction Layer will go here */}
                <div className="absolute inset-0 pointer-events-none border border-neutral-200/20">
                    {/* Grid lines or guides could go here */}
                </div>

                {/* Placeholder for panels */}
                <div className="flex items-center justify-center h-full text-neutral-400">
                    Drag panels here
                </div>
            </div>
        </div>
    );
};
