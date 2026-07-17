import React, { useLayoutEffect, useRef } from 'react';
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
  { id: 'help', label: 'Help / Shortcuts', icon: <Keyboard size={16} aria-hidden /> },
];

type Props = {
  activeTabId: WriterDockTabId;
  onTabChange: (id: WriterDockTabId) => void;
  library: React.ReactNode;
  activity: React.ReactNode;
  help: React.ReactNode;
  collapsed: boolean;
  onToggleCollapse: () => void;
  /** Full-width bottom dock on narrow phones (vs right sidebar). */
  phoneLayout?: boolean;
  /** Focused workflow uses the Figma Story Library rail instead of the multi-tool dock. */
  storyLibraryOnly?: boolean;
  onAddStory?: () => void;
};

export const WriterStudioDock: React.FC<Props> = ({
  activeTabId,
  onTabChange,
  library,
  activity,
  help,
  collapsed,
  onToggleCollapse,
  phoneLayout = false,
  storyLibraryOnly = false,
  onAddStory,
}) => {
  const showPanelsButtonRef = useRef<HTMLButtonElement>(null);
  const hidePanelsButtonRef = useRef<HTMLButtonElement>(null);
  const restoreKeyboardFocusRef = useRef(false);
  const content =
    activeTabId === 'library' ? library : activeTabId === 'activity' ? activity : help;

  useLayoutEffect(() => {
    if (!restoreKeyboardFocusRef.current) return;
    restoreKeyboardFocusRef.current = false;
    (collapsed ? showPanelsButtonRef : hidePanelsButtonRef).current?.focus();
  }, [collapsed]);

  const handleToggleCollapse = (event: React.MouseEvent<HTMLButtonElement>) => {
    restoreKeyboardFocusRef.current = event.detail === 0;
    onToggleCollapse();
  };

  if (collapsed) {
    if (phoneLayout) {
      return (
        <div className="writer-motion-dock writer-motion-dock--collapsed writer-motion-dock--phone flex-shrink-0 flex flex-row items-stretch justify-center border-t border-white/25 bg-white/15 backdrop-blur-md pb-[max(0.25rem,env(safe-area-inset-bottom,0px))]">
          <Tooltip content="Show Library / Activity panels" side="top">
            <button
              ref={showPanelsButtonRef}
              type="button"
              onClick={handleToggleCollapse}
              className="flex-1 max-w-sm py-2.5 px-4 border-black/10 hover:bg-black/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/30"
              aria-label="Show workshop panels"
            >
              <BookOpen size={18} className="text-black/70 mx-auto" aria-hidden />
            </button>
          </Tooltip>
        </div>
      );
    }
    return (
      <div className="writer-motion-dock writer-motion-dock--collapsed flex-shrink-0 flex flex-col border-l border-white/25 bg-white/15 backdrop-blur-md w-10">
        <Tooltip content="Show panels" side="left">
          <button
            ref={showPanelsButtonRef}
            type="button"
            onClick={handleToggleCollapse}
            className="p-2 border-b border-black/10 hover:bg-black/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/30"
            aria-label="Show workshop panels"
          >
            <BookOpen size={18} className="text-black/70 mx-auto" aria-hidden />
          </button>
        </Tooltip>
      </div>
    );
  }

  if (phoneLayout) {
    return (
      <div
        className="writer-motion-dock writer-motion-dock--open writer-motion-dock--phone flex-shrink-0 flex flex-col border-t border-white/30 bg-white/15 backdrop-blur-md w-full min-w-0 min-h-0 max-h-[min(42vh,420px)] shadow-lg shadow-teal-900/10 pb-[max(0.25rem,env(safe-area-inset-bottom,0px))]"
        role="region"
        aria-label="Workshop panels"
      >
        <div className="flex border-b border-black/10 shrink-0" style={{ background: WRITERS_GOLD_SLANT }}>
          {DOCK_TABS.map((t) => (
            <Tooltip key={t.id} content={t.label} side="top">
              <button
                type="button"
                onClick={() => onTabChange(t.id)}
                className={`flex-1 flex items-center justify-center gap-1 py-2.5 min-w-0 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-black/25 ${
                  activeTabId === t.id ? 'text-black' : 'text-black/55 active:bg-black/10'
                }`}
                style={activeTabId === t.id ? { background: ACCENT_GOLD_GRADIENT } : undefined}
                aria-pressed={activeTabId === t.id}
                aria-label={t.label}
              >
                {t.icon}
                <span className="text-[9px] font-bold uppercase tracking-wider truncate max-w-[4.5rem]">
                  {t.label}
                </span>
              </button>
            </Tooltip>
          ))}
          <Tooltip content="Hide panels" side="top">
            <button
              ref={hidePanelsButtonRef}
              type="button"
              onClick={handleToggleCollapse}
              className="px-2.5 border-l border-black/10 text-black/60 active:bg-black/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-black/25 shrink-0"
              aria-label="Hide workshop panels"
            >
              <span className="text-lg leading-none">⌄</span>
            </button>
          </Tooltip>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-2 text-black/80">{content}</div>
      </div>
    );
  }

  return (
    <div
      className={`writer-motion-dock writer-motion-dock--open flex-shrink-0 flex flex-col border-l border-white/30 bg-white/20 backdrop-blur-md min-h-0 shadow-lg shadow-teal-900/10 ${
        storyLibraryOnly ? 'w-[280px]' : 'w-[min(100%,min(92vw,280px))] min-w-[260px] max-w-[320px]'
      }`}
      role="region"
      aria-label="Workshop panels"
    >
      {storyLibraryOnly ? (
        <div className="flex min-h-[56px] shrink-0 items-center justify-between border-b border-black/10 px-5">
          <span className="text-[14px] font-black uppercase tracking-wide text-black">Story Library</span>
          <button type="button" onClick={onAddStory} disabled={!onAddStory} className="inline-flex h-9 w-9 items-center justify-center rounded-md text-2xl font-light leading-none text-black hover:bg-black/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/25 disabled:opacity-40" aria-label="Create new series">+</button>
        </div>
      ) : (
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
            ref={hidePanelsButtonRef}
            type="button"
            onClick={handleToggleCollapse}
            className="px-2 border-l border-black/10 text-black/60 hover:bg-black/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-black/25"
            aria-label="Hide workshop panels"
          >
            <span className="text-lg leading-none">›</span>
          </button>
        </Tooltip>
      </div>
      )}
      <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-2 text-black/80">{content}</div>
    </div>
  );
};
