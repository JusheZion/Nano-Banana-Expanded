import {
  generateLayoutFromAiIntent,
  generateLayoutFromTemplate,
  type ComicLayoutIntent,
  type ComicLayoutTemplateId,
  type GeneratedComicPanelLayout,
} from '@/modes/comic/geometry/layoutTemplates';
import { movePanelRect, resizePanelRect, type PanelResizeHandle } from '@/modes/comic/geometry/panels';
import { snapRectToGutters, snapRectToMargins } from '@/modes/comic/geometry/snapping';
import { clampRectToPage, type ComicRect } from '@/modes/comic/geometry/rects';

export type GuidedComicLayoutTemplateId =
  | 'auto'
  | 'three-panel'
  | 'three-panel-wide-top'
  | 'three-panel-wide-bottom'
  | 'four-panel'
  | 'six-panel-grid'
  | 'splash';

export type GuidedComicLayoutPageInput = {
  pageNumber?: number;
  panelCount: string;
  panelBeats: string[];
};

export type GuidedComicLayoutIntent = 'feature' | 'wide' | 'tall' | 'normal';
export type GuidedComicLayoutMarginMode = 'safe' | 'full-bleed';
export type GuidedComicLayoutGutterMode = 'standard' | 'thin';
export type GuidedComicImageFit = 'cover' | 'contain' | 'stretch';

export type GuidedComicLayoutSettings = {
  marginMode?: GuidedComicLayoutMarginMode;
  gutterMode?: GuidedComicLayoutGutterMode;
};

export type GuidedComicLayoutPanelPlan = {
  panelNumber: number;
  panelId?: string;
  beatText: string;
  intent: GuidedComicLayoutIntent;
  columnSpan: number;
  rowSpan: number;
};

export type GuidedComicPanelGeometry = {
  panelId: string;
  x: number;
  y: number;
  w: number;
  h: number;
  order: number;
  locked?: boolean;
  imageId?: string;
  imageUrl?: string;
  imageFit?: GuidedComicImageFit;
  imageFocusX?: number;
  imageFocusY?: number;
  imageZoom?: number;
};
export type GuidedComicLayoutResizeHandle = 'nw' | 'ne' | 'sw' | 'se';

export type GuidedComicLayoutGridStyle = {
  gridTemplateColumns: string;
  gridAutoRows: string;
};

const MAX_GUIDED_PANELS = 8;
const NORMALIZED_LAYOUT_GUTTER = 0.017;
const NORMALIZED_THIN_LAYOUT_GUTTER = 0.006;
export const NORMALIZED_LAYOUT_MARGIN = 0.04;
const MIN_GUIDED_PANEL_SIZE = 0.12;
const VALID_GUIDED_TEMPLATE_IDS = new Set<GuidedComicLayoutTemplateId>([
  'auto',
  'three-panel',
  'three-panel-wide-top',
  'three-panel-wide-bottom',
  'four-panel',
  'six-panel-grid',
  'splash',
]);
const VALID_GUIDED_LAYOUT_INTENTS = new Set<GuidedComicLayoutIntent>(['feature', 'wide', 'tall', 'normal']);

function getLayoutMetrics(settings: GuidedComicLayoutSettings = {}) {
  const margin = settings.marginMode === 'full-bleed' ? 0 : NORMALIZED_LAYOUT_MARGIN;
  const gutter = settings.gutterMode === 'thin' ? NORMALIZED_THIN_LAYOUT_GUTTER : NORMALIZED_LAYOUT_GUTTER;
  return {
    x: margin,
    y: margin,
    w: 1 - margin * 2,
    h: 1 - margin * 2,
    gutter,
    margin,
  };
}

