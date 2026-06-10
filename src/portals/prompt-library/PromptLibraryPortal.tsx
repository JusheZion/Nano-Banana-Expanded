import { useCallback, useEffect, useMemo, useState } from 'react';
import type { FormEvent, KeyboardEvent } from 'react';
import {
  Archive,
  Boxes,
  Copy,
  Database,
  Download,
  Edit3,
  FileClock,
  Library,
  Plus,
  Search,
  Send,
  Sparkles,
  Star,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useAuth } from '@/shared/context/AuthContext';
import { supabase } from '@/shared/lib/supabase';
import { usePromptLibraryBridge, handoffToPromptDraft } from '@/stores/promptLibraryBridge';
import { demoPrompts } from './data/demoData';
import {
  categoryMeta,
  createExport,
  createPromptFromDraft,
  draftFromPrompt,
  duplicatePrompt,
  emptyDraft,
  filterPrompts,
} from './lib/promptUtils';
import {
  deletePrompt as deleteDatabasePrompt,
  fetchPrompts,
  savePrompt as saveDatabasePrompt,
  toggleFavorite as toggleDatabaseFavorite,
} from './lib/promptRepository';
import type { LibraryFilters, PromptDraft, PromptRecord } from './lib/types';
import './promptLibrary.css';

const defaultFilters: LibraryFilters = {
  search: '',
  category: 'all',
  tag: '',
  model: '',
  entity: '',
  favoritesOnly: false,
};

const categoryOptions = ['all', ...Object.keys(categoryMeta)] as Array<LibraryFilters['category']>;

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error) return error.message;
  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === 'string' && message.trim()) return message;
  }
  return fallback;
}

