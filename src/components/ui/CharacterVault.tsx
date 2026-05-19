import React, { useEffect, useMemo, useState } from 'react';
import { ChevronRight, RefreshCw, Search } from 'lucide-react';
import { getCharacterAlbums } from '@/shared/api/arcsVault';
import type { VaultCharacterAlbum } from '@/shared/api/arcsVault';
import { ProfileVaultModal } from '@/components/ui/ProfileVaultModal';
import { VaultImageWithFallback } from '@/components/ui/VaultImageWithFallback';
import {
  VAULT_CARD_INTERACTION,
  getVaultAlbumLayout,
  VaultViewModeToggle,
  type VaultPreviewMode,
} from '@/components/ui/VaultChrome';
import { useGuidedComicVaultBridge } from '@/stores/guidedComicVaultBridge';

function getCoverItem(album: VaultCharacterAlbum) {
  if (!album.coverId) return album.items[0] ?? null;
  const cover = album.items.find((it) => it.id === album.coverId);
  return cover ?? album.items[0] ?? null;
}

export const CharacterVault: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [albums, setAlbums] = useState<VaultCharacterAlbum[]>([]);
  const [openProfile, setOpenProfile] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [previewMode, setPreviewMode] = useState<VaultPreviewMode>('large');
  const guidedTarget = useGuidedComicVaultBridge((s) => s.pendingTarget);
  const selectGuidedReference = useGuidedComicVaultBridge((s) => s.selectVaultReference);

  const selectedAlbum = useMemo(() => {
    if (!openProfile) return null;
    return albums.find((a) => a.profileName === openProfile) ?? null;
  }, [albums, openProfile]);

  const refresh = async () => {
    const next = await getCharacterAlbums();
    setAlbums(next);
  };

  useEffect(() => {
    setLoading(true);
    refresh()
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (openProfile && !albums.some((a) => a.profileName === openProfile)) {
      setOpenProfile(null);
    }
  }, [albums, openProfile]);

  const filteredAlbums = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return albums;
    return albums.filter((a) => a.profileName.toLowerCase().includes(q));
  }, [albums, search]);

  const totalImages = albums.reduce((acc, a) => acc + a.items.length, 0);

  return (
    <div className="relative min-h-[calc(100vh-5rem)] px-6 py-8 sm:px-8">
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(145deg,#160003_0%,#4d0610_34%,#861327_58%,#300207_78%,#120002_100%)]" />
      <div className="absolute inset-0 -z-10 opacity-58 bg-[radial-gradient(circle_at_18%_12%,rgba(255,77,126,0.18),transparent_38%)]" />
      <div className="absolute inset-0 -z-10 opacity-52 bg-[radial-gradient(circle_at_76%_58%,rgba(251,191,36,0.18),transparent_55%)]" />
      <div className="absolute inset-x-0 top-0 -z-10 h-56 bg-[linear-gradient(180deg,rgba(251,245,212,0.18),rgba(212,175,55,0.12)_38%,transparent_100%)]" />
      <div className="absolute inset-0 -z-10 opacity-45 bg-[linear-gradient(118deg,transparent_0%,rgba(255,255,255,0.10)_22%,transparent_40%,rgba(255,255,255,0.06)_64%,transparent_82%)]" />

      {selectedAlbum && (
        <ProfileVaultModal
          open={Boolean(selectedAlbum)}
          profileName={selectedAlbum.profileName}
          items={selectedAlbum.items}
          coverId={selectedAlbum.coverId}
          allProfileNames={albums.map((a) => a.profileName)}
          onClose={() => setOpenProfile(null)}
          onCoverUpdated={() => {
            void refresh();
          }}
          onVaultChanged={() => {
            void refresh();
          }}
          guidedSelectionTarget={guidedTarget}
          onUseForGuidedFlow={
            guidedTarget
              ? (item) => {
                  const castName = item.cast_name?.trim() || undefined;
                  const imageLabel = item.name?.trim() || undefined;
                  const displayName = castName || imageLabel || selectedAlbum.profileName;
                  selectGuidedReference({
                    type: guidedTarget.type,
                    name: guidedTarget.name,
                    referenceId: item.id,
                    imageUrl: item.image_url,
                    sourceType: 'character',
                    sourceLabel: displayName,
                    displayName,
                    profileName: selectedAlbum.profileName,
                    castName,
                    imageLabel,
                  });
                }
              : undefined
          }
        />
      )}

      <div className="relative mb-8">
        <div className="grid gap-3 lg:grid-cols-[auto_auto_minmax(220px,1fr)_auto] lg:items-center">
          <div className="flex min-w-0 flex-wrap items-center gap-3 text-sm text-[#D4AF37]/75">
            <div className="rounded-xl border border-[#D4AF37]/20 bg-black/20 px-3 py-2">
              Profiles: <span className="text-[#FBF5D4]/90 font-medium">{albums.length}</span>
            </div>
            <div className="rounded-xl border border-[#D4AF37]/20 bg-black/20 px-3 py-2">
              Images: <span className="text-[#FBF5D4]/90 font-medium">{totalImages}</span>
            </div>
          </div>
          <button
            type="button"
            disabled={loading}
            onClick={() => void refresh()}
            className="inline-flex min-w-[150px] items-center justify-center gap-2 rounded-xl border border-[#D4AF37]/35 bg-black/30 px-4 py-2.5 text-sm text-[#FBF5D4] hover:bg-black/40 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh vault
          </button>
          <div className="relative min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#D4AF37]/60" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search profiles…"
              className="w-full rounded-xl border border-[#D4AF37]/25 bg-black/25 pl-10 pr-3 py-2.5 text-sm text-[#FBF5D4] placeholder:text-[#D4AF37]/50"
            />
          </div>
          <VaultViewModeToggle value={previewMode} onChange={setPreviewMode} />
        </div>
      </div>

      {loading ? (
        <div className="text-center py-16 text-[#FBF5D4]/70">Loading Vault…</div>
      ) : albums.length === 0 ? (
        <div className="text-center py-16 text-[#FBF5D4]/70">
          No character references yet. Save from Reference Character Studio.
        </div>
      ) : filteredAlbums.length === 0 ? (
        <div className="text-center py-16 text-[#FBF5D4]/70">
          No profiles match “{search.trim()}”.
        </div>
      ) : (
        <div
          className={[
            'grid pb-16',
            getVaultAlbumLayout(previewMode).grid,
          ].join(' ')}
        >
          {filteredAlbums.map((album) => {
            const layout = getVaultAlbumLayout(previewMode);
            const coverItem = getCoverItem(album);
            const cover = coverItem?.image_url ?? null;
            const count = album.items.length;
            const hasManualCover = album.items.some((it) => it.is_profile_cover);
            const fx = coverItem?.thumbnail_focus_x ?? 50;
            const fy = coverItem?.thumbnail_focus_y ?? 50;
            const fsc = coverItem?.thumbnail_scale ?? 1;
            return (
              <button
                key={album.profileName}
                type="button"
                onClick={() => setOpenProfile(album.profileName)}
                className={[
                  'group relative overflow-hidden rounded-xl border text-left',
                  layout.card,
                  'border-[#D4AF37]/18 bg-black/24',
                  'shadow-[0_10px_60px_rgba(0,0,0,0.35)]',
                  'hover:bg-white/[0.07]',
                  VAULT_CARD_INTERACTION,
                ].join(' ')}
              >
                <div className="absolute inset-0 pointer-events-none opacity-40 bg-[linear-gradient(135deg,rgba(212,175,55,0.10),transparent_45%)]" />

                {cover ? (
                  <VaultImageWithFallback
                    src={cover}
                    alt={album.profileName}
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
                  <div className={`flex ${layout.frame} items-center justify-center bg-black/30 text-[#FBF5D4]/60`}>
                    No image
                  </div>
                )}

                <div className={[layout.body, previewMode === 'compact' ? '' : 'bg-[#180104]/92'].join(' ')}>
                  <div className={previewMode === 'compact' ? 'flex h-full min-w-0 flex-col justify-between gap-2' : 'flex items-start justify-between gap-3'}>
                    <div className="min-w-0">
                      <div className="text-[11px] uppercase tracking-[0.35em] text-[#FBBF24]/80">
                        Profile
                      </div>
                      <div className={`${layout.title} text-[#FBF5D4]`}>
                        {album.profileName}
                      </div>
                      <div className={`${layout.meta} text-[#D4AF37]/80`}>
                        {count} image{count === 1 ? '' : 's'}
                        <span className={previewMode === 'compact' ? 'sr-only' : 'ml-2 text-[#FBF5D4]/70'}>
                          {hasManualCover ? '(starred cover)' : '(newest cover)'}
                        </span>
                      </div>
                    </div>

                    <div className={['shrink-0 inline-flex items-center gap-2 rounded-lg border border-[#D4AF37]/25 bg-black/20 px-2.5 py-1.5 text-[#FBF5D4]/82 transition group-hover:border-[#FBBF24]/55 group-hover:bg-black/35', previewMode === 'compact' ? 'self-start' : ''].join(' ')}>
                      <span className="text-[11px] tracking-wide">Open</span>
                      <ChevronRight className="w-4 h-4 text-[#FBBF24]" />
                    </div>
                  </div>
                </div>

                {/* Ruby glow on hover */}
                <div className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition duration-500 bg-[radial-gradient(circle_at_40%_35%,rgba(224,17,95,0.25),transparent_55%)]" />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
