import { useMemo, useState } from 'react';
import {
  FolderInput,
  MoreHorizontal,
  Pencil,
  RefreshCw,
  Tag,
  Trash2,
  X,
} from 'lucide-react';
import type { VaultCharacterItem } from '@/shared/api/arcsVault';
import { VaultImageWithFallback } from '@/components/ui/VaultImageWithFallback';
import { ArchiveThumbnailFocusModal } from '@/components/ui/ArchiveThumbnailFocusModal';
import {
  setProfileCover,
  renameVaultCharacterProfile,
  moveVaultCharacterToProfile,
  updateVaultCharacterCastName,
  deleteVaultCharacter,
  deleteVaultCharacterProfile,
  vaultMergeConfirmSkipped,
  setVaultMergeConfirmSkipped,
} from '@/shared/api/arcsVault';

function RubyEncrustedStar(props: { active: boolean; className?: string }) {
  const { active, className } = props;
  return (
    <span className={className}>
      <svg
        viewBox="0 0 24 24"
        width="22"
        height="22"
        aria-hidden="true"
        className={active ? 'drop-shadow-[0_0_10px_rgba(224,17,95,0.45)]' : ''}
      >
        <path
          d="M12 2.5l2.9 6.2 6.8.6-5.1 4.4 1.6 6.6L12 16.9 5.8 20.3l1.6-6.6-5.1-4.4 6.8-.6L12 2.5z"
          fill={active ? '#FBBF24' : 'none'}
          stroke={active ? '#D4AF37' : 'rgba(212,175,55,0.8)'}
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
        <circle
          cx="12"
          cy="12.1"
          r="2.2"
          fill={active ? '#e0115f' : 'transparent'}
          stroke={active ? 'rgba(255,255,255,0.25)' : 'transparent'}
          strokeWidth="0.6"
        />
      </svg>
    </span>
  );
}

