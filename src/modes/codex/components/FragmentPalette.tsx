import { useMemo, useState } from 'react';
import { Search, X } from 'lucide-react';
import {
  ALL_FRAGMENTS,
  FRAGMENT_CATEGORY_LABELS,
  FRAGMENT_CATEGORY_ORDER,
  searchFragments,
  type FragmentCategory,
  type FragmentDef,
} from '../data/FragmentRegistry';
import { FragmentPreview } from './FragmentPreview';

interface FragmentPaletteProps {
  /** Fired when a fragment is chosen — the portal places its whole group. */
  onPlace: (fragment: FragmentDef) => void;
  tint?: string;
}

type CategoryFilter = FragmentCategory | 'all';

/**
 * The composed half of the insert menu. Mirrors `SigilPalette` so the two read
 * as one library, but each tile previews a group rather than a single mark.
 */
export function FragmentPalette({ onPlace, tint = '#d8b45a' }: FragmentPaletteProps) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<CategoryFilter>('all');

  const results = useMemo(
    () => searchFragments(query, category === 'all' ? undefined : category),
    [query, category],
  );

  const grouped = useMemo(() => {
    if (query.trim()) return null;
    const groups = new Map<string, FragmentDef[]>();
    for (const fragment of results) {
      const key = `${FRAGMENT_CATEGORY_LABELS[fragment.category]} · ${fragment.section}`;
      const bucket = groups.get(key);
      if (bucket) bucket.push(fragment);
      else groups.set(key, [fragment]);
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
            placeholder="Search fragments…"
            aria-label="Search the fragment library"
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

        <div
          role="tablist"
          aria-label="Fragment category"
          className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 [scrollbar-width:thin]"
        >
          <CategoryChip
            label="All"
            count={ALL_FRAGMENTS.length}
            active={category === 'all'}
            onClick={() => setCategory('all')}
          />
          {FRAGMENT_CATEGORY_ORDER.map((cat) => (
            <CategoryChip
              key={cat}
              label={FRAGMENT_CATEGORY_LABELS[cat]}
              count={ALL_FRAGMENTS.filter((f) => f.category === cat).length}
              active={category === cat}
              onClick={() => setCategory(cat)}
            />
          ))}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        {results.length === 0 && (
          <p className="px-1 py-6 text-center text-xs text-white/40">
            No fragments match “{query}”.
          </p>
        )}

        {grouped
          ? grouped.map(([label, fragments]) => (
              <section key={label} className="mb-5 last:mb-0">
                <h3 className="mb-2 text-[10px] uppercase tracking-[0.14em] text-white/40">
                  {label}
                </h3>
                <FragmentGrid fragments={fragments} onPlace={onPlace} tint={tint} />
              </section>
            ))
          : <FragmentGrid fragments={results} onPlace={onPlace} tint={tint} />}
      </div>

      <div className="shrink-0 border-t border-white/10 px-3 py-2 text-[10px] uppercase tracking-[0.12em] text-white/35">
        {results.length} {results.length === 1 ? 'fragment' : 'fragments'}
      </div>
    </div>
  );
}

function FragmentGrid({
  fragments,
  onPlace,
  tint,
}: {
  fragments: FragmentDef[];
  onPlace: (fragment: FragmentDef) => void;
  tint: string;
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {fragments.map((fragment) => (
        <button
          key={fragment.id}
          type="button"
          onClick={() => onPlace(fragment)}
          title={`${fragment.name} — ${fragment.section}`}
          aria-label={`Place ${fragment.name}`}
          className="group flex flex-col items-center gap-1.5 rounded-md border border-white/10 bg-white/[0.03] p-2 transition-colors hover:border-white/30 hover:bg-white/[0.08] focus:outline-none focus:ring-1 focus:ring-white/50"
        >
          <FragmentPreview fragment={fragment} width={104} height={62} tint={tint} />
          <span className="line-clamp-2 text-center text-[9px] leading-tight text-white/45 group-hover:text-white/70">
            {fragment.name}
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
      role="tab"
      aria-selected={active}
      className={[
        'shrink-0 whitespace-nowrap rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-[0.08em] transition-colors focus:outline-none focus:ring-1 focus:ring-white/50',
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