function roundLayoutValue(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function panelIdFor(pageNumber: number | undefined, panelNumber: number): string {
  return pageNumber ? `page-${pageNumber}-panel-${panelNumber}` : `panel-${panelNumber}`;
}

export function getGuidedComicActivePanelCount(page: Pick<GuidedComicLayoutPageInput, 'panelCount' | 'panelBeats'>): number {
  const parsed = Number.parseInt(page.panelCount, 10);
  if (Number.isFinite(parsed)) {
    return Math.min(MAX_GUIDED_PANELS, Math.max(1, parsed));
  }
  return Math.min(MAX_GUIDED_PANELS, Math.max(1, page.panelBeats.length));
}

export function getGuidedComicExistingPanelBeats(page: Pick<GuidedComicLayoutPageInput, 'panelCount' | 'panelBeats'>): string[] {
  const count = getGuidedComicActivePanelCount(page);
  return Array.from({ length: count }, (_, index) => page.panelBeats[index] ?? '');
}

function geometryFromSharedPanel(
  pageNumber: number | undefined,
  sharedPanel: GeneratedComicPanelLayout,
): GuidedComicPanelGeometry {
  return {
    panelId: panelIdFor(pageNumber, sharedPanel.order + 1),
    x: roundLayoutValue(sharedPanel.rect.x),
    y: roundLayoutValue(sharedPanel.rect.y),
    w: roundLayoutValue(sharedPanel.rect.width),
    h: roundLayoutValue(sharedPanel.rect.height),
    order: sharedPanel.order,
  };
}

function getSharedLayoutOptions(settings: GuidedComicLayoutSettings = {}) {
  const metrics = getLayoutMetrics(settings);
  return {
    margin: metrics.margin,
    gutter: metrics.gutter,
  };
}

export function normalizeGuidedComicLayoutTemplateId(value: unknown): GuidedComicLayoutTemplateId | undefined {
  if (typeof value !== 'string') return undefined;
  return VALID_GUIDED_TEMPLATE_IDS.has(value as GuidedComicLayoutTemplateId) ? (value as GuidedComicLayoutTemplateId) : 'auto';
}

export function normalizeGuidedComicLayoutIntent(value: unknown): GuidedComicLayoutIntent | undefined {
  if (typeof value !== 'string') return undefined;
  return VALID_GUIDED_LAYOUT_INTENTS.has(value as GuidedComicLayoutIntent) ? (value as GuidedComicLayoutIntent) : undefined;
}

export function createGuidedComicStarterLayout(
  page: GuidedComicLayoutPageInput,
  templateId: GuidedComicLayoutTemplateId,
  settings: GuidedComicLayoutSettings = {},
): GuidedComicPanelGeometry[] {
  const panelCount = getGuidedComicActivePanelCount(page);
  const pageNumber = page.pageNumber;
  return generateLayoutFromTemplate(templateId as ComicLayoutTemplateId, panelCount, getSharedLayoutOptions(settings)).map((panel) =>
    geometryFromSharedPanel(pageNumber, panel),
  );
}

export function createGuidedComicStarterLayoutFromAiIntent(
  page: GuidedComicLayoutPageInput,
  intent: GuidedComicLayoutIntent,
  settings: GuidedComicLayoutSettings = {},
): GuidedComicPanelGeometry[] {
  const panelCount = getGuidedComicActivePanelCount(page);
  const pageNumber = page.pageNumber;
  return generateLayoutFromAiIntent(intent as ComicLayoutIntent, panelCount, getSharedLayoutOptions(settings)).map((panel) =>
    geometryFromSharedPanel(pageNumber, panel),
  );
}

function copyGuidedPanelMetadata(
  starterGeometry: GuidedComicPanelGeometry[],
  existingGeometry: GuidedComicPanelGeometry[] | undefined,
): GuidedComicPanelGeometry[] {
  const byPanelId = new Map((existingGeometry ?? []).map((panel) => [panel.panelId, panel]));
  return starterGeometry.map((panel) => {
    const existing = byPanelId.get(panel.panelId);
    if (!existing) return panel;
    return {
      ...panel,
      locked: existing.locked,
      imageId: existing.imageId,
      imageUrl: existing.imageUrl,
      imageFit: existing.imageFit,
      imageFocusX: existing.imageFocusX,
      imageFocusY: existing.imageFocusY,
      imageZoom: existing.imageZoom,
    };
  });
}

export function createGuidedComicStarterLayoutWithExistingMetadata(
  page: GuidedComicLayoutPageInput,
  templateId: GuidedComicLayoutTemplateId,
  existingGeometry: GuidedComicPanelGeometry[] | undefined,
  settings: GuidedComicLayoutSettings = {},
): GuidedComicPanelGeometry[] {
  return copyGuidedPanelMetadata(createGuidedComicStarterLayout(page, templateId, settings), existingGeometry);
}

export function getConstrainedGuidedComicPanelGeometry(
  panel: GuidedComicPanelGeometry,
  options: { minSize?: number } = {},
): GuidedComicPanelGeometry {
  const minSize = options.minSize ?? MIN_GUIDED_PANEL_SIZE;
  const rect = clampRectToPage({ x: panel.x, y: panel.y, width: panel.w, height: panel.h }, { minWidth: minSize, minHeight: minSize });
  return {
    ...panel,
    x: rect.x,
    y: rect.y,
    w: rect.width,
    h: rect.height,
  };
}

export function getGuidedComicSafeMarginPanelGeometry(
  panel: GuidedComicPanelGeometry,
  margin = NORMALIZED_LAYOUT_MARGIN,
): GuidedComicPanelGeometry {
  const usableWidth = Math.max(MIN_GUIDED_PANEL_SIZE, 1 - margin * 2);
  const usableHeight = Math.max(MIN_GUIDED_PANEL_SIZE, 1 - margin * 2);
  const w = Math.min(panel.w, usableWidth);
  const h = Math.min(panel.h, usableHeight);
  return getConstrainedGuidedComicPanelGeometry({
    ...panel,
    x: Math.min(1 - margin - w, Math.max(margin, panel.x)),
    y: Math.min(1 - margin - h, Math.max(margin, panel.y)),
    w,
    h,
  });
}

export function getSnappedGuidedComicPanelGeometry(
  panel: GuidedComicPanelGeometry,
  pageGeometry: GuidedComicPanelGeometry[],
  settings: GuidedComicLayoutSettings = {},
): GuidedComicPanelGeometry {
  const otherPanels = pageGeometry.filter((candidate) => candidate.panelId !== panel.panelId);
  const metrics = getLayoutMetrics(settings);
  const rect: ComicRect = { x: panel.x, y: panel.y, width: panel.w, height: panel.h };
  const marginSnapped =
    metrics.margin > 0 ? snapRectToMargins(rect, { margin: metrics.margin, threshold: 0.025 }).rect : rect;
  const gutterSnapped = snapRectToGutters(
    marginSnapped,
    otherPanels.map((candidate) => ({ x: candidate.x, y: candidate.y, width: candidate.w, height: candidate.h })),
    { gutter: metrics.gutter, threshold: 0.025 },
  ).rect;
  return getConstrainedGuidedComicPanelGeometry({
    ...panel,
    x: gutterSnapped.x,
    y: gutterSnapped.y,
    w: gutterSnapped.width,
    h: gutterSnapped.height,
  });
}

function panelToRect(panel: GuidedComicPanelGeometry): ComicRect {
  return { x: panel.x, y: panel.y, width: panel.w, height: panel.h };
}

function rectToPanel(panel: GuidedComicPanelGeometry, rect: ComicRect): GuidedComicPanelGeometry {
  return {
    ...panel,
    x: rect.x,
    y: rect.y,
    w: rect.width,
    h: rect.height,
  };
}

function mapResizeHandle(handle: GuidedComicLayoutResizeHandle): PanelResizeHandle {
  switch (handle) {
    case 'nw':
      return 'top-left';
    case 'ne':
      return 'top-right';
    case 'sw':
      return 'bottom-left';
    case 'se':
      return 'bottom-right';
    default:
      return 'bottom-right';
  }
}

export function moveGuidedComicPanelGeometry(
  panel: GuidedComicPanelGeometry,
  delta: { x: number; y: number },
  pageGeometry: GuidedComicPanelGeometry[],
  settings: GuidedComicLayoutSettings = {},
): GuidedComicPanelGeometry {
  const moved = rectToPanel(
    panel,
    movePanelRect(panelToRect(panel), delta, { minWidth: MIN_GUIDED_PANEL_SIZE, minHeight: MIN_GUIDED_PANEL_SIZE }),
  );
  return getSnappedGuidedComicPanelGeometry(moved, pageGeometry, settings);
}

export function resizeGuidedComicPanelGeometry(
  panel: GuidedComicPanelGeometry,
  handle: GuidedComicLayoutResizeHandle,
  delta: { x: number; y: number },
  pageGeometry: GuidedComicPanelGeometry[],
  settings: GuidedComicLayoutSettings = {},
): GuidedComicPanelGeometry {
  const resized = rectToPanel(
    panel,
    resizePanelRect(panelToRect(panel), mapResizeHandle(handle), delta, {
      minWidth: MIN_GUIDED_PANEL_SIZE,
      minHeight: MIN_GUIDED_PANEL_SIZE,
    }),
  );
  return getSnappedGuidedComicPanelGeometry(resized, pageGeometry, settings);
}

export function syncGuidedComicLayoutGeometry(
  page: GuidedComicLayoutPageInput,
  existingGeometry: GuidedComicPanelGeometry[] | undefined,
  templateId: GuidedComicLayoutTemplateId,
  settings: GuidedComicLayoutSettings = {},
): GuidedComicPanelGeometry[] {
  const starter = createGuidedComicStarterLayout(page, templateId, settings);
  const byPanelId = new Map((existingGeometry ?? []).map((panel) => [panel.panelId, panel]));
  return starter.map((starterPanel, index) =>
    getConstrainedGuidedComicPanelGeometry({
      ...starterPanel,
      ...byPanelId.get(starterPanel.panelId),
      panelId: starterPanel.panelId,
      order: index,
    }),
  );
}

function inferPanelIntent(beatText: string, panelCount: number): GuidedComicLayoutIntent {
  const beat = beatText.toLowerCase();
  if (panelCount === 1 || /\b(splash|full[-\s]?page|huge reveal|big reveal|reveal|portal opens)\b/.test(beat)) {
    return 'feature';
  }
  if (/\b(wide|establishing|panorama|city|landscape|crowd|chase|battle|explosion|action)\b/.test(beat)) {
    return 'wide';
  }
  if (/\b(vertical|fall|falls|climb|tower|spire|drop|elevator)\b/.test(beat)) {
    return 'tall';
  }
  return 'normal';
}

function panelSpanForIntent(intent: GuidedComicLayoutIntent, panelCount: number): { columnSpan: number; rowSpan: number } {
  if (intent === 'feature' && panelCount > 1) {
    return { columnSpan: 2, rowSpan: 2 };
  }
  if (intent === 'wide' && panelCount > 1) {
    return { columnSpan: 2, rowSpan: 1 };
  }
  if (intent === 'tall' && panelCount > 2) {
    return { columnSpan: 1, rowSpan: 2 };
  }
  return { columnSpan: 1, rowSpan: 1 };
}

function templateSpanForPanel(
  templateId: GuidedComicLayoutTemplateId,
  panelNumber: number,
  panelCount: number,
): { intent?: GuidedComicLayoutIntent; columnSpan: number; rowSpan: number } | null {
  if (templateId === 'three-panel-wide-top' && panelCount === 3) {
    return panelNumber === 1
      ? { intent: 'wide', columnSpan: 2, rowSpan: 1 }
      : { columnSpan: 1, rowSpan: 1 };
  }
  if (templateId === 'three-panel-wide-bottom' && panelCount === 3) {
    return panelNumber === 3
      ? { intent: 'wide', columnSpan: 2, rowSpan: 1 }
      : { columnSpan: 1, rowSpan: 1 };
  }
  return null;
}

export function getGuidedComicLayoutPanels(
  page: GuidedComicLayoutPageInput,
  templateId: GuidedComicLayoutTemplateId,
): GuidedComicLayoutPanelPlan[] {
  const beats = getGuidedComicExistingPanelBeats(page);
  return beats.map((beatText, index) => {
    const intent = inferPanelIntent(beatText, beats.length);
    const templateSpan = templateSpanForPanel(templateId, index + 1, beats.length);
    return {
      panelNumber: index + 1,
      panelId: page.pageNumber ? `page-${page.pageNumber}-panel-${index + 1}` : undefined,
      beatText,
      intent: templateSpan?.intent ?? intent,
      ...(templateSpan ?? panelSpanForIntent(intent, beats.length)),
    };
  });
}

export function getGuidedComicLayoutGridStyle(
  templateId: GuidedComicLayoutTemplateId,
  panelCount: number,
): GuidedComicLayoutGridStyle {
  if (templateId === 'splash' || panelCount <= 1) {
    return {
      gridTemplateColumns: 'minmax(0, 1fr)',
      gridAutoRows: 'minmax(240px, 1fr)',
    };
  }
  if (templateId === 'three-panel' && panelCount <= 3) {
    return {
      gridTemplateColumns: 'minmax(0, 1fr)',
      gridAutoRows: 'minmax(150px, 1fr)',
    };
  }
  if ((templateId === 'three-panel-wide-top' || templateId === 'three-panel-wide-bottom') && panelCount === 3) {
    return {
      gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
      gridAutoRows: 'minmax(128px, 1fr)',
    };
  }
  if (templateId === 'six-panel-grid' || panelCount >= 5) {
    return {
      gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
      gridAutoRows: 'minmax(96px, 1fr)',
    };
  }
  return {
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    gridAutoRows: 'minmax(128px, 1fr)',
  };
}
