import type {
  ImageshopIssueQueue,
  ImageshopPanelQueueItem,
  ImageshopQueueReadiness,
  ImageshopReferenceChip,
} from '@/portals/storyline/imageshopPagePanelQueue';
import type {
  ImageshopCanonConflict,
  ImageshopWriterLoreCandidate,
} from '@/portals/storyline/imageshopCanonContext';
import type { ImageshopMissingReferenceRoute } from '@/portals/storyline/imageshopReferenceContext';
import type { ImageshopPromptPreflight } from '@/portals/storyline/imageshopPromptPreflight';
import { ImageshopContextInspector } from '@/portals/storyline/components/ImageshopContextInspector';
import { ImageshopOutputPanel } from '@/portals/storyline/components/ImageshopOutputPanel';
import { ImageshopPanelQueue } from '@/portals/storyline/components/ImageshopPanelQueue';
import type { ImageshopPromptPreflightSection } from '@/portals/storyline/components/ImageshopPromptPreflightPanel';
import type { ImageshopBatchUiStatus } from '@/portals/storyline/components/ImageshopBatchControls';
import type {
  ImageshopBatchGenerationAttempt,
  ImageshopBatchRetryStrategy,
} from '@/portals/storyline/imageshopBatchGeneration';

type ImageshopGenerationCockpitProps = {
  queue: ImageshopIssueQueue | null;
  selectedPanel: ImageshopPanelQueueItem | null;
  readiness: ImageshopQueueReadiness;
  generating: boolean;
  hasPreview: boolean;
  canonConflicts?: ImageshopCanonConflict[];
  missingReferenceRoutes?: ImageshopMissingReferenceRoute[];
  loreCards?: ImageshopWriterLoreCandidate[];
  resolvedReferenceChips?: ImageshopReferenceChip[];
  canUndoReferences?: boolean;
  preflight: ImageshopPromptPreflight;
  promptSections: ImageshopPromptPreflightSection[];
  batchStatus: ImageshopBatchUiStatus;
  batchAttempts: ImageshopBatchGenerationAttempt[];
  batchTotalItems: number;
  onSelectPanel: (queueItemId: string) => void;
  onLoadSelectedPanelPrompt: () => void;
  onGenerateSelectedPanel: () => void;
  onGeneratePage: () => void;
  onGenerateAll: () => void;
  onRetryFailed: (strategy: ImageshopBatchRetryStrategy) => void;
  onPauseBatch: () => void;
  onResumeBatch: () => void;
  onSkipSelectedPanel: () => void;
  hasSelectedBeat: boolean;
  canExportWriterImageMap: boolean;
  canReturnToWriter: boolean;
  canReturnToGuided: boolean;
  onChooseVaultTarget: (target: 'character' | 'asset' | 'npc') => void;
  onAssignSelectedBeat: () => void;
  onCreateNewBeat: () => void;
  onExportProductionJson: () => void;
  onExportWriterImageMap: () => void;
  onReturnToWriter: () => void;
  onReturnToGuided: () => void;
  onAttachCanon: (loreCardId: string) => void;
  onDetachCanon: (canonChipId: string) => void;
  onAddResolvedReferences: () => void;
  onReplaceReferences: () => void;
  onClearReferences: () => void;
  onUndoReferences: () => void;
  onRemoveReference: (referenceChipId: string) => void;
  onResolveMissingReference: (destination: ImageshopMissingReferenceRoute['destination']) => void;
};

export function ImageshopGenerationCockpit({
  queue,
  selectedPanel,
  readiness,
  generating,
  hasPreview,
  canonConflicts = [],
  missingReferenceRoutes = [],
  loreCards = [],
  resolvedReferenceChips = [],
  canUndoReferences = false,
  preflight,
  promptSections,
  batchStatus,
  batchAttempts,
  batchTotalItems,
  onSelectPanel,
  onLoadSelectedPanelPrompt,
  onGenerateSelectedPanel,
  onGeneratePage,
  onGenerateAll,
  onRetryFailed,
  onPauseBatch,
  onResumeBatch,
  onSkipSelectedPanel,
  hasSelectedBeat,
  canExportWriterImageMap,
  canReturnToWriter,
  canReturnToGuided,
  onChooseVaultTarget,
  onAssignSelectedBeat,
  onCreateNewBeat,
  onExportProductionJson,
  onExportWriterImageMap,
  onReturnToWriter,
  onReturnToGuided,
  onAttachCanon,
  onDetachCanon,
  onAddResolvedReferences,
  onReplaceReferences,
  onClearReferences,
  onUndoReferences,
  onRemoveReference,
  onResolveMissingReference,
}: ImageshopGenerationCockpitProps) {
  if (!queue) return null;

  const activePanel = selectedPanel ?? queue.pages[0]?.panels[0] ?? null;

  return (
    <section className="mt-3 min-w-0 max-w-full overflow-x-clip border border-amber-300/25 bg-[#120f08]/85 p-3 shadow-[0_18px_42px_rgba(0,0,0,0.28)]">
      <div className="grid min-w-0 gap-3 lg:grid-cols-2 2xl:grid-cols-[minmax(0,0.8fr)_minmax(0,1.15fr)_minmax(0,1fr)_minmax(0,1fr)]">
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
        <ImageshopContextInspector
          panel={activePanel}
          canonConflicts={canonConflicts}
          missingReferenceRoutes={missingReferenceRoutes}
          loreCards={loreCards}
          resolvedReferenceChips={resolvedReferenceChips}
          canUndoReferences={canUndoReferences}
          onAttachCanon={onAttachCanon}
          onDetachCanon={onDetachCanon}
          onAddResolvedReferences={onAddResolvedReferences}
          onReplaceReferences={onReplaceReferences}
          onClearReferences={onClearReferences}
          onUndoReferences={onUndoReferences}
          onRemoveReference={onRemoveReference}
          onResolveMissingReference={onResolveMissingReference}
        />
        <ImageshopOutputPanel
          panel={activePanel}
          generating={generating}
          hasPreview={hasPreview}
          preflight={preflight}
          promptSections={promptSections}
          batchStatus={batchStatus}
          batchAttempts={batchAttempts}
          batchTotalItems={batchTotalItems}
          onLoadSelectedPanelPrompt={onLoadSelectedPanelPrompt}
          onGenerateSelectedPanel={onGenerateSelectedPanel}
          onGeneratePage={onGeneratePage}
          onGenerateAll={onGenerateAll}
          onRetryFailed={onRetryFailed}
          onPauseBatch={onPauseBatch}
          onResumeBatch={onResumeBatch}
          onSkipSelectedPanel={onSkipSelectedPanel}
          hasSelectedBeat={hasSelectedBeat}
          canExportWriterImageMap={canExportWriterImageMap}
          canReturnToWriter={canReturnToWriter}
          canReturnToGuided={canReturnToGuided}
          onChooseVaultTarget={onChooseVaultTarget}
          onAssignSelectedBeat={onAssignSelectedBeat}
          onCreateNewBeat={onCreateNewBeat}
          onExportProductionJson={onExportProductionJson}
          onExportWriterImageMap={onExportWriterImageMap}
          onReturnToWriter={onReturnToWriter}
          onReturnToGuided={onReturnToGuided}
        />
      </div>
    </section>
  );
}
