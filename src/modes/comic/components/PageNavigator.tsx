import React from 'react';
import { useComicStore } from '../../../stores/comicStore';
import { Tooltip } from '../../../components/ui/Tooltip';
import { ACCENT_GOLD_GRADIENT, TEXT_ON_GOLD } from '../theme/Phase12DesignTokens';

interface PageNavigatorProps {
    isOpen: boolean;
    onClose: () => void;
    /** When true, render only inner content for use inside ComicPanelStack (no fixed wrapper, no header). */
    embedded?: boolean;
}

export const PageNavigator: React.FC<PageNavigatorProps> = ({ isOpen, onClose, embedded }) => {
    const {
        pages,
        currentPageId,
        selectPage,
        addPage,
        duplicatePage,
        removePage,
        reorderPages,
        setPageCover,
        layoutMode,
        setLayoutMode
    } = useComicStore();

    if (!isOpen && !embedded) return null;

    const handleMoveUp = (index: number) => {
        if (index === 0) return;
        reorderPages(pages[index].id, pages[index - 1].id);
    };

    const handleMoveDown = (index: number) => {
        if (index === pages.length - 1) return;
        reorderPages(pages[index].id, pages[index + 1].id);
    };

    const isRoyalBlue = embedded;
    const content = (
        <>
            <div className={`p-4 border-b ${isRoyalBlue ? 'border-[#002366]/20' : 'border-white/10'}`}>
                <div className="flex items-center justify-between mb-2">
                    <span className={`text-xs uppercase font-bold tracking-wider ${isRoyalBlue ? 'text-inherit opacity-70' : 'text-white/50'}`}>Layout Mode</span>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setLayoutMode('webtoon')}
                        className={`flex-1 py-1 px-2 rounded text-xs font-bold transition-colors ${layoutMode === 'webtoon' ? 'bg-[#b38728] text-black' : isRoyalBlue ? 'bg-[#002366]/10 text-inherit hover:bg-[#002366]/20' : 'bg-white/5 text-white/50 hover:bg-white/10'}`}
                    >
                        Webtoon
                    </button>
                    <button
                        onClick={() => setLayoutMode('spread')}
                        className={`flex-1 py-1 px-2 rounded text-xs font-bold transition-colors ${layoutMode === 'spread' ? 'bg-[#b38728] text-black' : isRoyalBlue ? 'bg-[#002366]/10 text-inherit hover:bg-[#002366]/20' : 'bg-white/5 text-white/50 hover:bg-white/10'}`}
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
                            className={`group relative rounded-lg border transition-all ${isActive ? (isRoyalBlue ? 'border-[#002366] bg-[#002366]/15' : 'border-gold-500 bg-gold-500/10') : isRoyalBlue ? 'border-[#002366]/20 bg-[#002366]/5 hover:border-[#002366]/40 hover:bg-[#002366]/10' : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10'}`}
                        >
                            <button
                                className="w-full text-left p-3 flex flex-col gap-2"
                                onClick={() => selectPage(page.id)}
                            >
                                <div className="flex items-center justify-between">
                                    <span className={`text-xs font-bold ${isRoyalBlue ? 'text-inherit' : 'text-white/70'}`}>
                                        Page {index + 1}
                                    </span>
                                    {isActive && <span className={`w-2 h-2 rounded-full ${isRoyalBlue ? 'bg-[#002366]' : 'bg-gold-400 shadow-[0_0_10px_rgba(212,175,55,0.8)]'}`} />}
                                </div>
                                <div className={`w-full h-24 rounded border overflow-hidden relative flex flex-col items-center justify-center ${isRoyalBlue ? 'bg-[#002366]/10 border-[#002366]/20' : 'bg-obsidian border-white/10'}`}>
                                    {/* Mini mock representation of panels */}
                                    {page.panels.length > 0 ? (
                                        <div className={`text-[10px] font-mono ${isRoyalBlue ? 'text-inherit opacity-60' : 'text-white/30'}`}>
                                            {page.panels.length} Panel{page.panels.length !== 1 ? 's' : ''}
                                        </div>
                                    ) : (
                                        <div className={`text-[10px] font-mono italic ${isRoyalBlue ? 'text-inherit opacity-60' : 'text-white/30'}`}>Empty</div>
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
                                    <Tooltip content={page.isCover ? 'Unset as cover (enable gutter snap)' : 'Set as cover (full-bleed, no gutter snap)'}>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setPageCover(page.id, !page.isCover); }}
                                            className={`w-6 h-6 rounded flex items-center justify-center text-xs ${page.isCover ? 'bg-[#b38728] text-black' : 'bg-black/80 hover:bg-black text-white'}`}
                                            title={page.isCover ? 'Cover' : 'Set as cover'}
                                        >
                                            📖
                                        </button>
                                    </Tooltip>
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

            <div className={`p-4 border-t ${isRoyalBlue ? 'border-[#002366]/20' : 'border-white/10'}`}>
                <button
                    onClick={addPage}
                    className={`w-full py-2 rounded text-sm font-bold transition-colors ${isRoyalBlue ? '' : 'bg-[#00D1FF]/20 hover:bg-[#00D1FF]/30 text-[#00D1FF] border border-[#00D1FF]/40'}`}
                    style={isRoyalBlue ? { background: ACCENT_GOLD_GRADIENT, color: TEXT_ON_GOLD } : undefined}
                >
                    + Add New Page
                </button>
            </div>
        </>
    );

    if (embedded) {
        return <div className="flex flex-col flex-1 min-h-0 overflow-hidden">{content}</div>;
    }

    return (
        <div className="fixed top-16 right-0 h-[calc(100vh-64px)] w-72 bg-[#1A1A1E] border-l border-white/[0.08] flex flex-col z-40 shadow-2xl text-white">
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
                <h2 className="text-lg font-bold tracking-wider flex items-center gap-2">
                    <span className="text-[#00D1FF]">📄</span> PAGES
                </h2>
                <button
                    onClick={onClose}
                    className="w-8 h-8 rounded shrink-0 hover:bg-white/10 flex items-center justify-center text-white/50 transition-colors"
                >
                    ✕
                </button>
            </div>
            {content}
        </div>
    );
};
