import React from 'react';
import { LayoutGrid, Layers, Settings, Library } from 'lucide-react';
import {
  PRIMARY_BG_FLAT,
  ACCENT_GOLD_GRADIENT,
  TEXT_ON_GOLD,
  TEXT_ON_BLUE,
} from '../theme/Phase12DesignTokens';

export type TabbedDockTabId = 'pages' | 'layers' | 'settings' | 'assets';

export interface TabbedDockTab {
  id: TabbedDockTabId;
  label: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}

export interface TabbedDockProps {
  tabs: TabbedDockTab[];
  activeTabId: TabbedDockTabId;
  onTabChange: (id: TabbedDockTabId) => void;
  /** Top offset in rem (e.g. below menu + strip). */
  topOffsetRem?: number;
  /** Width of the dock in px. */
  width?: number;
  className?: string;
}

export const TabbedDock: React.FC<TabbedDockProps> = ({
  tabs,
  activeTabId,
  onTabChange,
  topOffsetRem = 6,
  width = 300,
  className,
}) => {
  const activeTab = tabs.find(t => t.id === activeTabId) ?? tabs[0];

  return (
    <div
      className={`fixed right-0 flex flex-col border-l border-white/10 shadow-2xl z-30 overflow-hidden ${className ?? ''}`}
      style={{
        top: `${topOffsetRem}rem`,
        width,
        height: `calc(100vh - ${topOffsetRem}rem)`,
        background: PRIMARY_BG_FLAT,
      }}
      role="region"
      aria-label="Studio panels"
    >
      {/* Tab row */}
      <div className="flex items-stretch shrink-0 border-b border-white/10">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => onTabChange(tab.id)}
            className="flex-1 flex items-center justify-center gap-1.5 px-2 py-3 text-xs font-semibold uppercase tracking-wider transition-colors border-b-2 min-w-0"
            style={{
              borderBottomColor: activeTabId === tab.id ? 'transparent' : 'transparent',
              background: activeTabId === tab.id ? ACCENT_GOLD_GRADIENT : 'transparent',
              color: activeTabId === tab.id ? TEXT_ON_GOLD : TEXT_ON_BLUE,
            }}
            aria-pressed={activeTabId === tab.id}
            aria-label={tab.label}
          >
            {tab.icon}
            <span className="hidden sm:inline truncate">{tab.label}</span>
          </button>
        ))}
      </div>
      {/* Content */}
      <div className="flex-1 overflow-hidden flex flex-col min-h-0 bg-[#F5F5DC]" style={{ color: PRIMARY_BG_FLAT }}>
        {activeTab?.children}
      </div>
    </div>
  );
};

export const PagesTabIcon = () => <LayoutGrid size={16} />;
export const LayersTabIcon = () => <Layers size={16} />;
export const SettingsTabIcon = () => <Settings size={16} />;
export const AssetsTabIcon = () => <Library size={16} />;
