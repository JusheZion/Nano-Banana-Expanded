import type { ImageshopWriterImageMapExport } from '@/portals/storyline/imageshopWriterImport';

type ImageshopWriterImageMapPanel = ImageshopWriterImageMapExport['pages'][number]['panels'][number];

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function readPanelNumber(panel: Record<string, unknown>, fallback: number): number {
  const value = panel.index ?? panel.panel_number ?? panel.panelNumber;
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

export function mergeImageshopImageMapIntoWriterBeats({
  beatsJson,
  imageMapPanel,
  returnedAt,
}: {
  beatsJson: Record<string, unknown> | null;
  imageMapPanel: ImageshopWriterImageMapPanel;
  returnedAt: string;
}): Record<string, unknown> {
  const base = beatsJson ?? {};
  const panels = Array.isArray(base.panels)
    ? base.panels.filter(isRecord).map((panel) => ({ ...panel }))
    : [];
  const targetIndex = panels.findIndex(
    (panel, index) =>
      readPanelNumber(panel, index + 1) === imageMapPanel.panel_number ||
      (imageMapPanel.writer_panel_id != null && panel.id === imageMapPanel.writer_panel_id),
  );
  const targetPanel = targetIndex >= 0
    ? panels[targetIndex]
    : { index: imageMapPanel.panel_number };
  const nextPanel = {
    ...targetPanel,
    imageshop_output: {
      image_url: imageMapPanel.image_url,
      status: imageMapPanel.status,
      version_id: imageMapPanel.version_id,
      prompt: imageMapPanel.prompt,
      model: imageMapPanel.model,
      seed: imageMapPanel.seed,
      canon_used: imageMapPanel.canon_used,
      references_used: imageMapPanel.references_used,
      returned_at: returnedAt,
      queue_item_id: imageMapPanel.queue_item_id,
    },
  };

  if (targetIndex >= 0) {
    panels[targetIndex] = nextPanel;
  } else {
    panels.push(nextPanel);
    panels.sort((left, right) => readPanelNumber(left, 0) - readPanelNumber(right, 0));
  }

  return {
    ...base,
    panels,
  };
}
