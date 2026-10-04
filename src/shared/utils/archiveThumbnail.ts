import type { ThumbnailFocus } from '@/shared/utils/generationOutputRouter';

function finiteNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

/** Validates persisted archive framing before it reaches CSS transforms or object positioning. */
export function parseArchiveThumbnail(metadataTags: unknown): ThumbnailFocus | null {
  if (metadataTags == null || typeof metadataTags !== 'object') return null;
  const archiveThumbnail = (metadataTags as Record<string, unknown>).archive_thumbnail;
  if (archiveThumbnail == null || typeof archiveThumbnail !== 'object') return null;

  const raw = archiveThumbnail as Record<string, unknown>;
  const x = finiteNumber(raw.x);
  const y = finiteNumber(raw.y);
  const scale = finiteNumber(raw.scale);
  if (x == null && y == null && scale == null) return null;

  return {
    x: x == null ? 50 : Math.min(100, Math.max(0, x)),
    y: y == null ? 50 : Math.min(100, Math.max(0, y)),
    scale: scale != null && scale > 0 ? scale : 1,
  };
}
