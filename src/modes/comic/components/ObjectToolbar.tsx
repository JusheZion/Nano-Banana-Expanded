import React from 'react';
import { useComicStore } from '../../../stores/comicStore';

interface ObjectToolbarProps {
    currentPageId: string;
    selectedElementIds: string[];
}

export const ObjectToolbar: React.FC<ObjectToolbarProps> = ({ currentPageId, selectedElementIds }) => {
    const {
        bringToFront,
        sendToBack,
        cloneElement,
        removeElement,
        toggleFlip
    } = useComicStore();

    if (selectedElementIds.length === 0) return null;

    return (
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 bg-zinc-900 border border-white/20 rounded-full px-4 py-2 flex items-center gap-2 shadow-2xl z-50 animate-in fade-in slide-in-from-bottom-4 duration-200">

            {/* Z-Index Controls */}
            <div className="flex items-center gap-1 border-r border-white/10 pr-2 mr-2">
                <button
                    onClick={() => selectedElementIds.forEach(id => toggleFlip(currentPageId, id, 'horizontal'))}
                    className="p-2 hover:bg-white/10 rounded-full text-white/70 hover:text-white transition-colors"
                    title="Flip Horizontal"
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="16 3 21 12 16 21"></polyline>
                        <line x1="8" y1="3" x2="8" y2="21"></line>
                        <polyline points="3 7 3 17"></polyline>
                    </svg>
                </button>
                <button
                    onClick={() => selectedElementIds.forEach(id => toggleFlip(currentPageId, id, 'vertical'))}
                    className="p-2 hover:bg-white/10 rounded-full text-white/70 hover:text-white transition-colors"
                    title="Flip Vertical"
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 16 12 21 21 16"></polyline>
                        <line x1="3" y1="8" x2="21" y2="8"></line>
                        <polyline points="7 3 17 3"></polyline>
                    </svg>
                </button>
                <div className="h-4 w-px bg-white/10 mx-1" />
                <button
                    onClick={() => selectedElementIds.forEach(id => bringToFront(currentPageId, id))}
                    className="p-2 hover:bg-white/10 rounded-full text-white/70 hover:text-white transition-colors"
                    title="Bring to Front"
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M8 8h8v8H8z" />
                        <path d="M4 4h8v8H4z" strokeOpacity="0.5" />
                    </svg>
                </button>
                <button
                    onClick={() => selectedElementIds.forEach(id => sendToBack(currentPageId, id))}
                    className="p-2 hover:bg-white/10 rounded-full text-white/70 hover:text-white transition-colors"
                    title="Send to Back"
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M4 4h8v8H4z" />
                        <path d="M8 8h8v8H8z" strokeOpacity="0.5" />
                    </svg>
                </button>
            </div>

            {/* Lifecycle Controls */}
            <div className="flex items-center gap-1">
                <button
                    onClick={() => selectedElementIds.forEach(id => cloneElement(currentPageId, id))}
                    className="p-2 hover:bg-teal-500/20 hover:text-teal-400 rounded-full text-white/70 transition-colors"
                    title="Clone (Ctrl+D)"
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                    </svg>
                </button>
                <button
                    onClick={() => selectedElementIds.forEach(id => removeElement(currentPageId, id))}
                    className="p-2 hover:bg-red-500/20 hover:text-red-400 rounded-full text-white/70 transition-colors"
                    title="Delete (Backspace)"
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                </button>
            </div>
        </div>
    );
};
