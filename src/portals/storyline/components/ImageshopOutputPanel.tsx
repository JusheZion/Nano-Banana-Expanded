import type { ImageshopPanelQueueItem } from '@/portals/storyline/imageshopPagePanelQueue';

type ImageshopOutputPanelProps = {
  panel: ImageshopPanelQueueItem | null;
  generating: boolean;
  hasPreview: boolean;
  onLoadSelectedPanelPrompt: () => void;
  onGenerateSelectedPanel: () => void;
};

export function ImageshopOutputPanel({
  panel,
  generating,
  hasPreview,
  onLoadSelectedPanelPrompt,
  onGenerateSelectedPanel,
}: ImageshopOutputPanelProps) {
  const canGenerate = Boolean(panel?.prompt) && !generating;
  const canRetry = panel?.status === 'failed' && canGenerate;

  return (
    <div className="min-w-0 space-y-3">
      <div className="border border-white/10 bg-black/25 p-3">
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/45">Output Destinations</p>
        <div className="mt-2 grid gap-1.5 text-[11px] text-white/65">
          <span>Vault save</span>
          <span>Writer image map</span>
          <span>Guided return</span>
        </div>
        <p className="mt-2 text-[11px] text-white/55">
          {hasPreview
            ? 'Preview ready for vault save, download, or guided return when available.'
            : 'Generate a panel to unlock vault save, Writer image-map export, and guided return paths.'}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onLoadSelectedPanelPrompt}
          className="border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white/80 hover:bg-white/10"
        >
          Load selected panel prompt
        </button>
        <button
          type="button"
          disabled={!canGenerate}
          onClick={onGenerateSelectedPanel}
          className="bg-amber-300 px-3 py-1.5 text-xs font-semibold text-black disabled:opacity-45"
        >
          {generating ? 'Generating panel...' : 'Generate selected panel'}
        </button>
        <button
          type="button"
          disabled={!canRetry}
          onClick={onGenerateSelectedPanel}
          className="border border-red-200/30 bg-red-300/10 px-3 py-1.5 text-xs font-semibold text-red-50 disabled:opacity-45"
        >
          Retry selected panel
        </button>
        {!canRetry ? (
          <p className="basis-full text-[11px] text-white/45">
            Retry unlocks after the selected panel fails.
          </p>
        ) : null}
      </div>
    </div>
  );
}
