import React, { useEffect, useMemo, useState } from 'react';
import { ChevronRight, RefreshCw, Search } from 'lucide-react';
import { getAssetAlbums } from '@/shared/api/arcsAssetVault';
import type { VaultAssetAlbum } from '@/shared/api/arcsAssetVault';
import { CollectionVaultModal } from '@/components/ui/CollectionVaultModal';
import { VaultImageWithFallback } from '@/components/ui/VaultImageWithFallback';
import {
  VAULT_CARD_INTERACTION,
  getVaultAlbumLayout,
  VaultViewModeToggle,
  type VaultPreviewMode,
} from '@/components/ui/VaultChrome';
import { useGuidedComicVaultBridge } from '@/stores/guidedComicVaultBridge';

const LIME_LIGHT = '#D9F99D';

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
  const [previewMode, setPreviewMode] = useState<VaultPreviewMode>('large');
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
    <div className="relative min-h-[calc(100vh-5rem)] px-6 py-8 text-white sm:px-8">
      <div
        className="absolute inset-0 -z-10 opacity-95"
        style={{
          background: 'linear-gradient(145deg,#071407 0%,#1f3f19 34%,#426b2a 58%,#14330f 78%,#061306 100%)',
        }}
      />
      <div className="absolute inset-0 -z-10 opacity-70 bg-[radial-gradient(circle_at_22%_14%,rgba(173,196,113,0.22),transparent_40%)]" />
      <div className="absolute inset-0 -z-10 opacity-60 bg-[radial-gradient(circle_at_76%_58%,rgba(251,191,36,0.20),transparent_55%)]" />
      <div className="absolute inset-x-0 top-0 -z-10 h-56 bg-[linear-gradient(180deg,rgba(251,245,212,0.18),rgba(212,175,55,0.12)_38%,transparent_100%)]" />
      <div className="absolute inset-0 -z-10 opacity-40 bg-[linear-gradient(118deg,transparent_0%,rgba(255,255,255,0.10)_22%,transparent_42%,rgba(255,255,255,0.06)_64%,transparent_84%)]" />

      {selected && (
        <CollectionVaultModal
          open={Boolean(selected)}
          collectionName={selected.collectionName}
          items={selected.items}
          allCollectionNames={albums.map((a) => a.collectionName)}
          onClose={() => setOpenCollection(null)}
          onVaultChanged={() => void refresh()}
          guidedSelectionTarget={guidedTarget}
          onUseForGuidedFlow={
            guidedTarget
              ? (item) => {
                  const imageLabel = item.asset_name?.trim() || item.name?.trim() || undefined;
                  const displayName = imageLabel || selected.collectionName;
                  selectGuidedReference({
                    type: guidedTarget.type,
                    name: guidedTarget.name,
                    referenceId: item.id,
                    imageUrl: item.image_url,
                    sourceType: 'asset',
                    sourceLabel: displayName,
                    displayName,
                    collectionName: selected.collectionName,
                    imageLabel,
                  });
                }
              : undefined
          }
        />
      )}

      <div className="relative mb-8">
        <div className="grid gap-3 lg:grid-cols-[auto_auto_minmax(220px,1fr)_auto] lg:items-center">
          <div className="flex min-w-0 flex-wrap gap-3 text-sm text-[#D4AF37]/80">
            <div
              className="rounded-xl border px-3 py-2"
              style={{ borderColor: '#D4AF3744', background: 'rgba(0,0,0,0.2)' }}
            >
              Collections:{' '}
              <span className="text-[#FBF5D4] font-medium">{albums.length}</span>
            </div>
            <div
              className="rounded-xl border px-3 py-2"
              style={{ borderColor: '#D4AF3744', background: 'rgba(0,0,0,0.2)' }}
            >
              Assets: <span className="text-[#FBF5D4] font-medium">{total}</span>
            </div>
          </div>
          <button
            type="button"
            disabled={loading}
            onClick={() => void refresh()}
            className="inline-flex min-w-[150px] items-center justify-center gap-2 rounded-xl border border-[#D4AF37]/40 bg-black/30 px-4 py-2.5 text-sm text-[#FBF5D4] hover:bg-black/40 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <div className="relative min-w-[200px]">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 opacity-50"
              style={{ color: LIME_LIGHT }}
            />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search collections…"
              className="w-full rounded-xl border border-[#D4AF37]/30 bg-black/30 pl-10 pr-3 py-2.5 text-sm text-[#FBF5D4] placeholder:text-[#FBF5D4]/45"
            />
          </div>
          <VaultViewModeToggle value={previewMode} onChange={setPreviewMode} />
        </div>
      </div>

      {loading ? (
        <p className="text-center py-16 text-[#FBF5D4]/75">Loading…</p>
      ) : albums.length === 0 ? (
        <p className="text-center py-16 text-[#FBF5D4]/75">
          No assets yet. Save from Asset Reference Studio.
        </p>
      ) : filtered.length === 0 ? (
        <p className="text-center py-16 text-[#FBF5D4]/75">
          No collections match “{search.trim()}”.
        </p>
      ) : (
        <div
          className={[
            'grid pb-16',
            getVaultAlbumLayout(previewMode).grid,
          ].join(' ')}
        >
          {filtered.map((album) => {
            const layout = getVaultAlbumLayout(previewMode);
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
                className={[
                  'group relative overflow-hidden rounded-xl border border-[#D4AF37]/18 bg-black/24 text-left shadow-xl transition hover:border-[#FBBF24]/65 hover:bg-white/[0.07]',
                  layout.card,
                  VAULT_CARD_INTERACTION,
                ].join(' ')}
              >
                {img ? (
                  <VaultImageWithFallback
                    src={img}
                    alt={album.collectionName}
                    frameClassName={[
                      'relative overflow-hidden bg-black/35',
                      layout.frame,
                    ].join(' ')}
                    imgClassName={[
                      layout.image,
                      'w-full object-cover opacity-95 transition duration-300 group-hover:scale-[1.02] group-hover:opacity-100',
                    ].join(' ')}
                    imgStyle={{
                      objectPosition: `${fx}% ${fy}%`,
                      transform: `scale(${Math.min(fsc, 1.08)})`,
                      transformOrigin: `${fx}% ${fy}%`,
                    }}
                  />
                ) : (
                  <div className={`flex ${layout.frame} items-center justify-center bg-black/30 text-[#FBF5D4]/65`}>
                    No image
                  </div>
                )}
                <div className={[layout.body, previewMode === 'compact' ? '' : 'bg-[#071407]/92'].join(' ')}>
                  <div className={previewMode === 'compact' ? 'flex h-full min-w-0 flex-col justify-between gap-2' : 'flex justify-between items-start gap-3'}>
                    <div className="min-w-0">
                      <div className="text-[11px] uppercase tracking-widest text-[#FBBF24]/80">
                        Collection
                      </div>
                      <div
                        className={layout.title}
                        style={{ color: LIME_LIGHT }}
                      >
                        {album.collectionName}
                      </div>
                      <div className={`${layout.meta} text-[#FBF5D4]/80`}>
                        {n} asset{n === 1 ? '' : 's'}
                      </div>
                    </div>
                    <div className={['shrink-0 flex items-center gap-2 rounded-lg border border-[#D4AF37]/35 bg-black/20 px-2.5 py-1.5 text-[#FBF5D4] text-[11px]', previewMode === 'compact' ? 'self-start' : ''].join(' ')}>
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
