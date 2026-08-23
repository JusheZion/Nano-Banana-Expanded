import type Konva from 'konva';
import { jsPDF } from 'jspdf';
import type { CodexPlate } from '../types/codexObjects';

/**
 * Export a plate as PNG, or a whole codex as a multi-page PDF.
 *
 * Both go through the Konva stage, so what exports is exactly what's composed.
 * PDF pages are the plate raster — text in the file is therefore not
 * selectable, which is the accepted trade for having one composition path.
 */

export function downloadBlob(data: Blob | string, filename: string): void {
  const url = typeof data === 'string' ? data : URL.createObjectURL(data);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  if (typeof data !== 'string') URL.revokeObjectURL(url);
}

export function safeFilename(name: string, extension: string): string {
  const base = name.trim().replace(/[^\w\-. ]+/g, '').replace(/\s+/g, '-') || 'codex';
  return `${base}.${extension}`;
}

/** `pixelRatio` multiplies the plate's CSS size; 3 is roughly print resolution. */
export function exportStagePng(
  stage: Konva.Stage,
  filename: string,
  pixelRatio = 3,
): void {
  const uri = stage.toDataURL({ pixelRatio, mimeType: 'image/png' });
  downloadBlob(uri, filename);
}

export interface PlateRaster {
  dataUrl: string;
  width: number;
  height: number;
}

/**
 * Render one plate to a raster off-screen. Takes the live stage for the active
 * plate; callers switch plates and re-capture for a multi-page export.
 */
export function rasterisePlate(
  stage: Konva.Stage,
  plate: CodexPlate,
  pixelRatio = 3,
): PlateRaster {
  return {
    dataUrl: stage.toDataURL({ pixelRatio, mimeType: 'image/jpeg', quality: 0.94 }),
    width: plate.width,
    height: plate.height,
  };
}

/** One page per plate, each at the plate's own natural size (96px to the inch). */
export function buildPdf(rasters: PlateRaster[], filename: string): void {
  if (rasters.length === 0) return;

  const first = rasters[0];
  const doc = new jsPDF({
    orientation: first.width >= first.height ? 'landscape' : 'portrait',
    unit: 'px',
    format: [first.width, first.height],
    compress: true,
  });

  rasters.forEach((raster, index) => {
    if (index > 0) {
      doc.addPage(
        [raster.width, raster.height],
        raster.width >= raster.height ? 'landscape' : 'portrait',
      );
    }
    doc.addImage(raster.dataUrl, 'JPEG', 0, 0, raster.width, raster.height);
  });

  doc.save(filename);
}
