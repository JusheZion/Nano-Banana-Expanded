/**
 * Archive Recall Modal: browse saved characters (by profile) or assets (by collection)
 * and inject a chosen image URL into a reference slot.
 */
import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import {
  getCharactersGroupedByProfile,
  getAssetsGroupedByCollection,
  type CharacterArchiveItem,
  type AssetArchiveItem,
} from '@/shared/api/arcsArchive';
import {
  ACCENT_GOLD_GRADIENT,
  CHARACTER_STUDIO_EMERALD_TEXT,
  ASSET_STUDIO_AMETHYST_TEXT,
} from '@/shared/theme/Phase12DesignTokens';

const goldTextStyle: React.CSSProperties = {
  background: ACCENT_GOLD_GRADIENT,
  WebkitBackgroundClip: 'text',
  backgroundClip: 'text',
  color: 'transparent',
};

export interface ArchiveRecallModalProps {
  open: boolean;
  onClose: () => void;
  context: 'character' | 'asset';
  slotIndex: number;
  selectedUrl?: string | null;
  onSelect: (imageUrl: string) => void;
}

type GroupedCharacter = Record<string, CharacterArchiveItem[]>;
type GroupedAsset = Record<string, AssetArchiveItem[]>;

export const ArchiveRecallModal: React.FC<ArchiveRecallModalProps> = ({
  open,
  onClose,
  context,
  slotIndex,
  selectedUrl,
  onSelect,
}) => {
  const [loading, setLoading] = useState(true);
  const [groupedCharacters, setGroupedCharacters] = useState<GroupedCharacter>({});
  const [groupedAssets, setGroupedAssets] = useState<GroupedAsset>({});

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    if (context === 'character') {
      getCharactersGroupedByProfile()
        .then(setGroupedCharacters)
        .finally(() => setLoading(false));
      setGroupedAssets({});
    } else {
      getAssetsGroupedByCollection()
        .then(setGroupedAssets)
        .finally(() => setLoading(false));
      setGroupedCharacters({});
    }
  }, [open, context]);

  const accentTextStyle =
    context === 'character'
      ? { background: CHARACTER_STUDIO_EMERALD_TEXT, WebkitBackgroundClip: 'text' as const, backgroundClip: 'text' as const, color: 'transparent' as const }
      : { background: ASSET_STUDIO_AMETHYST_TEXT, WebkitBackgroundClip: 'text' as const, backgroundClip: 'text' as const, color: 'transparent' as const };

  const borderAccent = context === 'character' ? 'border-amber-500/40' : 'border-violet-500/40';
  const hoverAccent = context === 'character' ? 'hover:border-amber-500/70' : 'hover:border-violet-500/70';
  const selectedRing =
    context === 'character' ? 'ring-4 ring-amber-300/25' : 'ring-4 ring-violet-300/25';
  const selectedBorder = context === 'character' ? 'border-amber-500/90' : 'border-violet-500/90';

  if (!open) return null;

  const characterKeys = Object.keys(groupedCharacters);
  const assetKeys = Object.keys(groupedAssets);
  const hasData = characterKeys.length > 0 || assetKeys.length > 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={`Recall from archive — slot ${slotIndex}`}
    >
      <div
        className="flex flex-col rounded-xl border bg-black/90 backdrop-blur-md max-h-[85vh] w-full max-w-2xl overflow-hidden shadow-xl"
        style={{ borderColor: context === 'character' ? 'rgba(245, 158, 11, 0.4)' : 'rgba(139, 92, 246, 0.4)' }}
      >
        <div className="flex-shrink-0 flex items-center justify-between px-4 py-2 border-b border-white/10">
          <h2 className="text-sm font-bold uppercase tracking-widest" style={goldTextStyle}>
            {context === 'character' ? 'Character archive' : 'Asset archive'} — choose for slot {slotIndex}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg border border-white/20 hover:bg-white/10 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-white/80" />
          </button>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-4">
          {loading ? (
            <p className="text-sm text-white/70 py-8 text-center">Loading archive…</p>
          ) : !hasData ? (
            <p className="text-sm text-white/60 py-8 text-center">No saved {context === 'character' ? 'characters' : 'assets'} yet.</p>
          ) : (
            <div className="space-y-6">
              {context === 'character' &&
                characterKeys.map((key) => (
                  <section key={key}>
                    <h3 className="text-xs font-semibold uppercase tracking-wider mb-2" style={accentTextStyle}>
                      {key}
                    </h3>
                    <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-2">
                      {groupedCharacters[key].map((item) => {
                        const isSelected = selectedUrl && item.image_url === selectedUrl;
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => {
                              onSelect(item.image_url);
                              onClose();
                            }}
                            className={`flex flex-col rounded-lg border overflow-hidden bg-black/40 transition-colors ${borderAccent} ${hoverAccent} ${
                              isSelected ? `${selectedBorder} ${selectedRing}` : ''
                            }`}
                          >
                            <div className="relative">
                              <img
                                src={item.image_url}
                                alt=""
                                className="w-full aspect-[9/16] object-cover"
                              />
                              {isSelected && (
                                <div
                                  className="absolute top-1 left-1 text-[9px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-200"
                                >
                                  Selected
                                </div>
                              )}
                            </div>
                            <span className="text-[10px] text-white/80 truncate px-1 py-0.5">
                              {item.cast_name ?? item.name ?? item.profile_name ?? '—'}
                            </span>
                            {item.seed != null && (
                              <span className="text-[9px] text-white/50 px-1">
                                seed {item.seed}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </section>
                ))}
              {context === 'asset' &&
                assetKeys.map((key) => (
                  <section key={key}>
                    <h3 className="text-xs font-semibold uppercase tracking-wider mb-2" style={accentTextStyle}>
                      {key}
                    </h3>
                    <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-2">
                      {groupedAssets[key].map((item) => {
                        const isSelected = selectedUrl && item.image_url === selectedUrl;
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => {
                              onSelect(item.image_url);
                              onClose();
                            }}
                            className={`flex flex-col rounded-lg border overflow-hidden bg-black/40 transition-colors ${borderAccent} ${hoverAccent} ${
                              isSelected ? `${selectedBorder} ${selectedRing}` : ''
                            }`}
                          >
                            <div className="relative">
                              <img
                                src={item.image_url}
                                alt=""
                                className="w-full aspect-[9/16] object-cover"
                              />
                              {isSelected && (
                                <div
                                  className="absolute top-1 left-1 text-[9px] font-bold px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-200"
                                >
                                  Selected
                                </div>
                              )}
                            </div>
                            <span className="text-[10px] text-white/80 truncate px-1 py-0.5">
                              {item.asset_name ?? item.name ?? item.collection_name ?? '—'}
                            </span>
                            {item.seed != null && (
                              <span className="text-[9px] text-white/50 px-1">
                                seed {item.seed}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </section>
                ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
