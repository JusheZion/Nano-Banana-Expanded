import type {
  ImageshopIssueQueue,
  ImageshopPanelQueueItem,
  ImageshopQueueReadiness,
} from '@/portals/storyline/imageshopPagePanelQueue';
import type { ImageshopMissingReferenceRoute } from '@/portals/storyline/imageshopReferenceContext';
import { ImageshopContextInspector } from '@/portals/storyline/components/ImageshopContextInspector';
import { ImageshopOutputPanel } from '@/portals/storyline/components/ImageshopOutputPanel';
import { ImageshopPanelQueue } from '@/portals/storyline/components/ImageshopPanelQueue';

type ImageshopGenerationCockpitProps = {
  queue: ImageshopIssueQueue | null;
  selectedPanel: ImageshopPanelQueueItem | null;
  readiness: ImageshopQueueReadiness;
  generating: boolean;
  hasPreview: boolean;
  missingReferenceRoutes?: ImageshopMissingReferenceRoute[];
  onSelectPanel: (queueItemId: string) => void;
  onLoadSelectedPanelPrompt: () => void;
  onGenerateSelectedPanel: () => void;
};

export function ImageshopGenerationCockpit({
  queue,
  selectedPanel,
  readiness,
  generating,
  hasPreview,
  missingReferenceRoutes = [],
  onSelectPanel,
  onLoadSelectedPanelPrompt,
  onGenerateSelectedPanel,
}: ImageshopGenerationCockpitProps) {
  if (!queue) return null;

  const activePanel = selectedPanel ?? queue.pages[0]?.panels[0] ?? null;

  return (
    <section className="mt-3 border border-amber-300/25 bg-[#120f08]/85 p-3 shadow-[0_18px_42px_rgba(0,0,0,0.28)]">
      <div className="grid gap-3 xl:grid-cols-[minmax(14rem,0.85fr)_minmax(18rem,1.2fr)_minmax(14rem,0.85fr)]">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-amber-100/65">
            Writer Pages Cockpit
          </p>
          <h4 className="mt-1 text-base font-semibold text-white">{queue.issueTitle}</h4>
          <p className="mt-1 text-[11px] text-white/55">
            {queue.seriesTitle ? `${queue.seriesTitle} - ` : ''}
            {queue.issueNumber != null ? `Issue ${queue.issueNumber}` : 'Writer issue'} · {readiness.readyPanels}/
            {readiness.totalPanels} panels ready
          </p>

          <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
            <div className="border border-white/10 bg-black/20 p-2">
              <span className="block text-white/45">Ready</span>
              <strong className="text-amber-100">{readiness.readyPanels}</strong>
            </div>
            <div className="border border-white/10 bg-black/20 p-2">
              <span className="block text-white/45">Needs prompt</span>
              <strong className="text-amber-100">{readiness.missingPromptPanels.length}</strong>
            </div>
            <div className="border border-white/10 bg-black/20 p-2">
              <span className="block text-white/45">Canon chips</span>
              <strong className="text-amber-100">{readiness.canonChipCount}</strong>
            </div>
            <div className="border border-white/10 bg-black/20 p-2">
              <span className="block text-white/45">Reference chips</span>
              <strong className="text-amber-100">{readiness.referenceChipCount}</strong>
            </div>
          </div>
        </div>

        <ImageshopPanelQueue
          queue={queue}
          activePanel={activePanel}
          readiness={readiness}
          onSelectPanel={onSelectPanel}
        />
        <ImageshopContextInspector panel={activePanel} missingReferenceRoutes={missingReferenceRoutes} />
        <ImageshopOutputPanel
          panel={activePanel}
          generating={generating}
          hasPreview={hasPreview}
          onLoadSelectedPanelPrompt={onLoadSelectedPanelPrompt}
          onGenerateSelectedPanel={onGenerateSelectedPanel}
        />
      </div>
    </section>
  );
}
