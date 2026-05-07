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

export type GuidedComicLayoutPanelPlan = {
  panelNumber: number;
  panelId?: string;
  beatText: string;
  intent: GuidedComicLayoutIntent;
  columnSpan: number;
  rowSpan: number;
};

export type GuidedComicLayoutGridStyle = {
  gridTemplateColumns: string;
  gridAutoRows: string;
};

const MAX_GUIDED_PANELS = 8;

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
