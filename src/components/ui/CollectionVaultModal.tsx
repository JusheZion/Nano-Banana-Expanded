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
import type { VaultAssetItem } from '@/shared/api/arcsAssetVault';
import { VaultImageWithFallback } from '@/components/ui/VaultImageWithFallback';
import { ArchiveThumbnailFocusModal } from '@/components/ui/ArchiveThumbnailFocusModal';
import {
  renameVaultAssetCollection,
  moveVaultAssetToCollection,
  updateVaultAssetNames,
  deleteVaultAsset,
  deleteVaultAssetCollection,
} from '@/shared/api/arcsAssetVault';
import {
  assetVaultMergeConfirmSkipped,
  setAssetVaultMergeConfirmSkipped,
} from '@/shared/api/arcsAssetVault';

const AMETHYST = '#8B5CF6';
const AMETHYST_LIGHT = '#A78BFA';

export function CollectionVaultModal(props: {
  open: boolean;
  collectionName: string;
  items: VaultAssetItem[];
  allCollectionNames: string[];
  onClose: () => void;
  onVaultChanged: () => void;
}) {
  const {
    open,
    collectionName,
    items,
    allCollectionNames,
    onClose,
    onVaultChanged,
  } = props;

  const [saveError, setSaveError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [showRename, setShowRename] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  const [showDeleteCollection, setShowDeleteCollection] = useState(false);

  const [actionItemId, setActionItemId] = useState<string | null>(null);
  const [nameEditId, setNameEditId] = useState<string | null>(null);
  const [nameEditValue, setNameEditValue] = useState('');
  const [moveItemId, setMoveItemId] = useState<string | null>(null);
  const [moveTarget, setMoveTarget] = useState('');
  const [focusEditItem, setFocusEditItem] = useState<VaultAssetItem | null>(null);

  const [mergeOpen, setMergeOpen] = useState(false);
  const [mergeDontAsk, setMergeDontAsk] = useState(false);
  const [pendingMove, setPendingMove] = useState<{ id: string; target: string } | null>(
    null
  );
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
    const res = await moveVaultAssetToCollection({
      id,
      targetCollectionDisplay: target,
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
    if (normCol(target) !== normCol(collectionName)) onClose();
  };

  const startMove = (id: string) => {
    const target = moveTarget.trim() || 'Unnamed';
    if (normCol(target) === normCol(collectionName)) {
      setSaveError('Choose a different collection than the current one.');
      return;
    }
    const isLast = items.length === 1;
    const destExists = allCollectionNames.some(
      (c) => normCol(c) === normCol(target) && normCol(c) !== normCol(collectionName)
    );
    if (isLast) {
      setPendingLastItemMove({ id, target });
      setLastItemOpen(true);
      return;
    }
    if (destExists && !assetVaultMergeConfirmSkipped()) {
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
    const destExists = allCollectionNames.some(
      (c) => normCol(c) === normCol(target) && normCol(c) !== normCol(collectionName)
    );
    setPendingLastItemMove(null);
    if (destExists && !assetVaultMergeConfirmSkipped()) {
      setPendingMove({ id, target });
      setMergeOpen(true);
    } else {
      void executeMove(id, target);
    }
  };

  const confirmMerge = async () => {
    if (mergeDontAsk) setAssetVaultMergeConfirmSkipped(true);
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
          context="asset"
          item={focusEditItem}
          onClose={() => setFocusEditItem(null)}
          onSaved={onVaultChanged}
        />
      )}
      <button
        type="button"
        className="absolute inset-0 bg-black/70"
        aria-label="Close"
        onClick={onClose}
      />

      <div className="absolute inset-x-0 top-6 mx-auto w-[min(1080px,94vw)] max-h-[92vh] flex flex-col">
        <div
          className="relative overflow-hidden rounded-2xl border flex flex-col max-h-[92vh] border-violet-500/30 shadow-[0_30px_120px_rgba(0,0,0,0.55)] bg-[linear-gradient(135deg,#1e1033_0%,#0f172a_100%)]"
        >
          <div className="relative p-5 sm:p-7 flex flex-col min-h-0 flex-1 overflow-hidden">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <div
                  className="text-xs uppercase tracking-[0.35em]"
                  style={{ color: `${AMETHYST_LIGHT}cc` }}
                >
                  Asset collection
                </div>
                <div
                  className="mt-1 text-2xl sm:text-3xl font-semibold tracking-wide text-white break-words"
                  style={{ color: AMETHYST_LIGHT }}
                >
                  {collectionName}
                </div>
                <p className="mt-2 text-sm text-violet-200/70">
                  Rename collection, move assets, or delete. Merge into existing collections
                  is confirmed once (unless skipped).
                </p>
              </div>
              <div className="flex flex-wrap gap-2 shrink-0">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    setRenameValue(collectionName === 'Unnamed' ? '' : collectionName);
                    setShowRename(true);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-violet-500/40 bg-black/30 px-3 py-2 text-xs text-violet-100 hover:bg-black/40"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  Rename collection
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setShowDeleteCollection(true)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-red-500/40 bg-black/30 px-3 py-2 text-xs text-red-200/90"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete collection
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => onVaultChanged()}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-violet-500/40 bg-black/30 px-3 py-2 text-xs text-violet-100"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Refresh
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="inline-flex items-center justify-center rounded-xl border border-violet-500/40 bg-black/30 w-10 h-10 text-violet-100"
                  aria-label="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {(saveError || busy) && (
              <div className="mt-4 rounded-xl border border-violet-500/30 bg-black/25 px-4 py-3 text-sm">
                {saveError ? (
                  <span className="text-amber-300">{saveError}</span>
                ) : (
                  <span className="text-violet-200/80">Working…</span>
                )}
              </div>
            )}

            {showRename && (
              <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60">
                <div className="w-full max-w-md rounded-2xl border border-violet-500/40 bg-[#1e1033] p-6">
                  <h3 className="text-lg font-semibold text-violet-100">Rename collection</h3>
                  <input
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    className="mt-4 w-full rounded-xl border border-white/20 bg-black/40 px-3 py-2 text-violet-50"
                    placeholder="Collection name"
                  />
                  <div className="mt-4 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowRename(false)}
                      className="px-4 py-2 rounded-xl border border-white/20 text-sm text-white/80"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={busy || !renameValue.trim()}
                      onClick={async () => {
                        setBusy(true);
                        const res = await renameVaultAssetCollection(
                          collectionName,
                          renameValue.trim()
                        );
                        setBusy(false);
                        if (!res.ok) setSaveError(res.error);
                        else {
                          setShowRename(false);
                          onVaultChanged();
                          onClose();
                        }
                      }}
                      className="px-4 py-2 rounded-xl text-sm font-medium text-white disabled:opacity-50"
                      style={{ backgroundColor: AMETHYST }}
                    >
                      Rename
                    </button>
                  </div>
                </div>
              </div>
            )}

            {showDeleteCollection && (
              <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60">
                <div className="w-full max-w-md rounded-2xl border border-red-500/40 bg-[#1e1033] p-6">
                  <h3 className="text-lg font-semibold text-red-200">Delete entire collection?</h3>
                  <p className="text-sm text-violet-200/80 mt-2">
                    Remove all {items.length} asset{items.length === 1 ? '' : 's'} in “
                    {collectionName}”.
                  </p>
                  <div className="mt-4 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowDeleteCollection(false)}
                      className="px-4 py-2 rounded-xl border border-white/20 text-sm"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={async () => {
                        setBusy(true);
                        const res = await deleteVaultAssetCollection(collectionName);
                        setBusy(false);
                        if (!res.ok) setSaveError(res.error);
                        else {
                          setShowDeleteCollection(false);
                          onVaultChanged();
                          onClose();
                        }
                      }}
                      className="px-4 py-2 rounded-xl bg-red-700 text-white text-sm"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            )}

            {mergeOpen && pendingMove && (
              <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60">
                <div className="w-full max-w-md rounded-2xl border border-violet-500/40 bg-[#1e1033] p-6">
                  <h3 className="text-lg font-semibold text-violet-100">Merge into collection?</h3>
                  <p className="text-sm text-violet-200/75 mt-2">
                    “{pendingMove.target.trim() || 'Unnamed'}” already has assets.
                  </p>
                  <label className="mt-4 flex items-center gap-2 text-sm text-violet-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={mergeDontAsk}
                      onChange={(e) => setMergeDontAsk(e.target.checked)}
                    />
                    Don&apos;t ask again
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
                      className="px-4 py-2 rounded-xl text-sm font-medium text-white"
                      style={{ backgroundColor: AMETHYST }}
                    >
                      Merge &amp; move
                    </button>
                  </div>
                </div>
              </div>
            )}

            {lastItemOpen && pendingLastItemMove && (
              <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60">
                <div className="w-full max-w-md rounded-2xl border border-amber-500/40 bg-[#1e1033] p-6">
                  <h3 className="text-lg font-semibold text-violet-100">Last asset here</h3>
                  <p className="text-sm text-violet-200/75 mt-2">
                    Moving it removes the empty “{collectionName}” group from the vault.
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
                      className="px-4 py-2 rounded-xl bg-amber-600 text-white text-sm"
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
                  const title = item.asset_name || item.name || 'Asset';
                  const show = actionItemId === item.id;
                  return (
                    <div
                      key={item.id}
                      className="relative overflow-hidden rounded-2xl border border-white/10 bg-black/20"
                    >
                      <VaultImageWithFallback
                        src={item.image_url}
                        alt={title}
                        frameClassName="w-full h-[200px]"
                        imgClassName="w-full h-[200px] object-cover"
                        imgStyle={{
                          objectPosition: `${item.thumbnail_focus_x ?? 50}% ${item.thumbnail_focus_y ?? 50}%`,
                          transform: `scale(${item.thumbnail_scale ?? 1})`,
                          transformOrigin: `${item.thumbnail_focus_x ?? 50}% ${item.thumbnail_focus_y ?? 50}%`,
                        }}
                      />
                      <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/90 to-transparent">
                        <div className="flex items-end justify-between gap-2">
                          <div className="min-w-0 truncate text-sm font-medium text-violet-100">
                            {title}
                          </div>
                          <button
                            type="button"
                            onClick={() => setActionItemId(show ? null : item.id)}
                            className="shrink-0 rounded-lg border border-violet-500/40 p-1.5 text-violet-200"
                          >
                            <MoreHorizontal className="w-4 h-4" />
                          </button>
                        </div>
                        {show && (
                          <div className="mt-2 pt-2 border-t border-white/10 space-y-2">
                            <button
                              type="button"
                              onClick={() => {
                                setFocusEditItem(item);
                                setActionItemId(null);
                              }}
                              className="flex items-center gap-1 w-full text-left text-xs text-violet-200 hover:text-violet-100"
                            >
                              <Pencil className="w-3 h-3" />
                              Framing…
                            </button>

                            {nameEditId === item.id ? (
                              <div className="flex gap-1">
                                <input
                                  value={nameEditValue}
                                  onChange={(e) => setNameEditValue(e.target.value)}
                                  className="flex-1 min-w-0 rounded-lg border border-white/20 bg-black/50 px-2 py-1 text-xs text-white"
                                />
                                <button
                                  type="button"
                                  disabled={busy}
                                  onClick={async () => {
                                    setBusy(true);
                                    const res = await updateVaultAssetNames({
                                      id: item.id,
                                      assetName: nameEditValue.trim() || null,
                                    });
                                    setBusy(false);
                                    if (!res.ok) setSaveError(res.error);
                                    else {
                                      setNameEditId(null);
                                      onVaultChanged();
                                    }
                                  }}
                                  className="px-2 py-1 rounded-lg text-xs text-white"
                                  style={{ backgroundColor: AMETHYST }}
                                >
                                  Save
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  setNameEditId(item.id);
                                  setNameEditValue(item.asset_name || item.name || '');
                                }}
                                className="flex items-center gap-1 w-full text-left text-xs text-violet-300"
                              >
                                <Tag className="w-3 h-3" />
                                Edit asset name
                              </button>
                            )}
                            {moveItemId === item.id ? (
                              <div className="space-y-1">
                                <input
                                  list="vault-asset-collections"
                                  value={moveTarget}
                                  onChange={(e) => setMoveTarget(e.target.value)}
                                  placeholder="Target collection"
                                  className="w-full rounded-lg border border-white/20 bg-black/50 px-2 py-1 text-xs text-white"
                                />
                                <datalist id="vault-asset-collections">
                                  {allCollectionNames
                                    .filter((c) => normCol(c) !== normCol(collectionName))
                                    .map((c) => (
                                      <option key={c} value={c === 'Unnamed' ? '' : c} />
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
                                    className="px-2 text-xs text-white/50"
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
                                className="flex items-center gap-1 w-full text-left text-xs text-violet-300"
                              >
                                <FolderInput className="w-3 h-3" />
                                Move to collection…
                              </button>
                            )}
                            <button
                              type="button"
                              disabled={busy}
                              onClick={async () => {
                                if (!confirm('Delete this asset?')) return;
                                setBusy(true);
                                const res = await deleteVaultAsset(item.id);
                                setBusy(false);
                                if (!res.ok) setSaveError(res.error);
                                else {
                                  setActionItemId(null);
                                  onVaultChanged();
                                  if (items.length <= 1) onClose();
                                }
                              }}
                              className="flex items-center gap-1 w-full text-left text-xs text-red-300"
                            >
                              <Trash2 className="w-3 h-3" />
                              Delete asset
                            </button>
                          </div>
                        )}
                      </div>
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

function normCol(c: string): string {
  const t = c.trim();
  return t === '' || t === 'Unnamed' ? 'unnamed' : t.toLowerCase();
}
