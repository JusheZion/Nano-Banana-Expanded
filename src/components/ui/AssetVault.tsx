import React, { useEffect, useMemo, useState } from 'react';
import { ChevronRight, RefreshCw, Search } from 'lucide-react';
import { getAssetAlbums } from '@/shared/api/arcsAssetVault';
import type { VaultAssetAlbum } from '@/shared/api/arcsAssetVault';
import { CollectionVaultModal } from '@/components/ui/CollectionVaultModal';
import { VaultImageWithFallback } from '@/components/ui/VaultImageWithFallback';
import { useGuidedComicVaultBridge } from '@/stores/guidedComicVaultBridge';

const AMETHYST = '#8B5CF6';
const AMETHYST_LIGHT = '#A78BFA';

function coverItem(album: VaultAssetAlbum) {
  const sorted = [...album.items].sort((a, b) => {
    const at = a.created_at ? Date.parse(a.created_at) : 0;
    const bt = b.created_at ? Date.parse(b.created_at) : 0;
    return bt - at;
  });
  return sorted[0] ?? null;
}

export const AssetVault: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [albums, setAlbums] = useState<VaultAssetAlbum[]>([]);
  const [openCollection, setOpenCollection] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const guidedTarget = useGuidedComicVaultBridge((s) => s.pendingTarget);
  const selectGuidedReference = useGuidedComicVaultBridge((s) => s.selectVaultReference);

  const selected = useMemo(() => {
    if (!openCollection) return null;
    return albums.find((a) => a.collectionName === openCollection) ?? null;
  }, [albums, openCollection]);

  const refresh = async () => {
    const next = await getAssetAlbums();
    setAlbums(next);
  };

  useEffect(() => {
    setLoading(true);
    refresh()
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (openCollection && !albums.some((a) => a.collectionName === openCollection)) {
      setOpenCollection(null);
    }
  }, [albums, openCollection]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return albums;
    return albums.filter((a) => a.collectionName.toLowerCase().includes(q));
  }, [albums, search]);

  const total = albums.reduce((acc, a) => acc + a.items.length, 0);

  return (
    <div className="relative min-h-[calc(100vh-5rem)] px-8 py-10 text-white">
      <div
        className="absolute inset-0 -z-10 opacity-90"
        style={{
          background: `linear-gradient(135deg, #050816 0%, #10172f 56%, #0b1024 100%)`,
        }}
      />

      {selected && (
        <CollectionVaultModal
          open={Boolean(selected)}
          collectionName={selected.collectionName}
          items={selected.items}
          allCollectionNames={albums.map((a) => a.collectionName)}
          onClose={() => setOpenCollection(null)}
          onVaultChanged={() => void refresh()}
          guidedSelectionTarget={guidedTarget?.type === 'location' ? guidedTarget : null}
          onUseForGuidedFlow={(item) =>
            selectGuidedReference({
              type: 'location',
              name: guidedTarget?.name ?? selected.collectionName,
              referenceId: item.id,
              imageUrl: item.image_url,
              sourceType: 'asset',
              sourceLabel: selected.collectionName,
            })
          }
        />
      )}

      <div className="relative mb-8">
        <div
          className="inline-flex items-center gap-2 rounded-full border px-4 py-2"
          style={{ borderColor: `${AMETHYST}55`, background: 'rgba(0,0,0,0.25)' }}
        >
          <span className="text-xs uppercase tracking-[0.35em] text-amber-100/85">
            ARCS Image Vault
          </span>
        </div>
        <h1
          className="mt-5 text-5xl sm:text-6xl font-extralight tracking-widest drop-shadow-lg leading-none"
          style={{ color: '#D4AF37' }}
        >
          ASSET
          <br />
          <span
            className="font-black text-transparent bg-clip-text bg-gradient-to-r from-[#D4AF37] via-[#FBF5D4] to-sky-200 tracking-[0.2em]"
          >
            VAULT
          </span>
        </h1>
        <div className="mt-5 flex flex-wrap gap-3 text-sm" style={{ color: `${AMETHYST}aa` }}>
          <div
            className="rounded-xl border px-3 py-2"
            style={{ borderColor: `${AMETHYST}44`, background: 'rgba(0,0,0,0.2)' }}
          >
            Collections:{' '}
            <span className="text-violet-100 font-medium">{albums.length}</span>
          </div>
          <div
            className="rounded-xl border px-3 py-2"
            style={{ borderColor: `${AMETHYST}44`, background: 'rgba(0,0,0,0.2)' }}
          >
            Assets: <span className="text-violet-100 font-medium">{total}</span>
          </div>
        </div>
        <div
          className="mt-6 h-[2px] w-full rounded-full opacity-80"
          style={{
            background: `linear-gradient(90deg, ${AMETHYST}, ${AMETHYST_LIGHT}, transparent)`,
          }}
        />

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 opacity-50"
              style={{ color: AMETHYST_LIGHT }}
            />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search collections…"
              className="w-full rounded-xl border border-violet-500/30 bg-black/30 pl-10 pr-3 py-2.5 text-sm text-violet-100 placeholder:text-violet-400/50"
            />
          </div>
          <button
            type="button"
            disabled={loading}
            onClick={() => void refresh()}
            className="inline-flex items-center gap-2 rounded-xl border border-violet-500/40 bg-black/30 px-4 py-2.5 text-sm text-violet-100 hover:bg-black/40 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {loading ? (
        <p className="text-center py-16 text-violet-300/70">Loading…</p>
      ) : albums.length === 0 ? (
        <p className="text-center py-16 text-violet-300/70">
          No assets yet. Save from Asset Reference Studio.
        </p>
      ) : filtered.length === 0 ? (
        <p className="text-center py-16 text-violet-300/70">
          No collections match “{search.trim()}”.
        </p>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-6 pb-16">
          {filtered.map((album) => {
            const cover = coverItem(album);
            const img = cover?.image_url ?? null;
            const n = album.items.length;
            const fx = cover?.thumbnail_focus_x ?? 50;
            const fy = cover?.thumbnail_focus_y ?? 50;
            const fsc = cover?.thumbnail_scale ?? 1;
            return (
              <button
                key={album.collectionName}
                type="button"
                onClick={() => setOpenCollection(album.collectionName)}
                className="group relative overflow-hidden rounded-2xl border border-violet-500/25 bg-black/25 text-left shadow-xl hover:border-violet-400/50 transition"
              >
                {img ? (
                  <VaultImageWithFallback
                    src={img}
                    alt={album.collectionName}
                    frameClassName="w-full h-[280px]"
                    imgClassName="w-full h-[280px] object-cover opacity-90 group-hover:opacity-100 transition"
                    imgStyle={{
                      objectPosition: `${fx}% ${fy}%`,
                      transform: `scale(${fsc})`,
                      transformOrigin: `${fx}% ${fy}%`,
                    }}
                  />
                ) : (
                  <div className="w-full h-[280px] flex items-center justify-center text-violet-400/60">
                    No image
                  </div>
                )}
                <div className="absolute inset-x-0 bottom-0 p-5 bg-gradient-to-t from-black/90 to-transparent">
                  <div className="flex justify-between items-end gap-3">
                    <div className="min-w-0">
                      <div className="text-[11px] uppercase tracking-widest text-violet-300/80">
                        Collection
                      </div>
                      <div
                        className="mt-1 text-xl font-semibold truncate"
                        style={{ color: AMETHYST_LIGHT }}
                      >
                        {album.collectionName}
                      </div>
                      <div className="text-sm text-violet-300/80 mt-1">
                        {n} asset{n === 1 ? '' : 's'}
                      </div>
                    </div>
                    <div className="shrink-0 flex items-center gap-2 rounded-xl border border-violet-500/35 bg-black/30 px-3 py-2 text-violet-100 text-xs">
                      Open
                      <ChevronRight className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
