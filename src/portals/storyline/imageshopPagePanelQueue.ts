import type { ImageshopPromptWorkspace } from '@/portals/storyline/imageshopPromptComposer';

export type ImageshopPanelQueueSource = 'writer-json' | 'comic-page-json' | 'manual';

export type ImageshopPanelGenerationStatus =
  | 'draft'
  | 'ready'
  | 'generating'
  | 'generated'
  | 'failed'
  | 'approved'
  | 'skipped';

export type ImageshopReferenceLane =
  | 'character-dna'
  | 'wardrobe'
  | 'environment'
  | 'props'
  | 'style'
  | 'lighting'
  | 'canon';

export type ImageshopCanonChip = {
  id: string;
  title: string;
  category: string;
  source: 'obsidian' | 'writer' | 'manual';
  summary: string;
  provenance?: {
    obsidianPath?: string;
    writerLoreCardId?: string;
    importedAt?: string;
  };
};

export type ImageshopReferenceChip = {
  id: string;
  label: string;
  lane: ImageshopReferenceLane;
  sourceType: 'character' | 'asset' | 'npc' | 'guided' | 'approved-output';
  referenceId?: string;
  imageUrl?: string;
  signedUrlStatus?: 'unknown' | 'ready' | 'failed';
};

export type ImageshopPanelQueueItem = {
  id?: string;
  queueItemId: string;
  pageId?: string;
  pageNumber: number;
  panelNumber: number;
  beatId?: string;
  prompt: string;
  action: string;
  composition: string;
  dialogue: string;
  sfx: string;
  characters: string[];
  locations: string[];
  artStyle: string;
  loreIds: string[];
  referenceIds: string[];
  canonChips: ImageshopCanonChip[];
  referenceChips: ImageshopReferenceChip[];
  status: ImageshopPanelGenerationStatus;
  createdAt: string;
  updatedAt: string;
};

export type ImageshopPageQueue = {
  id?: string;
  pageNumber: number;
  summary: string;
  panels: ImageshopPanelQueueItem[];
};

export type ImageshopIssueQueue = {
  id: string;
  source: ImageshopPanelQueueSource;
  importedAt: string;
  seriesId?: string;
  seriesTitle?: string;
  issueId?: string;
  issueTitle: string;
  issueNumber?: number;
  pages: ImageshopPageQueue[];
};

export type ImageshopQueueReadiness = {
  totalPanels: number;
  readyPanels: number;
  missingPromptPanels: string[];
  generatedPanels: number;
  approvedPanels: number;
  failedPanels: number;
  canonChipCount: number;
  referenceChipCount: number;
};

export type CreateImageshopIssueQueueInput = {
  source: ImageshopPanelQueueSource;
  importedAt?: string;
  series?: {
    id?: string;
    title?: string;
  };
  issue?: {
    id?: string;
    title?: string;
    issueNumber?: number;
  };
  pages: Array<{
    id?: string;
    pageNumber: number;
    summary?: string;
    panels: Array<{
      id?: string;
      panelNumber: number;
      beatId?: string;
      action?: string;
      composition?: string;
      dialogue?: string;
      sfx?: string;
      characters?: string[];
      locations?: string[];
      artStyle?: string;
      loreIds?: string[];
      referenceIds?: string[];
      canonChips?: ImageshopCanonChip[];
      referenceChips?: ImageshopReferenceChip[];
      status?: ImageshopPanelGenerationStatus;
    }>;
  }>;
};

export type ImageshopGenerationProvenance = {
  source: 'imageshop-panel-queue';
  sourceQueueId: string;
  sourcePanelId: string;
  capturedAt: string;
  writer: {
    seriesId?: string;
    seriesTitle?: string;
    issueId?: string;
    issueTitle: string;
    issueNumber?: number;
    pageId?: string;
    pageNumber: number;
    panelNumber: number;
    beatId?: string;
  };
  generation: {
    model: string;
    aspectRatio: string;
    destination: string;
  };
  prompt: {
    composed: string;
    sections: Partial<ImageshopPromptWorkspace>;
  };
  canon: ImageshopCanonChip[];
  references: ImageshopReferenceChip[];
};

export type ImageshopPanelReferenceUndo = {
  queueItemId: string;
  previousReferenceIds: string[];
  previousReferenceChips: ImageshopReferenceChip[];
};

export type ImageshopPanelReferenceMutationResult = {
  queue: ImageshopIssueQueue;
  undo: ImageshopPanelReferenceUndo | null;
  blockedReason?: 'confirmation-required' | 'panel-not-found';
};

function cleanText(value: string | null | undefined): string {
  return value?.trim() ?? '';
}

function cleanList(values: string[] | undefined): string[] {
  return (values ?? []).map((value) => value.trim()).filter(Boolean);
}

function buildQueueId(source: ImageshopPanelQueueSource, issueId: string | undefined, importedAt: string): string {
  const issuePart = cleanText(issueId) || 'issue';
  const importedPart = importedAt.replace(/[^0-9a-z]/gi, '').slice(0, 14) || Date.now().toString();
  return `${source}-${issuePart}-${importedPart}`;
}

