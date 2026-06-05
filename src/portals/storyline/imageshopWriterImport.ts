import {
  createImageshopIssueQueue,
  type ImageshopCanonChip,
  type ImageshopGenerationProvenance,
  type ImageshopIssueQueue,
  type ImageshopPanelGenerationStatus,
  type ImageshopReferenceChip,
  type ImageshopReferenceLane,
} from '@/portals/storyline/imageshopPagePanelQueue';
import type {
  ImageshopProductionBatch,
  ImageshopProductionBatchItem,
} from '@/portals/storyline/imageshopJsonSchemas';

export type ImageshopWriterImportDiagnosticCode =
  | 'missing_page_beats'
  | 'empty_page_panels'
  | 'missing_panel_prompt'
  | 'unsupported_panel_field';

export type ImageshopWriterImportDiagnostic = {
  code: ImageshopWriterImportDiagnosticCode;
  severity: 'warning' | 'error';
  message: string;
  pageNumber?: number;
  panelNumber?: number;
  field?: string;
};

export type ImageshopWriterImportResult = {
  batch: ImageshopProductionBatch;
  queue: ImageshopIssueQueue;
  diagnostics: ImageshopWriterImportDiagnostic[];
};

export type ImageshopWriterImageMapOutput = {
  queueItemId: string;
  imageUrl: string;
  status: Extract<ImageshopPanelGenerationStatus, 'generated' | 'approved'>;
  versionId?: string;
  prompt?: string;
  model?: string;
  seed?: number | null;
  provenance?: ImageshopGenerationProvenance;
};

