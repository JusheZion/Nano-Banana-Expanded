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

export type GuidedComicLayoutGridStyle = {
  gridTemplateColumns: string;
  gridAutoRows: string;
};

const MAX_GUIDED_PANELS = 8;
const NORMALIZED_LAYOUT_GUTTER = 0.017;
const NORMALIZED_THIN_LAYOUT_GUTTER = 0.006;
export const NORMALIZED_LAYOUT_MARGIN = 0.04;
const NORMALIZED_SNAP_TOLERANCE = 0.025;
const MIN_GUIDED_PANEL_SIZE = 0.12;

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

function geometry(
  pageNumber: number | undefined,
  panelNumber: number,
  x: number,
  y: number,
  w: number,
  h: number,
): GuidedComicPanelGeometry {
  return {
    panelId: panelIdFor(pageNumber, panelNumber),
    x: roundLayoutValue(x),
    y: roundLayoutValue(y),
    w: roundLayoutValue(w),
    h: roundLayoutValue(h),
    order: panelNumber - 1,
  };
}

function gridStarterGeometry(
  pageNumber: number | undefined,
  panelCount: number,
  settings: GuidedComicLayoutSettings = {},
): GuidedComicPanelGeometry[] {
  const metrics = getLayoutMetrics(settings);
  const columns = panelCount <= 2 ? panelCount : panelCount >= 5 ? 3 : 2;
  const rows = Math.ceil(panelCount / columns);
  const cellW = (metrics.w - metrics.gutter * (columns - 1)) / columns;
  const cellH = (metrics.h - metrics.gutter * (rows - 1)) / rows;

  return Array.from({ length: panelCount }, (_, index) => {
    const column = index % columns;
    const row = Math.floor(index / columns);
    return geometry(
      pageNumber,
      index + 1,
      metrics.x + column * (cellW + metrics.gutter),
      metrics.y + row * (cellH + metrics.gutter),
      cellW,
      cellH,
    );
  });
}

export function createGuidedComicStarterLayout(
  page: GuidedComicLayoutPageInput,
  templateId: GuidedComicLayoutTemplateId,
  settings: GuidedComicLayoutSettings = {},
): GuidedComicPanelGeometry[] {
  const panelCount = getGuidedComicActivePanelCount(page);
  const pageNumber = page.pageNumber;
  const metrics = getLayoutMetrics(settings);
  if (panelCount === 1 || templateId === 'splash') {
    return [geometry(pageNumber, 1, metrics.x, metrics.y, metrics.w, metrics.h)];
  }
  if (templateId === 'three-panel' && panelCount === 3) {
    const h = (metrics.h - metrics.gutter * 2) / 3;
    return [0, 1, 2].map((row) =>
      geometry(pageNumber, row + 1, metrics.x, metrics.y + row * (h + metrics.gutter), metrics.w, h),
    );
  }
  if (templateId === 'three-panel-wide-top' && panelCount === 3) {
    const featureH = metrics.h * 0.658;
    const bottomH = metrics.h - featureH - metrics.gutter;
    const halfW = (metrics.w - metrics.gutter) / 2;
    return [
      geometry(pageNumber, 1, metrics.x, metrics.y, metrics.w, featureH),
      geometry(pageNumber, 2, metrics.x, metrics.y + featureH + metrics.gutter, halfW, bottomH),
      geometry(pageNumber, 3, metrics.x + halfW + metrics.gutter, metrics.y + featureH + metrics.gutter, halfW, bottomH),
    ];
  }
  if (templateId === 'three-panel-wide-bottom' && panelCount === 3) {
    const topH = metrics.h * 0.325;
    const halfW = (metrics.w - metrics.gutter) / 2;
    return [
      geometry(pageNumber, 1, metrics.x, metrics.y, halfW, topH),
      geometry(pageNumber, 2, metrics.x + halfW + metrics.gutter, metrics.y, halfW, topH),
      geometry(pageNumber, 3, metrics.x, metrics.y + topH + metrics.gutter, metrics.w, metrics.h - topH - metrics.gutter),
    ];
  }
  return gridStarterGeometry(pageNumber, panelCount, settings);
}

export function getConstrainedGuidedComicPanelGeometry(
  panel: GuidedComicPanelGeometry,
  options: { minSize?: number } = {},
): GuidedComicPanelGeometry {
  const minSize = options.minSize ?? MIN_GUIDED_PANEL_SIZE;
  const w = Math.min(1, Math.max(minSize, panel.w));
  const h = Math.min(1, Math.max(minSize, panel.h));
  const x = Math.min(1 - w, Math.max(0, panel.x));
  const y = Math.min(1 - h, Math.max(0, panel.y));
  return {
    ...panel,
    x: roundLayoutValue(x),
    y: roundLayoutValue(y),
    w: roundLayoutValue(w),
    h: roundLayoutValue(h),
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

function snapValue(value: number, guides: number[]): number {
  const guide = guides.reduce<{ value: number; distance: number } | null>((nearest, candidate) => {
    const distance = Math.abs(candidate - value);
    if (distance > NORMALIZED_SNAP_TOLERANCE) return nearest;
    if (!nearest || distance < nearest.distance) return { value: candidate, distance };
    return nearest;
  }, null);
  return guide?.value ?? value;
}

export function getSnappedGuidedComicPanelGeometry(
  panel: GuidedComicPanelGeometry,
  pageGeometry: GuidedComicPanelGeometry[],
  settings: GuidedComicLayoutSettings = {},
): GuidedComicPanelGeometry {
  const otherPanels = pageGeometry.filter((candidate) => candidate.panelId !== panel.panelId);
  const metrics = getLayoutMetrics(settings);
  const marginGuides = metrics.margin > 0 ? [metrics.margin, 1 - metrics.margin] : [];
  const guides = [
    0,
    ...marginGuides,
    1,
    ...otherPanels.flatMap((candidate) => [
      candidate.x,
      candidate.y,
      candidate.x + candidate.w,
      candidate.y + candidate.h,
      candidate.x - metrics.gutter,
      candidate.y - metrics.gutter,
      candidate.x + candidate.w + metrics.gutter,
      candidate.y + candidate.h + metrics.gutter,
    ]),
  ].map(roundLayoutValue);

  const snappedX = snapValue(panel.x, guides);
  const snappedY = snapValue(panel.y, guides);
  const snappedRight = snapValue(panel.x + panel.w, guides);
  const snappedBottom = snapValue(panel.y + panel.h, guides);
  return getConstrainedGuidedComicPanelGeometry({
    ...panel,
    x: snappedX,
    y: snappedY,
    w: snappedRight !== panel.x + panel.w ? snappedRight - snappedX : panel.w,
    h: snappedBottom !== panel.y + panel.h ? snappedBottom - snappedY : panel.h,
  });
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
