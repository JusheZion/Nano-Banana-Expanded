import { useEffect, useMemo, useState } from 'react';
import {
  Download,
  FolderInput,
  Maximize2,
  Minimize2,
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
import {
  buildVaultImageFilenameWithBlob,
  buildVaultImagesZip,
  fetchVaultImageBlob,
  sanitizeFilenameBase,
  triggerBrowserDownload,
  type VaultZipItem,
} from '@/shared/lib/vaultImageDownload';
import type { GuidedComicVaultTarget } from '@/stores/guidedComicVaultBridge';

const LIME = '#84CC16';

export function CollectionVaultModal(props: {
  open: boolean;
  collectionName: string;
  items: VaultAssetItem[];
  allCollectionNames: string[];
  onClose: () => void;
  onVaultChanged: () => void;
  guidedSelectionTarget?: GuidedComicVaultTarget | null;
  onUseForGuidedFlow?: (item: VaultAssetItem) => void;
}) {
  const {
    open,
    collectionName,
    items,
    allCollectionNames,
    onClose,
    onVaultChanged,
    guidedSelectionTarget,
    onUseForGuidedFlow,
  } = props;

  const [saveError, setSaveError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [modalSize, setModalSize] = useState<'fit' | 'wide'>('fit');

  const [showRename, setShowRename] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  const [showDeleteCollection, setShowDeleteCollection] = useState(false);

  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
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

  const [zipSelectedIds, setZipSelectedIds] = useState<Set<string>>(() => new Set());
  const [downloadBusy, setDownloadBusy] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setZipSelectedIds(new Set());
      setDownloadError(null);
    }
  }, [open]);

  const sorted = useMemo(() => {
    return [...items].sort((a, b) => {
      const at = a.created_at ? Date.parse(a.created_at) : 0;
      const bt = b.created_at ? Date.parse(b.created_at) : 0;
      return bt - at;
    });
  }, [items]);

  const toZipItem = (item: VaultAssetItem): VaultZipItem => ({
    rawUrl: item.image_url,
    title: item.asset_name || item.name || 'Asset',
    id: item.id,
    seed: item.seed,
  });

  const toggleZipSelect = (id: string) => {
    setZipSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const runDownloadOne = async (item: VaultAssetItem) => {
    setDownloadBusy(true);
    setDownloadError(null);
    try {
      const blob = await fetchVaultImageBlob(item.image_url);
      const title = item.asset_name || item.name || 'Asset';
      const fn = buildVaultImageFilenameWithBlob(
        { title, id: item.id, seed: item.seed },
        blob
      );
      triggerBrowserDownload(blob, fn);
    } catch (e) {
      setDownloadError(e instanceof Error ? e.message : 'Download failed');
    } finally {
      setDownloadBusy(false);
    }
  };

  const runDownloadAllZip = async () => {
    if (sorted.length === 0) return;
    setDownloadBusy(true);
    setDownloadError(null);
    try {
      const zip = await buildVaultImagesZip(sorted.map(toZipItem));
      const safe = sanitizeFilenameBase(collectionName, 'collection');
      triggerBrowserDownload(zip, `${safe}_vault.zip`);
    } catch (e) {
      setDownloadError(e instanceof Error ? e.message : 'Zip failed');
    } finally {
      setDownloadBusy(false);
    }
  };

  const runDownloadSelectedZip = async () => {
    const sel = sorted.filter((i) => zipSelectedIds.has(i.id));
    if (sel.length === 0) return;
    setDownloadBusy(true);
    setDownloadError(null);
    try {
      const zip = await buildVaultImagesZip(sel.map(toZipItem));
      const safe = sanitizeFilenameBase(collectionName, 'collection');
      triggerBrowserDownload(zip, `${safe}_selected.zip`);
    } catch (e) {
      setDownloadError(e instanceof Error ? e.message : 'Zip failed');
    } finally {
      setDownloadBusy(false);
    }
  };

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

      <div
        className={[
          'absolute left-2 right-2 top-2 max-h-[calc(100vh-1rem)] flex flex-col md:left-24',
          modalSize === 'fit' ? 'md:right-auto md:w-[min(1320px,calc(100vw-7rem))]' : 'md:right-2',
        ].join(' ')}
      >
        <div
          className="relative overflow-hidden rounded-2xl border flex flex-col max-h-[calc(100vh-1rem)] border-[#D4AF37]/30 shadow-[0_30px_120px_rgba(0,0,0,0.55)] bg-[linear-gradient(135deg,#071407_0%,#16610d_42%,#84cc16_74%,#102806_100%)]"
        >
          <div className="absolute inset-0 pointer-events-none opacity-70 bg-[radial-gradient(circle_at_26%_18%,rgba(255,255,255,0.16),transparent_48%)]" />
          <div className="absolute inset-0 pointer-events-none opacity-65 bg-[radial-gradient(circle_at_74%_58%,rgba(251,191,36,0.22),transparent_55%)]" />
          <div className="relative p-4 sm:p-5 flex flex-col min-h-0 flex-1 overflow-hidden">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div
                  className="text-xs uppercase tracking-[0.35em]"
                  style={{ color: '#D4AF37cc' }}
                >
                  Asset collection
                </div>
                <div
                  className="mt-1 text-2xl font-semibold tracking-wide text-white break-words"
                  style={{ color: '#FBF5D4' }}
                >
                  {collectionName}
                </div>
                <p className="mt-2 text-sm text-[#D4AF37]/70">
                  Check images for ZIP batches, or use Download all. HQ single download is on each
                  card. Rename, move, or delete; merge into existing collections is confirmed once
                  (unless skipped).
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
                  className="inline-flex items-center gap-1.5 rounded-xl border border-[#D4AF37]/35 bg-black/30 px-3 py-2 text-xs text-[#FBF5D4] hover:bg-black/40"
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
                  disabled={busy || downloadBusy || sorted.length === 0}
                  onClick={() => void runDownloadAllZip()}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-[#D4AF37]/35 bg-black/30 px-3 py-2 text-xs text-[#FBF5D4] disabled:opacity-40"
                  title="Download all images as a ZIP"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download all
                </button>
                <button
                  type="button"
                  disabled={busy || downloadBusy || zipSelectedIds.size === 0}
                  onClick={() => void runDownloadSelectedZip()}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-[#D4AF37]/35 bg-black/30 px-3 py-2 text-xs text-[#FBF5D4] disabled:opacity-40"
                  title="Download selected images as a ZIP"
                >
                  <Download className="w-3.5 h-3.5" />
                  Selected ({zipSelectedIds.size})
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => onVaultChanged()}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-[#D4AF37]/35 bg-black/30 px-3 py-2 text-xs text-[#FBF5D4]"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Refresh
                </button>
                <button
                  type="button"
                  onClick={() => setModalSize((size) => (size === 'fit' ? 'wide' : 'fit'))}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-[#D4AF37]/35 bg-black/30 px-3 py-2 text-xs text-[#FBF5D4]"
                >
                  {modalSize === 'fit' ? (
                    <Maximize2 className="w-3.5 h-3.5" />
                  ) : (
                    <Minimize2 className="w-3.5 h-3.5" />
                  )}
                  {modalSize === 'fit' ? 'Wide view' : 'Fit view'}
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="inline-flex items-center justify-center rounded-xl border border-[#D4AF37]/30 bg-black/30 w-10 h-10 text-[#FBF5D4]"
                  aria-label="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {(saveError || busy || downloadBusy || downloadError) && (
              <div className="mt-4 rounded-xl border border-[#D4AF37]/30 bg-black/25 px-4 py-3 text-sm">
                {downloadError ? (
                  <span className="text-amber-300">{downloadError}</span>
                ) : saveError ? (
                  <span className="text-amber-300">{saveError}</span>
                ) : downloadBusy ? (
                  <span className="text-[#FBF5D4]/80">Preparing download…</span>
                ) : (
                  <span className="text-[#FBF5D4]/80">Working…</span>
                )}
              </div>
            )}

            {showRename && (
              <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60">
                <div className="w-full max-w-md rounded-2xl border border-[#D4AF37]/40 bg-[linear-gradient(135deg,#071407,#16610d_55%,#102806)] p-6">
                  <h3 className="text-lg font-semibold text-[#FBF5D4]">Rename collection</h3>
                  <input
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    className="mt-4 w-full rounded-xl border border-white/20 bg-black/40 px-3 py-2 text-[#FBF5D4]"
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
                      style={{ backgroundColor: LIME, color: '#102806' }}
                    >
                      Rename
                    </button>
                  </div>
                </div>
              </div>
            )}

            {showDeleteCollection && (
              <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60">
                <div className="w-full max-w-md rounded-2xl border border-red-500/40 bg-[linear-gradient(135deg,#071407,#16610d_55%,#102806)] p-6">
                  <h3 className="text-lg font-semibold text-red-200">Delete entire collection?</h3>
                  <p className="text-sm text-[#FBF5D4]/80 mt-2">
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
                <div className="w-full max-w-md rounded-2xl border border-[#D4AF37]/40 bg-[linear-gradient(135deg,#071407,#16610d_55%,#102806)] p-6">
                  <h3 className="text-lg font-semibold text-[#FBF5D4]">Merge into collection?</h3>
                  <p className="text-sm text-[#FBF5D4]/75 mt-2">
                    “{pendingMove.target.trim() || 'Unnamed'}” already has assets.
                  </p>
                  <label className="mt-4 flex items-center gap-2 text-sm text-[#FBF5D4] cursor-pointer">
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
                      style={{ backgroundColor: LIME, color: '#102806' }}
                    >
                      Merge &amp; move
                    </button>
                  </div>
                </div>
              </div>
            )}

            {lastItemOpen && pendingLastItemMove && (
              <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60">
                <div className="w-full max-w-md rounded-2xl border border-amber-500/40 bg-[linear-gradient(135deg,#071407,#16610d_55%,#102806)] p-6">
                  <h3 className="text-lg font-semibold text-[#FBF5D4]">Last asset here</h3>
                  <p className="text-sm text-[#FBF5D4]/75 mt-2">
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

            <div className="mt-4 overflow-y-auto flex-1 min-h-0 pr-1 custom-scrollbar">
              <datalist id="vault-asset-collections-global">
                {allCollectionNames
                  .filter((c) => normCol(c) !== normCol(collectionName))
                  .map((c) => (
                    <option key={c} value={c === 'Unnamed' ? '' : c} />
                  ))}
              </datalist>
              <div className="grid grid-cols-1 gap-4 pb-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                {sorted.map((item) => {
                  const title = item.asset_name || item.name || 'Asset';
                  const isSelected = selectedItemId === item.id;
                  return (
                    <div
                      key={item.id}
                      className={[
                        'group relative flex flex-col overflow-hidden rounded-2xl border bg-black/20 transition',
                        isSelected ? 'border-[#FBBF24]/55' : 'border-white/10 hover:border-[#D4AF37]/35',
                      ].join(' ')}
                    >
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() =>
                          setSelectedItemId((s) => (s === item.id ? null : item.id))
                        }
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            setSelectedItemId((s) => (s === item.id ? null : item.id));
                          }
                        }}
                        className="relative cursor-pointer"
                      >
                        <div className="flex aspect-[9/16] w-full items-center justify-center overflow-hidden bg-black/25">
                          <VaultImageWithFallback
                            src={item.image_url}
                            alt={title}
                            frameClassName="flex aspect-[9/16] w-full items-center justify-center overflow-hidden"
                            imgClassName="block h-full w-full object-cover"
                            imgStyle={{
                              objectPosition: `${item.thumbnail_focus_x ?? 50}% ${item.thumbnail_focus_y ?? 50}%`,
                            }}
                          />
                        </div>
                      </div>

                      <div
                        className="border-t border-white/10 bg-[#071407]/95 p-3"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div>
                          <div className="min-w-0">
                            <p className="line-clamp-2 min-h-[2.25rem] break-words text-sm font-bold leading-snug text-[#FBF5D4]">
                              {title}
                            </p>
                            <p className="mt-1 truncate text-[11px] text-[#D4AF37]/70">
                              {guidedSelectionTarget ? collectionName : 'Vault asset'}
                            </p>
                          </div>
                        </div>

                        {guidedSelectionTarget && onUseForGuidedFlow ? (
                          <button
                            type="button"
                            disabled={busy}
                            className="mt-3 w-full rounded-xl border border-emerald-300/45 bg-emerald-300/15 px-3 py-2 text-xs font-black text-emerald-50 transition hover:bg-emerald-300/25 disabled:opacity-50"
                            title={`Use this image for ${guidedSelectionTarget.name}`}
                            onClick={() => onUseForGuidedFlow(item)}
                          >
                            Use for guided flow: {guidedSelectionTarget.name}
                          </button>
                        ) : null}

                        <div className="mt-3 grid grid-cols-6 gap-1.5">
                          <label className="flex min-w-0 cursor-pointer items-center justify-center gap-1 rounded-lg border border-[#D4AF37]/30 bg-black/30 px-1 py-1.5 text-[10px] font-bold text-[#FBF5D4] transition hover:bg-black/45">
                            <input
                              type="checkbox"
                              checked={zipSelectedIds.has(item.id)}
                              disabled={downloadBusy}
                              onChange={() => toggleZipSelect(item.id)}
                              className="rounded border-[#D4AF37]/50"
                            />
                            ZIP
                          </label>
                          <button
                            type="button"
                            disabled={busy || downloadBusy}
                            className="min-w-0 rounded-lg border border-[#D4AF37]/30 bg-black/30 px-1 py-1.5 text-[#FBF5D4] transition hover:bg-black/45 disabled:opacity-40"
                            title="Download HQ image"
                            onClick={() => void runDownloadOne(item)}
                          >
                            <Download className="mx-auto h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            className="min-w-0 rounded-lg border border-[#D4AF37]/30 bg-black/30 px-1 py-1.5 text-[#FBF5D4] transition hover:bg-black/45"
                            title="Framing"
                            onClick={() => {
                              setFocusEditItem(item);
                              setSelectedItemId(null);
                            }}
                          >
                            <Pencil className="mx-auto h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            className="min-w-0 rounded-lg border border-[#D4AF37]/30 bg-black/30 px-1 py-1.5 text-[#FBF5D4] transition hover:bg-black/45"
                            title="Edit asset name"
                            onClick={() => {
                              setNameEditId(item.id);
                              setNameEditValue(item.asset_name || item.name || '');
                              setSelectedItemId(item.id);
                            }}
                          >
                            <Tag className="mx-auto h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            className="min-w-0 rounded-lg border border-[#D4AF37]/30 bg-black/30 px-1 py-1.5 text-[#FBF5D4] transition hover:bg-black/45"
                            title="Move to collection"
                            onClick={() => {
                              setMoveItemId(item.id);
                              setMoveTarget('');
                              setSelectedItemId(item.id);
                            }}
                          >
                            <FolderInput className="mx-auto h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            disabled={busy}
                            className="min-w-0 rounded-lg border border-red-500/35 bg-black/30 px-1 py-1.5 text-red-200 transition hover:bg-red-950/35 disabled:opacity-40"
                            title="Delete asset"
                            onClick={async () => {
                              if (!confirm('Delete this asset?')) return;
                              setBusy(true);
                              const res = await deleteVaultAsset(item.id);
                              setBusy(false);
                              if (!res.ok) setSaveError(res.error);
                              else {
                                setSelectedItemId(null);
                                onVaultChanged();
                                if (items.length <= 1) onClose();
                              }
                            }}
                          >
                            <Trash2 className="mx-auto h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      {(nameEditId === item.id || moveItemId === item.id) && (
                        <div
                          className="border-t border-white/10 bg-black/40 px-3 py-2 space-y-2"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {nameEditId === item.id && (
                            <div className="flex gap-1">
                              <input
                                value={nameEditValue}
                                onChange={(e) => setNameEditValue(e.target.value)}
                                className="flex-1 min-w-0 rounded-lg border border-white/20 bg-black/50 px-2 py-1.5 text-xs text-white"
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
                                className="px-3 py-1.5 rounded-lg text-xs font-medium text-white"
                                style={{ backgroundColor: LIME, color: '#102806' }}
                              >
                                Save
                              </button>
                              <button
                                type="button"
                                onClick={() => setNameEditId(null)}
                                className="px-2 text-xs text-white/50"
                              >
                                Cancel
                              </button>
                            </div>
                          )}
                          {moveItemId === item.id && (
                            <div className="space-y-1">
                              <input
                                list="vault-asset-collections-global"
                                value={moveTarget}
                                onChange={(e) => setMoveTarget(e.target.value)}
                                placeholder="Target collection"
                                className="w-full rounded-lg border border-white/20 bg-black/50 px-2 py-1.5 text-xs text-white"
                              />
                              <div className="flex gap-2 justify-end">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setMoveItemId(null);
                                    setMoveTarget('');
                                  }}
                                  className="px-2 py-1 text-xs text-white/50"
                                >
                                  Cancel
                                </button>
                                <button
                                  type="button"
                                  disabled={busy}
                                  onClick={() => startMove(item.id)}
                                  className="flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-800/80 text-white text-xs"
                                >
                                  <FolderInput className="w-3 h-3" />
                                  Move
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      <div className="relative z-[5] border-t border-white/10 bg-black/35 px-3 py-2.5">
                        <div className="flex items-center justify-between gap-2 min-w-0">
                          <div className="min-w-0 truncate text-sm font-medium text-[#FBF5D4]">
                            {title}
                          </div>
                          <span className="text-[10px] text-[#D4AF37]/55 shrink-0 hidden sm:inline">
                            Click image for actions
                          </span>
                        </div>
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
