import { useMemo, useState } from 'react';
import type {
  ImageshopPanelQueueItem,
  ImageshopReferenceChip,
  ImageshopReferenceLane,
} from '@/portals/storyline/imageshopPagePanelQueue';
import type {
  ImageshopCanonConflict,
  ImageshopWriterLoreCandidate,
} from '@/portals/storyline/imageshopCanonContext';
import type { ImageshopMissingReferenceRoute } from '@/portals/storyline/imageshopReferenceContext';

type ImageshopContextInspectorProps = {
  panel: ImageshopPanelQueueItem | null;
  canonConflicts?: ImageshopCanonConflict[];
  missingReferenceRoutes?: ImageshopMissingReferenceRoute[];
  loreCards?: ImageshopWriterLoreCandidate[];
  resolvedReferenceChips?: ImageshopReferenceChip[];
  canUndoReferences?: boolean;
  onAttachCanon?: (loreCardId: string) => void;
  onDetachCanon?: (canonChipId: string) => void;
  onAddResolvedReferences?: () => void;
  onReplaceReferences?: () => void;
  onClearReferences?: () => void;
  onUndoReferences?: () => void;
  onRemoveReference?: (referenceChipId: string) => void;
  onResolveMissingReference?: (destination: ImageshopMissingReferenceRoute['destination']) => void;
};

const REFERENCE_LANE_LABELS: Record<ImageshopReferenceLane, string> = {
  'character-dna': 'Character DNA',
  wardrobe: 'Wardrobe',
  environment: 'Environment',
  props: 'Props',
  style: 'Style',
  lighting: 'Lighting',
  canon: 'Canon',
};

