import { useMemo, useState } from 'react';
import { Search, X } from 'lucide-react';
import {
  ALL_SIGILS,
  searchSigils,
  SIGIL_CATEGORY_LABELS,
  SIGIL_CATEGORY_ORDER,
  type SigilCategory,
  type SigilDef,
} from '../data/SigilRegistry';
import { SigilGlyph } from './SigilGlyph';
import type { SigilAppearance } from '../utils/sigilRaster';

interface SigilPaletteProps {
  /** Fired when a mark is chosen — the portal places it on the plate. */
  onPlace: (sigil: SigilDef) => void;
  /** Tint applied to previews so the palette reads against the current plate. */
  tint?: string;
  /**
   * Paint used for previews. When set, the palette shows each mark exactly as
   * it will land on the plate, relief and gradient included.
   */
  appearance?: SigilAppearance;
}

type CategoryFilter = SigilCategory | 'all';

/**
 * The insert menu: every mark in the library, grouped by category and
 * searchable by name, section or tag. Clicking a mark places it.
 */
export function SigilPalette({ onPlace, tint = '#d8b45a', appearance }: SigilPaletteProps) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<CategoryFilter>('all');

  const results = useMemo(
    () => searchSigils(query, category === 'all' ? undefined : category),
    [query, category],
  );

  /** Section groupings, preserved only while browsing (search results are ranked). */
  const grouped = useMemo(() => {
    if (query.trim()) return null;
    const groups = new Map<string, SigilDef[]>();
    for (const sigil of results) {
      const key = `${SIGIL_CATEGORY_LABELS[sigil.category]} · ${sigil.section}`;
      const bucket = groups.get(key);
      if (bucket) bucket.push(sigil);
      else groups.set(key, [sigil]);
    }
    return [...groups.entries()];
  }, [results, query]);

  return (
    <div className="flex h-full flex-col text-white/90">
      <div className="shrink-0 space-y-3 border-b border-white/10 p-3">
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
            placeholder="Search marks…"
            aria-label="Search the sigil library"
            className="w-full rounded-md border border-white/15 bg-black/30 py-1.5 pl-8 pr-8 text-sm text-white placeholder:text-white/35 focus:border-white/35 focus:outline-none focus:ring-1 focus:ring-white/25"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label="Clear search"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-white/40 hover:text-white/80 focus:outline-none focus:ring-1 focus:ring-white/40"
            >
              <X size={13} />
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-1.5">
          <CategoryChip
            label="All"
            count={ALL_SIGILS.length}
            active={category === 'all'}
            onClick={() => setCategory('all')}
          />
          {SIGIL_CATEGORY_ORDER.map((cat) => (
            <CategoryChip
              key={cat}
              label={SIGIL_CATEGORY_LABELS[cat]}
              count={ALL_SIGILS.filter((s) => s.category === cat).length}
              active={category === cat}
              onClick={() => setCategory(cat)}
            />
          ))}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        {results.length === 0 && (
          <p className="px-1 py-6 text-center text-xs text-white/40">
            No marks match “{query}”.
          </p>
        )}

        {grouped
          ? grouped.map(([label, sigils]) => (
              <section key={label} className="mb-5 last:mb-0">
                <h3 className="mb-2 text-[10px] uppercase tracking-[0.14em] text-white/40">
                  {label}
                </h3>
                <SigilGrid sigils={sigils} onPlace={onPlace} tint={tint} appearance={appearance} />
              </section>
            ))
          : <SigilGrid sigils={results} onPlace={onPlace} tint={tint} appearance={appearance} />}
      </div>

      <div className="shrink-0 border-t border-white/10 px-3 py-2 text-[10px] uppercase tracking-[0.12em] text-white/35">
        {results.length} {results.length === 1 ? 'mark' : 'marks'}
      </div>
    </div>
  );
}

function SigilGrid({
  sigils,
  onPlace,
  tint,
  appearance,
}: {
  sigils: SigilDef[];
  onPlace: (sigil: SigilDef) => void;
  tint: string;
  appearance?: SigilAppearance;
}) {
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(64px,1fr))] gap-2">
      {sigils.map((sigil) => (
        <button
          key={sigil.id}
          type="button"
          onClick={() => onPlace(sigil)}
          title={`${sigil.name} — ${sigil.section}`}
          aria-label={`Place ${sigil.name}`}
          className="group flex aspect-square flex-col items-center justify-center gap-1 rounded-md border border-white/10 bg-white/[0.03] p-1.5 transition-colors hover:border-white/30 hover:bg-white/[0.08] focus:outline-none focus:ring-1 focus:ring-white/50"
        >
          <SigilGlyph sigil={sigil} size={26} color={tint} appearance={appearance} />
          <span className="line-clamp-2 text-center text-[8.5px] leading-tight text-white/45 group-hover:text-white/70">
            {sigil.name}
          </span>
        </button>
      ))}
    </div>
  );
}

function CategoryChip({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={[
        'rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-[0.08em] transition-colors focus:outline-none focus:ring-1 focus:ring-white/50',
        active
          ? 'border-white/40 bg-white/15 text-white'
          : 'border-white/10 bg-transparent text-white/50 hover:border-white/25 hover:text-white/80',
      ].join(' ')}
    >
      {label}
      <span className="ml-1 tabular-nums opacity-60">{count}</span>
    </button>
  );
}
