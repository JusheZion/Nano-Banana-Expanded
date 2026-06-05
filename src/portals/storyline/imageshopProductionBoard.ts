import type { ImageshopIssueQueue } from '@/portals/storyline/imageshopPagePanelQueue';
import {
  getCurrentImageshopProductionVersion,
  type ImageshopProductionItem,
  type ImageshopProductionStatus,
  type ImageshopProductionVersionKind,
} from '@/stores/imageshopProductionStore';

export type ImageshopProductionBoardVersion = {
  id: string;
  kind: ImageshopProductionVersionKind;
  imageUrl: string;
  prompt: string;
  model?: string;
  seed: number | null;
  createdAt: string;
};

export type ImageshopProductionBoardPanel = {
  queueItemId: string;
  pageNumber: number;
  panelNumber: number;
  prompt: string;
  status: ImageshopProductionStatus | 'unstarted';
  productionItemId?: string;
  currentVersionId?: string;
  versions: ImageshopProductionBoardVersion[];
};

export type ImageshopProductionBoardPage = {
  pageNumber: number;
  summary: string;
  panels: ImageshopProductionBoardPanel[];
};

export type ImageshopProductionBoard = {
  issueTitle: string;
  pages: ImageshopProductionBoardPage[];
};

export function buildImageshopProductionBoard(
  queue: ImageshopIssueQueue,
  productionItems: ImageshopProductionItem[],
): ImageshopProductionBoard {
  const bySourceId = new Map(
    productionItems
      .filter((item) => item.sourceId)
      .map((item) => [item.sourceId as string, item]),
  );

  return {
    issueTitle: queue.issueTitle,
    pages: queue.pages.map((page) => ({
      pageNumber: page.pageNumber,
      summary: page.summary,
      panels: page.panels.map((panel) => {
        const productionItem = bySourceId.get(panel.queueItemId);
        const currentVersion = getCurrentImageshopProductionVersion(productionItem);
        return {
          queueItemId: panel.queueItemId,
          pageNumber: panel.pageNumber,
          panelNumber: panel.panelNumber,
          prompt: panel.prompt,
          status: productionItem?.status ?? 'unstarted',
          productionItemId: productionItem?.id,
          currentVersionId: currentVersion?.id,
          versions:
            productionItem?.versions.map((version) => ({
              id: version.id,
              kind: version.kind,
              imageUrl: version.imageUrl,
              prompt: version.prompt,
              model: version.provenance?.generation.model,
              seed: version.seed,
              createdAt: version.createdAt,
            })) ?? [],
        };
      }),
    })),
  };
}
