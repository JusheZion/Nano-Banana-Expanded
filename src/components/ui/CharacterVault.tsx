import React, { useEffect, useMemo, useState } from 'react';
import { ChevronRight, RefreshCw, Search, Sparkles } from 'lucide-react';
import { getCharacterAlbums } from '@/shared/api/arcsVault';
import type { VaultCharacterAlbum } from '@/shared/api/arcsVault';
import { ProfileVaultModal } from '@/components/ui/ProfileVaultModal';
import { VaultImageWithFallback } from '@/components/ui/VaultImageWithFallback';

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
    <div className="relative min-h-[calc(100vh-5rem)] px-8 py-10">
      {/* Ruby canvas */}
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(135deg,#8b0000_0%,#4a0000_100%)]" />
      <div className="absolute inset-0 -z-10 opacity-70 bg-[radial-gradient(circle_at_20%_15%,rgba(251,191,36,0.25),transparent_52%)]" />
      <div className="absolute inset-0 -z-10 opacity-70 bg-[radial-gradient(circle_at_70%_55%,rgba(224,17,95,0.20),transparent_55%)]" />

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
        />
      )}

      {/* Header */}
      <div className="relative mb-8">
        <div className="inline-flex items-center gap-2 rounded-full border border-[#D4AF37]/30 bg-black/25 px-4 py-2">
          <Sparkles className="w-4 h-4 text-[#FBBF24]" />
          <span className="text-xs uppercase tracking-[0.35em] text-[#FBF5D4]/85">
            Ruby Vault
          </span>
        </div>

        <h1 className="mt-5 text-5xl sm:text-6xl font-extralight tracking-widest text-[#D4AF37] drop-shadow-lg leading-none">
          CHARACTER
          <br />
          <span className="font-black text-transparent bg-clip-text bg-gradient-to-r from-[#D4AF37] via-[#FBF5D4] to-[#e0115f] tracking-[0.2em]">
            VAULT
          </span>
        </h1>

        <div className="mt-5 flex flex-wrap items-center gap-3 text-sm text-[#D4AF37]/75">
          <div className="rounded-xl border border-[#D4AF37]/20 bg-black/20 px-3 py-2">
            Profiles: <span className="text-[#FBF5D4]/90 font-medium">{albums.length}</span>
          </div>
          <div className="rounded-xl border border-[#D4AF37]/20 bg-black/20 px-3 py-2">
            Images: <span className="text-[#FBF5D4]/90 font-medium">{totalImages}</span>
          </div>
          <div className="h-[1px] w-10 bg-[#D4AF37]/35" />
          <div className="text-[#FBF5D4]/75">
            Album covers are gold-starred or fall back to the newest generation.
          </div>
        </div>

        {/* Gold structural divider */}
        <div className="mt-7 h-[2px] w-full rounded-full bg-[linear-gradient(135deg,#D4AF37_0%,#FBBF24_55%,rgba(251,191,36,0.0)_100%)]" />

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#D4AF37]/60" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search profiles…"
              className="w-full rounded-xl border border-[#D4AF37]/25 bg-black/25 pl-10 pr-3 py-2.5 text-sm text-[#FBF5D4] placeholder:text-[#D4AF37]/50"
            />
          </div>
          <button
            type="button"
            disabled={loading}
            onClick={() => void refresh()}
            className="inline-flex items-center gap-2 rounded-xl border border-[#D4AF37]/35 bg-black/30 px-4 py-2.5 text-sm text-[#FBF5D4] hover:bg-black/40 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh vault
          </button>
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
        <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-6 pb-16">
          {filteredAlbums.map((album) => {
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
                  'group relative overflow-hidden rounded-2xl border text-left',
                  'border-[#D4AF37]/25 bg-black/20',
                  'shadow-[0_10px_60px_rgba(0,0,0,0.35)]',
                  'hover:border-[#FBBF24]/60 hover:bg-black/25',
                  'transition',
                ].join(' ')}
              >
                <div className="absolute inset-0 pointer-events-none opacity-60 bg-[linear-gradient(135deg,rgba(212,175,55,0.18),transparent_45%)]" />
                <div className="absolute inset-0 pointer-events-none opacity-60 bg-[linear-gradient(to_top,rgba(0,0,0,0.85),transparent_55%)]" />

                {cover ? (
                  <VaultImageWithFallback
                    src={cover}
                    alt={album.profileName}
                    frameClassName="w-full h-[280px]"
                    imgClassName="w-full h-[280px] object-cover opacity-90 group-hover:opacity-100 transition"
                    imgStyle={{
                      objectPosition: `${fx}% ${fy}%`,
                      transform: `scale(${fsc})`,
                      transformOrigin: `${fx}% ${fy}%`,
                    }}
                  />
                ) : (
                  <div className="w-full h-[280px] flex items-center justify-center text-[#FBF5D4]/60">
                    No image
                  </div>
                )}

                <div className="absolute inset-x-0 bottom-0 p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="text-[11px] uppercase tracking-[0.35em] text-[#FBBF24]/80">
                        Profile
                      </div>
                      <div className="mt-1 text-xl font-semibold tracking-wide text-[#FBF5D4] truncate">
                        {album.profileName}
                      </div>
                      <div className="mt-1 text-sm text-[#D4AF37]/80">
                        {count} image{count === 1 ? '' : 's'}
                        {hasManualCover ? (
                          <span className="ml-2 text-[#FBF5D4]/70">(starred cover)</span>
                        ) : (
                          <span className="ml-2 text-[#FBF5D4]/70">(newest cover)</span>
                        )}
                      </div>
                    </div>

                    <div className="shrink-0 inline-flex items-center gap-2 rounded-xl border border-[#D4AF37]/25 bg-black/25 px-3 py-2 text-[#FBF5D4]/85 group-hover:border-[#FBBF24]/55 group-hover:bg-black/35 transition">
                      <span className="text-xs tracking-wide">Open</span>
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

