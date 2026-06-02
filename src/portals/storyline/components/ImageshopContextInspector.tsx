import type {
  ImageshopPanelQueueItem,
  ImageshopReferenceLane,
} from '@/portals/storyline/imageshopPagePanelQueue';
import type { ImageshopMissingReferenceRoute } from '@/portals/storyline/imageshopReferenceContext';

type ImageshopContextInspectorProps = {
  panel: ImageshopPanelQueueItem | null;
  missingReferenceRoutes?: ImageshopMissingReferenceRoute[];
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
  missingReferenceRoutes = [],
}: ImageshopContextInspectorProps) {
  return (
    <div className="min-w-0 space-y-3">
      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/45">Context Inspector</p>

      <div className="border border-white/10 bg-black/25 p-3">
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/45">Canon used</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {(panel?.canonChips ?? []).length > 0 ? (
            panel?.canonChips.map((chip) => (
              <span key={chip.id} className="border border-amber-300/25 bg-amber-300/10 px-2 py-1 text-[11px] text-amber-50">
                {chip.title}
              </span>
            ))
          ) : (
            <span className="text-[11px] text-white/45">No canon chips attached.</span>
          )}
        </div>
      </div>

      <div className="border border-white/10 bg-black/25 p-3">
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/45">Reference lanes</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {(panel?.referenceChips ?? []).length > 0 ? (
            panel?.referenceChips.map((chip) => (
              <span key={chip.id} className="border border-cyan-300/25 bg-cyan-300/10 px-2 py-1 text-[11px] text-cyan-50">
                <span className="font-semibold">{REFERENCE_LANE_LABELS[chip.lane]}</span>
                <span className="ml-1">{chip.label}</span>
              </span>
            ))
          ) : (
            <span className="text-[11px] text-white/45">No reference chips attached.</span>
          )}
        </div>
        {missingReferenceRoutes.length > 0 ? (
          <div className="mt-3 border-t border-white/10 pt-2">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/45">Missing references</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {missingReferenceRoutes.map((route) => (
                <span
                  key={route.referenceId}
                  className="border border-rose-200/25 bg-rose-300/10 px-2 py-1 text-[11px] text-rose-50"
                >
                  {route.label}
                </span>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
