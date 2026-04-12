import React, { type RefObject } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Copy,
  HelpCircle,
  PanelRight,
  Search,
  Type,
} from 'lucide-react';
import { Tooltip } from '@/shared/components/Tooltip';
import {
  ACCENT_GOLD_GRADIENT,
  WRITERS_GOLD_SLANT,
} from '@/shared/theme/Phase12DesignTokens';
import {
  type WriterWorkspaceTabId,
  WRITER_WORKSPACE_TAB_LABELS,
  WRITER_WORKSPACE_TAB_ORDER,
} from '@/portals/writer/writerSearch';
import { workspaceTabShortcutHint } from '@/portals/writer/writerWorkspaceShortcuts';
import {
  WRITER_HELP_CATEGORIES,
  WRITER_UI_TIPS,
  type WriterHelpCategoryId,
} from '@/portals/writer/writerHelpRegistry';
import { useResponsiveLayout } from '@/shared/context/ResponsiveLayoutContext';

export type WriterRibbonMenuId = 'file' | 'home' | 'insert' | 'review' | 'view' | 'ai' | 'help';

const MENUS: { id: WriterRibbonMenuId; label: string }[] = [
  { id: 'file', label: 'File' },
  { id: 'home', label: 'Home' },
  { id: 'insert', label: 'Insert' },
  { id: 'review', label: 'Review' },
  { id: 'view', label: 'View' },
  { id: 'ai', label: 'AI Tools' },
  { id: 'help', label: 'Help' },
];

const WORKSPACE_TABS: { id: WriterWorkspaceTabId; label: string }[] =
  WRITER_WORKSPACE_TAB_ORDER.map((id) => ({
    id,
    label: WRITER_WORKSPACE_TAB_LABELS[id].ribbon,
  }));

const RIBBON_DIVIDER = <div className="h-8 w-px bg-black/15 shrink-0 mx-1" aria-hidden />;

type Props = {
  activeMenu: WriterRibbonMenuId;
  onActiveMenu: (id: WriterRibbonMenuId) => void;
  workspaceTab: WriterWorkspaceTabId;
  onWorkspaceTab: (id: WriterWorkspaceTabId) => void;
  findQuery: string;
  onFindQuery: (q: string) => void;
  findInputRef: RefObject<HTMLInputElement | null>;
  findMatchCount: number;
  findActiveIndex: number;
  onFindNext: () => void;
  onFindPrev: () => void;
  monospacePre: boolean;
  onToggleMonospace: () => void;
  textScale: 'sm' | 'md' | 'lg';
  onTextScale: (s: 'sm' | 'md' | 'lg') => void;
  dockOpen: boolean;
  onToggleDock: () => void;
  onCopyVisibleText: () => void;
  canCopyVisible: boolean;
  onRunPacing: () => void;
  onRunCanon: () => void;
  canRunReview: boolean;
  pacingLoading: boolean;
  canonLoading: boolean;
  onQuickGenerate: () => void;
  quickGenerateLabel: string;
  quickGenerateDisabled: boolean;
  quickGenerateLoading: boolean;
  hasPrevPage: boolean;
  hasNextPage: boolean;
  onPrevPage: () => void;
  onNextPage: () => void;
  onOpenHelpCategory: (id: WriterHelpCategoryId) => void;
  /** Shown under the primary AI action tooltip (next step in the pipeline). */
  quickGenerateNextHint?: string;
  /** Switch workspace tab and show Home ribbon (e.g. from File menu). */
  onSelectWorkspaceTabFromFile?: (id: WriterWorkspaceTabId) => void;
};

