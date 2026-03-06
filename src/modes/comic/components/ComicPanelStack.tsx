import React from 'react';
import { ChevronDown, ChevronRight, LayoutGrid, Layers, Settings, Library } from 'lucide-react';
import { PRIMARY_BG, PRIMARY_BG_FLAT, ACCENT_GOLD_GRADIENT, TEXT_ON_GOLD, TEXT_ON_BLUE } from '../theme/Phase12DesignTokens';

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
    /** Top offset in rem so the stack sits below top ribbon. */
    topOffsetRem?: number;
    /** Bottom offset in rem for fixed toolbar below stack (reduces stack height). */
    bottomBarRem?: number;
    className?: string;
}

/**
 * Vertical stack of right-side panels (Pages, Layers, Settings, Assets).
 * Starts below the top ribbon (and below contextual toolbar when topOffsetRem is increased).
 */
export const ComicPanelStack: React.FC<ComicPanelStackProps> = ({ panels, topOffsetRem = DEFAULT_TOP_REM, bottomBarRem = 0, className }) => {
    const height = `calc(100vh - ${topOffsetRem}rem${bottomBarRem ? ` - ${bottomBarRem}rem` : ''})`;
    return (
        <div
            className={`fixed right-0 flex flex-col w-72 border-l border-white/10 shadow-2xl z-30 overflow-hidden ${className ?? ''}`}
            style={{ top: `${topOffsetRem}rem`, height, background: PRIMARY_BG }}
        >
            {panels.map(({ id, label, icon, isOpen, onToggle, children }) => (
                <div key={id} className={`flex flex-col border-b border-white/10 last:border-b-0 ${isOpen ? 'flex-1 min-h-0' : 'shrink-0'}`}>
                    <button
                        type="button"
                        onClick={onToggle}
                        className="flex items-center gap-2 w-full px-4 py-3 text-left border-b border-white/10 transition-colors hover:opacity-90"
                        style={{
                            background: isOpen ? ACCENT_GOLD_GRADIENT : 'transparent',
                            color: isOpen ? TEXT_ON_GOLD : TEXT_ON_BLUE,
                        }}
                        aria-expanded={isOpen}
                        aria-controls={`panel-${id}`}
                    >
                        <span className="flex-shrink-0 opacity-90">
                            {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                        </span>
                        <span className="flex-shrink-0">{icon}</span>
                        <span className="text-xs font-semibold uppercase tracking-wider truncate">
                            {label}
                        </span>
                    </button>
                    {isOpen && (
                        <div
                            id={`panel-${id}`}
                            className="flex-1 overflow-hidden flex flex-col min-h-0"
                            style={{ backgroundColor: '#F5F5DC', color: PRIMARY_BG_FLAT }}
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
