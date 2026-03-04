import React from 'react';
import { ChevronDown, ChevronRight, LayoutGrid, Layers, Settings, Library } from 'lucide-react';

const DEFAULT_TOP_REM = 4; // below top ribbon only

export interface StackPanelSpec {
    id: 'pages' | 'layers' | 'settings' | 'assets';
    label: string;
    icon: React.ReactNode;
    isOpen: boolean;
    onToggle: () => void;
    children: React.ReactNode;
}

interface ComicPanelStackProps {
    panels: StackPanelSpec[];
    /** Top offset in rem so the stack sits below top ribbon and (when present) contextual balloon toolbar. */
    topOffsetRem?: number;
    className?: string;
}

/**
 * Vertical stack of right-side panels (Pages, Layers, Settings, Assets).
 * Starts below the top ribbon (and below contextual toolbar when topOffsetRem is increased).
 */
export const ComicPanelStack: React.FC<ComicPanelStackProps> = ({ panels, topOffsetRem = DEFAULT_TOP_REM, className }) => {
    return (
        <div
            className={`fixed right-0 flex flex-col w-72 border-l border-white/[0.08] bg-[#1A1A1E] shadow-2xl z-30 overflow-hidden ${className ?? ''}`}
            style={{ top: `${topOffsetRem}rem`, height: `calc(100vh - ${topOffsetRem}rem)` }}
        >
            {panels.map(({ id, label, icon, isOpen, onToggle, children }) => (
                <div key={id} className={`flex flex-col border-b border-white/[0.08] last:border-b-0 ${isOpen ? 'flex-1 min-h-0' : 'shrink-0'}`}>
                    <button
                        type="button"
                        onClick={onToggle}
                        className="flex items-center gap-2 w-full px-4 py-3 text-left bg-[#0F0F12]/80 hover:bg-[#00D1FF]/10 border-b border-white/[0.08] transition-colors"
                        aria-expanded={isOpen}
                        aria-controls={`panel-${id}`}
                    >
                        <span className="text-white/80 flex-shrink-0">
                            {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                        </span>
                        <span className="flex-shrink-0 text-[#00D1FF]">{icon}</span>
                        <span className="text-xs font-semibold uppercase tracking-wider text-white/90 truncate">
                            {label}
                        </span>
                    </button>
                    {isOpen && (
                        <div
                            id={`panel-${id}`}
                            className="flex-1 overflow-hidden flex flex-col min-h-0"
                            role="region"
                            aria-label={label}
                        >
                            {children}
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
};

export const PagesIcon = () => <LayoutGrid size={16} />;
export const LayersIcon = () => <Layers size={16} />;
export const SettingsIcon = () => <Settings size={16} />;
export const AssetsIcon = () => <Library size={16} />;