export function ProfileVaultModal(props: {
  open: boolean;
  profileName: string;
  items: VaultCharacterItem[];
  coverId: string | null;
  allProfileNames: string[];
  onClose: () => void;
  onCoverUpdated: () => void;
  onVaultChanged: () => void;
}) {
  const {
    open,
    profileName,
    items,
    coverId,
    allProfileNames,
    onClose,
    onCoverUpdated,
    onVaultChanged,
  } = props;

  const [savingId, setSavingId] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [showRenameProfile, setShowRenameProfile] = useState(false);
  const [renameValue, setRenameValue] = useState('');

  const [showDeleteAlbum, setShowDeleteAlbum] = useState(false);

  const [actionItemId, setActionItemId] = useState<string | null>(null);
  const [castEditId, setCastEditId] = useState<string | null>(null);
  const [castEditValue, setCastEditValue] = useState('');
  const [moveItemId, setMoveItemId] = useState<string | null>(null);
  const [moveTarget, setMoveTarget] = useState('');
  const [focusEditItem, setFocusEditItem] = useState<VaultCharacterItem | null>(null);

  const [mergeOpen, setMergeOpen] = useState(false);
  const [mergeDontAsk, setMergeDontAsk] = useState(false);
  const [pendingMove, setPendingMove] = useState<{
    id: string;
    target: string;
  } | null>(null);

  const [lastItemOpen, setLastItemOpen] = useState(false);
  const [pendingLastItemMove, setPendingLastItemMove] = useState<{
    id: string;
    target: string;
  } | null>(null);

  const sorted = useMemo(() => {
    return [...items].sort((a, b) => {
      const at = a.created_at ? Date.parse(a.created_at) : 0;
      const bt = b.created_at ? Date.parse(b.created_at) : 0;
      return bt - at;
    });
  }, [items]);

  const executeMove = async (id: string, targetRaw: string) => {
    const target = targetRaw.trim() || 'Unnamed';
    setBusy(true);
    setSaveError(null);
    const res = await moveVaultCharacterToProfile({
      id,
      targetProfileDisplay: target,
    });
    setBusy(false);
    setMoveItemId(null);
    setMoveTarget('');
    setPendingMove(null);
    setLastItemOpen(false);
    setPendingLastItemMove(null);
    if (!res.ok) {
      setSaveError(res.error);
      return;
    }
    onVaultChanged();
    if (target === profileName || normalizeProf(target) === normalizeProf(profileName)) {
      onCoverUpdated();
    } else {
      onClose();
    }
  };

  const startMove = (id: string) => {
    const target = moveTarget.trim() || 'Unnamed';
    if (normalizeProf(target) === normalizeProf(profileName)) {
      setSaveError('Choose a different profile than the current one.');
      return;
    }
    const isLast = items.length === 1;
    const destAlbumExists = allProfileNames.some(
      (p) =>
        normalizeProf(p) === normalizeProf(target) &&
        normalizeProf(p) !== normalizeProf(profileName)
    );

    if (isLast) {
      setPendingLastItemMove({ id, target });
      setLastItemOpen(true);
      return;
    }
    if (destAlbumExists && !vaultMergeConfirmSkipped()) {
      setPendingMove({ id, target });
      setMergeOpen(true);
      return;
    }
    void executeMove(id, target);
  };

  const confirmLastItemMove = () => {
    if (!pendingLastItemMove) return;
    const { id, target } = pendingLastItemMove;
    setLastItemOpen(false);
    const destAlbumExists = allProfileNames.some(
      (p) =>
        normalizeProf(p) === normalizeProf(target) &&
        normalizeProf(p) !== normalizeProf(profileName)
    );
    setPendingLastItemMove(null);
    if (destAlbumExists && !vaultMergeConfirmSkipped()) {
      setPendingMove({ id, target });
      setMergeOpen(true);
    } else {
      void executeMove(id, target);
    }
  };

  const confirmMerge = async () => {
    if (mergeDontAsk) setVaultMergeConfirmSkipped(true);
    if (!pendingMove) return;
    const { id, target } = pendingMove;
    setMergeOpen(false);
    await executeMove(id, target);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100]">
      {focusEditItem && (
        <ArchiveThumbnailFocusModal
          context="character"
          item={focusEditItem}
          onClose={() => setFocusEditItem(null)}
          onSaved={onVaultChanged}
        />
      )}
      <button
        type="button"
        className="absolute inset-0 bg-black/70"
        aria-label="Close vault modal"
        onClick={onClose}
      />

      <div className="absolute inset-x-0 top-6 mx-auto w-[min(1080px,94vw)] max-h-[92vh] flex flex-col">
        <div
          className={[
            'relative overflow-hidden rounded-2xl border flex flex-col max-h-[92vh]',
            'border-[#D4AF37]/30 shadow-[0_30px_120px_rgba(0,0,0,0.55)]',
            'bg-[linear-gradient(135deg,#8b0000_0%,#4a0000_100%)]',
          ].join(' ')}
        >
          <div className="absolute inset-0 pointer-events-none opacity-70 bg-[radial-gradient(circle_at_30%_20%,rgba(251,191,36,0.22),transparent_50%)]" />
          <div className="absolute inset-0 pointer-events-none opacity-60 bg-[radial-gradient(circle_at_70%_60%,rgba(224,17,95,0.18),transparent_55%)]" />

          <div className="relative p-5 sm:p-7 flex flex-col min-h-0 flex-1 overflow-hidden">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="text-xs uppercase tracking-[0.35em] text-[#FBBF24]/80">
                  Profile Vault
                </div>
                <div className="mt-1 text-2xl sm:text-3xl font-semibold tracking-wide text-[#FBF5D4] break-words">
                  {profileName}
                </div>
                <div className="mt-2 text-sm text-[#D4AF37]/70">
                  Star sets cover. Toolbar: rename profile, move images, or delete.
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    setRenameValue(profileName === 'Unnamed' ? '' : profileName);
                    setShowRenameProfile(true);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-[#D4AF37]/35 bg-black/30 px-3 py-2 text-xs text-[#FBF5D4] hover:bg-black/40"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  Rename profile
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setShowDeleteAlbum(true)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-red-500/40 bg-black/30 px-3 py-2 text-xs text-red-200/90 hover:bg-red-950/40"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete album
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => onVaultChanged()}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-[#D4AF37]/35 bg-black/30 px-3 py-2 text-xs text-[#FBF5D4] hover:bg-black/40"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Refresh
                </button>
                <button
                  type="button"
                  className="inline-flex items-center justify-center rounded-xl border border-[#D4AF37]/30 bg-black/30 text-[#FBF5D4] w-10 h-10 hover:bg-black/40"
                  onClick={onClose}
                  aria-label="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {(savingId || saveError || busy) && (
              <div className="mt-4 rounded-xl border border-[#D4AF37]/25 bg-black/25 px-4 py-3 text-sm">
                {saveError ? (
                  <div className="text-[#FBBF24] font-medium">{saveError}</div>
                ) : savingId ? (
                  <div className="text-[#FBF5D4]/90">
                    Saving… <span className="text-[#D4AF37]/70 font-mono text-xs">{savingId}</span>
                  </div>
                ) : (
                  <div className="text-[#FBF5D4]/70">Working…</div>
                )}
              </div>
            )}

            {/* Modals stack */}
            {showRenameProfile && (
              <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60">
                <div className="w-full max-w-md rounded-2xl border border-[#D4AF37]/40 bg-[#4a0000] p-6 shadow-xl">
                  <h3 className="text-lg font-semibold text-[#FBF5D4]">Rename profile</h3>
                  <p className="text-sm text-[#D4AF37]/80 mt-1">
                    All images in this album move to the new profile name.
                  </p>
                  <input
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    placeholder="Profile name"
                    className="mt-4 w-full rounded-xl border border-white/20 bg-black/40 px-3 py-2 text-[#FBF5D4] placeholder:text-white/40"
                  />
                  <div className="mt-4 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowRenameProfile(false)}
                      className="px-4 py-2 rounded-xl border border-white/20 text-sm text-white/80"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={busy || !renameValue.trim()}
                      onClick={async () => {
                        setBusy(true);
                        setSaveError(null);
                        const res = await renameVaultCharacterProfile(profileName, renameValue.trim());
                        setBusy(false);
                        if (!res.ok) {
                          setSaveError(res.error);
                          return;
                        }
                        setShowRenameProfile(false);
                        onVaultChanged();
                        onClose();
                      }}
                      className="px-4 py-2 rounded-xl bg-[#FBBF24] text-black text-sm font-medium disabled:opacity-50"
                    >
                      Rename
                    </button>
                  </div>
                </div>
              </div>
            )}

            {showDeleteAlbum && (
              <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60">
                <div className="w-full max-w-md rounded-2xl border border-red-500/40 bg-[#4a0000] p-6 shadow-xl">
                  <h3 className="text-lg font-semibold text-red-200">Delete entire album?</h3>
                  <p className="text-sm text-[#FBF5D4]/80 mt-2">
                    Permanently remove all {items.length} image{items.length === 1 ? '' : 's'} in “
                    {profileName}”. This cannot be undone.
                  </p>
                  <div className="mt-4 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowDeleteAlbum(false)}
                      className="px-4 py-2 rounded-xl border border-white/20 text-sm"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={async () => {
                        setBusy(true);
                        setSaveError(null);
                        const res = await deleteVaultCharacterProfile(profileName);
                        setBusy(false);
                        if (!res.ok) {
                          setSaveError(res.error);
                          return;
                        }
                        setShowDeleteAlbum(false);
                        onVaultChanged();
                        onClose();
                      }}
                      className="px-4 py-2 rounded-xl bg-red-700 text-white text-sm font-medium"
                    >
                      Delete album
                    </button>
                  </div>
                </div>
              </div>
            )}

            {mergeOpen && pendingMove && (
              <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60">
                <div className="w-full max-w-md rounded-2xl border border-[#D4AF37]/40 bg-[#4a0000] p-6 shadow-xl">
                  <h3 className="text-lg font-semibold text-[#FBF5D4]">Merge into existing album?</h3>
                  <p className="text-sm text-[#D4AF37]/80 mt-2">
                    “{pendingMove.target.trim() || 'Unnamed'}” already has images. This image will be
                    added to that album. The starred cover on the destination album is unchanged.
                  </p>
                  <label className="mt-4 flex items-center gap-2 text-sm text-[#FBF5D4]/90 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={mergeDontAsk}
                      onChange={(e) => setMergeDontAsk(e.target.checked)}
                    />
                    Don&apos;t ask again for merges
                  </label>
                  <div className="mt-4 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setMergeOpen(false);
                        setPendingMove(null);
                      }}
                      className="px-4 py-2 rounded-xl border border-white/20 text-sm"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => void confirmMerge()}
                      className="px-4 py-2 rounded-xl bg-[#FBBF24] text-black text-sm font-medium"
                    >
                      Merge &amp; move
                    </button>
                  </div>
                </div>
              </div>
            )}

            {lastItemOpen && pendingLastItemMove && (
              <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60">
                <div className="w-full max-w-md rounded-2xl border border-amber-500/40 bg-[#4a0000] p-6 shadow-xl">
                  <h3 className="text-lg font-semibold text-[#FBF5D4]">Last image in this profile</h3>
                  <p className="text-sm text-[#D4AF37]/80 mt-2">
                    Moving it will remove the empty “{profileName}” album from the vault grid.
                  </p>
                  <div className="mt-4 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setLastItemOpen(false);
                        setPendingLastItemMove(null);
                      }}
                      className="px-4 py-2 rounded-xl border border-white/20 text-sm"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => confirmLastItemMove()}
                      className="px-4 py-2 rounded-xl bg-amber-600 text-white text-sm font-medium"
                      >
                      Continue
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="mt-6 overflow-y-auto flex-1 min-h-0 pr-1 custom-scrollbar">
              <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-4 pb-4">
                {sorted.map((item) => {
                  const isActive = coverId === item.id;
                  const isSaving = savingId === item.id;
                  const title = item.cast_name || item.name || 'Visual Reference';
                  const showActions = actionItemId === item.id;
                  return (
                    <div
                      key={item.id}
                      className={[
                        'relative overflow-hidden rounded-2xl border',
                        'border-white/10 bg-black/20',
                        'shadow-[0_6px_36px_rgba(0,0,0,0.25)]',
                        isActive
                          ? 'ring-2 ring-[#FBBF24]/70 shadow-[0_0_40px_rgba(224,17,95,0.22)]'
                          : 'hover:border-[#D4AF37]/35 hover:bg-black/25',
                        'transition',
                      ].join(' ')}
                    >
                      <VaultImageWithFallback
                        src={item.image_url}
                        alt={title}
                        frameClassName="w-full h-[200px]"
                        imgClassName="w-full h-[200px] object-cover opacity-95"
                        imgStyle={{
                          objectPosition: `${item.thumbnail_focus_x ?? 50}% ${item.thumbnail_focus_y ?? 50}%`,
                          transform: `scale(${item.thumbnail_scale ?? 1})`,
                          transformOrigin: `${item.thumbnail_focus_x ?? 50}% ${item.thumbnail_focus_y ?? 50}%`,
                        }}
                      />

                      <div className="absolute inset-x-0 bottom-0 p-3 bg-[linear-gradient(to_top,rgba(0,0,0,0.85),transparent)]">
                        <div className="flex items-end justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-semibold text-[#FBF5D4] truncate">
                              {title}
                            </div>
                            {item.seed != null && (
                              <div className="text-[10px] font-mono text-white/60 mt-0.5">
                                #{item.seed}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              disabled={Boolean(savingId) || busy}
                              className={[
                                'rounded-lg border p-1.5',
                                isActive
                                  ? 'border-[#FBBF24]/70 bg-[#FBBF24]/15'
                                  : 'border-[#D4AF37]/35 bg-black/25',
                              ].join(' ')}
                              aria-label={isActive ? 'Cover' : 'Set cover'}
                              onClick={async () => {
                                if (savingId) return;
                                setSaveError(null);
                                setSavingId(item.id);
                                const res = await setProfileCover({
                                  profileName,
                                  id: item.id,
                                });
                                setSavingId(null);
                                if (!res.ok) {
                                  setSaveError(res.error);
                                  return;
                                }
                                onCoverUpdated();
                              }}
                            >
                              <RubyEncrustedStar active={isActive} />
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setActionItemId(showActions ? null : item.id)
                              }
                              className="rounded-lg border border-[#D4AF37]/35 bg-black/25 p-1.5 text-[#FBF5D4]"
                              aria-label="More actions"
                            >
                              <MoreHorizontal className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {showActions && (
                          <div className="mt-2 pt-2 border-t border-white/10 space-y-2">
                            <button
                              type="button"
                              onClick={() => {
                                setFocusEditItem(item);
                                setActionItemId(null);
                              }}
                              className="flex items-center gap-1 w-full text-left text-xs text-[#D4AF37] hover:text-[#FBBF24]"
                            >
                              <Pencil className="w-3 h-3" />
                              Framing…
                            </button>

                            {castEditId === item.id ? (
                              <div className="flex gap-1">
                                <input
                                  value={castEditValue}
                                  onChange={(e) => setCastEditValue(e.target.value)}
                                  placeholder="Cast / look name"
                                  className="flex-1 min-w-0 rounded-lg border border-white/20 bg-black/50 px-2 py-1 text-xs text-[#FBF5D4]"
                                />
                                <button
                                  type="button"
                                  disabled={busy}
                                  onClick={async () => {
                                    setBusy(true);
                                    const res = await updateVaultCharacterCastName(
                                      item.id,
                                      castEditValue.trim() || null
                                    );
                                    setBusy(false);
                                    if (!res.ok) setSaveError(res.error);
                                    else {
                                      setCastEditId(null);
                                      onVaultChanged();
                                    }
                                  }}
                                  className="px-2 py-1 rounded-lg bg-[#FBBF24]/90 text-black text-xs"
                                >
                                  Save
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  setCastEditId(item.id);
                                  setCastEditValue(item.cast_name || '');
                                }}
                                className="flex items-center gap-1 w-full text-left text-xs text-[#D4AF37] hover:text-[#FBBF24]"
                              >
                                <Tag className="w-3 h-3" />
                                Edit cast name
                              </button>
                            )}

                            {moveItemId === item.id ? (
                              <div className="space-y-1">
                                <input
                                  list="vault-profile-destinations"
                                  value={moveTarget}
                                  onChange={(e) => setMoveTarget(e.target.value)}
                                  placeholder="Target profile"
                                  className="w-full rounded-lg border border-white/20 bg-black/50 px-2 py-1 text-xs text-[#FBF5D4]"
                                />
                                <datalist id="vault-profile-destinations">
                                  {allProfileNames
                                    .filter(
                                      (p) =>
                                        normalizeProf(p) !== normalizeProf(profileName)
                                    )
                                    .map((p) => (
                                      <option key={p} value={p === 'Unnamed' ? '' : p} />
                                    ))}
                                </datalist>
                                <div className="flex gap-1">
                                  <button
                                    type="button"
                                    disabled={busy}
                                    onClick={() => startMove(item.id)}
                                    className="flex-1 flex items-center justify-center gap-1 py-1 rounded-lg bg-emerald-800/80 text-white text-xs"
                                  >
                                    <FolderInput className="w-3 h-3" />
                                    Move
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setMoveItemId(null);
                                      setMoveTarget('');
                                    }}
                                    className="px-2 py-1 text-xs text-white/60"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  setMoveItemId(item.id);
                                  setMoveTarget('');
                                }}
                                className="flex items-center gap-1 w-full text-left text-xs text-[#D4AF37] hover:text-[#FBBF24]"
                              >
                                <FolderInput className="w-3 h-3" />
                                Move to profile…
                              </button>
                            )}

                            <button
                              type="button"
                              disabled={busy}
                              onClick={async () => {
                                if (!confirm('Delete this image from the vault?')) return;
                                setBusy(true);
                                const res = await deleteVaultCharacter(item.id);
                                setBusy(false);
                                if (!res.ok) setSaveError(res.error);
                                else {
                                  setActionItemId(null);
                                  onVaultChanged();
                                  if (items.length <= 1) onClose();
                                }
                              }}
                              className="flex items-center gap-1 w-full text-left text-xs text-red-300/90 hover:text-red-200"
                            >
                              <Trash2 className="w-3 h-3" />
                              Delete image
                            </button>
                          </div>
                        )}
                      </div>

                      {isSaving && (
                        <div className="absolute inset-0 bg-black/35 backdrop-blur-[1px]" />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function normalizeProf(p: string): string {
  const t = p.trim();
  return t === '' || t === 'Unnamed' ? 'unnamed' : t.toLowerCase();
}