export type ImageshopWriterImageMapExport = {
  source: 'imageshop';
  target: 'writers-workshop';
  kind: 'writer-image-map';
  exported_at: string;
  writer_issue_id?: string;
  issue: {
    issue_number?: number;
    title: string;
  };
  pages: Array<{
    page_number: number;
    panels: Array<{
      queue_item_id: string;
      writer_page_id?: string;
      writer_panel_id?: string;
      panel_number: number;
      image_url: string;
      status: ImageshopWriterImageMapOutput['status'];
      version_id?: string;
      prompt?: string;
      model?: string;
      seed?: number | null;
      canon_used: ImageshopCanonChip[];
      references_used: ImageshopReferenceChip[];
    }>;
  }>;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function readString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function readNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function readRecord(value: unknown): Record<string, unknown> | null {
  return isRecord(value) ? value : null;
}

function readList(value: unknown): string[] {
  if (Array.isArray(value)) return uniqueList(value.flatMap((item) => readList(item)));
  if (typeof value !== 'string') return [];
  return uniqueList(value.split(/[,;\n]/).map((item) => item.trim()));
}

function uniqueList(values: string[]): string[] {
  const seen = new Set<string>();
  return values.filter((value) => {
    const normalized = value.trim();
    const key = normalized.toLowerCase();
    if (!normalized || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function firstText(...values: unknown[]): string {
  return values.map(readString).find(Boolean) ?? '';
}

function readPanelNumber(panel: Record<string, unknown>, fallback: number): number {
  return readNumber(panel.index) ?? readNumber(panel.panelNumber) ?? readNumber(panel.panel_number) ?? fallback;
}

function readPanelId(panel: Record<string, unknown>): string | undefined {
  return firstText(panel.id, panel.panel_id, panel.beat_id) || undefined;
}

function readPageId(page: Record<string, unknown>): string | undefined {
  return firstText(page.id, page.page_id) || undefined;
}

function readPageNumber(page: Record<string, unknown>, fallback: number): number {
  return readNumber(page.page_number) ?? readNumber(page.pageNumber) ?? fallback;
}

function readIssue(input: Record<string, unknown>): Record<string, unknown> {
  return readRecord(input.issue) ?? {};
}

function readSeries(input: Record<string, unknown>): Record<string, unknown> {
  return readRecord(input.series) ?? {};
}

function readProductionDefaults(input: Record<string, unknown>): Record<string, unknown> {
  return readRecord(input.production_defaults) ?? readRecord(input.productionDefaults) ?? {};
}

function readBeatsJson(page: Record<string, unknown>): Record<string, unknown> | null {
  return readRecord(page.beats_json) ?? readRecord(page.beatsJson);
}

function readPanels(beatsJson: Record<string, unknown> | null): Record<string, unknown>[] | null {
  if (!beatsJson) return null;
  return Array.isArray(beatsJson.panels)
    ? beatsJson.panels.filter(isRecord)
    : null;
}

function readArtStyle(args: {
  panel: Record<string, unknown>;
  beatsJson: Record<string, unknown> | null;
  productionDefaults: Record<string, unknown>;
}): string {
  return firstText(
    args.panel.art_style,
    args.panel.artStyle,
    args.panel.visual_style,
    args.beatsJson?.art_style,
    args.beatsJson?.artStyle,
    args.beatsJson?.visual_style,
    args.productionDefaults.art_style,
    args.productionDefaults.artStyle,
  );
}

function readCharacters(panel: Record<string, unknown>, beatsJson: Record<string, unknown> | null): string[] {
  return uniqueList([
    ...readList(panel.characters),
    ...readList(panel.key_characters),
    ...readList(panel.keyCharacters),
    ...readList(panel.cast),
    ...readList(beatsJson?.characters),
    ...readList(beatsJson?.key_characters),
    ...readList(beatsJson?.keyCharacters),
    ...readList(beatsJson?.cast),
  ]);
}

function readLocations(panel: Record<string, unknown>, beatsJson: Record<string, unknown> | null): string[] {
  return uniqueList([
    ...readList(panel.locations),
    ...readList(panel.key_locations),
    ...readList(panel.keyLocation),
    ...readList(panel.key_location),
    ...readList(beatsJson?.locations),
    ...readList(beatsJson?.key_locations),
    ...readList(beatsJson?.keyLocation),
    ...readList(beatsJson?.key_location),
  ]);
}

function readLoreIds(panel: Record<string, unknown>, beatsJson: Record<string, unknown> | null): string[] {
  return uniqueList([
    ...readList(panel.lore_ids),
    ...readList(panel.loreIds),
    ...readList(panel.canon_lore_ids),
    ...readList(panel.canonLoreIds),
    ...readList(beatsJson?.lore_ids),
    ...readList(beatsJson?.loreIds),
  ]);
}

function readReferenceIds(panel: Record<string, unknown>, beatsJson: Record<string, unknown> | null): string[] {
  return uniqueList([
    ...readList(panel.reference_ids),
    ...readList(panel.referenceIds),
    ...readList(panel.vault_reference_ids),
    ...readList(panel.vaultReferenceIds),
    ...readList(beatsJson?.reference_ids),
    ...readList(beatsJson?.referenceIds),
    ...readList(beatsJson?.vault_reference_ids),
    ...readList(beatsJson?.vaultReferenceIds),
  ]);
}

function readCanonSource(value: unknown): ImageshopCanonChip['source'] {
  const source = readString(value).toLowerCase();
  if (source === 'obsidian' || source === 'writer' || source === 'manual') return source;
  return 'writer';
}

function readCanonChips(panel: Record<string, unknown>, importedAt: string): ImageshopCanonChip[] {
  const raw = Array.isArray(panel.canon) ? panel.canon : Array.isArray(panel.canonChips) ? panel.canonChips : [];
  return raw.filter(isRecord).map((item, index) => {
    const id = firstText(item.id, item.lore_id, item.loreId) || `canon-${index + 1}`;
    const summary = firstText(item.summary, item.prompt_summary, item.body, item.description);
    const sourcePath = firstText(item.source_path, item.sourcePath, item.obsidianPath);
    return {
      id,
      title: firstText(item.title, item.label, id) || id,
      category: firstText(item.category, item.type) || 'reference',
      source: readCanonSource(item.source),
      summary,
      provenance: {
        obsidianPath: sourcePath || undefined,
        writerLoreCardId: firstText(item.writer_lore_card_id, item.writerLoreCardId, item.id) || undefined,
        importedAt,
      },
    };
  });
}

function readReferenceLane(value: unknown): ImageshopReferenceLane {
  const lane = readString(value).replace(/_/g, '-').toLowerCase();
  if (
    lane === 'character-dna' ||
    lane === 'wardrobe' ||
    lane === 'environment' ||
    lane === 'props' ||
    lane === 'style' ||
    lane === 'lighting' ||
    lane === 'canon'
  ) {
    return lane;
  }
  return 'props';
}

function readReferenceSourceType(value: unknown): ImageshopReferenceChip['sourceType'] {
  const sourceType = readString(value).replace(/_/g, '-').toLowerCase();
  if (
    sourceType === 'character' ||
    sourceType === 'asset' ||
    sourceType === 'npc' ||
    sourceType === 'guided' ||
    sourceType === 'approved-output'
  ) {
    return sourceType;
  }
  return 'asset';
}

function readReferenceChips(panel: Record<string, unknown>): ImageshopReferenceChip[] {
  const raw = Array.isArray(panel.references)
    ? panel.references
    : Array.isArray(panel.referenceChips)
      ? panel.referenceChips
      : [];
  return raw.filter(isRecord).map((item, index) => {
    const id = firstText(item.id, item.reference_id, item.referenceId) || `reference-${index + 1}`;
    return {
      id,
      label: firstText(item.label, item.displayName, item.name, id) || id,
      lane: readReferenceLane(item.lane),
      sourceType: readReferenceSourceType(item.source_type ?? item.sourceType),
      referenceId: firstText(item.reference_id, item.referenceId, item.id) || undefined,
      imageUrl: firstText(item.image_url, item.imageUrl, item.url) || undefined,
      signedUrlStatus: 'unknown',
    };
  });
}

function buildPromptSections(args: {
  action: string;
  composition: string;
  dialogue: string;
  sfx: string;
  characters: string[];
  locations: string[];
  artStyle: string;
  pageSummary: string;
}): ImageshopProductionBatchItem['promptSections'] {
  const main = [
    args.action,
    args.composition ? `Composition: ${args.composition}` : '',
    args.dialogue ? `Dialogue: ${args.dialogue}` : '',
    args.sfx ? `SFX: ${args.sfx}` : '',
  ]
    .filter(Boolean)
    .join('\n');
  return {
    main,
    character: args.characters.join(', '),
    environment: args.locations.join(', '),
    artStyle: args.artStyle,
    continuity: args.pageSummary,
  };
}

function titleForIssue(input: Record<string, unknown>, issue: Record<string, unknown>): string {
  return firstText(issue.title, input.title) || 'Imported Writer issue';
}

export function normalizeImageshopWriterJson(input: unknown): ImageshopWriterImportResult {
  if (!isRecord(input) || !Array.isArray(input.pages)) {
    throw new Error('Unsupported Writer JSON. Import a Writers Workshop issue pack with pages.');
  }

  const diagnostics: ImageshopWriterImportDiagnostic[] = [];
  const importedAt = firstText(input.exported_at, input.exportedAt) || new Date().toISOString();
  const issue = readIssue(input);
  const series = readSeries(input);
  const productionDefaults = readProductionDefaults(input);
  const issueId = firstText(input.issue_id, input.issueId) || undefined;
  const issueTitle = titleForIssue(input, issue);

  const pages = input.pages.filter(isRecord).map((page, pageIndex) => {
    const pageNumber = readPageNumber(page, pageIndex + 1);
    const pageId = readPageId(page);
    const beatsJson = readBeatsJson(page);
    const panels = readPanels(beatsJson);
    const pageSummary = firstText(beatsJson?.one_line_hook, beatsJson?.summary, page.summary);

    if (!panels) {
      diagnostics.push({
        code: 'missing_page_beats',
        severity: 'warning',
        message: `Page ${pageNumber} has no beats_json panels to import.`,
        pageNumber,
      });
    } else if (panels.length === 0) {
      diagnostics.push({
        code: 'empty_page_panels',
        severity: 'warning',
        message: `Page ${pageNumber} has an empty panels array.`,
        pageNumber,
      });
    }

    return {
      id: pageId,
      pageNumber,
      summary: pageSummary,
      panels: (panels ?? []).map((panel, panelIndex) => {
        const panelNumber = readPanelNumber(panel, panelIndex + 1);
        const action = firstText(panel.prompt, panel.visualPrompt, panel.action);
        const composition = readString(panel.composition);
        const prompt = action || composition;
        if (!prompt) {
          diagnostics.push({
            code: 'missing_panel_prompt',
            severity: 'error',
            message: `Page ${pageNumber} Panel ${panelNumber} has no action, composition, or prompt text.`,
            pageNumber,
            panelNumber,
          });
        }

        return {
          id: readPanelId(panel),
          panelNumber,
          beatId: readPanelId(panel),
          action,
          composition,
          dialogue: firstText(panel.dialogue, panel.dialogue_placeholder, panel.dialoguePlaceholder),
          sfx: readString(panel.sfx),
          characters: readCharacters(panel, beatsJson),
          locations: readLocations(panel, beatsJson),
          artStyle: readArtStyle({ panel, beatsJson, productionDefaults }),
          loreIds: readLoreIds(panel, beatsJson),
          referenceIds: readReferenceIds(panel, beatsJson),
          canonChips: readCanonChips(panel, importedAt),
          referenceChips: readReferenceChips(panel),
        };
      }),
    };
  });

  const queue = createImageshopIssueQueue({
    source: 'writer-json',
    importedAt,
    series: {
      id: firstText(series.id, input.series_id, input.seriesId) || undefined,
      title: readString(series.title),
    },
    issue: {
      id: issueId,
      title: issueTitle,
      issueNumber: readNumber(issue.issue_number) ?? readNumber(issue.issueNumber),
    },
    pages,
  });

  const items: ImageshopProductionBatchItem[] = queue.pages.flatMap((page) =>
    page.panels.map((panel) => ({
      sourceId: panel.queueItemId,
      sourceKind: 'writer-panel',
      label: `Page ${panel.pageNumber} Panel ${panel.panelNumber}`,
      prompt: panel.prompt,
      promptSections: buildPromptSections({
        action: panel.action,
        composition: panel.composition,
        dialogue: panel.dialogue,
        sfx: panel.sfx,
        characters: panel.characters,
        locations: panel.locations,
        artStyle: panel.artStyle,
        pageSummary: page.summary,
      }),
    })),
  );

  return {
    batch: {
      id: `writer-issue-json-${issueId ?? 'issue'}-${importedAt.replace(/[^0-9a-z]/gi, '').slice(0, 14)}`,
      kind: 'writer-issue-json',
      title: issueTitle,
      importedAt,
      items,
      panelQueue: queue,
      importDiagnostics: diagnostics,
    },
    queue,
    diagnostics,
  };
}

export function buildImageshopWriterImageMapExport({
  queue,
  outputs,
  exportedAt = new Date().toISOString(),
}: {
  queue: ImageshopIssueQueue;
  outputs: ImageshopWriterImageMapOutput[];
  exportedAt?: string;
}): ImageshopWriterImageMapExport {
  const byQueueItemId = new Map(outputs.map((output) => [output.queueItemId, output]));
  return {
    source: 'imageshop',
    target: 'writers-workshop',
    kind: 'writer-image-map',
    exported_at: exportedAt,
    writer_issue_id: queue.issueId,
    issue: {
      issue_number: queue.issueNumber,
      title: queue.issueTitle,
    },
    pages: queue.pages
      .map((page) => ({
        page_number: page.pageNumber,
        panels: page.panels.flatMap((panel) => {
          const output = byQueueItemId.get(panel.queueItemId);
          if (!output) return [];
          return [
            {
              queue_item_id: panel.queueItemId,
              writer_page_id: panel.pageId,
              writer_panel_id: panel.id,
              panel_number: panel.panelNumber,
              image_url: output.imageUrl,
              status: output.status,
              version_id: output.versionId,
              prompt: output.prompt,
              model: output.model,
              seed: output.seed,
              canon_used: output.provenance?.canon ?? panel.canonChips,
              references_used: output.provenance?.references ?? panel.referenceChips,
            },
          ];
        }),
      }))
      .filter((page) => page.panels.length > 0),
  };
}