export function PromptLibraryPortal() {
  const { user } = useAuth();
  const consumeInboundDraft = usePromptLibraryBridge((s) => s.consumeInboundDraft);
  const requestUsePrompt = usePromptLibraryBridge((s) => s.requestUsePrompt);
  const [prompts, setPrompts] = useState<PromptRecord[]>(demoPrompts);
  const [selectedId, setSelectedId] = useState(demoPrompts[1]?.id ?? demoPrompts[0]?.id ?? '');
  const [filters, setFilters] = useState<LibraryFilters>(defaultFilters);
  const [editorDraft, setEditorDraft] = useState<PromptDraft | null>(null);
  const [status, setStatus] = useState('Prompt Library ready. Sign in to persist ARCS prompt intelligence.');
  const [isBusy, setIsBusy] = useState(false);

  const isDatabaseReady = Boolean(supabase && user);
  const visiblePrompts = useMemo(() => filterPrompts(prompts, filters), [prompts, filters]);
  const selectedPrompt = prompts.find((prompt) => prompt.id === selectedId) ?? visiblePrompts[0] ?? prompts[0] ?? null;
  const stats = useMemo(() => buildStats(prompts), [prompts]);

  useEffect(() => {
    const handoff = consumeInboundDraft();
    if (!handoff) return;
    const draft = handoffToPromptDraft(handoff);
    setEditorDraft(draft);
    setStatus(`Incoming prompt from ${handoff.sourceLabel}. Review and save it to the library.`);
  }, [consumeInboundDraft]);

  const loadDatabasePrompts = useCallback(async () => {
    if (!supabase || !user) return;
    setIsBusy(true);
    try {
      const databasePrompts = await fetchPrompts(supabase, user);
      setPrompts(databasePrompts.length ? databasePrompts : []);
      setSelectedId(databasePrompts[0]?.id ?? '');
      setStatus(databasePrompts.length ? 'Database library synced.' : 'Database connected. Create your first prompt.');
    } catch (error) {
      setStatus(getErrorMessage(error, 'Database sync failed.'));
    } finally {
      setIsBusy(false);
    }
  }, [user]);

  useEffect(() => {
    if (!supabase || !user) {
      setPrompts(demoPrompts);
      setStatus('Demo library loaded. Sign in to persist Prompt Library records.');
      return;
    }
    void loadDatabasePrompts();
  }, [loadDatabasePrompts, user]);

  async function handleSave(draft: PromptDraft) {
    const existing = draft.id ? prompts.find((prompt) => prompt.id === draft.id) : undefined;
    const nextPrompt = createPromptFromDraft(draft, existing);
    setIsBusy(true);
    try {
      if (supabase && user) {
        await saveDatabasePrompt(supabase, user, draft, existing);
        await loadDatabasePrompts();
      } else {
        setPrompts((current) => {
          const withoutExisting = current.filter((prompt) => prompt.id !== nextPrompt.id);
          return [nextPrompt, ...withoutExisting];
        });
        setSelectedId(nextPrompt.id);
      }
      setEditorDraft(null);
      setStatus(isDatabaseReady ? 'Prompt saved to Supabase.' : 'Prompt saved in demo memory for this session.');
    } catch (error) {
      setStatus(getErrorMessage(error, 'Prompt save failed.'));
    } finally {
      setIsBusy(false);
    }
  }

  async function handleFavorite(prompt: PromptRecord) {
    try {
      if (supabase && user) {
        await toggleDatabaseFavorite(supabase, user, prompt);
        await loadDatabasePrompts();
      } else {
        setPrompts((current) =>
          current.map((item) => (item.id === prompt.id ? { ...item, isFavorite: !item.isFavorite } : item)),
        );
      }
      setStatus(prompt.isFavorite ? 'Favorite removed.' : 'Prompt favorited.');
    } catch (error) {
      setStatus(getErrorMessage(error, 'Favorite update failed.'));
    }
  }

  async function handleDelete(prompt: PromptRecord) {
    try {
      if (supabase && user) {
        await deleteDatabasePrompt(supabase, user, prompt.id);
        await loadDatabasePrompts();
      } else {
        setPrompts((current) => current.filter((item) => item.id !== prompt.id));
      }
      setSelectedId(prompts.find((item) => item.id !== prompt.id)?.id ?? '');
      setStatus('Prompt deleted.');
    } catch (error) {
      setStatus(getErrorMessage(error, 'Delete failed.'));
    }
  }

  async function handleCopy(prompt: PromptRecord) {
    await navigator.clipboard.writeText(prompt.promptText);
    setStatus('Prompt copied.');
  }

  function handleExport() {
    const blob = new Blob([createExport(prompts)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'arcs-prompt-library-export.json';
    anchor.click();
    URL.revokeObjectURL(url);
    setStatus('Library export downloaded.');
  }

  async function handleImport(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    try {
      const parsed = JSON.parse(text) as { prompts?: PromptRecord[] };
      if (!Array.isArray(parsed.prompts)) throw new Error('Import file must include a prompts array.');
      setPrompts(parsed.prompts);
      setSelectedId(parsed.prompts[0]?.id ?? '');
      setStatus('Import loaded into this session. Save records individually to persist curated changes.');
    } catch (error) {
      setStatus(getErrorMessage(error, 'Import failed.'));
    } finally {
      event.target.value = '';
    }
  }

  function handleUsePrompt(prompt: PromptRecord, target: 'lab' | 'studio' | 'assets') {
    requestUsePrompt({
      target,
      promptText: prompt.promptText,
      title: prompt.title,
      sourcePromptId: prompt.id,
      sourceLabel: prompt.sourceLabel || 'Prompt Library',
      promptSections: prompt.promptSections,
    });
    setStatus(`Sent "${prompt.title}" to ${target === 'lab' ? 'Illustrator’s Imageshop' : target === 'studio' ? 'Character Studio' : 'Asset Studio'}.`);
  }

  return (
    <section className="prompt-library-portal" aria-label="Prompt Library">
      <div className="prompt-library-veil" aria-hidden />
      <header className="prompt-library-command">
        <div>
          <p className="prompt-library-overline">ARCS Prompt Intelligence</p>
          <h2>Prompt Library</h2>
          <p>Curate reusable prompts, track provenance, and move generation language between ARCS portals.</p>
        </div>
        <div className="prompt-library-actions">
          <button type="button" onClick={() => setEditorDraft({ ...emptyDraft })}>
            <Plus size={16} /> New Prompt
          </button>
          <label>
            <Upload size={16} /> Import
            <input type="file" accept="application/json" onChange={handleImport} />
          </label>
          <button type="button" onClick={handleExport}>
            <Download size={16} /> Export
          </button>
        </div>
      </header>

      <div className="prompt-library-grid">
        <aside className="prompt-library-left">
          <div className="prompt-library-stat-grid">
            <Stat icon={Library} label="Prompts" value={String(prompts.length)} />
            <Stat icon={Star} label="Favorites" value={String(stats.favorites)} />
            <Stat icon={Archive} label="Collections" value={String(stats.collections)} />
            <Stat icon={Boxes} label="Entities" value={String(stats.entities)} />
          </div>

          <div className="prompt-library-filter-panel">
            <label className="prompt-library-search">
              <Search size={15} />
              <input
                value={filters.search}
                onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))}
                placeholder="Search prompts, tags, portals"
              />
            </label>
            <div className="prompt-library-filter-row">
              <select
                value={filters.category}
                onChange={(event) =>
                  setFilters((current) => ({ ...current, category: event.target.value as LibraryFilters['category'] }))
                }
              >
                {categoryOptions.map((category) => (
                  <option key={category} value={category}>
                    {category === 'all' ? 'All categories' : categoryMeta[category].label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                aria-pressed={filters.favoritesOnly}
                onClick={() => setFilters((current) => ({ ...current, favoritesOnly: !current.favoritesOnly }))}
              >
                <Star size={14} /> Favorites
              </button>
            </div>
            <div className="prompt-library-filter-row">
              <input
                value={filters.tag}
                onChange={(event) => setFilters((current) => ({ ...current, tag: event.target.value }))}
                placeholder="Tag"
              />
              <input
                value={filters.entity}
                onChange={(event) => setFilters((current) => ({ ...current, entity: event.target.value }))}
                placeholder="Entity"
              />
            </div>
          </div>

          <div className="prompt-library-list" aria-label="Prompt list">
            {visiblePrompts.map((prompt) => (
              <button
                type="button"
                key={prompt.id}
                className={`prompt-library-row ${prompt.id === selectedPrompt?.id ? 'is-active' : ''}`}
                onClick={() => setSelectedId(prompt.id)}
              >
                <span style={{ borderColor: categoryMeta[prompt.category].accent }} />
                <strong>{prompt.title}</strong>
                <small>{prompt.sourceLabel || categoryMeta[prompt.category].label}</small>
              </button>
            ))}
            {!visiblePrompts.length && <p className="prompt-library-empty">No prompts match the active filters.</p>}
          </div>
        </aside>

        <main className="prompt-library-detail">
          {selectedPrompt ? (
            <>
              <div className="prompt-library-detail-header">
                <div>
                  <p>{categoryMeta[selectedPrompt.category].label}</p>
                  <h3>{selectedPrompt.title}</h3>
                </div>
                <div className="prompt-library-icon-actions">
                  <button type="button" onClick={() => void handleFavorite(selectedPrompt)} aria-label="Favorite prompt">
                    <Star size={16} fill={selectedPrompt.isFavorite ? 'currentColor' : 'none'} />
                  </button>
                  <button type="button" onClick={() => setEditorDraft(draftFromPrompt(selectedPrompt))} aria-label="Edit prompt">
                    <Edit3 size={16} />
                  </button>
                  <button type="button" onClick={() => setEditorDraft(duplicatePrompt(selectedPrompt))} aria-label="Duplicate prompt">
                    <Copy size={16} />
                  </button>
                  <button type="button" onClick={() => void handleDelete(selectedPrompt)} aria-label="Delete prompt">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              <pre className="prompt-library-prompt">{selectedPrompt.promptText}</pre>

              <div className="prompt-library-use-bar">
                <button type="button" onClick={() => void handleCopy(selectedPrompt)}>
                  <Copy size={15} /> Copy
                </button>
                <button type="button" onClick={() => handleUsePrompt(selectedPrompt, 'lab')}>
                  <Send size={15} /> Use in Imageshop
                </button>
                <button type="button" onClick={() => handleUsePrompt(selectedPrompt, 'studio')}>
                  <Send size={15} /> Character Studio
                </button>
                <button type="button" onClick={() => handleUsePrompt(selectedPrompt, 'assets')}>
                  <Send size={15} /> Asset Studio
                </button>
              </div>

              <div className="prompt-library-meta-grid">
                <MetaBlock title="Tags" values={selectedPrompt.tags} />
                <MetaBlock title="Collections" values={selectedPrompt.collections} />
                <MetaBlock title="Characters" values={selectedPrompt.characters.map((item) => item.name)} />
                <MetaBlock title="Scenes" values={selectedPrompt.scenes.map((item) => item.name)} />
              </div>
            </>
          ) : (
            <div className="prompt-library-null">
              <Sparkles size={38} />
              <h3>No prompt selected</h3>
              <p>Create or import a prompt to begin curating ARCS prompt intelligence.</p>
            </div>
          )}
        </main>

        <aside className="prompt-library-right">
          <div className="prompt-library-status">
            <Database size={16} />
            <span>{isBusy ? 'Syncing…' : status}</span>
          </div>
          <ProvenancePanel prompt={selectedPrompt} />
          <VersionsPanel prompt={selectedPrompt} />
        </aside>
      </div>

      {editorDraft && (
        <PromptEditor
          draft={editorDraft}
          onCancel={() => setEditorDraft(null)}
          onSave={(draft) => void handleSave(draft)}
        />
      )}
    </section>
  );
}

function Stat({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="prompt-library-stat">
      <Icon size={16} />
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function MetaBlock({ title, values }: { title: string; values: string[] }) {
  return (
    <div className="prompt-library-meta-block">
      <span>{title}</span>
      <p>{values.length ? values.join(', ') : 'None'}</p>
    </div>
  );
}

function ProvenancePanel({ prompt }: { prompt: PromptRecord | null }) {
  return (
    <section className="prompt-library-side-card">
      <h4>Source Context</h4>
      {prompt?.sourcePortal ? (
        <>
          <p className="prompt-library-source-pill">{prompt.sourcePortal}</p>
          <strong>{prompt.sourceLabel || 'ARCS source'}</strong>
          <pre>{JSON.stringify(prompt.sourceContext ?? {}, null, 2)}</pre>
        </>
      ) : (
        <p className="prompt-library-muted">Manual or legacy prompt. New ARCS handoffs will store portal provenance here.</p>
      )}
    </section>
  );
}

function VersionsPanel({ prompt }: { prompt: PromptRecord | null }) {
  return (
    <section className="prompt-library-side-card">
      <h4><FileClock size={15} /> Versions</h4>
      {(prompt?.versions ?? []).slice(0, 4).map((version) => (
        <div className="prompt-library-version" key={version.id}>
          <strong>v{version.versionNumber}</strong>
          <span>{version.notes || 'Saved draft'}</span>
        </div>
      ))}
      {!(prompt?.versions ?? []).length && <p className="prompt-library-muted">Versions appear as prompt text changes.</p>}
    </section>
  );
}

function PromptEditor({
  draft,
  onCancel,
  onSave,
}: {
  draft: PromptDraft;
  onCancel: () => void;
  onSave: (draft: PromptDraft) => void;
}) {
  const [localDraft, setLocalDraft] = useState(draft);

  function update<K extends keyof PromptDraft>(key: K, value: PromptDraft[K]) {
    setLocalDraft((current) => ({ ...current, [key]: value }));
  }

  function saveDraft() {
    if (!localDraft.promptText.trim()) return;
    onSave(localDraft);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    saveDraft();
  }

  function handleEditorKeyDown(event: KeyboardEvent<HTMLFormElement>) {
    const target = event.target as HTMLElement;
    if (event.key !== 'Enter' || target.tagName !== 'INPUT') return;
    event.preventDefault();
    saveDraft();
  }

  return (
    <div className="prompt-library-modal" role="dialog" aria-modal="true" aria-label="Prompt editor">
      <form className="prompt-library-editor" onSubmit={handleSubmit} onKeyDown={handleEditorKeyDown}>
        <header>
          <div>
            <p>{localDraft.sourceLabel || 'Manual prompt'}</p>
            <h3>{localDraft.id ? 'Edit prompt' : 'Save prompt'}</h3>
          </div>
          <button type="button" onClick={onCancel} aria-label="Close editor">
            <X size={18} />
          </button>
        </header>
        <div className="prompt-library-editor-grid">
          <label>
            Title
            <input value={localDraft.title} onChange={(event) => update('title', event.target.value)} />
          </label>
          <label>
            Category
            <select
              value={localDraft.category}
              onChange={(event) => update('category', event.target.value as PromptDraft['category'])}
            >
              {Object.entries(categoryMeta).map(([value, meta]) => (
                <option key={value} value={value}>
                  {meta.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Model
            <input value={localDraft.model} onChange={(event) => update('model', event.target.value)} />
          </label>
          <label>
            Tags
            <input value={localDraft.tags} onChange={(event) => update('tags', event.target.value)} />
          </label>
          <label>
            Collections
            <input value={localDraft.collections} onChange={(event) => update('collections', event.target.value)} />
          </label>
          <label>
            Characters
            <input value={localDraft.characters} onChange={(event) => update('characters', event.target.value)} />
          </label>
        </div>
        <label className="prompt-library-editor-text">
          Prompt
          <textarea value={localDraft.promptText} onChange={(event) => update('promptText', event.target.value)} />
        </label>
        <label className="prompt-library-editor-text">
          Notes
          <textarea value={localDraft.notes} onChange={(event) => update('notes', event.target.value)} />
        </label>
        <label className="prompt-library-editor-text">
          Variables
          <textarea
            value={localDraft.variables}
            onChange={(event) => update('variables', event.target.value)}
            placeholder="name | default | required"
          />
        </label>
        <footer>
          <button type="button" onClick={onCancel}>
            Cancel
          </button>
          <button type="submit" disabled={!localDraft.promptText.trim()}>
            Save to Library
          </button>
        </footer>
      </form>
    </div>
  );
}

function buildStats(prompts: PromptRecord[]) {
  return {
    favorites: prompts.filter((prompt) => prompt.isFavorite).length,
    collections: new Set(prompts.flatMap((prompt) => prompt.collections)).size,
    entities: new Set([
      ...prompts.flatMap((prompt) => prompt.characters.map((character) => character.name)),
      ...prompts.flatMap((prompt) => prompt.looks.map((look) => look.name)),
      ...prompts.flatMap((prompt) => prompt.scenes.map((scene) => scene.name)),
    ]).size,
  };
}