export function ImageshopContextInspector({
  panel,
  canonConflicts = [],
  missingReferenceRoutes = [],
  loreCards = [],
  resolvedReferenceChips = [],
  canUndoReferences = false,
  onAttachCanon,
  onDetachCanon,
  onAddResolvedReferences,
  onReplaceReferences,
  onClearReferences,
  onUndoReferences,
  onRemoveReference,
  onResolveMissingReference,
}: ImageshopContextInspectorProps) {
  const availableLoreCards = useMemo(
    () => loreCards.filter((card) => !(panel?.canonChips ?? []).some((chip) => chip.id === card.id)),
    [loreCards, panel?.canonChips],
  );
  const [selectedLoreCardId, setSelectedLoreCardId] = useState('');

  return (
    <div className="min-w-0 space-y-3">
      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/45">Context Inspector</p>

      <div className="border border-white/10 bg-black/25 p-3">
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/45">Canon used</p>
        <div className="mt-2 space-y-2">
          {(panel?.canonChips ?? []).length > 0 ? (
            panel?.canonChips.map((chip) => (
              <div key={chip.id} className="border-l-2 border-amber-300/50 pl-2 text-[11px]">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="font-semibold text-amber-50">{chip.title}</span>
                  <span className="text-[10px] uppercase text-amber-100/55">
                    {chip.source === 'obsidian' ? 'Obsidian' : chip.source === 'writer' ? 'Writer' : 'Manual'}
                  </span>
                  {onDetachCanon ? (
                    <button
                      type="button"
                      onClick={() => onDetachCanon(chip.id)}
                      className="border border-white/10 px-1.5 py-0.5 text-[9px] uppercase text-white/50 hover:bg-white/10"
                      aria-label={`Detach canon ${chip.title}`}
                    >
                      Detach
                    </button>
                  ) : null}
                </div>
                {chip.summary ? <p className="mt-1 text-white/60">{chip.summary}</p> : null}
                {chip.provenance?.obsidianPath ? (
                  <p className="mt-1 truncate font-mono text-[10px] text-white/40">{chip.provenance.obsidianPath}</p>
                ) : null}
              </div>
            ))
          ) : (
            <span className="text-[11px] text-white/45">No canon chips attached.</span>
          )}
        </div>
        {canonConflicts.length > 0 ? (
          <div className="mt-3 border-t border-amber-200/15 pt-2">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-amber-100/60">Canon warnings</p>
            <div className="mt-2 space-y-1">
              {canonConflicts.map((conflict) => (
                <p key={`${conflict.code}-${conflict.loreCardId}`} className="text-[11px] text-amber-100/80">
                  {conflict.message}
                </p>
              ))}
            </div>
          </div>
        ) : null}
        {onAttachCanon && availableLoreCards.length > 0 ? (
          <div className="mt-3 flex flex-wrap items-end gap-2 border-t border-white/10 pt-2">
            <label className="min-w-0 flex-1 text-[10px] uppercase text-white/45">
              Lore card to attach
              <select
                aria-label="Lore card to attach"
                value={selectedLoreCardId}
                onChange={(event) => setSelectedLoreCardId(event.target.value)}
                className="mt-1 w-full border border-white/15 bg-black/40 px-2 py-1.5 text-[11px] normal-case text-white"
              >
                <option value="">Choose lore card</option>
                {availableLoreCards.map((card) => (
                  <option key={card.id} value={card.id}>
                    {card.title}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              disabled={!selectedLoreCardId}
              onClick={() => {
                if (!selectedLoreCardId) return;
                onAttachCanon(selectedLoreCardId);
                setSelectedLoreCardId('');
              }}
              className="border border-amber-300/30 bg-amber-300/10 px-2 py-1.5 text-[10px] text-amber-50 disabled:opacity-40"
              aria-label="Attach selected lore card"
            >
              Attach
            </button>
          </div>
        ) : null}
      </div>

      <div className="border border-white/10 bg-black/25 p-3">
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/45">Reference lanes</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {(panel?.referenceChips ?? []).length > 0 ? (
            panel?.referenceChips.map((chip) => (
              <span key={chip.id} className="border border-cyan-300/25 bg-cyan-300/10 px-2 py-1 text-[11px] text-cyan-50">
                <span className="font-semibold">{REFERENCE_LANE_LABELS[chip.lane]}</span>
                <span className="ml-1">{chip.label}</span>
                <span className="ml-1 text-[9px] uppercase text-cyan-100/55">
                  {chip.sourceType} · {chip.signedUrlStatus ?? 'unknown'}
                </span>
                {onRemoveReference ? (
                  <button
                    type="button"
                    onClick={() => onRemoveReference(chip.id)}
                    className="ml-1 border-l border-cyan-100/20 pl-1 text-[9px] uppercase text-cyan-50/70"
                    aria-label={`Remove reference ${chip.label}`}
                  >
                    Remove
                  </button>
                ) : null}
              </span>
            ))
          ) : (
            <span className="text-[11px] text-white/45">No reference chips attached.</span>
          )}
        </div>
        {onAddResolvedReferences || onReplaceReferences || onClearReferences || onUndoReferences ? (
          <div className="mt-3 flex flex-wrap gap-1.5 border-t border-white/10 pt-2">
            {onAddResolvedReferences ? (
              <button
                type="button"
                disabled={resolvedReferenceChips.length === 0}
                onClick={onAddResolvedReferences}
                className="border border-white/15 px-2 py-1 text-[9px] uppercase text-white/65 disabled:opacity-40"
                aria-label="Add resolved references"
                title={resolvedReferenceChips.length === 0 ? 'No resolved references are available.' : undefined}
              >
                Add resolved
              </button>
            ) : null}
            {onReplaceReferences ? (
              <button
                type="button"
                disabled={resolvedReferenceChips.length === 0}
                onClick={onReplaceReferences}
                className="border border-white/15 px-2 py-1 text-[9px] uppercase text-white/65 disabled:opacity-40"
                aria-label="Replace panel references"
              >
                Replace
              </button>
            ) : null}
            {onClearReferences ? (
              <button
                type="button"
                disabled={(panel?.referenceChips.length ?? 0) === 0}
                onClick={onClearReferences}
                className="border border-rose-200/20 px-2 py-1 text-[9px] uppercase text-rose-100 disabled:opacity-40"
                aria-label="Clear panel references"
              >
                Clear
              </button>
            ) : null}
            {onUndoReferences ? (
              <button
                type="button"
                disabled={!canUndoReferences}
                onClick={onUndoReferences}
                className="border border-white/15 px-2 py-1 text-[9px] uppercase text-white/65 disabled:opacity-40"
                aria-label="Undo reference change"
                title={!canUndoReferences ? 'No reference change is available to undo.' : undefined}
              >
                Undo
              </button>
            ) : null}
          </div>
        ) : null}
        {missingReferenceRoutes.length > 0 ? (
          <div className="mt-3 border-t border-white/10 pt-2">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/45">Missing references</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {missingReferenceRoutes.map((route) => (
                <button
                  type="button"
                  key={route.referenceId}
                  onClick={() => onResolveMissingReference?.(route.destination)}
                  className="border border-rose-200/25 bg-rose-300/10 px-2 py-1 text-[11px] text-rose-50"
                  aria-label={route.label}
                >
                  {route.label}
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
