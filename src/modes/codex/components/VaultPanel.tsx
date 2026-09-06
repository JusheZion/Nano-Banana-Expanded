import { useEffect, useMemo, useState } from 'react';
import { Search, X } from 'lucide-react';
import { useVaultStore } from '@/stores/vaultStore';
import type { ObsidianLoreEntry } from '@/portals/writer/obsidianLoreImport';

interface VaultPanelProps {
  /** Fired when a note is chosen, so the portal can bind the selection to it. */
  onUseNote?: (entry: ObsidianLoreEntry) => void;
  /** Path of the note the current selection is bound to, for highlighting. */
  boundNotePath?: string;
  onRefreshed?: (summary: string) => void;
}

/**
 * Connects Codex Studio to the Obsidian vault and lists what it found.
 *
 * Read-only throughout: Obsidian stays the only thing that writes to the vault.
 */
export function VaultPanel({ onUseNote, boundNotePath, onRefreshed }: VaultPanelProps) {
  const status = useVaultStore((s) => s.status);
  const vaultName = useVaultStore((s) => s.vaultName);
  const entries = useVaultStore((s) => s.entries);
  const error = useVaultStore((s) => s.error);
  const lastReadAt = useVaultStore((s) => s.lastReadAt);
  const includeDrafts = useVaultStore((s) => s.includeDrafts);
  const connect = useVaultStore((s) => s.connect);
  const reconnect = useVaultStore((s) => s.reconnect);
  const refresh = useVaultStore((s) => s.refresh);
  const disconnect = useVaultStore((s) => s.disconnect);
  const restore = useVaultStore((s) => s.restore);
  const setIncludeDrafts = useVaultStore((s) => s.setIncludeDrafts);

  const [query, setQuery] = useState('');

  useEffect(() => { void restore(); }, [restore]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return entries;
    return entries.filter(
      (e) =>
        e.title.toLowerCase().includes(q) ||
        e.category.toLowerCase().includes(q) ||
        e.sourcePath.toLowerCase().includes(q),
    );
  }, [entries, query]);

  if (status === 'unsupported') {
    return (
      <Message title="Not available in this browser">
        Connecting a vault needs the File System Access API, which only Chromium
        browsers provide. Open Codex Studio in Chrome or Edge to bind plates to
        canon. Everything else in the studio works here.
      </Message>
    );
  }

  if (status === 'disconnected') {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
        <p className="text-xs text-white/60">No vault connected</p>
        <p className="max-w-[16rem] text-[11px] leading-relaxed text-white/35">
          Point Codex Studio at your Obsidian vault to pull names, epithets and
          stats straight from canon. It is read-only — nothing is ever written
          back to your notes.
        </p>
        <button
          type="button"
          onClick={() => void connect()}
          className="rounded border border-amber-300/40 bg-amber-300/10 px-3 py-1.5 text-[11px] text-amber-100 transition-colors hover:border-amber-300/70 focus:outline-none focus:ring-1 focus:ring-amber-300/60"
        >
          Connect vault…
        </button>
      </div>
    );
  }

  if (status === 'needs-permission') {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
        <p className="text-xs text-white/60">Permission needed</p>
        <p className="max-w-[16rem] text-[11px] leading-relaxed text-white/35">
          {vaultName ? `“${vaultName}” is remembered, ` : 'Your vault is remembered, '}
          but the browser drops folder access between sessions. One click restores it.
        </p>
        <button
          type="button"
          onClick={() => void reconnect()}
          className="rounded border border-amber-300/40 bg-amber-300/10 px-3 py-1.5 text-[11px] text-amber-100 transition-colors hover:border-amber-300/70 focus:outline-none focus:ring-1 focus:ring-amber-300/60"
        >
          Reconnect
        </button>
        <button
          type="button"
          onClick={() => void disconnect()}
          className="text-[10px] text-white/30 underline underline-offset-2 hover:text-white/60"
        >
          Forget this vault
        </button>
      </div>
    );
  }

  if (status === 'reading') {
    return <Message title="Reading vault">Parsing notes…</Message>;
  }

  if (status === 'error') {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
        <p className="text-xs text-rose-200/80">Could not read the vault</p>
        <p className="max-w-[16rem] text-[11px] leading-relaxed text-white/40">{error}</p>
        <button
          type="button"
          onClick={() => void refresh()}
          className="rounded border border-white/20 px-3 py-1.5 text-[11px] text-white/75 hover:border-white/40 focus:outline-none focus:ring-1 focus:ring-white/50"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col text-white/90">
      <div className="shrink-0 space-y-2.5 border-b border-white/10 p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-[12px] text-white" title={vaultName ?? ''}>
              {vaultName}
            </p>
            <p className="text-[10px] text-white/35">
              {entries.length} note{entries.length === 1 ? '' : 's'}
              {lastReadAt && ` · read ${new Date(lastReadAt).toLocaleTimeString()}`}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              void refresh().then((refreshed) => {
                if (refreshed) onRefreshed?.('Vault re-read.');
              });
            }}
            className="shrink-0 rounded border border-white/20 px-2 py-1 text-[10px] uppercase tracking-[0.08em] text-white/70 hover:border-white/40 hover:text-white focus:outline-none focus:ring-1 focus:ring-white/50"
          >
            Refresh
          </button>
        </div>

        <div className="relative">
          <Search
            size={14}
            aria-hidden="true"
            className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-white/40"
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search notes…"
            aria-label="Search vault notes"
            className="w-full rounded-md border border-white/15 bg-black/30 py-1.5 pl-8 pr-8 text-sm text-white placeholder:text-white/35 focus:border-white/35 focus:outline-none"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label="Clear search"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-white/40 hover:text-white/80"
            >
              <X size={13} />
            </button>
          )}
        </div>

        <label className="flex items-center gap-2 text-[10.5px] text-white/45">
          <input
            type="checkbox"
            checked={includeDrafts}
            onChange={(e) => void setIncludeDrafts(e.target.checked)}
            className="accent-amber-300"
          />
          Show raw sources and system notes
        </label>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {results.length === 0 && (
          <p className="px-1 py-6 text-center text-xs text-white/40">
            {entries.length === 0 ? 'No notes found in this vault.' : `No notes match “${query}”.`}
          </p>
        )}
        <ul className="space-y-0.5">
          {results.map((entry) => {
            const bound = entry.sourcePath === boundNotePath;
            return (
              <li key={entry.sourcePath}>
                <button
                  type="button"
                  onClick={() => onUseNote?.(entry)}
                  aria-current={bound ? 'true' : undefined}
                  className={[
                    'w-full rounded px-2 py-1.5 text-left transition-colors focus:outline-none focus:ring-1 focus:ring-white/40',
                    bound ? 'bg-amber-300/15 ring-1 ring-amber-300/40' : 'hover:bg-white/[0.07]',
                  ].join(' ')}
                >
                  <span className="block truncate text-[12px] text-white/85">{entry.title}</span>
                  <span className="block truncate text-[10px] text-white/35">
                    {entry.category || 'note'} ·{' '}
                    {entry.sourcePath.split('/').slice(0, -1).join('/')}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="shrink-0 border-t border-white/10 px-3 py-2">
        <button
          type="button"
          onClick={() => void disconnect()}
          className="text-[10px] text-white/30 underline underline-offset-2 hover:text-white/60"
        >
          Disconnect vault
        </button>
      </div>
    </div>
  );
}

function Message({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center">
      <p className="text-xs text-white/60">{title}</p>
      <p className="max-w-[16rem] text-[11px] leading-relaxed text-white/35">{children}</p>
    </div>
  );
}
