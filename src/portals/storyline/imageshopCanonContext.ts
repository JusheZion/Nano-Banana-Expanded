import {
  readLoreImportMetadataFromBody,
  stripLoreImportMetadataFromBody,
} from '@/portals/writer/obsidianLoreImport';
import type {
  ImageshopCanonChip,
  ImageshopPanelQueueItem,
} from '@/portals/storyline/imageshopPagePanelQueue';

export type ImageshopWriterLoreCandidate = {
  id: string;
  seriesId?: string | null;
  title: string;
  category: string;
  body: string;
  includeInPrompt: boolean;
  updatedAt?: string;
};

export type ImageshopCanonConflict = {
  code: 'vault-label-mismatch' | 'duplicate-canon-title';
  severity: 'warning';
  loreCardId: string;
  message: string;
};

export type ImageshopCanonContext = {
  chips: ImageshopCanonChip[];
  conflicts: ImageshopCanonConflict[];
  promptSummary: string;
};

type BuildImageshopCanonContextInput = {
  panel: ImageshopPanelQueueItem | null;
  loreCards?: ImageshopWriterLoreCandidate[];
};

function normalize(value: string | null | undefined): string {
  return (value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ');
}

function collapseWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function stripMarkdown(value: string): string {
  return collapseWhitespace(
    value
      .replace(/^---[\s\S]*?---\s*/m, '')
      .replace(/!\[\[[^\]]+\]\]/g, '')
      .replace(/\[\[([^|\]#]+)(?:[|#][^\]]*)?\]\]/g, '$1')
      .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
      .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
      .replace(/^#{1,6}\s+/gm, '')
      .replace(/^>\s?/gm, '')
      .replace(/[*_~`]+/g, '')
      .replace(/<!--[\s\S]*?-->/g, ''),
  );
}

function firstPromptSafeSummary(card: ImageshopWriterLoreCandidate): {
  summary: string;
  metadata: ReturnType<typeof readLoreImportMetadataFromBody>;
} {
  const metadata = readLoreImportMetadataFromBody(card.body);
  const metadataSummary = collapseWhitespace(metadata?.summary ?? '');
  if (metadataSummary) {
    return {
      summary: metadataSummary.slice(0, 360),
      metadata,
    };
  }

  const cleanBody = stripLoreImportMetadataFromBody(card.body);
  const quotedSummary = cleanBody
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line.startsWith('>'));
  const summary = stripMarkdown(quotedSummary || cleanBody || card.title);
  return {
    summary: summary.slice(0, 360),
    metadata,
  };
}

function panelContext(panel: ImageshopPanelQueueItem): string {
  return normalize(
    [
      panel.prompt,
      panel.action,
      panel.composition,
      panel.dialogue,
      panel.sfx,
      panel.artStyle,
      ...panel.characters,
      ...panel.locations,
      ...panel.canonChips.flatMap((chip) => [chip.id, chip.title, chip.summary]),
    ].join('\n'),
  );
}

function cardIsRelevant(panel: ImageshopPanelQueueItem, card: ImageshopWriterLoreCandidate): boolean {
  const normalizedId = normalize(card.id);
  if (panel.loreIds.some((id) => normalize(id) === normalizedId)) return true;
  if (panel.canonChips.some((chip) => normalize(chip.id) === normalizedId)) return true;
  const title = normalize(card.title);
  return Boolean(title) && panelContext(panel).includes(title);
}

export function createImageshopCanonChipFromLoreCard(
  card: ImageshopWriterLoreCandidate,
): ImageshopCanonChip {
  const { summary, metadata } = firstPromptSafeSummary(card);
  return {
    id: card.id,
    title: card.title.trim() || card.id,
    category: card.category.trim() || 'reference',
    source: metadata ? 'obsidian' : 'writer',
    summary,
    provenance: {
      obsidianPath: metadata?.sourcePath || undefined,
      writerLoreCardId: card.id,
      importedAt: metadata?.importDate || card.updatedAt || undefined,
    },
  };
}

function mergeCanonChips(
  existing: ImageshopCanonChip[],
  attached: ImageshopCanonChip[],
): ImageshopCanonChip[] {
  const seen = new Set<string>();
  return [...existing, ...attached].filter((chip) => {
    const key = normalize(chip.id) || `${normalize(chip.category)}|${normalize(chip.title)}`;
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function findConflicts(
  panel: ImageshopPanelQueueItem,
  chips: ImageshopCanonChip[],
): ImageshopCanonConflict[] {
  const conflicts: ImageshopCanonConflict[] = [];
  for (const chip of chips) {
    const matchingReference = panel.referenceChips.find((reference) => {
      const loreId = normalize(chip.id);
      return normalize(reference.referenceId) === loreId || normalize(reference.id) === loreId;
    });
    if (
      matchingReference &&
      normalize(matchingReference.label) &&
      normalize(matchingReference.label) !== normalize(chip.title)
    ) {
      conflicts.push({
        code: 'vault-label-mismatch',
        severity: 'warning',
        loreCardId: chip.id,
        message: `Canon "${chip.title}" conflicts with vault reference label "${matchingReference.label}".`,
      });
    }
  }
  const byTitle = new Map<string, ImageshopCanonChip>();
  for (const chip of chips) {
    const title = normalize(chip.title);
    if (!title) continue;
    const existing = byTitle.get(title);
    if (
      existing &&
      existing.id !== chip.id &&
      normalize(existing.summary) !== normalize(chip.summary)
    ) {
      conflicts.push({
        code: 'duplicate-canon-title',
        severity: 'warning',
        loreCardId: chip.id,
        message: `Canon "${chip.title}" has conflicting summaries from ${existing.source} and ${chip.source} sources.`,
      });
      continue;
    }
    byTitle.set(title, chip);
  }
  return conflicts;
}

export function buildImageshopCanonContext({
  panel,
  loreCards = [],
}: BuildImageshopCanonContextInput): ImageshopCanonContext {
  if (!panel) {
    return {
      chips: [],
      conflicts: [],
      promptSummary: '',
    };
  }

  const attached = panel.canonMode === 'manual'
    ? []
    : loreCards
        .filter((card) => card.includeInPrompt)
        .filter((card) => cardIsRelevant(panel, card))
        .map(createImageshopCanonChipFromLoreCard);
  const chips = mergeCanonChips(panel.canonChips, attached);

  return {
    chips,
    conflicts: findConflicts(panel, chips),
    promptSummary: chips
      .map((chip) => `${chip.title}: ${chip.summary}`.trim())
      .filter(Boolean)
      .join('\n'),
  };
}