function buildPanelQueueItemId(args: {
  issueId?: string;
  pageNumber: number;
  panelNumber: number;
}): string {
  const issuePart = cleanText(args.issueId) || 'issue';
  return `${issuePart}-page-${args.pageNumber}-panel-${args.panelNumber}`;
}

export function createImageshopIssueQueue(input: CreateImageshopIssueQueueInput): ImageshopIssueQueue {
  const importedAt = input.importedAt ?? new Date().toISOString();
  const issueTitle = cleanText(input.issue?.title) || 'Imported issue';
  const issueId = cleanText(input.issue?.id) || undefined;

  return {
    id: buildQueueId(input.source, issueId, importedAt),
    source: input.source,
    importedAt,
    seriesId: cleanText(input.series?.id) || undefined,
    seriesTitle: cleanText(input.series?.title) || undefined,
    issueId,
    issueTitle,
    issueNumber: input.issue?.issueNumber,
    pages: input.pages.map((page) => ({
      id: cleanText(page.id) || undefined,
      pageNumber: page.pageNumber,
      summary: cleanText(page.summary),
      panels: page.panels.map((panel) => {
        const now = importedAt;
        const action = cleanText(panel.action);
        const composition = cleanText(panel.composition);
        const prompt = action || composition;
        return {
          id: cleanText(panel.id) || undefined,
          queueItemId: buildPanelQueueItemId({
            issueId,
            pageNumber: page.pageNumber,
            panelNumber: panel.panelNumber,
          }),
          pageId: cleanText(page.id) || undefined,
          pageNumber: page.pageNumber,
          panelNumber: panel.panelNumber,
          beatId: cleanText(panel.beatId) || undefined,
          prompt,
          action,
          composition,
          dialogue: cleanText(panel.dialogue),
          sfx: cleanText(panel.sfx),
          characters: cleanList(panel.characters),
          locations: cleanList(panel.locations),
          artStyle: cleanText(panel.artStyle),
          loreIds: cleanList(panel.loreIds),
          referenceIds: cleanList(panel.referenceIds),
          canonChips: panel.canonChips ?? [],
          referenceChips: panel.referenceChips ?? [],
          status: panel.status ?? 'draft',
          createdAt: now,
          updatedAt: now,
        };
      }),
    })),
  };
}

export function findImageshopPanelQueueItem(
  queue: ImageshopIssueQueue,
  queueItemId: string,
): ImageshopPanelQueueItem | undefined {
  for (const page of queue.pages) {
    const panel = page.panels.find((item) => item.queueItemId === queueItemId);
    if (panel) return panel;
  }
  return undefined;
}

export function getImageshopQueueReadiness(queue: ImageshopIssueQueue | null): ImageshopQueueReadiness {
  const panels = queue?.pages.flatMap((page) => page.panels) ?? [];
  return panels.reduce<ImageshopQueueReadiness>(
    (acc, panel) => {
      const hasPrompt = Boolean(panel.prompt.trim());
      acc.totalPanels += 1;
      if (hasPrompt) acc.readyPanels += 1;
      if (!hasPrompt) acc.missingPromptPanels.push(panel.queueItemId);
      if (panel.status === 'generated') acc.generatedPanels += 1;
      if (panel.status === 'approved') acc.approvedPanels += 1;
      if (panel.status === 'failed') acc.failedPanels += 1;
      acc.canonChipCount += panel.canonChips.length;
      acc.referenceChipCount += panel.referenceChips.length;
      return acc;
    },
    {
      totalPanels: 0,
      readyPanels: 0,
      missingPromptPanels: [],
      generatedPanels: 0,
      approvedPanels: 0,
      failedPanels: 0,
      canonChipCount: 0,
      referenceChipCount: 0,
    },
  );
}

export function updateImageshopPanelQueueItemStatus(
  queue: ImageshopIssueQueue,
  queueItemId: string,
  status: ImageshopPanelGenerationStatus,
): ImageshopIssueQueue {
  const updatedAt = new Date().toISOString();
  return {
    ...queue,
    pages: queue.pages.map((page) => ({
      ...page,
      panels: page.panels.map((panel) =>
        panel.queueItemId === queueItemId
          ? {
              ...panel,
              status,
              updatedAt,
            }
          : panel,
      ),
    })),
  };
}

function referenceChipIdentity(chip: ImageshopReferenceChip): string {
  return [
    chip.id,
    chip.sourceType,
    chip.referenceId ?? '',
    chip.imageUrl ?? '',
    chip.lane,
  ].join('|');
}

