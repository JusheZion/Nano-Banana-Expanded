import { clampRectToPage, roundGeometryValue, type ComicRect } from './rects';

export type ComicLayoutTemplateId =
  | 'auto'
  | 'three-panel'
  | 'three-panel-wide-top'
  | 'three-panel-wide-bottom'
  | 'four-panel'
  | 'six-panel-grid'
  | 'splash';

export type ComicLayoutIntent = 'feature' | 'wide' | 'tall' | 'normal';

export type GeneratedComicPanelLayout = {
  panelId: string;
  order: number;
  rect: ComicRect;
  intent: ComicLayoutIntent;
  templateId: ComicLayoutTemplateId | 'ai-intent';
};

export type GenerateLayoutOptions = {
  margin?: number;
  gutter?: number;
};

const MAX_TEMPLATE_PANELS = 8;
const DEFAULT_MARGIN = 0.04;
const DEFAULT_GUTTER = 0.017;

function activePanelCount(panelCount: number): number {
  return Math.max(1, Math.min(MAX_TEMPLATE_PANELS, Math.floor(panelCount)));
}

function metrics(options: GenerateLayoutOptions = {}) {
  const margin = options.margin ?? DEFAULT_MARGIN;
  const gutter = options.gutter ?? DEFAULT_GUTTER;
  return {
    x: margin,
    y: margin,
    width: 1 - margin * 2,
    height: 1 - margin * 2,
    gutter,
  };
}

function panel(order: number, rect: ComicRect, intent: ComicLayoutIntent, templateId: GeneratedComicPanelLayout['templateId']): GeneratedComicPanelLayout {
  return {
    panelId: `panel-${order + 1}`,
    order,
    rect: clampRectToPage(rect),
    intent,
    templateId,
  };
}

function gridLayout(panelCount: number, templateId: ComicLayoutTemplateId, options: GenerateLayoutOptions): GeneratedComicPanelLayout[] {
  const count = activePanelCount(panelCount);
  const page = metrics(options);
  const columns = count <= 2 ? count : count >= 5 ? 3 : 2;
  const rows = Math.ceil(count / columns);
  const width = (page.width - page.gutter * (columns - 1)) / columns;
  const height = (page.height - page.gutter * (rows - 1)) / rows;

  return Array.from({ length: count }, (_, index) => {
    const column = index % columns;
    const row = Math.floor(index / columns);
    return panel(
      index,
      {
        x: roundGeometryValue(page.x + column * (width + page.gutter)),
        y: roundGeometryValue(page.y + row * (height + page.gutter)),
        width: roundGeometryValue(width),
        height: roundGeometryValue(height),
      },
      'normal',
      templateId,
    );
  });
}

export function generateLayoutFromTemplate(
  templateId: ComicLayoutTemplateId,
  panelCount: number,
  options: GenerateLayoutOptions = {},
): GeneratedComicPanelLayout[] {
  const count = activePanelCount(panelCount);
  const page = metrics(options);

  if (templateId === 'splash' || count === 1) {
    return [panel(0, { x: page.x, y: page.y, width: page.width, height: page.height }, 'feature', templateId)];
  }

  if (templateId === 'three-panel' && count === 3) {
    const height = (page.height - page.gutter * 2) / 3;
    return [0, 1, 2].map((row) =>
      panel(
        row,
        {
          x: page.x,
          y: roundGeometryValue(page.y + row * (height + page.gutter)),
          width: page.width,
          height: roundGeometryValue(height),
        },
        'normal',
        templateId,
      ),
    );
  }

  if (templateId === 'three-panel-wide-top' && count === 3) {
    const featureHeight = page.height * 0.658;
    const lowerHeight = page.height - featureHeight - page.gutter;
    const halfWidth = (page.width - page.gutter) / 2;
    return [
      panel(0, { x: page.x, y: page.y, width: page.width, height: featureHeight }, 'wide', templateId),
      panel(1, { x: page.x, y: page.y + featureHeight + page.gutter, width: halfWidth, height: lowerHeight }, 'normal', templateId),
      panel(2, { x: page.x + halfWidth + page.gutter, y: page.y + featureHeight + page.gutter, width: halfWidth, height: lowerHeight }, 'normal', templateId),
    ];
  }

  if (templateId === 'three-panel-wide-bottom' && count === 3) {
    const topHeight = page.height * 0.325;
    const halfWidth = (page.width - page.gutter) / 2;
    return [
      panel(0, { x: page.x, y: page.y, width: halfWidth, height: topHeight }, 'normal', templateId),
      panel(1, { x: page.x + halfWidth + page.gutter, y: page.y, width: halfWidth, height: topHeight }, 'normal', templateId),
      panel(2, { x: page.x, y: page.y + topHeight + page.gutter, width: page.width, height: page.height - topHeight - page.gutter }, 'wide', templateId),
    ];
  }

  return gridLayout(count, templateId, options);
}

export function generateLayoutFromAiIntent(
  intent: ComicLayoutIntent,
  panelCount: number,
  options: GenerateLayoutOptions = {},
): GeneratedComicPanelLayout[] {
  if (intent === 'feature') {
    return generateLayoutFromTemplate(panelCount <= 1 ? 'splash' : 'three-panel-wide-top', panelCount, options).map((layout, index) => ({
      ...layout,
      intent: index === 0 ? 'feature' : layout.intent,
      templateId: 'ai-intent',
    }));
  }

  if (intent === 'wide') {
    return generateLayoutFromTemplate(panelCount === 3 ? 'three-panel-wide-top' : 'auto', panelCount, options).map((layout, index) => ({
      ...layout,
      intent: index === 0 ? 'wide' : layout.intent,
      templateId: 'ai-intent',
    }));
  }

  if (intent === 'tall') {
    return gridLayout(panelCount, 'auto', options).map((layout, index) => ({
      ...layout,
      rect: index === 0 && panelCount > 2
        ? clampRectToPage({ ...layout.rect, height: Math.min(1 - layout.rect.y, layout.rect.height * 2 + (options.gutter ?? DEFAULT_GUTTER)) })
        : layout.rect,
      intent: index === 0 ? 'tall' : layout.intent,
      templateId: 'ai-intent',
    }));
  }

  return gridLayout(panelCount, 'auto', options).map((layout) => ({ ...layout, templateId: 'ai-intent' }));
}
