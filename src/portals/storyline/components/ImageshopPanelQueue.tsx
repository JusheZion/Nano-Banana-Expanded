import type {
  ImageshopIssueQueue,
  ImageshopPanelQueueItem,
  ImageshopQueueReadiness,
} from '@/portals/storyline/imageshopPagePanelQueue';

type ImageshopPanelQueueProps = {
  queue: ImageshopIssueQueue;
  activePanel: ImageshopPanelQueueItem | null;
  readiness: ImageshopQueueReadiness;
  onSelectPanel: (queueItemId: string) => void;
};

function statusLabel(status: ImageshopPanelQueueItem['status']): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

export function ImageshopPanelQueue({
  queue,
  activePanel,
  readiness,
  onSelectPanel,
}: ImageshopPanelQueueProps) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/45">Panel Queue</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {queue.pages.flatMap((page) =>
          page.panels.map((panel) => {
            const selected = activePanel?.queueItemId === panel.queueItemId;
            return (
              <button
                key={panel.queueItemId}
                type="button"
                aria-label={`Select Page ${panel.pageNumber} Panel ${panel.panelNumber}`}
                onClick={() => onSelectPanel(panel.queueItemId)}
                className={`border px-2 py-1 text-[11px] ${
                  selected
                    ? 'border-amber-200 bg-amber-300/20 text-amber-50'
                    : 'border-white/15 bg-white/5 text-white/70 hover:bg-white/10'
                }`}
              >
                P{panel.pageNumber}.{panel.panelNumber}
              </button>
            );
          }),
        )}
      </div>

      {activePanel ? (
        <div className="mt-3 border border-white/10 bg-black/25 p-3">
          <p className="text-[10px] uppercase tracking-[0.14em] text-white/45">
            Page {activePanel.pageNumber} Panel {activePanel.panelNumber} - {statusLabel(activePanel.status)}
          </p>
          <p className="mt-2 whitespace-pre-wrap text-sm text-white">{activePanel.prompt || activePanel.composition}</p>
          {activePanel.composition ? (
            <p className="mt-2 text-[11px] text-white/60">Composition: {activePanel.composition}</p>
          ) : null}
          {activePanel.dialogue || activePanel.sfx ? (
            <p className="mt-2 text-[11px] text-white/60">
              {[activePanel.dialogue ? `Dialogue: ${activePanel.dialogue}` : '', activePanel.sfx ? `SFX: ${activePanel.sfx}` : '']
                .filter(Boolean)
                .join(' - ')}
            </p>
          ) : null}
          <p className="mt-2 text-[11px] text-white/55">
            {(activePanel.characters.length > 0 ? activePanel.characters.join(', ') : 'No characters listed')}{' '}
            - {(activePanel.locations.length > 0 ? activePanel.locations.join(', ') : 'No locations listed')} -{' '}
            {activePanel.artStyle || 'No art style listed'}
          </p>
        </div>
      ) : null}

      {readiness.failedPanels > 0 ? (
        <p className="mt-2 text-[11px] text-red-100/80">{readiness.failedPanels} panel needs retry.</p>
      ) : null}
    </div>
  );
}
