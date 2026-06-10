import React from 'react';
import { Pin, PinOff, Sparkles } from 'lucide-react';
import { CopyButton } from '@/shared/components/CopyButton';
import { PinnedHelpTooltip } from '@/shared/components/Tooltip';
import { Tooltip } from '@/shared/components/Tooltip';
import { useAssetStudioStore } from '@/stores/assetStudioStore';
import { ACCENT_GOLD_GRADIENT } from '@/shared/theme/Phase12DesignTokens';
import { goldTextStyle } from './assetStudioShared';

const REFINE_SUGGEST_CHIPS = [
  'Softer ambient light',
  'Wider establishing shot',
  'More detail in foreground',
  'Different time of day',
  'Richer materials',
];

type Props = {
  phoneCompact: boolean;
  displayPrompt: string;
  promptPinned: boolean;
  setPromptPinned: React.Dispatch<React.SetStateAction<boolean>>;
  promptPanelTab: 'auto' | 'reference' | 'edit' | 'refine';
  setPromptPanelTab: React.Dispatch<React.SetStateAction<'auto' | 'reference' | 'edit' | 'refine'>>;
  aiReferencePrompt: string;
  aiReferencePromptLoading: boolean;
  aiReferencePromptError: string | null;
  onDescribeLiveImage: () => void | Promise<void>;
  onSaveToPromptLibrary: () => void;
  snippetNameInput: string;
  setSnippetNameInput: (v: string) => void;
  snippetTextInput: string;
  setSnippetTextInput: (v: string) => void;
  onRefine: () => void | Promise<void>;
};

