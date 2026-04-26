import React from 'react';
import { Archive, Upload } from 'lucide-react';
import { Tooltip } from '@/shared/components/Tooltip';
import { useAssetStudioStore } from '@/stores/assetStudioStore';
import { getSlotLabel } from '@/shared/constants/referenceSlots';
import { ArcsStorageImg } from '@/components/ui/ArcsStorageImg';
import { goldTextStyle } from './assetStudioShared';

type Props = {
  uploadInputRef: React.RefObject<HTMLInputElement | null>;
  uploadSlotIndexRef: React.MutableRefObject<number | null>;
  focusedReferenceSlotIndex: number;
  setFocusedReferenceSlotIndex: (i: number) => void;
  setRecallSlotIndex: (i: number | null) => void;
  setRefHoverPreview: React.Dispatch<
    React.SetStateAction<{ url: string; x: number; y: number } | null>
  >;
};

export const AssetStudioReferencesPanel: React.FC<Props> = ({
  uploadInputRef,
  uploadSlotIndexRef,
  focusedReferenceSlotIndex,
  setFocusedReferenceSlotIndex,
  setRecallSlotIndex,
  setRefHoverPreview,
}) => {
  const store = useAssetStudioStore();

  return (
    <>
      <h2
        className="text-base font-bold uppercase tracking-widest border-b border-amber-500/20 pb-1 mb-2 shrink-0"
        style={goldTextStyle}
      >
        Reference images
      </h2>
      <input
        ref={uploadInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          const slotIndex = uploadSlotIndexRef.current;
          if (slotIndex == null) return;
          const url = URL.createObjectURL(file);
          store.setReferenceImageAt(slotIndex, url);
          store.setCurrentLiveImageUrl(url);
          uploadSlotIndexRef.current = null;
          e.target.value = '';
        }}
      />
      <div className="rounded-lg border border-amber-500/30 bg-black/35 px-2 py-2 mb-2 shrink-0 flex flex-wrap items-center gap-2">
        <div className="text-sm text-white/85 min-w-0 flex-1 basis-[140px]">
          <span className="font-bold text-amber-200/90">
            Slot {focusedReferenceSlotIndex + 1}
          </span>
          <span className="text-white/45"> · </span>
          <span className="text-white/75">{getSlotLabel(focusedReferenceSlotIndex, 'asset')}</span>
        </div>
        <div className="flex flex-wrap items-center gap-1">
          <Tooltip variant="asset" content="Upload an image into the focused slot" side="bottom">
            <button
              type="button"
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-sm font-medium border border-amber-500/35 text-amber-200/95 hover:bg-amber-500/15"
              onClick={() => {
                uploadSlotIndexRef.current = focusedReferenceSlotIndex;
                uploadInputRef.current?.click();
              }}
            >
              <Upload className="w-3.5 h-3.5 shrink-0" aria-hidden />
              Upload
            </button>
          </Tooltip>
          <Tooltip variant="asset" content="Choose from archive for the focused slot" side="bottom">
            <button
              type="button"
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-sm font-medium border border-amber-500/35 text-amber-200/95 hover:bg-amber-500/15"
              onClick={() => setRecallSlotIndex(focusedReferenceSlotIndex)}
            >
              <Archive className="w-3.5 h-3.5 shrink-0" aria-hidden />
              Archive
            </button>
          </Tooltip>
          <Tooltip variant="asset" content="Remove image from the focused slot" side="bottom">
            <button
              type="button"
              disabled={!store.referenceImageUrls[focusedReferenceSlotIndex]}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-sm font-medium border border-white/20 text-white/80 hover:bg-white/10 disabled:opacity-40 disabled:pointer-events-none"
              onClick={() => {
                const i = focusedReferenceSlotIndex;
                const url = store.referenceImageUrls[i];
                if (!url) return;
                const wasLive = store.currentLiveImageUrl === url;
                store.removeReferenceImage(i);
                if (wasLive) {
                  const nextUrls = useAssetStudioStore.getState().referenceImageUrls;
                  const still = nextUrls.filter(Boolean);
                  store.setCurrentLiveImageUrl(still[0] ?? null);
                }
              }}
            >
              Clear
            </button>
          </Tooltip>
          <Tooltip
            variant="asset"
            content="Clear every reference slot and reset the live preview."
            side="bottom"
          >
            <button
              type="button"
              onClick={() => {
                store.clearAllReferenceSlots();
                store.setCurrentLiveImageUrl(null);
              }}
              className="px-2.5 py-1.5 rounded-md text-sm border border-white/20 hover:bg-white/10"
            >
              Clear all
            </button>
          </Tooltip>
          <Tooltip
            variant="asset"
            content="Clear all reference slots but keep the current live preview image."
            side="bottom"
          >
            <button
              type="button"
              onClick={() => store.clearReferenceSlotsKeepLive()}
              className="px-2.5 py-1.5 rounded-md text-sm border border-amber-500/35 text-amber-200/95 hover:bg-amber-500/15"
            >
              Clear slots
            </button>
          </Tooltip>
          <Tooltip
            variant="asset"
            content="Paste an image from the clipboard into the first empty reference slot (browser permission required)."
            side="bottom"
          >
            <button
              type="button"
              onClick={async () => {
                try {
                  const clipItems = await navigator.clipboard.read();
                  for (const item of clipItems) {
                    for (const type of item.types) {
                      if (type.startsWith('image/')) {
                        const blob = await item.getType(type);
                        const url = URL.createObjectURL(blob);
                        const slots = Array.from({ length: 14 }, (_, i) => store.referenceImageUrls[i]);
                        const firstEmpty = slots.findIndex((u) => !u);
                        if (firstEmpty >= 0) {
                          store.setReferenceImageAt(firstEmpty, url);
                          store.setCurrentLiveImageUrl(url);
                        }
                        return;
                      }
                    }
                  }
                } catch {
                  store.setGenerationStatus('error', 'Could not paste image from clipboard.');
                }
              }}
              className="px-2.5 py-1.5 rounded-md text-sm border border-amber-500/40 hover:bg-amber-500/10"
            >
              Paste first empty
            </button>
          </Tooltip>
        </div>
      </div>
      <p className="text-sm text-white/50 mb-1 shrink-0">
        Click a thumbnail to focus a slot. Labels show slot role in the API stack.
      </p>
      <div className="mt-1 flex-1 min-h-0 overflow-y-auto custom-scrollbar">
        {!Array.from({ length: 14 }, (_, i) => store.referenceImageUrls[i]).some(Boolean) && (
          <p className="text-xs text-amber-200/70 mb-2">
            No references yet. Pick a slot, use Upload or Archive, or paste an image.
          </p>
        )}
        <div className="grid grid-cols-7 gap-1.5 w-full">
          {Array.from({ length: 14 }, (_, i) => {
            const url = store.referenceImageUrls[i];
            const isFocused = focusedReferenceSlotIndex === i;
            return (
              <div key={i} className="flex flex-col items-center gap-0.5 min-w-0 group/slot">
                <div className="relative w-full aspect-square max-h-[4.5rem]">
                  <button
                    type="button"
                    onClick={() => {
                      setFocusedReferenceSlotIndex(i);
                      if (url) store.setCurrentLiveImageUrl(url);
                    }}
                    className={`absolute inset-0 rounded-md bg-black/40 flex items-center justify-center overflow-hidden outline-none focus-visible:ring-2 focus-visible:ring-amber-400/90 ${
                      url
                        ? 'border-2 border-amber-500/55'
                        : 'border-2 border-dashed border-white/25'
                    } ${isFocused ? 'ring-2 ring-amber-300 ring-offset-1 ring-offset-black/70' : ''}`}
                    aria-pressed={isFocused}
                    aria-label={`Reference slot ${i + 1}, ${getSlotLabel(i, 'asset')}`}
                    onMouseEnter={
                      url
                        ? (e) =>
                            setRefHoverPreview({
                              url,
                              x: e.clientX + 12,
                              y: e.clientY + 12,
                            })
                        : undefined
                    }
                    onMouseMove={
                      url
                        ? (e) =>
                            setRefHoverPreview({
                              url,
                              x: e.clientX + 12,
                              y: e.clientY + 12,
                            })
                        : undefined
                    }
                    onMouseLeave={url ? () => setRefHoverPreview(null) : undefined}
                  >
                    {url ? (
                      <ArcsStorageImg src={url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-xs text-white/45 tabular-nums">{i + 1}</span>
                    )}
                  </button>
                  {url ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        const wasLive = store.currentLiveImageUrl === url;
                        store.removeReferenceImage(i);
                        if (wasLive) {
                          const nextUrls = useAssetStudioStore.getState().referenceImageUrls;
                          const still = nextUrls.filter(Boolean);
                          store.setCurrentLiveImageUrl(still[0] ?? null);
                        }
                      }}
                      className="absolute -top-0.5 -right-0.5 z-10 w-3.5 h-3.5 rounded-full bg-black/85 text-white text-xs leading-none flex items-center justify-center opacity-0 group-hover/slot:opacity-100 hover:!opacity-100 focus:opacity-100 pointer-events-auto border border-white/20"
                      aria-label={`Remove slot ${i + 1}`}
                    >
                      ×
                    </button>
                  ) : null}
                </div>
                <span className="text-[7px] text-center text-white/60 max-w-full leading-tight line-clamp-2">
                  {getSlotLabel(i, 'asset')}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
};