function dedupeReferenceChips(chips: ImageshopReferenceChip[]): ImageshopReferenceChip[] {
  const seen = new Set<string>();
  return chips.filter((chip) => {
    const key = referenceChipIdentity(chip);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function referenceIdsFromChips(chips: ImageshopReferenceChip[]): string[] {
  return cleanList(chips.map((chip) => chip.referenceId ?? chip.id));
}

function mutateImageshopPanelReferenceChips(
  queue: ImageshopIssueQueue,
  queueItemId: string,
  nextReferenceChips: ImageshopReferenceChip[],
): ImageshopPanelReferenceMutationResult {
  const existingPanel = findImageshopPanelQueueItem(queue, queueItemId);
  if (!existingPanel) {
    return {
      queue,
      undo: null,
      blockedReason: 'panel-not-found',
    };
  }

  const nextChips = dedupeReferenceChips(nextReferenceChips);
  const updatedAt = new Date().toISOString();
  const undo: ImageshopPanelReferenceUndo = {
    queueItemId,
    previousReferenceIds: existingPanel.referenceIds,
    previousReferenceChips: existingPanel.referenceChips,
  };

  return {
    queue: {
      ...queue,
      pages: queue.pages.map((page) => ({
        ...page,
        panels: page.panels.map((panel) =>
          panel.queueItemId === queueItemId
            ? {
                ...panel,
                referenceIds: referenceIdsFromChips(nextChips),
                referenceChips: nextChips,
                updatedAt,
              }
            : panel,
        ),
      })),
    },
    undo,
  };
}

export function addImageshopPanelReferenceChip(
  queue: ImageshopIssueQueue,
  queueItemId: string,
  chip: ImageshopReferenceChip,
): ImageshopPanelReferenceMutationResult {
  const existingPanel = findImageshopPanelQueueItem(queue, queueItemId);
  if (!existingPanel) {
    return {
      queue,
      undo: null,
      blockedReason: 'panel-not-found',
    };
  }
  const nextChips = dedupeReferenceChips([...existingPanel.referenceChips, chip]);
  if (nextChips.length === existingPanel.referenceChips.length) {
    return {
      queue,
      undo: null,
    };
  }
  return mutateImageshopPanelReferenceChips(queue, queueItemId, nextChips);
}

export function replaceImageshopPanelReferenceChips(
  queue: ImageshopIssueQueue,
  queueItemId: string,
  chips: ImageshopReferenceChip[],
  options: { confirmed: boolean },
): ImageshopPanelReferenceMutationResult {
  if (!options.confirmed) {
    return {
      queue,
      undo: null,
      blockedReason: 'confirmation-required',
    };
  }
  return mutateImageshopPanelReferenceChips(queue, queueItemId, chips);
}

export function clearImageshopPanelReferenceChips(
  queue: ImageshopIssueQueue,
  queueItemId: string,
  options: { confirmed: boolean },
): ImageshopPanelReferenceMutationResult {
  if (!options.confirmed) {
    return {
      queue,
      undo: null,
      blockedReason: 'confirmation-required',
    };
  }
  return mutateImageshopPanelReferenceChips(queue, queueItemId, []);
}

export function restoreImageshopPanelReferenceChips(
  queue: ImageshopIssueQueue,
  undo: ImageshopPanelReferenceUndo,
): ImageshopPanelReferenceMutationResult {
  const existingPanel = findImageshopPanelQueueItem(queue, undo.queueItemId);
  if (!existingPanel) {
    return {
      queue,
      undo: null,
      blockedReason: 'panel-not-found',
    };
  }

  const updatedAt = new Date().toISOString();
  return {
    queue: {
      ...queue,
      pages: queue.pages.map((page) => ({
        ...page,
        panels: page.panels.map((panel) =>
          panel.queueItemId === undo.queueItemId
            ? {
                ...panel,
                referenceIds: undo.previousReferenceIds,
                referenceChips: undo.previousReferenceChips,
                updatedAt,
              }
            : panel,
        ),
      })),
    },
    undo: {
      queueItemId: undo.queueItemId,
      previousReferenceIds: existingPanel.referenceIds,
      previousReferenceChips: existingPanel.referenceChips,
    },
  };
}

export function createImageshopGenerationProvenance({
  queue,
  panel,
  model,
  aspectRatio,
  prompt,
  promptSections,
  destination,
}: {
  queue: ImageshopIssueQueue;
  panel: ImageshopPanelQueueItem | null | undefined;
  model: string;
  aspectRatio: string;
  prompt: string;
  promptSections: Partial<ImageshopPromptWorkspace>;
  destination: string;
}): ImageshopGenerationProvenance {
  if (!panel) {
    throw new Error('Cannot create Imageshop provenance without a panel queue item.');
  }

  return {
    source: 'imageshop-panel-queue',
    sourceQueueId: queue.id,
    sourcePanelId: panel.queueItemId,
    capturedAt: new Date().toISOString(),
    writer: {
      seriesId: queue.seriesId,
      seriesTitle: queue.seriesTitle,
      issueId: queue.issueId,
      issueTitle: queue.issueTitle,
      issueNumber: queue.issueNumber,
      pageId: panel.pageId,
      pageNumber: panel.pageNumber,
      panelNumber: panel.panelNumber,
      beatId: panel.beatId,
    },
    generation: {
      model,
      aspectRatio,
      destination,
    },
    prompt: {
      composed: prompt,
      sections: promptSections,
    },
    canon: panel.canonChips,
    references: panel.referenceChips,
  };
}