export const AssetStudioLivePromptPanel: React.FC<Props> = ({
  phoneCompact,
  displayPrompt,
  promptPinned,
  setPromptPinned,
  promptPanelTab,
  setPromptPanelTab,
  aiReferencePrompt,
  aiReferencePromptLoading,
  aiReferencePromptError,
  onDescribeLiveImage,
  onSaveToPromptLibrary,
  snippetNameInput,
  setSnippetNameInput,
  snippetTextInput,
  setSnippetTextInput,
  onRefine,
}) => {
  const store = useAssetStudioStore();

  return (
    <div
      className={`rounded-xl border border-white/10 bg-black/30 p-2 flex flex-col min-h-0 overflow-hidden ${
        phoneCompact
          ? 'flex-1 min-h-[min(50vh,420px)] max-h-none'
          : 'shrink-0 max-h-[min(52vh,480px)] md:min-h-[min(42vh,420px)] md:flex-1 md:max-h-none'
      }`}
    >
      <div className="mb-1 shrink-0 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-bold uppercase tracking-widest" style={goldTextStyle}>
          Live Prompt
        </h2>
        {!phoneCompact && (
          <button
            type="button"
            onClick={() => {
              store.clearLivePromptOverridesOnly();
              setPromptPanelTab('auto');
            }}
            className="px-2 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide border border-white/20 text-white/75 hover:bg-white/10"
            title="Clear Edit override and Refine text only."
          >
            Clear overrides
          </button>
        )}
      </div>
      {!promptPinned ? (
        <p
          className="text-sm font-mono text-violet-100/90 truncate border border-white/10 rounded-lg px-3 py-2 bg-black/50 min-h-[2.5rem]"
          title={displayPrompt || undefined}
        >
          {(displayPrompt || '// Pin to expand — full prompt, tabs, and Architectural Lock').split('\n')[0].slice(0, 140)}
          {displayPrompt && (displayPrompt.length > 140 || displayPrompt.includes('\n')) ? '…' : ''}
        </p>
      ) : (
        <>
          {!phoneCompact && (
            <div className="flex flex-wrap gap-1 border-b border-white/10 pb-2 mb-2 shrink-0">
              {(
                [
                  { id: 'auto' as const, label: 'Prompt' },
                  { id: 'reference' as const, label: 'Reference Prompt' },
                  { id: 'edit' as const, label: 'Edit' },
                  { id: 'refine' as const, label: 'Refine' },
                ]
              ).map(({ id, label }) => (
                <span key={id} className="inline-flex items-center">
                  <button
                    type="button"
                    onClick={() => setPromptPanelTab(id)}
                    className={`px-3 py-1.5 rounded-t-lg text-sm font-medium border-b-2 transition-colors ${
                      promptPanelTab === id
                        ? 'border-amber-500 text-amber-200 bg-black/40'
                        : 'border-transparent text-white/60 hover:text-white/90'
                    }`}
                  >
                    {label}
                  </button>
                  <PinnedHelpTooltip variant="asset" title={label}>
                    {id === 'auto' && 'Compiled prompt from tags. ⌘/Ctrl+Enter generates.'}
                    {id === 'reference' &&
                      'AI-generated prompt from the live frame (vision). Use Describe live image. Different from Prompt (tag-built compile).'}
                    {id === 'edit' &&
                      'Raw prompt override. Model is in the bottom bar. Overrides compiled tags when the override field is non-empty.'}
                    {id === 'refine' && 'Refine the current live image with your instructions.'}
                  </PinnedHelpTooltip>
                </span>
              ))}
            </div>
          )}
          {!phoneCompact && promptPanelTab === 'auto' && (
            <div className="bg-black/60 p-2 rounded-lg font-mono text-xs text-violet-100/85 break-words flex-1 min-h-[80px] max-h-[min(22vh,200px)] overflow-y-auto custom-scrollbar transition-opacity duration-200">
              {displayPrompt || '// Prompt is empty...'}
            </div>
          )}
          {!phoneCompact && promptPanelTab === 'reference' && (
            <div className="flex-1 flex flex-col gap-2 min-h-[80px] max-h-[min(22vh,200px)] overflow-hidden">
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <Tooltip
                  variant="asset"
                  content="Calls Gemini vision on the image currently shown in the live frame (right panel). Use after Generate or when you load a scene."
                  side="bottom"
                >
                  <button
                    type="button"
                    onClick={() => void onDescribeLiveImage()}
                    disabled={
                      aiReferencePromptLoading ||
                      !store.currentLiveImageUrl ||
                      store.generationStatus === 'pending'
                    }
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold border border-amber-500/50 text-black disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ background: ACCENT_GOLD_GRADIENT }}
                  >
                    <Sparkles className="w-3.5 h-3.5 shrink-0" aria-hidden />
                    {aiReferencePromptLoading ? 'Describing…' : 'Describe live image'}
                  </button>
                </Tooltip>
                {aiReferencePromptError ? (
                  <span className="text-[10px] text-red-300/95 max-w-[12rem]">
                    {aiReferencePromptError}
                  </span>
                ) : null}
              </div>
              <div className="flex-1 min-h-[48px] overflow-y-auto rounded-lg bg-black/60 p-2 font-mono text-xs text-violet-100/85 break-words custom-scrollbar">
                {aiReferencePrompt.trim()
                  ? aiReferencePrompt
                  : '// Click “Describe live image” to generate an AI reference prompt from the scene in the live frame. The Prompt tab still shows the tag-built compile for Generate.'}
              </div>
            </div>
          )}
          {(phoneCompact || promptPanelTab === 'edit') && (
            <div className="flex-1 flex flex-col gap-2 min-h-[80px] max-h-[min(22vh,200px)] overflow-y-auto">
              <textarea
                value={store.vaultPromptOverride}
                onChange={(e) => store.setVaultPromptOverride(e.target.value)}
                placeholder="Override prompt…"
                className="w-full flex-1 min-h-[120px] bg-black/60 text-white/90 p-3 rounded-lg border border-amber-500/20 text-sm font-mono resize-y"
              />
              <div className="flex flex-wrap gap-2 items-center">
                <select
                  className="bg-black/50 text-white text-xs rounded border border-white/20 px-2 py-1 max-w-[160px]"
                  defaultValue=""
                  onChange={(e) => {
                    const s = store.promptSnippets.find((x) => x.id === e.target.value);
                    if (s) {
                      store.setVaultPromptOverride(
                        `${store.vaultPromptOverride}${store.vaultPromptOverride && !store.vaultPromptOverride.endsWith('\n') ? '\n' : ''}${s.text}`
                      );
                    }
                    e.target.value = '';
                  }}
                >
                  <option value="">Insert snippet…</option>
                  {store.promptSnippets.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  value={snippetNameInput}
                  onChange={(e) => setSnippetNameInput(e.target.value)}
                  placeholder="Snippet name"
                  className="w-24 bg-black/40 text-white text-xs px-2 py-1 rounded border border-white/15"
                />
                <input
                  type="text"
                  value={snippetTextInput}
                  onChange={(e) => setSnippetTextInput(e.target.value)}
                  placeholder="Snippet text"
                  className="flex-1 min-w-[100px] bg-black/40 text-white text-xs px-2 py-1 rounded border border-white/15"
                />
                <button
                  type="button"
                  onClick={() => {
                    store.addPromptSnippet(snippetNameInput, snippetTextInput);
                    setSnippetNameInput('');
                    setSnippetTextInput('');
                  }}
                  className="text-xs px-2 py-1 rounded border border-amber-500/40"
                >
                  Save snippet
                </button>
              </div>
              {store.promptSnippets.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {store.promptSnippets.map((s) => (
                    <span
                      key={s.id}
                      className="inline-flex items-center gap-1 text-sm px-2 py-0.5 rounded-full bg-white/10"
                    >
                      {s.name}
                      <button
                        type="button"
                        className="text-red-300"
                        onClick={() => store.removePromptSnippet(s.id)}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
          {!phoneCompact && promptPanelTab === 'refine' && (
            <div className="flex-1 flex flex-col gap-2 min-h-[80px] max-h-[min(22vh,200px)] overflow-y-auto">
              {!store.currentLiveImageUrl ? (
                <p className="text-sm text-violet-200/80">Generate or load an image first.</p>
              ) : (
                <>
                  <textarea
                    value={store.refinementPromptOverride}
                    onChange={(e) => store.setRefinementPromptOverride(e.target.value)}
                    placeholder="Type a refinement or use Suggest chips."
                    className="w-full flex-1 min-h-[160px] bg-black/60 text-white/90 p-3 rounded-lg border border-amber-500/20 text-sm resize-y"
                  />
                  <div className="flex flex-wrap gap-1">
                    {REFINE_SUGGEST_CHIPS.map((chip) => (
                      <button
                        key={chip}
                        type="button"
                        onClick={() =>
                          store.setRefinementPromptOverride(
                            store.refinementPromptOverride
                              ? `${store.refinementPromptOverride}, ${chip}`
                              : chip
                          )
                        }
                        className="text-xs px-2 py-1 rounded-full border border-white/20 hover:border-amber-500/50"
                      >
                        {chip}
                      </button>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" disabled className="px-3 py-1.5 rounded-lg text-xs border border-white/20 opacity-50">
                      NEW
                    </button>
                    <button
                      type="button"
                      onClick={() => void onRefine()}
                      disabled={
                        store.generationStatus === 'pending' ||
                        !store.refinementPromptOverride.trim()
                      }
                      className="px-4 py-1.5 rounded-lg text-xs font-bold text-black border border-amber-600/50 disabled:opacity-50"
                      style={{ background: ACCENT_GOLD_GRADIENT }}
                    >
                      Refine
                    </button>
                    <select
                      className="bg-black/50 text-white text-xs rounded border border-white/20 px-2 py-1"
                      defaultValue=""
                      onChange={(e) => {
                        const s = store.promptSnippets.find((x) => x.id === e.target.value);
                        if (s) {
                          store.setRefinementPromptOverride(
                            `${store.refinementPromptOverride}${store.refinementPromptOverride ? ', ' : ''}${s.text}`
                          );
                        }
                        e.target.value = '';
                      }}
                    >
                      <option value="">Insert snippet</option>
                      {store.promptSnippets.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              )}
            </div>
          )}
        </>
      )}
      <div className="mt-2 pt-2 border-t border-white/10 flex flex-wrap items-center gap-x-2 gap-y-1.5 shrink-0">
        <CopyButton text={displayPrompt} labelStyle={goldTextStyle} />
        <button
          type="button"
          onClick={onSaveToPromptLibrary}
          disabled={!displayPrompt.trim()}
          className="px-2 py-1 rounded-full text-sm border border-amber-500/40 hover:bg-amber-500/20 disabled:opacity-45"
        >
          Save to Prompt Library
        </button>
        {!phoneCompact && promptPinned && promptPanelTab === 'auto' && (
          <button
            type="button"
            onClick={() => {
              store.clearLivePromptOverridesOnly();
              setPromptPanelTab('auto');
            }}
            className="px-2 py-1 rounded-full text-sm border border-amber-500/40 hover:bg-amber-500/20"
          >
            Refresh
          </button>
        )}
        {!phoneCompact && (
          <button
            type="button"
            onClick={() => {
              store.clearLivePromptOverridesOnly();
              setPromptPanelTab('auto');
            }}
            className="px-2 py-1 rounded-full text-sm border border-amber-500/40 hover:bg-amber-500/20"
          >
            Reset to tags
          </button>
        )}
        {!phoneCompact && (
          <button
            type="button"
            onClick={() => {
              store.resetWorkspaceFreshSlate();
              setPromptPanelTab('auto');
            }}
            className="px-2 py-1 rounded-full text-sm border border-rose-500/45 text-rose-200/90 hover:bg-rose-500/15"
            title="Clear tags, refs, style selections, and prompt overrides. Keeps live image, seed, and session history."
          >
            Clear workspace
          </button>
        )}
        {!phoneCompact && (
          <button
            type="button"
            onClick={() => setPromptPinned((p) => !p)}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-sm font-bold border border-amber-500/40 text-amber-200/90 hover:bg-amber-500/10"
            aria-pressed={promptPinned}
          >
            {promptPinned ? <Pin className="w-3 h-3 shrink-0" aria-hidden /> : <PinOff className="w-3 h-3 shrink-0" aria-hidden />}
            {promptPinned ? 'Pinned' : 'Pin'}
          </button>
        )}
        {!phoneCompact && store.lastUsedPrompt ? (
          <button
            type="button"
            onClick={() => {
              void navigator.clipboard.writeText(store.lastUsedPrompt);
              store.setRefinementPromptOverride(
                store.refinementPromptOverride
                  ? `${store.refinementPromptOverride}\n${store.lastUsedPrompt.slice(0, 200)}…`
                  : store.lastUsedPrompt.slice(0, 500)
              );
              setPromptPanelTab('refine');
            }}
            className="text-sm px-2 py-0.5 rounded-full border border-violet-500/40 text-violet-200/90 hover:bg-violet-500/10 truncate max-w-[120px]"
            title="Copy full prompt to clipboard; append summary to Refine tab"
          >
            Last prompt
          </button>
        ) : null}
        <span className="text-xs text-white/55 uppercase tracking-wider">Model</span>
        <select
          value={store.selectedOnyxModelId}
          onChange={(e) => store.setSelectedOnyxModelId(e.target.value as 'flash' | 'pro')}
          className="max-w-[9.5rem] bg-black/55 text-white border border-amber-500/25 rounded-md px-1.5 py-0.5 text-sm"
        >
          <option value="flash">Nano Banana 2</option>
          <option value="pro">Nano Banana Pro</option>
        </select>
        <label className="flex items-center gap-1.5 cursor-pointer px-2 py-1 rounded-full border border-amber-500/30 bg-black/20 hover:border-amber-500/60 transition-all ml-auto">
          <span className="text-xs font-bold tracking-wide inline-block max-w-[5.5rem] leading-tight" style={goldTextStyle}>
            Architectural lock
          </span>
          <div
            role="button"
            tabIndex={0}
            aria-label="Toggle architectural lock"
            aria-pressed={store.architecturalLock}
            onClick={() => store.setArchitecturalLock(!store.architecturalLock)}
            onKeyDown={(e) => {
              if (e.key !== 'Enter' && e.key !== ' ') return;
              e.preventDefault();
              store.setArchitecturalLock(!store.architecturalLock);
            }}
            className="w-9 h-4 rounded-full p-0.5 transition-colors duration-300 bg-white/10"
            style={store.architecturalLock ? { background: ACCENT_GOLD_GRADIENT } : undefined}
          >
            <div
              className={`w-3.5 h-3.5 rounded-full bg-white shadow-md transition-transform duration-300 ${
                store.architecturalLock ? 'translate-x-[1.125rem]' : 'translate-x-0'
              }`}
            />
          </div>
        </label>
      </div>
    </div>
  );
};
