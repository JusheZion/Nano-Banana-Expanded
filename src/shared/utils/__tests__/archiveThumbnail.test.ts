import { describe, expect, it } from 'vitest';
import { parseArchiveThumbnail } from '@/shared/utils/archiveThumbnail';

describe('parseArchiveThumbnail', () => {
  it('normalizes partial and out-of-range persisted framing', () => {
    expect(parseArchiveThumbnail({ archive_thumbnail: { x: -20, y: 140, scale: -3 } })).toEqual({
      x: 0,
      y: 100,
      scale: 1,
    });
  });

  it('rejects non-finite and non-object framing metadata', () => {
    expect(parseArchiveThumbnail({ archive_thumbnail: { x: Number.NaN } })).toBeNull();
    expect(parseArchiveThumbnail({ archive_thumbnail: 'invalid' })).toBeNull();
    expect(parseArchiveThumbnail(null)).toBeNull();
  });
});
