import type { ImageshopProductionBoard as ImageshopProductionBoardData } from '@/portals/storyline/imageshopProductionBoard';

type ImageshopProductionBoardProps = {
  board: ImageshopProductionBoardData;
  onSelectVersion: (productionItemId: string, versionId: string) => void;
  onRevertVersion: (productionItemId: string, versionId: string) => void;
  onApprove: (productionItemId: string) => void;
  onPublish: (productionItemId: string) => void;
};

export function ImageshopProductionBoard({
  board,
  onSelectVersion,
  onRevertVersion,
  onApprove,
  onPublish,
}: ImageshopProductionBoardProps) {
  return (
    <div className="mt-3 space-y-3">
      {board.pages.map((page) => (
        <section key={page.pageNumber} className="border border-white/10 bg-black/20 p-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h4 className="text-sm font-semibold text-white" aria-label={`Page ${page.pageNumber}`}>
              Page {page.pageNumber}
            </h4>
            {page.summary ? <p className="text-[10px] text-white/45">{page.summary}</p> : null}
          </div>
          <div className="mt-2 grid gap-2 xl:grid-cols-2">
            {page.panels.map((panel) => {
              const canManage = Boolean(panel.productionItemId && panel.versions.length > 0);
              return (
                <article key={panel.queueItemId} className="border border-white/10 bg-black/25 p-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <h5 className="text-xs font-semibold text-white/90" aria-label={`Panel ${panel.panelNumber}`}>
                      Panel {panel.panelNumber}
                    </h5>
                    <span className="border border-white/10 px-2 py-0.5 text-[9px] uppercase text-white/50">
                      {panel.status}
                    </span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-[10px] text-white/45">{panel.prompt || 'No prompt yet.'}</p>

                  {panel.versions.length > 0 ? (
                    <div className="mt-2 grid gap-2 sm:grid-cols-2">
                      {panel.versions.map((version, index) => {
                        const versionNumber = index + 1;
                        const isCurrent = panel.currentVersionId === version.id;
                        return (
                          <div
                            key={version.id}
                            className={`min-w-0 border p-2 ${
                              isCurrent ? 'border-amber-300/60 bg-amber-400/10' : 'border-white/10 bg-black/20'
                            }`}
                          >
                            <img
                              src={version.imageUrl}
                              alt={`Page ${page.pageNumber} Panel ${panel.panelNumber} version ${versionNumber}`}
                              className="aspect-square w-full object-cover"
                            />
                            <div className="mt-1 flex items-center justify-between gap-2 text-[9px] text-white/50">
                              <span>Version {versionNumber}</span>
                              <span>{version.kind}</span>
                            </div>
                            <dl className="mt-1 grid grid-cols-2 gap-x-2 text-[9px] text-white/40">
                              <dt>Model</dt>
                              <dd className="truncate text-right">{version.model ?? 'unknown'}</dd>
                              <dt>Seed</dt>
                              <dd className="text-right">{version.seed ?? 'none'}</dd>
                            </dl>
                            <div className="mt-2 flex gap-1.5">
                              <button
                                type="button"
                                aria-pressed={isCurrent}
                                disabled={!panel.productionItemId}
                                onClick={() => panel.productionItemId && onSelectVersion(panel.productionItemId, version.id)}
                                className="border border-white/15 px-2 py-1 text-[9px] text-white/75 hover:bg-white/10 disabled:opacity-40"
                                aria-label={`Choose version ${versionNumber} for Page ${page.pageNumber} Panel ${panel.panelNumber}`}
                              >
                                Choose
                              </button>
                              <button
                                type="button"
                                disabled={!panel.productionItemId || isCurrent}
                                onClick={() => panel.productionItemId && onRevertVersion(panel.productionItemId, version.id)}
                                className="border border-white/15 px-2 py-1 text-[9px] text-white/75 hover:bg-white/10 disabled:opacity-40"
                                aria-label={`Revert Page ${page.pageNumber} Panel ${panel.panelNumber} to version ${versionNumber}`}
                              >
                                Revert
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="mt-2 border border-dashed border-white/10 p-2 text-[10px] text-white/35">
                      No generated versions yet.
                    </p>
                  )}

                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      disabled={!canManage}
                      onClick={() => panel.productionItemId && onApprove(panel.productionItemId)}
                      className="border border-emerald-300/25 bg-emerald-300/10 px-2 py-1 text-[9px] uppercase text-emerald-100 disabled:opacity-40"
                      aria-label={`Approve Page ${page.pageNumber} Panel ${panel.panelNumber}`}
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      disabled={!canManage || panel.status !== 'approved'}
                      onClick={() => panel.productionItemId && onPublish(panel.productionItemId)}
                      className="border border-sky-300/25 bg-sky-300/10 px-2 py-1 text-[9px] uppercase text-sky-100 disabled:opacity-40"
                      aria-label={`Publish Page ${page.pageNumber} Panel ${panel.panelNumber}`}
                    >
                      Publish
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
