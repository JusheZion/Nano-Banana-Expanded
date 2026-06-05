import { z } from 'zod';
import {
  createDefaultImageshopPageConfig,
  createDefaultImageshopPromptWorkspace,
  type ImageshopArtStyle,
  type ImageshopGenerationMode,
  type ImageshopPageConfig,
  type ImageshopPromptWorkspace,
} from '@/portals/storyline/imageshopPromptComposer';
import { normalizeImageshopWriterJson, type ImageshopWriterImportDiagnostic } from '@/portals/storyline/imageshopWriterImport';
import type { ImageshopIssueQueue } from '@/portals/storyline/imageshopPagePanelQueue';

export type ImageshopProductionBatchKind = 'story-beat-json' | 'comic-page-json' | 'arcs-page-json' | 'writer-issue-json';
export type ImageshopProductionSourceKind = 'story-beat' | 'comic-page' | 'arcs-page' | 'writer-panel';

export type ImageshopProductionBatchItem = {
  sourceId: string;
  sourceKind: ImageshopProductionSourceKind;
  label: string;
  prompt: string;
  promptSections: Partial<ImageshopPromptWorkspace>;
  pageConfig?: ImageshopPageConfig;
};

export type ImageshopProductionBatch = {
  id: string;
  kind: ImageshopProductionBatchKind;
  title: string;
  importedAt: string;
  artStyles?: ImageshopArtStyle[];
  selectedArtStyleId?: string | null;
  items: ImageshopProductionBatchItem[];
  panelQueue?: ImageshopIssueQueue;
  importDiagnostics?: ImageshopWriterImportDiagnostic[];
};

const storyBeatJsonSchema = z.object({
  title: z.string().optional(),
  beats: z.array(
    z.object({
      id: z.string().optional(),
      title: z.string().optional(),
      prompt: z.string().optional(),
      visualPrompt: z.string().optional(),
      action: z.string().optional(),
      composition: z.string().optional(),
      characters: z.array(z.string()).optional(),
      environment: z.string().optional(),
      artStyle: z.string().optional(),
    }),
  ),
});

const comicPageJsonSchema = z.object({
  kind: z.string().optional(),
  title: z.string().optional(),
  pages: z.array(
    z.object({
      pageNumber: z.number().optional(),
      pageType: z.string().optional(),
      summary: z.string().optional(),
      panels: z.array(
        z.object({
          panelNumber: z.number().optional(),
          prompt: z.string().optional(),
          action: z.string().optional(),
          composition: z.string().optional(),
          dialogue: z.string().optional(),
          dialogue_placeholder: z.string().optional(),
          sfx: z.string().optional(),
        }),
      ),
    }),
  ),
});

const arcsPageJsonSchema = z.object({
  kind: z.string().optional(),
  title: z.string().optional(),
  mode: z.string().optional(),
  selectedArtStyleId: z.string().nullable().optional(),
  artStyles: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      description: z.string().optional(),
      prompt: z.string(),
    }),
  ).optional(),
  pageConfig: z.record(z.string(), z.unknown()).optional(),
  panelQueue: z.custom<ImageshopIssueQueue>(
    (value) =>
      Boolean(value) &&
      typeof value === 'object' &&
      typeof (value as ImageshopIssueQueue).id === 'string' &&
      Array.isArray((value as ImageshopIssueQueue).pages),
    'Invalid Imageshop panel queue.',
  ).optional(),
  items: z.array(
    z.object({
      id: z.string().optional(),
      label: z.string().optional(),
      prompt: z.string().optional(),
      promptSections: z.record(z.string(), z.string()).optional(),
      pageConfig: z.record(z.string(), z.unknown()).optional(),
    }),
  ),
});

