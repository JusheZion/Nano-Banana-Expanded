import React from 'react';
import { useComicStore } from '../../../stores/comicStore';
import { Tooltip } from '../../../components/ui/Tooltip';

interface PageNavigatorProps {
    isOpen: boolean;
    onClose: () => void;
}

export const PageNavigator: React.FC<PageNavigatorProps> = ({ isOpen, onClose }) => {
    const {
        pages,
        currentPageId,
        selectPage,
        addPage,
        duplicatePage,
        removePage,
        reorderPages,
        layoutMode,
        setLayoutMode
    } = useComicStore();

    if (!isOpen) return null;

    const handleMoveUp = (index: number) => {
        if (index === 0) return;
        reorderPages(pages[index].id, pages[index - 1].id);
    };

    const handleMoveDown = (index: number) => {
        if (index === pages.length - 1) return;
        reorderPages(pages[index].id, pages[index + 1].id);
    };

    return (
        <div className="fixed top-16 right-0 h-[calc(100vh-64px)] w-72 bg-obsidian-dark/90 backdrop-blur-xl border-l border-white/10 flex flex-col z-40 shadow-2xl shadow-black/50 transform transition-transform">
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
                <h2 className="text-lg font-bold text-white tracking-wider flex items-center gap-2">
                    <span className="text-gold-400">📄</span> PAGES
                </h2>
                <button
                    onClick={onClose}
                    className="w-8 h-8 rounded shrink-0 hover:bg-white/10 flex items-center justify-center text-white/50 transition-colors"
                >
                    ✕
                </button>
            </div>

            <div className="p-4 border-b border-white/10">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-xs uppercase font-bold tracking-wider text-white/50">Layout Mode</span>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setLayoutMode('webtoon')}
                        className={`flex-1 py-1 px-2 rounded text-xs font-bold transition-colors ${layoutMode === 'webtoon' ? 'bg-gold-500 text-black' : 'bg-white/5 text-white/50 hover:bg-white/10'}`}
                    >
                        Webtoon
                    </button>
                    <button
                        onClick={() => setLayoutMode('spread')}
                        className={`flex-1 py-1 px-2 rounded text-xs font-bold transition-colors ${layoutMode === 'spread' ? 'bg-gold-500 text-black' : 'bg-white/5 text-white/50 hover:bg-white/10'}`}
                    >
                        Spread
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                {pages.map((page, index) => {
                    const isActive = page.id === currentPageId;
                    return (
                        <div
                            key={page.id}
                            className={`group relative rounded-lg border transition-all ${isActive ? 'border-gold-500 bg-gold-500/10' : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10'}`}
                        >
                            <button
                                className="w-full text-left p-3 flex flex-col gap-2"
                                onClick={() => selectPage(page.id)}
                            >
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-white/70">
                                        Page {index + 1}
                                    </span>
                                    {isActive && <span className="w-2 h-2 rounded-full bg-gold-400 shadow-[0_0_10px_rgba(212,175,55,0.8)]" />}
                                </div>
                                <div className="w-full h-24 bg-obsidian rounded border border-white/10 overflow-hidden relative flex flex-col items-center justify-center">
                                    {/* Mini mock representation of panels */}
                                    {page.panels.length > 0 ? (
                                        <div className="text-[10px] text-white/30 font-mono">
                                            {page.panels.length} Panel{page.panels.length !== 1 ? 's' : ''}
                                        </div>
                                    ) : (
                                        <div className="text-[10px] text-white/30 font-mono italic">Empty</div>
                                    )}
                                </div>
                            </button>

                            {/* Actions Overlay */}
                            <div className="absolute top-2 right-2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <div className="flex gap-1">
                                    <Tooltip content="Move Up">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleMoveUp(index); }}
                                            disabled={index === 0}
                                            className="w-6 h-6 rounded bg-black/80 hover:bg-black text-white flex items-center justify-center text-xs disabled:opacity-50"
                                        >
                                            ↑
                                        </button>
                                    </Tooltip>
                                    <Tooltip content="Move Down">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleMoveDown(index); }}
                                            disabled={index === pages.length - 1}
                                            className="w-6 h-6 rounded bg-black/80 hover:bg-black text-white flex items-center justify-center text-xs disabled:opacity-50"
                                        >
                                            ↓
                                        </button>
                                    </Tooltip>
                                </div>
                                <div className="flex gap-1 justify-end">
                                    <Tooltip content="Duplicate Page">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); duplicatePage(page.id); }}
                                            className="w-6 h-6 rounded bg-black/80 hover:bg-black text-white flex items-center justify-center text-xs"
                                        >
                                            ⧉
                                        </button>
                                    </Tooltip>
                                    <Tooltip content="Delete Page">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); removePage(page.id); }}
                                            disabled={pages.length <= 1}
                                            className="w-6 h-6 rounded bg-red-900/80 hover:bg-red-800 text-white flex items-center justify-center text-xs disabled:opacity-50"
                                        >
                                            ✕
                                        </button>
                                    </Tooltip>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="p-4 border-t border-white/10">
                <button
                    onClick={addPage}
                    className="w-full py-2 bg-gradient-to-r from-teal-700 to-teal-600 hover:from-teal-600 hover:to-teal-500 rounded text-sm text-white font-bold transition-colors shadow-lg shadow-teal-900/50"
                >
                    + Add New Page
                </button>
            </div>
        </div>
    );
};