export const WriterRibbon: React.FC<Props> = ({
  activeMenu,
  onActiveMenu,
  workspaceTab,
  onWorkspaceTab,
  findQuery,
  onFindQuery,
  findInputRef,
  findMatchCount,
  findActiveIndex,
  onFindNext,
  onFindPrev,
  monospacePre,
  onToggleMonospace,
  textScale,
  onTextScale,
  dockOpen,
  onToggleDock,
  onCopyVisibleText,
  canCopyVisible,
  onRunPacing,
  onRunCanon,
  canRunReview,
  pacingLoading,
  canonLoading,
  onQuickGenerate,
  quickGenerateLabel,
  quickGenerateDisabled,
  quickGenerateLoading,
  hasPrevPage,
  hasNextPage,
  onPrevPage,
  onNextPage,
  onOpenHelpCategory,
  quickGenerateNextHint,
  onSelectWorkspaceTabFromFile,
}) => {
  const { isPhone } = useResponsiveLayout();

  return (
    <div className="flex-shrink-0 flex flex-col border-b border-white/25 bg-white/20 backdrop-blur-md">
      <div
        className="flex items-stretch gap-0.5 px-1 py-0.5 border-b border-black/10 min-h-[2.25rem] overflow-x-auto overscroll-x-contain [-webkit-overflow-scrolling:touch]"
        style={{ background: WRITERS_GOLD_SLANT }}
        role="tablist"
        aria-label="Ribbon menus"
      >
        {MENUS.map((m) => (
          <button
            key={m.id}
            type="button"
            role="tab"
            aria-selected={activeMenu === m.id}
            onClick={() => onActiveMenu(m.id)}
            className={`shrink-0 px-2 sm:px-3 py-1.5 text-[10px] sm:text-[11px] font-bold uppercase tracking-wide rounded-t-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/25 ${
              activeMenu === m.id
                ? 'bg-[#ebe8dc] text-black shadow-sm'
                : 'text-black/65 hover:bg-black/10'
            }`}
          >
            {m.id === 'help' ? (
              <span className="inline-flex items-center gap-1">
                <HelpCircle size={14} className="opacity-85 shrink-0" aria-hidden />
                {m.label}
              </span>
            ) : (
              m.label
            )}
          </button>
        ))}
      </div>

      <div
        className={`flex px-2 py-2 min-h-[3.25rem] ${
          isPhone ? 'flex-col items-stretch gap-2' : 'flex-wrap items-center gap-1'
        }`}
      >
        <div
          className={`flex flex-wrap items-center gap-1 min-w-0 ${isPhone ? 'w-full' : ''}`}
        >
        {activeMenu === 'file' && (
          <div className="flex flex-wrap items-center gap-2 px-2">
            {onSelectWorkspaceTabFromFile ? (
              <Tooltip
                content="Synopsis helper, issue pack copy/download, edit saved outline / beats / dialogue / shot plan"
                side="bottom"
              >
                <button
                  type="button"
                  onClick={() => onSelectWorkspaceTabFromFile('scripts')}
                  className="rounded-md border border-amber-800/40 bg-amber-100/90 px-3 py-1.5 text-[11px] font-bold text-black shadow-sm hover:bg-amber-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/25"
                >
                  Scripts & exports
                </button>
              </Tooltip>
            ) : null}
            <Tooltip content={WRITER_UI_TIPS.fileRibbon} side="bottom">
              <button
                type="button"
                className="rounded-lg border border-black/15 bg-white/75 p-2 text-black/70 hover:bg-white hover:text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/25"
                aria-label="About File menu and exports"
              >
                <HelpCircle size={18} aria-hidden />
              </button>
            </Tooltip>
          </div>
        )}

        {activeMenu === 'home' && (
          <>
            <div className="flex flex-col gap-0.5 px-2 border-r border-black/10 pr-3">
              <span className="text-[9px] font-bold uppercase tracking-wider text-black/45">Workspace</span>
              <div className="flex flex-wrap gap-1">
                {WORKSPACE_TABS.map((t) => (
                  <Tooltip
                    key={t.id}
                    content={`${t.label} — ${workspaceTabShortcutHint(t.id)}`}
                    side="bottom"
                  >
                    <button
                      type="button"
                      onClick={() => onWorkspaceTab(t.id)}
                      className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/25 ${
                        workspaceTab === t.id
                          ? 'text-black shadow-sm'
                          : 'bg-white/50 text-black/65 hover:bg-white/80'
                      }`}
                      style={workspaceTab === t.id ? { background: ACCENT_GOLD_GRADIENT } : undefined}
                    >
                      {t.label}
                    </button>
                  </Tooltip>
                ))}
              </div>
            </div>
            {RIBBON_DIVIDER}
            <div className="flex flex-col gap-0.5 px-2 border-r border-black/10 pr-3">
              <span className="text-[9px] font-bold uppercase tracking-wider text-black/45">Clipboard</span>
              <Tooltip content="Copy visible script or JSON (⌘C after focus)" side="bottom">
                <button
                  type="button"
                  disabled={!canCopyVisible}
                  onClick={onCopyVisibleText}
                  className="inline-flex items-center gap-1 rounded-md border border-black/15 bg-white/70 px-2 py-1 text-[11px] font-semibold text-black disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/25"
                >
                  <Copy size={14} aria-hidden />
                  Copy
                </button>
              </Tooltip>
            </div>
            {RIBBON_DIVIDER}
            <div className="flex flex-col gap-0.5 px-2 border-r border-black/10 pr-3">
              <span className="text-[9px] font-bold uppercase tracking-wider text-black/45">Font</span>
              <div className="flex items-center gap-1">
                <Tooltip content="Monospace previews" side="bottom">
                  <button
                    type="button"
                    onClick={onToggleMonospace}
                    className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/25 ${
                      monospacePre ? 'border-amber-700 bg-amber-100 text-black' : 'border-black/15 bg-white/70 text-black'
                    }`}
                  >
                    <Type size={14} aria-hidden />
                    Mono
                  </button>
                </Tooltip>
              </div>
            </div>
            {RIBBON_DIVIDER}
            <div className="flex flex-col gap-0.5 px-2">
              <span className="text-[9px] font-bold uppercase tracking-wider text-black/45">Navigate</span>
              <div className="flex gap-1">
                <Tooltip content="Previous page" side="bottom">
                  <button
                    type="button"
                    disabled={!hasPrevPage}
                    onClick={onPrevPage}
                    className="rounded-md border border-black/15 bg-white/70 px-2 py-1 text-[11px] font-semibold disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/25"
                  >
                    ◀ Page
                  </button>
                </Tooltip>
                <Tooltip content="Next page" side="bottom">
                  <button
                    type="button"
                    disabled={!hasNextPage}
                    onClick={onNextPage}
                    className="rounded-md border border-black/15 bg-white/70 px-2 py-1 text-[11px] font-semibold disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/25"
                  >
                    Page ▶
                  </button>
                </Tooltip>
              </div>
            </div>
          </>
        )}

        {activeMenu === 'insert' && (
          <div className="flex items-center px-2">
            <Tooltip content={WRITER_UI_TIPS.insertRibbon} side="bottom">
              <button
                type="button"
                className="rounded-lg border border-black/15 bg-white/75 p-2 text-black/70 hover:bg-white hover:text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/25"
                aria-label="About Insert menu"
              >
                <HelpCircle size={18} aria-hidden />
              </button>
            </Tooltip>
          </div>
        )}

        {activeMenu === 'review' && (
          <div className="flex flex-wrap items-end gap-2 px-2">
            <Tooltip content={WRITER_UI_TIPS.reviewPacing} side="bottom">
              <button
                type="button"
                disabled={!canRunReview || pacingLoading}
                onClick={onRunPacing}
                className="rounded-md px-3 py-1.5 text-[11px] font-bold text-black shadow-sm disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/25"
                style={{ background: ACCENT_GOLD_GRADIENT }}
              >
                {pacingLoading ? '…' : 'Pacing review'}
              </button>
            </Tooltip>
            <Tooltip content={WRITER_UI_TIPS.reviewCanon} side="bottom">
              <button
                type="button"
                disabled={!canRunReview || canonLoading}
                onClick={onRunCanon}
                className="rounded-md px-3 py-1.5 text-[11px] font-bold text-black shadow-sm disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/25"
                style={{ background: ACCENT_GOLD_GRADIENT }}
              >
                {canonLoading ? '…' : 'Canon check'}
              </button>
            </Tooltip>
          </div>
        )}

        {activeMenu === 'view' && (
          <div className="flex flex-wrap items-center gap-2 px-2">
            <Tooltip content="Toggle Library / Activity panels (⌘⇧H)" side="bottom">
              <button
                type="button"
                onClick={onToggleDock}
                className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/25 ${
                  dockOpen ? 'border-amber-700 bg-amber-100' : 'border-black/15 bg-white/70'
                }`}
              >
                <PanelRight size={14} aria-hidden />
                Panels
              </button>
            </Tooltip>
            <span className="text-[9px] font-bold uppercase text-black/45">Text size</span>
            {(['sm', 'md', 'lg'] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => onTextScale(s)}
                className={`rounded px-2 py-0.5 text-[11px] font-bold uppercase focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/25 ${
                  textScale === s ? 'ring-2 ring-black/30 bg-white' : 'bg-white/50 hover:bg-white/80'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {activeMenu === 'ai' && (
          <div className="flex flex-wrap items-center gap-2 px-2">
            <Tooltip
              content={
                quickGenerateNextHint?.trim()
                  ? `${WRITER_UI_TIPS.aiQuickGenerate}\n\nNext: ${quickGenerateNextHint.trim()}`
                  : WRITER_UI_TIPS.aiQuickGenerate
              }
              side="bottom"
            >
              <button
                type="button"
                disabled={quickGenerateDisabled || quickGenerateLoading}
                onClick={onQuickGenerate}
                className="rounded-md px-4 py-1.5 text-[11px] font-bold text-black shadow-sm disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/25"
                style={{ background: ACCENT_GOLD_GRADIENT }}
              >
                {quickGenerateLoading ? 'Working…' : quickGenerateLabel}
              </button>
            </Tooltip>
          </div>
        )}

        {activeMenu === 'help' && (
          <div className="flex flex-col gap-2 px-2 py-0.5 min-w-0">
            <span className="text-[9px] font-bold uppercase tracking-wider text-black/45">Guides</span>
            <div className="flex flex-wrap gap-2 items-start">
              {WRITER_HELP_CATEGORIES.map((cat) => {
                const Icon = cat.Icon;
                return (
                  <Tooltip key={cat.id} content={`${cat.label} — ${cat.sublabel}`} side="bottom">
                    <button
                      type="button"
                      onClick={() => onOpenHelpCategory(cat.id)}
                      className="flex flex-col items-center justify-center aspect-square w-[4.85rem] shrink-0 rounded-xl border border-black/15 bg-white/85 shadow-sm hover:bg-white hover:border-black/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/25 px-1 pt-1.5 pb-1 gap-0.5"
                    >
                      <Icon size={26} className="text-black/85 shrink-0" aria-hidden />
                      <span className="text-[8.5px] font-black uppercase leading-[1.05] text-center text-black w-full px-0.5 line-clamp-2">
                        {cat.label}
                      </span>
                      <span className="text-[7px] font-bold uppercase leading-[1.1] text-center text-black/50 w-full px-0.5 line-clamp-2">
                        {cat.sublabel}
                      </span>
                    </button>
                  </Tooltip>
                );
              })}
            </div>
          </div>
        )}
        </div>

        {!isPhone ? <div className="flex-1 min-w-[120px]" /> : null}

        <div
          className={`flex items-center gap-1 shrink-0 ${
            isPhone
              ? 'w-full border-t border-black/10 pt-2 justify-between'
              : 'border-l border-black/10 pl-2 ml-auto'
          }`}
        >
          <Search size={14} className="text-black/45 shrink-0" aria-hidden />
          <input
            ref={findInputRef}
            type="search"
            placeholder="Find in view…"
            value={findQuery}
            onChange={(e) => onFindQuery(e.target.value)}
            className={`rounded-md border border-black/15 bg-white/90 px-2 py-1 text-[11px] text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/25 ${
              isPhone ? 'flex-1 min-w-0 max-w-full' : 'w-[min(200px,28vw)]'
            }`}
            aria-label="Find in document"
          />
          <span className="text-[10px] text-black/45 tabular-nums min-w-[3rem]">
            {findQuery.trim()
              ? `${Math.min(findActiveIndex + 1, Math.max(findMatchCount, 1))}/${findMatchCount || 0}`
              : ''}
          </span>
          <Tooltip content="Previous match" side="bottom">
            <button
              type="button"
              disabled={findMatchCount === 0}
              onClick={onFindPrev}
              className="p-1 rounded border border-black/10 bg-white/70 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/25"
              aria-label="Previous find match"
            >
              <ChevronUp size={16} aria-hidden />
            </button>
          </Tooltip>
          <Tooltip content="Next match" side="bottom">
            <button
              type="button"
              disabled={findMatchCount === 0}
              onClick={onFindNext}
              className="p-1 rounded border border-black/10 bg-white/70 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/25"
              aria-label="Next find match"
            >
              <ChevronDown size={16} aria-hidden />
            </button>
          </Tooltip>
        </div>
      </div>
    </div>
  );
};
