import type { ImageshopPanelQueueItem } from '@/portals/storyline/imageshopPagePanelQueue';
import type { ImageshopPromptPreflight } from '@/portals/storyline/imageshopPromptPreflight';
import {
  ImageshopPromptPreflightPanel,
  type ImageshopPromptPreflightSection,
} from '@/portals/storyline/components/ImageshopPromptPreflightPanel';
import {
  ImageshopBatchControls,
  type ImageshopBatchUiStatus,
} from '@/portals/storyline/components/ImageshopBatchControls';
import type {
  ImageshopBatchGenerationAttempt,
  ImageshopBatchRetryStrategy,
} from '@/portals/storyline/imageshopBatchGeneration';
import { ImageshopOutputDestinations } from '@/portals/storyline/components/ImageshopOutputDestinations';

type ImageshopOutputPanelProps = {
  panel: ImageshopPanelQueueItem | null;
  generating: boolean;
  hasPreview: boolean;
  preflight: ImageshopPromptPreflight;
  promptSections: ImageshopPromptPreflightSection[];
  batchStatus: ImageshopBatchUiStatus;
  batchAttempts: ImageshopBatchGenerationAttempt[];
  batchTotalItems: number;
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
};

export function ImageshopOutputPanel({
  panel,
  generating,
  hasPreview,
  preflight,
  promptSections,
  batchStatus,
  batchAttempts,
  batchTotalItems,
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
}: ImageshopOutputPanelProps) {
  const canGenerate = Boolean(panel?.prompt) && preflight.canGenerate && !generating;
  const canRetry = panel?.status === 'failed' && canGenerate;

  return (
    <div className="min-w-0 space-y-3">
      <ImageshopPromptPreflightPanel preflight={preflight} sections={promptSections} />
      <ImageshopBatchControls
        status={batchStatus}
        attempts={batchAttempts}
        totalItems={batchTotalItems}
        canGenerate={preflight.canGenerate}
        onGeneratePage={onGeneratePage}
        onGenerateAll={onGenerateAll}
        onRetryFailed={onRetryFailed}
        onPause={onPauseBatch}
        onResume={onResumeBatch}
        onSkipSelected={onSkipSelectedPanel}
      />

      <ImageshopOutputDestinations
        hasPreview={hasPreview}
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
