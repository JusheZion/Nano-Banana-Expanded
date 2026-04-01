import React from 'react';
import { BookOpen, History, Keyboard } from 'lucide-react';
import { Tooltip } from '@/shared/components/Tooltip';
import { ACCENT_GOLD_GRADIENT, WRITERS_GOLD_SLANT } from '@/shared/theme/Phase12DesignTokens';

export type WriterDockTabId = 'library' | 'activity' | 'help';

type TabDef = {
  id: WriterDockTabId;
  label: string;
  icon: React.ReactNode;
};

const DOCK_TABS: TabDef[] = [
  { id: 'library', label: 'Library', icon: <BookOpen size={16} aria-hidden /> },
  { id: 'activity', label: 'Activity', icon: <History size={16} aria-hidden /> },
  { id: 'help', label: 'Shortcuts', icon: <Keyboard size={16} aria-hidden /> },
];

type Props = {
  activeTabId: WriterDockTabId;
  onTabChange: (id: WriterDockTabId) => void;
  library: React.ReactNode;
  activity: React.ReactNode;
  help: React.ReactNode;
  collapsed: boolean;
  onToggleCollapse: () => void;
};

export const WriterStudioDock: React.FC<Props> = ({
  activeTabId,
  onTabChange,
  library,
  activity,
  help,
  collapsed,
  onToggleCollapse,
}) => {
  const content =
    activeTabId === 'library' ? library : activeTabId === 'activity' ? activity : help;

  if (collapsed) {
    return (
      <div className="flex-shrink-0 flex flex-col border-l border-white/25 bg-white/15 backdrop-blur-md w-10">
        <Tooltip content="Show panels" side="left">
          <button
            type="button"
            onClick={onToggleCollapse}
            className="p-2 border-b border-black/10 hover:bg-black/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/30"
            aria-label="Show workshop panels"
          >
            <BookOpen size={18} className="text-black/70 mx-auto" aria-hidden />
          </button>
        </Tooltip>
      </div>
    );
  }

  return (
    <div
      className="flex-shrink-0 flex flex-col border-l border-white/30 bg-white/15 backdrop-blur-md w-[min(100%,280px)] min-w-[240px] max-w-[320px] min-h-0 shadow-lg shadow-teal-900/10"
      role="region"
      aria-label="Workshop panels"
    >
      <div className="flex border-b border-black/10 shrink-0" style={{ background: WRITERS_GOLD_SLANT }}>
        {DOCK_TABS.map((t) => (
          <Tooltip key={t.id} content={t.label} side="bottom">
            <button
              type="button"
              onClick={() => onTabChange(t.id)}
              className={`flex-1 flex items-center justify-center gap-1 py-2.5 min-w-0 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-black/25 ${
                activeTabId === t.id ? 'text-black' : 'text-black/55 hover:text-black/80 hover:bg-black/5'
              }`}
              style={activeTabId === t.id ? { background: ACCENT_GOLD_GRADIENT } : undefined}
              aria-pressed={activeTabId === t.id}
              aria-label={t.label}
            >
              {t.icon}
              <span className="hidden xl:inline text-[10px] font-bold uppercase tracking-wider truncate">
                {t.label}
              </span>
            </button>
          </Tooltip>
        ))}
        <Tooltip content="Hide panels (⌘⇧H)" side="bottom">
          <button
            type="button"
            onClick={onToggleCollapse}
            className="px-2 border-l border-black/10 text-black/60 hover:bg-black/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-black/25"
            aria-label="Hide workshop panels"
          >
            <span className="text-lg leading-none">›</span>
          </button>
        </Tooltip>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-2 text-black/80">{content}</div>
    </div>
  );
};