function createBatchId(kind: ImageshopProductionBatchKind): string {
  return `${kind}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function firstText(...values: Array<string | null | undefined>): string {
  return values.map((value) => value?.trim()).find(Boolean) ?? '';
}

function pageConfigFromUnknown(value: unknown): ImageshopPageConfig {
  return {
    ...createDefaultImageshopPageConfig(),
    ...(typeof value === 'object' && value ? value : {}),
    panelStyle: {
      ...createDefaultImageshopPageConfig().panelStyle,
      ...((typeof value === 'object' && value && 'panelStyle' in value && typeof value.panelStyle === 'object' && value.panelStyle)
        ? value.panelStyle
        : {}),
    },
  } as ImageshopPageConfig;
}

function normalizePromptSections(value: Record<string, string> | undefined): Partial<ImageshopPromptWorkspace> {
  const defaults = createDefaultImageshopPromptWorkspace();
  return Object.fromEntries(
    Object.keys(defaults)
      .map((key) => [key, value?.[key] ?? ''])
      .filter(([, sectionValue]) => sectionValue),
  ) as Partial<ImageshopPromptWorkspace>;
}

function normalizeStoryBeatJson(input: unknown): ImageshopProductionBatch | null {
  const parsed = storyBeatJsonSchema.safeParse(input);
  if (!parsed.success) return null;

  return {
    id: createBatchId('story-beat-json'),
    kind: 'story-beat-json',
    title: parsed.data.title?.trim() || 'Imported story beats',
    importedAt: new Date().toISOString(),
    items: parsed.data.beats.map((beat, index) => {
      const prompt = firstText(beat.prompt, beat.visualPrompt, beat.action, beat.composition, `Story beat ${index + 1}`);
      return {
        sourceId: beat.id?.trim() || `story-beat-${index + 1}`,
        sourceKind: 'story-beat',
        label: beat.title?.trim() || `Story Beat ${index + 1}`,
        prompt,
        promptSections: {
          main: prompt,
          character: beat.characters?.join(', ') ?? '',
          environment: beat.environment ?? '',
          artStyle: beat.artStyle ?? '',
        },
      };
    }),
  };
}

function normalizeComicPageJson(input: unknown): ImageshopProductionBatch | null {
  const parsed = comicPageJsonSchema.safeParse(input);
  if (!parsed.success) return null;

  return {
    id: createBatchId('comic-page-json'),
    kind: 'comic-page-json',
    title: parsed.data.title?.trim() || 'Imported comic pages',
    importedAt: new Date().toISOString(),
    items: parsed.data.pages.flatMap((page, pageIndex) => {
      const pageNumber = page.pageNumber ?? pageIndex + 1;
      const pageConfig = pageConfigFromUnknown({
        pageType: page.pageType,
      });

      return page.panels.map((panel, panelIndex) => {
        const panelNumber = panel.panelNumber ?? panelIndex + 1;
        const prompt = firstText(panel.prompt, panel.action, panel.composition, page.summary, `Page ${pageNumber} Panel ${panelNumber}`);
        const dialogue = firstText(panel.dialogue, panel.dialogue_placeholder);
        const sfx = firstText(panel.sfx);
        const main = [prompt, dialogue ? `Dialogue: ${dialogue}` : '', sfx ? `SFX: ${sfx}` : '']
          .filter(Boolean)
          .join('\n');

        return {
          sourceId: `page-${pageNumber}-panel-${panelNumber}`,
          sourceKind: 'comic-page',
          label: `Page ${pageNumber} Panel ${panelNumber}`,
          prompt,
          promptSections: {
            main,
            continuity: page.summary ?? '',
          },
          pageConfig,
        };
      });
    }),
  };
}

function normalizeArcsPageJson(input: unknown): ImageshopProductionBatch | null {
  const parsed = arcsPageJsonSchema.safeParse(input);
  if (!parsed.success) return null;

  return {
    id: createBatchId('arcs-page-json'),
    kind: 'arcs-page-json',
    title: parsed.data.title?.trim() || 'Imported ARCS Imageshop config',
    importedAt: new Date().toISOString(),
    artStyles: parsed.data.artStyles?.map((style) => ({
      id: style.id,
      name: style.name,
      description: style.description ?? '',
      prompt: style.prompt,
    })),
    selectedArtStyleId: parsed.data.selectedArtStyleId ?? null,
    panelQueue: parsed.data.panelQueue,
    items: parsed.data.items.map((item, index) => {
      const prompt = item.prompt?.trim() || item.promptSections?.main?.trim() || `ARCS item ${index + 1}`;
      return {
        sourceId: item.id?.trim() || `arcs-item-${index + 1}`,
        sourceKind: 'arcs-page',
        label: item.label?.trim() || `ARCS Item ${index + 1}`,
        prompt,
        promptSections: normalizePromptSections(item.promptSections),
        pageConfig: pageConfigFromUnknown(item.pageConfig ?? parsed.data.pageConfig),
      };
    }),
  };
}

export function normalizeImageshopJson(input: unknown): ImageshopProductionBatch {
  const arcs = normalizeArcsPageJson(input);
  if (arcs) return arcs;

  const comic = normalizeComicPageJson(input);
  if (comic) return comic;

  try {
    const writer = normalizeImageshopWriterJson(input);
    return writer.batch;
  } catch {
    // Continue through the legacy supported schemas before surfacing the generic unsupported error.
  }

  const story = normalizeStoryBeatJson(input);
  if (story) return story;

  throw new Error('Unsupported Imageshop JSON. Import Writer issue-pack JSON, Story Beat JSON, Comic Page JSON, or exported ARCS Page JSON.');
}

export function exportImageshopProductionConfig({
  title,
  mode,
  pageConfig,
  artStyles = [],
  selectedArtStyleId = null,
  panelQueue,
  items,
}: {
  title: string;
  mode: ImageshopGenerationMode;
  pageConfig: ImageshopPageConfig;
  artStyles?: ImageshopArtStyle[];
  selectedArtStyleId?: string | null;
  panelQueue?: ImageshopIssueQueue | null;
  items: Array<{
    id: string;
    label: string;
    prompt: string;
    promptSections?: Partial<ImageshopPromptWorkspace>;
    pageConfig?: ImageshopPageConfig;
  }>;
}): string {
  return JSON.stringify(
    {
      kind: 'arcs-page-json',
      title,
      mode,
      selectedArtStyleId,
      artStyles,
      pageConfig,
      panelQueue: panelQueue ?? undefined,
      items: items.map((item) => ({
        id: item.id,
        label: item.label,
        prompt: item.prompt,
        promptSections: item.promptSections ?? { main: item.prompt },
        pageConfig: item.pageConfig ?? pageConfig,
      })),
    },
    null,
    2,
  );
}
